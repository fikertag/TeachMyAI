import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongoose";
import RagChunks from "@/model/KnowladgeChunks";
import ServiceModel from "@/model/service";
import { embedTextGemini } from "@/lib/aiUtils/embed";
import { buildPromptFromConfig } from "@/lib/aiUtils/promptBuilder";
import { rga_ethify_cfg } from "@/lib/aiUtils/promots";
import { auth } from "@/lib/auth";
import { headers as nextHeaders } from "next/headers";
import {
  authenticateAndConsumeApiKey,
  getApiKeyFromHeaders,
} from "@/lib/api-keys";

const LegacySchema = z.object({
  message: z.string().min(1),
  serviceId: z.string().min(1),
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
    let history: { role: "user" | "assistant"; content: string }[];

    if ("messages" in body) {
      const lastUser = [...body.messages]
        .reverse()
        .find((m) => m.role === "user");
      message = (lastUser ?? body.messages[body.messages.length - 1]).content;
      requestedServiceId = body.serviceId;
      history = body.messages
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));
    } else {
      message = body.message;
      requestedServiceId = body.serviceId;
      history = body.history ?? [];
    }

    const serviceIdFromBody =
      typeof requestedServiceId === "string" && requestedServiceId.trim()
        ? requestedServiceId.trim()
        : undefined;

    const apiKeyHeader = getApiKeyFromHeaders(req.headers);

    let resolvedServiceId: string | undefined = serviceIdFromBody;

    if (apiKeyHeader) {
      const res = await authenticateAndConsumeApiKey({ apiKey: apiKeyHeader });
      if (!res.ok) {
        return NextResponse.json({ error: res.error }, { status: res.status });
      }

      resolvedServiceId = resolvedServiceId ?? res.serviceId;

      if (resolvedServiceId !== res.serviceId) {
        return NextResponse.json(
          { error: "API key not allowed for this service" },
          { status: 403 },
        );
      }
    } else {
      if (!resolvedServiceId) {
        return NextResponse.json(
          { error: "serviceId is required" },
          { status: 400 },
        );
      }

      const session = await auth.api.getSession({
        headers: await nextHeaders(),
      });

      const userId = session?.user?.id;
      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return NextResponse.json(
          { error: "Invalid user id in session" },
          { status: 400 },
        );
      }

      const ownerObjectId = new mongoose.Types.ObjectId(userId);

      if (!mongoose.Types.ObjectId.isValid(resolvedServiceId)) {
        return NextResponse.json(
          { error: "Invalid serviceId" },
          { status: 400 },
        );
      }

      const serviceObjectId = new mongoose.Types.ObjectId(resolvedServiceId);

      const owned = await ServiceModel.findOne({
        _id: serviceObjectId,
        ownerId: ownerObjectId,
      })
        .select("_id")
        .lean();

      if (!owned) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (
      !resolvedServiceId ||
      !mongoose.Types.ObjectId.isValid(resolvedServiceId)
    ) {
      return NextResponse.json({ error: "Invalid serviceId" }, { status: 400 });
    }

    const serviceObjectId = new mongoose.Types.ObjectId(resolvedServiceId);

    const service = await ServiceModel.findById(serviceObjectId)
      .select("systemPrompt promptConfig")
      .lean();

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey)
      return NextResponse.json({ error: "AI key missing" }, { status: 500 });

    const model = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      apiKey,
      temperature: 0.7,
    });

    // 1️⃣ Embed question
    const emb = await embedTextGemini({ contents: [message] });
    const vector = emb?.[0]?.values;
    console.log("Query embedding:", vector);

    if (!vector)
      return NextResponse.json({ error: "Embedding failed" }, { status: 500 });

    // 2️⃣ Vector search
    const chunks = await RagChunks.aggregate([
      {
        $vectorSearch: {
          queryVector: vector,
          index: "rga_index",
          path: "embedding",
          numCandidates: 50,
          limit: 5,
        },
      },
      { $match: { serviceId: serviceObjectId } },
      {
        $project: {
          _id: 0,
          chunkText: 1,
          score: { $meta: "vectorSearchScore" },
        },
      },
    ]);
    console.log("Retrieved chunks:", chunks);
    // 3️⃣ Build retrieved context
    const context = chunks
      .map((c, i) => `Source ${i + 1}:\n${c.chunkText}`)
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
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
