import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

import dbConnect from "@/lib/mongoose";
import { auth } from "@/lib/auth";
import KnowledgeDocument from "@/model/KnowledgeDocument";
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
      .select("_id serviceId title source createdAt updatedAt")
      .lean();

    return NextResponse.json({
      documents: docs.map((d) => ({
        id: d._id.toString(),
        serviceId: (
          d as { serviceId: mongoose.Types.ObjectId }
        ).serviceId.toString(),
        title: (d as { title: string }).title,
        source: (d as { source: string }).source,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
