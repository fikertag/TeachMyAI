import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
// import { GoogleGenAI } from "@google/genai";
import dbConnect from "@/lib/mongoose";
import { auth } from "@/lib/auth";
import { encryptApiKey } from "@/lib/api-keys";
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
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional(),
    systemPrompt: z.string().max(20000).optional(),
    allowedOrigins: z.array(z.string().min(1).max(300)).max(50).optional(),
    geminiApiKey: z.string().min(20).max(300).optional().nullable(),
    promptConfig: z
      .object({
        role: z.string().optional(),
        instruction: z.union([z.string(), z.array(z.string())]).optional(),
        context: z.string().optional(),
        output_constraints: z
          .union([z.string(), z.array(z.string())])
          .optional(),
        style_or_tone: z.union([z.string(), z.array(z.string())]).optional(),
        output_format: z.union([z.string(), z.array(z.string())]).optional(),
        examples: z.union([z.string(), z.array(z.string())]).optional(),
        goal: z.string().optional(),
        reasoning_strategy: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .refine(
    (v) => Object.keys(v).length > 0,
    "At least one field must be provided",
  );

// async function verifyGeminiApiKey(apiKey: string) {
//   const ai = new GoogleGenAI({ apiKey });
//   await ai.models.generateContent({
//     model: "gemini-2.0-flash",
//     contents: "ping",
//   });
// }

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
    const unset: Record<string, 1> = {};

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

    if (typeof body.color === "string") {
      update.color = body.color;
    }

    if (typeof body.systemPrompt === "string") {
      update.systemPrompt = body.systemPrompt;
    }

    if (body.allowedOrigins !== undefined) {
      update.allowedOrigins = body.allowedOrigins;
    }

    if (body.geminiApiKey !== undefined) {
      if (body.geminiApiKey === null) {
        unset.geminiApiKeyEncrypted = 1;
        unset.geminiApiKeyLast4 = 1;
        unset.geminiApiKeyUpdatedAt = 1;
      } else {
        const trimmed = body.geminiApiKey.trim();
        if (!trimmed) {
          return NextResponse.json(
            { error: "Gemini API key cannot be empty" },
            { status: 400 },
          );
        }
        // await verifyGeminiApiKey(trimmed);
        update.geminiApiKeyEncrypted = encryptApiKey(trimmed);
        update.geminiApiKeyLast4 = trimmed.slice(-4);
        update.geminiApiKeyUpdatedAt = new Date();
      }
    }

    if (body.promptConfig !== undefined) {
      update.promptConfig = body.promptConfig;
    }

    try {
      const updateQuery: {
        $set?: Record<string, unknown>;
        $unset?: Record<string, 1>;
      } = {};

      if (Object.keys(update).length > 0) updateQuery.$set = update;
      if (Object.keys(unset).length > 0) updateQuery.$unset = unset;

      const updated = await ServiceModel.findOneAndUpdate(
        { _id: serviceObjectId, ownerId: authRes.ownerObjectId },
        updateQuery,
        { new: true, strict: false },
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
          color: (updated as { color?: string }).color,
          systemPrompt: (updated as { systemPrompt: string }).systemPrompt,
          allowedOrigins: Array.isArray(
            (updated as { allowedOrigins?: unknown }).allowedOrigins,
          )
            ? ((updated as { allowedOrigins: string[] }).allowedOrigins ?? [])
            : [],
          hasGeminiApiKey:
            (typeof (updated as { geminiApiKeyEncrypted?: unknown })
              .geminiApiKeyEncrypted === "string" &&
              Boolean(
                (updated as { geminiApiKeyEncrypted?: string })
                  .geminiApiKeyEncrypted,
              )) ||
            Boolean(
              (updated as { geminiApiKeyLast4?: string }).geminiApiKeyLast4,
            ),
          geminiApiKeyLast4:
            (updated as { geminiApiKeyLast4?: string }).geminiApiKeyLast4 ??
            null,
          geminiApiKeyUpdatedAt:
            (updated as { geminiApiKeyUpdatedAt?: Date })
              .geminiApiKeyUpdatedAt ?? null,
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
