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

const Schema = z.object({
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

type RequestBody = z.infer<typeof Schema>;

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
    const { message, serviceId, history = [] } = body;

    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return NextResponse.json({ error: "Invalid serviceId" }, { status: 400 });
    }

    const serviceObjectId = new mongoose.Types.ObjectId(serviceId);

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
    console.log("Embedding vector:", vector);

    if (!vector)
      return NextResponse.json({ error: "Embedding failed" }, { status: 500 });

    // 2️⃣ Vector search
    const chunks = await RagChunks.aggregate<ChunkHit>([
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

    console.log("Vector search results:", chunks);

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

    const mergedInstruction =
      typeof cfgMerged.instruction === "string" && cfgMerged.instruction.trim()
        ? cfgMerged.instruction
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
