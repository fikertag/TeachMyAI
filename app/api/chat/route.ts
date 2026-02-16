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

function msgToText(m: any) {
  if (!m) return "";
  if (typeof m === "string") return m;
  if (typeof m?.content === "string") return m.content;
  if (Array.isArray(m?.content))
    return m.content.map((p: any) => p?.text || "").join("\n");
  return "";
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const body = Schema.parse(await req.json());
    const { message, serviceId, history = [] } = body;

    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return NextResponse.json({ error: "Invalid serviceId" }, { status: 400 });
    }

    const serviceObjectId = new mongoose.Types.ObjectId(serviceId);

    const service = await ServiceModel.findById(serviceObjectId)
      .select("systemPrompt")
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
          filter: {
            serviceId: serviceObjectId,
          },
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

    // 3️⃣ Build retrieved context
    const context = chunks
      .map((c: any, i: number) => `Source ${i + 1}:\n${c.chunkText}`)
      .join("\n\n");

    // 4️⃣ Format frontend history
    const historyText = history
      .slice(-6) // limit to last messages
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    const systemPrompt = (service?.systemPrompt || "").trim();
    const cfg = {
      ...rga_ethify_cfg,
      instruction: systemPrompt || rga_ethify_cfg.instruction,
      context: `${rga_ethify_cfg.context}\n\n${context}`,
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
