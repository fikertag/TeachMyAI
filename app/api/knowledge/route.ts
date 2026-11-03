import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

import dbConnect from "@/lib/mongoose";
import { auth } from "@/lib/auth";
import KnowledgeDocument from "@/model/KnowledgeDocument";
import RagChunks from "@/model/KnowladgeChunks";
import ServiceModel from "@/model/service";

export const runtime = "nodejs";

export async function GET(req: Request) {
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

    const url = new URL(req.url);
    const serviceId = url.searchParams.get("serviceId") ?? "";

    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return NextResponse.json({ error: "Invalid serviceId" }, { status: 400 });
    }

    await dbConnect();

    const ownerObjectId = new mongoose.Types.ObjectId(userId);
    const serviceObjectId = new mongoose.Types.ObjectId(serviceId);

    const service = await ServiceModel.findOne({
      _id: serviceObjectId,
      ownerId: ownerObjectId,
    })
      .select("_id")
      .lean();

    if (!service) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const docs = await KnowledgeDocument.find({ serviceId: serviceObjectId })
      .sort({ createdAt: -1 })
      .select("_id serviceId title preview source revokedAt createdAt updatedAt")
      .lean();

    const docsWithPreview = await Promise.all(
      docs.map(async (d) => {
        let preview = (d as { preview?: string }).preview ?? "";
        if (!preview) {
          const firstChunk = await RagChunks.findOne({
            documentId: d._id,
          })
            .sort({ index: 1 })
            .select("chunkText")
            .lean();
          if (firstChunk?.chunkText) {
            preview = firstChunk.chunkText.slice(0, 240);
          }
        }

        return {
          id: d._id.toString(),
          serviceId: (
            d as { serviceId: mongoose.Types.ObjectId }
          ).serviceId.toString(),
          title: (d as { title: string }).title,
          preview,
          source: (d as { source: string }).source,
          revokedAt: (d as { revokedAt?: Date }).revokedAt,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        };
      }),
    );

    return NextResponse.json({
      documents: docsWithPreview,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
