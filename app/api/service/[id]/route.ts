import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";

import dbConnect from "@/lib/mongoose";
import { auth } from "@/lib/auth";
import ServiceModel from "@/model/service";
import ApiKeyModel from "@/model/apiKey";
import ApiKeyUsageModel from "@/model/apiKeyUsage";
import KnowledgeDocument from "@/model/KnowledgeDocument";
import RagChunks from "@/model/KnowladgeChunks";

export const runtime = "nodejs";

const UpdateServiceSchema = z
  .object({
    slug: z.string().min(1).max(80).optional(),
    description: z.string().max(2000).optional(),
  })
  .refine(
    (v) => Object.keys(v).length > 0,
    "At least one field must be provided",
  );

function requireObjectId(id: string, label: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ${label}`);
  }
  return new mongoose.Types.ObjectId(id);
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function requireUser() {
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

  return {
    ok: true as const,
    ownerObjectId: new mongoose.Types.ObjectId(userId),
  };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authRes = await requireUser();
    if (!authRes.ok) {
      return NextResponse.json(
        { error: authRes.error },
        { status: authRes.status },
      );
    }

    const { id } = await params;
    const serviceObjectId = requireObjectId(id, "service id");

    const json = await req.json();
    const body = UpdateServiceSchema.parse(json);

    await dbConnect();

    const update: Record<string, unknown> = {};

    if (typeof body.slug === "string") {
      const slug = slugify(body.slug);
      if (!slug) {
        return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
      }
      update.slug = slug;
    }

    if (typeof body.description === "string") {
      update.description = body.description;
    }

    try {
      const updated = await ServiceModel.findOneAndUpdate(
        { _id: serviceObjectId, ownerId: authRes.ownerObjectId },
        { $set: update },
        { new: true },
      ).lean();

      if (!updated) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      return NextResponse.json({
        service: {
          id: updated._id.toString(),
          ownerId: (
            updated as { ownerId: mongoose.Types.ObjectId }
          ).ownerId.toString(),
          name: (updated as { name: string }).name,
          slug: (updated as { slug: string }).slug,
          description: (updated as { description: string }).description,
          systemPrompt: (updated as { systemPrompt: string }).systemPrompt,
          promptConfig: (updated as { promptConfig?: unknown }).promptConfig,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        },
      });
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code?: number }).code === 11000
      ) {
        return NextResponse.json({ error: "Slug is taken" }, { status: 409 });
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

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authRes = await requireUser();
    if (!authRes.ok) {
      return NextResponse.json(
        { error: authRes.error },
        { status: authRes.status },
      );
    }

    const { id } = await params;
    const serviceObjectId = requireObjectId(id, "service id");

    await dbConnect();

    const service = await ServiceModel.findOne({
      _id: serviceObjectId,
      ownerId: authRes.ownerObjectId,
    })
      .select("_id")
      .lean();

    if (!service) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const apiKeys = await ApiKeyModel.find({ serviceId: serviceObjectId })
      .select("_id")
      .lean();

    const apiKeyIds = apiKeys.map(
      (k) => k._id as unknown as mongoose.Types.ObjectId,
    );

    const deletions: Promise<unknown>[] = [
      ApiKeyModel.deleteMany({ serviceId: serviceObjectId }),
      RagChunks.deleteMany({ serviceId: serviceObjectId }),
      KnowledgeDocument.deleteMany({ serviceId: serviceObjectId }),
    ];

    if (apiKeyIds.length) {
      deletions.push(
        ApiKeyUsageModel.deleteMany({ apiKeyId: { $in: apiKeyIds } }),
      );
    }

    await Promise.all(deletions);

    await ServiceModel.deleteOne({
      _id: serviceObjectId,
      ownerId: authRes.ownerObjectId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
