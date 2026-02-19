import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongoose";
import RagChunks from "@/model/KnowladgeChunks";
import ServiceModel from "@/model/service";
import { decryptApiKey } from "@/lib/api-keys";
import { embedTextGemini } from "@/lib/aiUtils/embed";
import { buildPromptFromConfig } from "@/lib/aiUtils/promptBuilder";
import { rga_ethify_cfg } from "@/lib/aiUtils/promots";

const LegacySchema = z.object({
  message: z.string().min(1),
  serviceId: z.string().min(1),
  embedReferrer: z.string().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .optional(),
});

const MessagesSchema = z.object({
  serviceId: z.string().min(1).optional(),
  embedReferrer: z.string().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1),
      }),
    )
    .min(1),
});

const Schema = z.union([LegacySchema, MessagesSchema]);

type LegacyBody = z.infer<typeof LegacySchema>;
type MessagesBody = z.infer<typeof MessagesSchema>;
type RequestBody = LegacyBody | MessagesBody;

type ChunkHit = {
  chunkText: string;
  score: number;
};

function normalizeAllowedOrigin(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  if (trimmed.startsWith("*\.")) {
    const bareHost = trimmed.slice(2).trim();
    if (!bareHost) return null;
    return `*.${bareHost}`;
  }

  try {
    const parsed = new URL(
      trimmed.includes("://") ? trimmed : `https://${trimmed}`,
    );
    if (!parsed.hostname) return null;
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
      return null;
    return `${parsed.protocol}//${parsed.host}`.toLowerCase();
  } catch {
    return null;
  }
}

function originFromReferrer(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return `${parsed.protocol}//${parsed.host}`.toLowerCase();
  } catch {
    return null;
  }
}

function hostFromOrigin(origin: string): string {
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isAllowedOrigin(origin: string, allowedOrigins: string[]): boolean {
  const normalizedOrigin = origin.toLowerCase();
  const hostname = hostFromOrigin(normalizedOrigin);
  if (!hostname) return false;

  return allowedOrigins.some((item) => {
    const allowed = normalizeAllowedOrigin(item);
    if (!allowed) return false;

    if (allowed.startsWith("*.")) {
      const bare = allowed.slice(2);
      return hostname === bare || hostname.endsWith(`.${bare}`);
    }

    return allowed === normalizedOrigin;
  });
}

function parseUrl(value: string): URL | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed);
  } catch {
    return null;
  }
}

function isEmbedRequest(req: NextRequest, embedReferrer: string): boolean {
  const refererUrl = parseUrl(req.headers.get("referer") ?? "");
  if (refererUrl?.pathname.startsWith("/embed/chat")) return true;

  const bodyReferrerUrl = parseUrl(embedReferrer);
  if (bodyReferrerUrl?.pathname.startsWith("/embed/chat")) return true;

  return false;
}

