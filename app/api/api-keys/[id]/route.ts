import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";

import dbConnect from "@/lib/mongoose";
import { auth } from "@/lib/auth";
import ApiKeyModel from "@/model/apiKey";
import ApiKeyUsageModel from "@/model/apiKeyUsage";

export const runtime = "nodejs";

const UpdateApiKeySchema = z
  .object({
    name: z.string().min(1).max(80).optional(),
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

async function requireUserId() {
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
    userObjectId: new mongoose.Types.ObjectId(userId),
  };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authRes = await requireUserId();
    if (!authRes.ok) {
      return NextResponse.json(
        { error: authRes.error },
        { status: authRes.status },
      );
    }

    const { id } = await params;
    const apiKeyObjectId = requireObjectId(id, "apiKey id");

    const json = await req.json();
    const body = UpdateApiKeySchema.parse(json);

    await dbConnect();

    const update: Record<string, unknown> = {};
    if (typeof body.name === "string") update.name = body.name.trim();

    const updated = await ApiKeyModel.findOneAndUpdate(
      { _id: apiKeyObjectId, ownerId: authRes.userObjectId },
      { $set: update },
      { new: true },
    )
      .select(
        "_id serviceId name prefix last4 rateLimitPerMinute monthlyRequestLimit revokedAt lastUsedAt createdAt updatedAt",
      )
      .lean();

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      apiKey: {
        id: updated._id.toString(),
        serviceId: (
          updated as { serviceId: mongoose.Types.ObjectId }
        ).serviceId.toString(),
        name: (updated as { name: string }).name,
        prefix: (updated as { prefix: string }).prefix,
        last4: (updated as { last4: string }).last4,
        rateLimitPerMinute: (updated as { rateLimitPerMinute?: number })
          .rateLimitPerMinute,
        monthlyRequestLimit: (updated as { monthlyRequestLimit?: number })
          .monthlyRequestLimit,
        revokedAt: (updated as { revokedAt?: Date }).revokedAt,
        lastUsedAt: (updated as { lastUsedAt?: Date }).lastUsedAt,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
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

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authRes = await requireUserId();
    if (!authRes.ok) {
      return NextResponse.json(
        { error: authRes.error },
        { status: authRes.status },
      );
    }

    const { id } = await params;
    const apiKeyObjectId = requireObjectId(id, "apiKey id");

    await dbConnect();

    const url = new URL(req.url);
    const hard = url.searchParams.get("hard") === "true";

    if (hard) {
      const key = await ApiKeyModel.findOne({
        _id: apiKeyObjectId,
        ownerId: authRes.userObjectId,
      })
        .select("_id revokedAt")
        .lean();

      if (!key) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      if (!(key as { revokedAt?: Date }).revokedAt) {
        return NextResponse.json(
          { error: "Revoke the key before deleting" },
          { status: 409 },
        );
      }

      await Promise.all([
        ApiKeyModel.deleteOne({
          _id: apiKeyObjectId,
          ownerId: authRes.userObjectId,
        }),
        ApiKeyUsageModel.deleteMany({ apiKeyId: apiKeyObjectId }),
      ]);

      return NextResponse.json({ ok: true });
    }

    const updated = await ApiKeyModel.findOneAndUpdate(
      {
        _id: apiKeyObjectId,
        ownerId: authRes.userObjectId,
        revokedAt: { $exists: false },
      },
      { $set: { revokedAt: new Date() } },
      { new: true },
    )
      .select(
        "_id serviceId name prefix last4 rateLimitPerMinute monthlyRequestLimit revokedAt lastUsedAt createdAt updatedAt",
      )
      .lean();

    if (!updated) {
      const exists = await ApiKeyModel.findOne({
        _id: apiKeyObjectId,
        ownerId: authRes.userObjectId,
      })
        .select("_id revokedAt")
        .lean();

      if (!exists) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
