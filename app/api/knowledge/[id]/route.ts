import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

import dbConnect from "@/lib/mongoose";
import { auth } from "@/lib/auth";
import KnowledgeDocument from "@/model/KnowledgeDocument";
import RagChunks from "@/model/KnowladgeChunks";
import ServiceModel from "@/model/service";

export const runtime = "nodejs";

function requireObjectId(id: string, label: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ${label}`);
  }
  return new mongoose.Types.ObjectId(id);
}

async function requireOwner() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const userId = session?.user?.id;
  if (!userId)
    return { ok: false as const, status: 401, error: "Unauthorized" };

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return {
      ok: false as const,
      status: 400,
      error: "Invalid user id in session",
    };
  }

  return { ok: true as const, ownerId: new mongoose.Types.ObjectId(userId) };
}

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authRes = await requireOwner();
    if (!authRes.ok) {
      return NextResponse.json(
        { error: authRes.error },
        { status: authRes.status },
      );
    }

    const { id } = await params;
    const docObjectId = requireObjectId(id, "document id");

    await dbConnect();

    const doc = await KnowledgeDocument.findById(docObjectId)
      .select("_id serviceId revokedAt")
      .lean();

    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const serviceObjectId = (doc as { serviceId: mongoose.Types.ObjectId })
      .serviceId;

    const service = await ServiceModel.findOne({
      _id: serviceObjectId,
      ownerId: authRes.ownerId,
    })
      .select("_id")
      .lean();

    if (!service) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!(doc as { revokedAt?: Date }).revokedAt) {
      await Promise.all([
        RagChunks.deleteMany({ documentId: docObjectId }),
        KnowledgeDocument.updateOne(
          { _id: docObjectId },
          { $set: { revokedAt: new Date() } },
        ),
      ]);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authRes = await requireOwner();
    if (!authRes.ok) {
      return NextResponse.json(
        { error: authRes.error },
        { status: authRes.status },
      );
    }

    const { id } = await params;
    const docObjectId = requireObjectId(id, "document id");

    await dbConnect();

    const doc = await KnowledgeDocument.findById(docObjectId)
      .select("_id serviceId")
      .lean();

    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const serviceObjectId = (doc as { serviceId: mongoose.Types.ObjectId })
      .serviceId;

    const service = await ServiceModel.findOne({
      _id: serviceObjectId,
      ownerId: authRes.ownerId,
    })
      .select("_id")
      .lean();

    if (!service) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await Promise.all([
      KnowledgeDocument.deleteOne({ _id: docObjectId }),
      RagChunks.deleteMany({ documentId: docObjectId }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
