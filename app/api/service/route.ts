import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import dbConnect from "@/lib/mongoose";
import { auth } from "@/lib/auth";
import ServiceModel from "@/model/service";

export const runtime = "nodejs";

const CreateServiceSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  systemPrompt: z.string().optional(),
  promptConfig: z
    .object({
      role: z.string().optional(),
      instruction: z.union([z.string(), z.array(z.string())]).optional(),
      context: z.string().optional(),
      output_format: z.union([z.string(), z.array(z.string())]).optional(),
      examples: z.union([z.string(), z.array(z.string())]).optional(),
      goal: z.string().optional(),
      reasoning_strategy: z.string().optional(),
    })
    .passthrough()
    .optional(),
});

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function GET() {
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

    await dbConnect();

    const ownerObjectId = new mongoose.Types.ObjectId(userId);
    const services = await ServiceModel.find({ ownerId: ownerObjectId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      services: services.map((s) => ({
        id: s._id.toString(),
        ownerId: s.ownerId.toString(),
        name: s.name,
        slug: s.slug,
        description: s.description,
        systemPrompt: s.systemPrompt,
        promptConfig: s.promptConfig,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
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
    const body = CreateServiceSchema.parse(json);

    await dbConnect();

    const ownerObjectId = new mongoose.Types.ObjectId(userId);

    const existing = await ServiceModel.findOne({ ownerId: ownerObjectId })
      .select("_id")
      .lean();

    if (existing) {
      return NextResponse.json(
        { error: "You can only create one service" },
        { status: 409 },
      );
    }

    const slug = body.slug ? slugify(body.slug) : slugify(body.name);
    if (!slug) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }

    try {
      const service = await ServiceModel.create({
        ownerId: ownerObjectId,
        name: body.name,
        slug,
        description: body.description ?? "",
        systemPrompt: body.systemPrompt ?? "",
        promptConfig: body.promptConfig,
      });

      return NextResponse.json(
        {
          service: {
            id: service._id.toString(),
            ownerId: service.ownerId.toString(),
            name: service.name,
            slug: service.slug,
            description: service.description,
            systemPrompt: service.systemPrompt,
            promptConfig: service.promptConfig,
          },
        },
        { status: 201 },
      );
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code?: number }).code === 11000
      ) {
        return NextResponse.json(
          { error: "Service already exists or slug is taken" },
          { status: 409 },
        );
      }
      throw err;
    }
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