function msgToText(message: unknown): string {
  if (message == null) return "";
  if (typeof message === "string") return message;

  if (typeof message === "object") {
    const content = (message as { content?: unknown }).content;
    if (typeof content === "string") return content;

    if (Array.isArray(content)) {
      return content
        .map((part) => {
          if (!part || typeof part !== "object") return "";
          const text = (part as Record<string, unknown>).text;
          return typeof text === "string" ? text : "";
        })
        .filter(Boolean)
        .join("\n");
    }
  }

  return "";
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const body: RequestBody = Schema.parse(await req.json());

    let message: string;
    let requestedServiceId: string | undefined;
    let embedReferrer = "";
    let history: { role: "user" | "assistant"; content: string }[];

    if ("messages" in body) {
      const lastUser = [...body.messages]
        .reverse()
        .find((m) => m.role === "user");
      message = (lastUser ?? body.messages[body.messages.length - 1]).content;
      requestedServiceId = body.serviceId;
      embedReferrer = body.embedReferrer ?? "";
      history = body.messages
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));
    } else {
      message = body.message;
      requestedServiceId = body.serviceId;
      embedReferrer = body.embedReferrer ?? "";
      history = body.history ?? [];
    }

    const serviceIdFromBody =
      typeof requestedServiceId === "string" && requestedServiceId.trim()
        ? requestedServiceId.trim()
        : undefined;

    const resolvedServiceId: string | undefined = serviceIdFromBody;

    if (!resolvedServiceId) {
      return NextResponse.json(
        { error: "serviceId is required" },
        { status: 400 },
      );
    }

    if (
      resolvedServiceId &&
      !mongoose.Types.ObjectId.isValid(resolvedServiceId)
    ) {
      return NextResponse.json({ error: "Invalid serviceId" }, { status: 400 });
    }

    const serviceObjectId = resolvedServiceId
      ? new mongoose.Types.ObjectId(resolvedServiceId)
      : undefined;

    const service = serviceObjectId
      ? await ServiceModel.findById(serviceObjectId)
          .select(
            "systemPrompt promptConfig allowedOrigins geminiApiKeyEncrypted",
          )
          .lean()
      : null;

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const allowedOrigins =
      service && typeof service === "object"
        ? ((service as { allowedOrigins?: unknown }).allowedOrigins as
            | string[]
            | undefined)
        : undefined;

    const normalizedAllowedOrigins = Array.isArray(allowedOrigins)
      ? allowedOrigins
          .map((v) => normalizeAllowedOrigin(v))
          .filter((v): v is string => Boolean(v))
      : [];

    if (isEmbedRequest(req, embedReferrer)) {
      if (normalizedAllowedOrigins.length === 0) {
        return NextResponse.json(
          {
            error:
              "Embed is disabled for this service. Add allowed origins in service settings.",
          },
          { status: 403 },
        );
      }

      const requestOrigin =
        originFromReferrer(embedReferrer) ??
        originFromReferrer(req.headers.get("referer") ?? "") ??
        originFromReferrer(req.headers.get("origin") ?? "");

      if (
        !requestOrigin ||
        !isAllowedOrigin(requestOrigin, normalizedAllowedOrigins)
      ) {
        return NextResponse.json(
          {
            error:
              "Embed is not allowed from this domain. Add it to allowed origins in service settings.",
          },
          { status: 403 },
        );
      }
    }

    const serviceGeminiApiKey = decryptApiKey(
      (service as { geminiApiKeyEncrypted?: string }).geminiApiKeyEncrypted,
    );

    const apiKey = serviceGeminiApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey)
      return NextResponse.json({ error: "AI key missing" }, { status: 500 });

    const model = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      apiKey,
      temperature: 0.7,
    });

    // 1️⃣ Embed question
    const emb = await embedTextGemini({ contents: [message], apiKey });
    const vector = emb?.[0]?.values;

    if (!vector)
      return NextResponse.json({ error: "Embedding failed" }, { status: 500 });

    // 2️⃣ Vector search
    const chunks = serviceObjectId
      ? await RagChunks.aggregate([
          {
            $vectorSearch: {
              queryVector: vector,
              index: "rga_index",
              filter: { serviceId: serviceObjectId },
              path: "embedding",
              numCandidates: 50,
              limit: 5,
            },
          },
          {
            $project: {
              _id: 0,
              chunkText: 1,
              score: { $meta: "vectorSearchScore" },
            },
          },
        ])
      : [];

    // 3️⃣ Build retrieved context
    const context = chunks
      .map(
        (c, i) => `Source ${i + 1}:
${c.chunkText}`,
      )
      .join("\n\n");

    // 4️⃣ Format frontend history
    const historyText = history
      .slice(-6) // limit to last messages
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    const systemPrompt = (service?.systemPrompt || "").trim();
    const servicePromptConfig =
      service && typeof service === "object"
        ? ((service as { promptConfig?: unknown }).promptConfig as
            | Record<string, unknown>
            | undefined)
        : undefined;

    const cfgBase = rga_ethify_cfg;
    const cfgMerged = {
      ...cfgBase,
      ...(servicePromptConfig ?? {}),
    };

    const promptConfigInstruction =
      servicePromptConfig && typeof servicePromptConfig === "object"
        ? (servicePromptConfig as { instruction?: unknown }).instruction
        : undefined;

    const mergedInstruction =
      typeof promptConfigInstruction === "string" &&
      promptConfigInstruction.trim()
        ? promptConfigInstruction
        : systemPrompt
          ? systemPrompt
          : cfgBase.instruction;

    const mergedContextBase =
      typeof cfgMerged.context === "string" && cfgMerged.context.trim()
        ? cfgMerged.context
        : cfgBase.context;

    const cfg = {
      ...cfgMerged,
      instruction: mergedInstruction,
      context: `${mergedContextBase ?? ""}\n\n${context}`.trim(),
    };

    const finalPrompt = buildPromptFromConfig(
      cfg,
      `Chat History:\n${historyText}\n\nUSER QUESTION:\n${message}`,
    );

    // 5️⃣ Call model
    const res = await model.invoke(finalPrompt);
    const answer = msgToText(res);

    return NextResponse.json({
      response: answer,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }

    console.error(err);
    return NextResponse.json(
      { error: "there was an error processing your request" },
      { status: 500 },
    );
  }
}
