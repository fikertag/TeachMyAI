import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import dbConnect from "@/lib/mongoose";
import { auth } from "@/lib/auth";
import ServiceModel from "@/model/service";

export const runtime = "nodejs";
const MAX_SERVICES_PER_OWNER = 3;

const CreateServiceSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  systemPrompt: z.string().optional(),
  allowedOrigins: z.array(z.string().min(1).max(300)).max(50).optional(),
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

function isDuplicateKeyError(err: unknown) {
  return (
    !!err &&
    typeof err === "object" &&
    "code" in err &&
    (err as { code?: number }).code === 11000
  );
}

async function createServiceDoc(input: {
  ownerId: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  systemPrompt?: string;
  allowedOrigins?: string[];
  promptConfig?: Record<string, unknown>;
}) {
  return ServiceModel.create({
    ownerId: input.ownerId,
    name: input.name,
    slug: input.slug,
    description: input.description ?? "",
    systemPrompt: input.systemPrompt ?? "",
    allowedOrigins: input.allowedOrigins ?? [],
    promptConfig: input.promptConfig,
  });
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
        color: s.color,
        systemPrompt: s.systemPrompt,
        allowedOrigins: Array.isArray(s.allowedOrigins) ? s.allowedOrigins : [],
        hasGeminiApiKey:
          typeof (s as { geminiApiKeyEncrypted?: unknown })
            .geminiApiKeyEncrypted === "string" &&
          Boolean(
            (s as { geminiApiKeyEncrypted?: string }).geminiApiKeyEncrypted,
          ),
        geminiApiKeyLast4:
          (s as { geminiApiKeyLast4?: string }).geminiApiKeyLast4 ?? null,
        geminiApiKeyUpdatedAt:
          (s as { geminiApiKeyUpdatedAt?: Date }).geminiApiKeyUpdatedAt ?? null,
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
    const serviceCount = await ServiceModel.countDocuments({
      ownerId: ownerObjectId,
    });

    if (serviceCount >= MAX_SERVICES_PER_OWNER) {
      return NextResponse.json(
        {
          error: `Service limit reached. You can create up to ${MAX_SERVICES_PER_OWNER} services.`,
        },
        { status: 409 },
      );
    }

    const slug = body.slug ? slugify(body.slug) : slugify(body.name);
    if (!slug) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }

    try {
      const service = await createServiceDoc({
        ownerId: ownerObjectId,
        name: body.name,
        slug,
        description: body.description,
        systemPrompt: body.systemPrompt,
        allowedOrigins: body.allowedOrigins,
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
            allowedOrigins: Array.isArray(service.allowedOrigins)
              ? service.allowedOrigins
              : [],
            hasGeminiApiKey:
              typeof service.geminiApiKeyEncrypted === "string" &&
              Boolean(service.geminiApiKeyEncrypted),
            geminiApiKeyLast4: service.geminiApiKeyLast4 ?? null,
            geminiApiKeyUpdatedAt: service.geminiApiKeyUpdatedAt ?? null,
            promptConfig: service.promptConfig,
          },
        },
        { status: 201 },
      );
    } catch (err: unknown) {
      if (!isDuplicateKeyError(err)) {
        throw err;
      }

      const keyPattern =
        err && typeof err === "object" && "keyPattern" in err
          ? ((err as { keyPattern?: Record<string, unknown> }).keyPattern ?? {})
          : {};

      // Backward compatibility: if an old unique ownerId index still exists,
      // remove it and retry once.
      if ("ownerId" in keyPattern) {
        try {
          await ServiceModel.collection.dropIndex("ownerId_1");
        } catch {
          // ignore if index doesn't exist or cannot be dropped in this context
        }

        try {
          const service = await createServiceDoc({
            ownerId: ownerObjectId,
            name: body.name,
            slug,
            description: body.description,
            systemPrompt: body.systemPrompt,
            allowedOrigins: body.allowedOrigins,
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
                allowedOrigins: Array.isArray(service.allowedOrigins)
                  ? service.allowedOrigins
                  : [],
                hasGeminiApiKey:
                  typeof service.geminiApiKeyEncrypted === "string" &&
                  Boolean(service.geminiApiKeyEncrypted),
                geminiApiKeyLast4: service.geminiApiKeyLast4 ?? null,
                geminiApiKeyUpdatedAt: service.geminiApiKeyUpdatedAt ?? null,
                promptConfig: service.promptConfig,
              },
            },
            { status: 201 },
          );
        } catch (retryErr: unknown) {
          if (isDuplicateKeyError(retryErr)) {
            return NextResponse.json(
              { error: "Slug is already taken" },
              { status: 409 },
            );
          }
          throw retryErr;
        }
      }

      return NextResponse.json(
        { error: "Slug is already taken" },
        { status: 409 },
      );
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
