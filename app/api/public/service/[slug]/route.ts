import mongoose from "mongoose";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import ServiceModel from "@/model/service";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug?: string }> },
) {
  try {
    const p = await params;
    const slug = p?.slug?.toString().trim() ?? "";
    if (!slug) {
      return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    }

    await dbConnect();

    const service = await ServiceModel.findOne({ slug })
      .select("_id name description color quickPrompts")
      .lean();

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    return NextResponse.json({
      service: {
        id: (service as { _id: mongoose.Types.ObjectId })._id.toString(),
        name: (service as { name: string }).name,
        slug: (service as { slug: string }).slug,
        description: (service as { description?: string }).description ?? "",
        color: (service as { color?: string }).color,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "there was an error" }, { status: 500 });
  }
}
