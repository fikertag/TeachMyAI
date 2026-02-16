import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/mongoose";
import { chunkText } from "@/lib/aiUtils/chunk";
import { embedTextGemini } from "@/lib/aiUtils/embed";
import KnowledgeDocument from "@/model/KnowledgeDocument";
import RagChunks from "@/model/KnowladgeChunks";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import ServiceModel from "@/model/service";

export const runtime = "nodejs";

const IngestRequestSchema = z.object({
  serviceId: z.string().min(1),
  text: z.string().min(1),
  title: z.string().min(1).optional(),
});

function toObjectId(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ObjectId: ${id}`);
  }
  return new mongoose.Types.ObjectId(id);
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
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

    const json = await req.json();
    const body = IngestRequestSchema.parse(json);
    await dbConnect();

    const ownerObjectId = new mongoose.Types.ObjectId(userId);
    const serviceObjectId = toObjectId(body.serviceId);

    const service = await ServiceModel.findOne({
      _id: serviceObjectId,
      ownerId: ownerObjectId,
    })
      .select("_id")
      .lean();

    if (!service) {
      return NextResponse.json(
        { error: "Forbidden: service does not belong to user" },
        { status: 403 },
      );
    }

    const document = await KnowledgeDocument.create({
      serviceId: serviceObjectId,
      title: body.title ?? "Untitled",
      text: body.text,
      source: "api",
    });

    const chunks = await chunkText(body.text);

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: "No chunks produced from text" },
        { status: 400 },
      );
    }

    const allChunks = chunks.map((chunkText, index) => ({ chunkText, index }));

    const embeddings = await embedTextGemini({
      contents: allChunks.map((chunk) => chunk.chunkText),
    });

    if (embeddings.length !== allChunks.length) {
      throw new Error(
        `Embedding count mismatch: got ${embeddings.length}, expected ${allChunks.length}`,
      );
    }

    const docs = allChunks.map((chunk, i) => ({
      serviceId: serviceObjectId,
      documentId: document._id,
      index: chunk.index,
      chunkText: chunk.chunkText,
      embedding: (() => {
        const values = (embeddings[i] as { values?: unknown })?.values;
        if (
          Array.isArray(values) &&
          values.every((v) => typeof v === "number")
        ) {
          return values;
        }
        throw new Error("Unexpected embedding shape from Gemini embed API");
      })(),
    }));

    const inserted = await RagChunks.insertMany(docs, { ordered: false });

    return NextResponse.json({
      serviceId: body.serviceId,
      documentId: document._id.toString(),
      chunksInserted: inserted.length,
      totalChunks: chunks.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.flatten() },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
