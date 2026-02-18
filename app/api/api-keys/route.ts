import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";

import dbConnect from "@/lib/mongoose";
import { auth } from "@/lib/auth";
import ServiceModel from "@/model/service";
import ApiKeyModel from "@/model/apiKey";
import { decryptApiKey, encryptApiKey, generateApiKey } from "@/lib/api-keys";
import ApiKeyUsageModel from "@/model/apiKeyUsage";

export const runtime = "nodejs";

const CreateApiKeySchema = z.object({
  serviceId: z.string().min(1),
  name: z.string().min(1).max(80),
});

function minuteStartUtc(now: Date) {
  return new Date(Math.floor(now.getTime() / 60000) * 60000);
}

function monthStartUtc(now: Date) {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0),
  );
}

function getServerControlledLimits() {
  const perMinuteRaw = process.env.API_KEY_RATE_LIMIT_PER_MINUTE;
  const monthlyRaw = process.env.API_KEY_MONTHLY_REQUEST_LIMIT;

  const perMinute = perMinuteRaw ? Number(perMinuteRaw) : 60;
  const monthly = monthlyRaw ? Number(monthlyRaw) : 10000;

  return {
    rateLimitPerMinute:
      Number.isFinite(perMinute) && perMinute > 0 ? perMinute : 60,
    monthlyRequestLimit:
      Number.isFinite(monthly) && monthly > 0 ? monthly : 10000,
  };
}

function requireObjectId(id: string, label: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ${label}`);
  }
  return new mongoose.Types.ObjectId(id);
}

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
    const serviceIdParam = url.searchParams.get("serviceId");
    const includeUsage = url.searchParams.get("includeUsage") === "true";

    await dbConnect();

    const ownerObjectId = new mongoose.Types.ObjectId(userId);

    const filter: Record<string, unknown> = { ownerId: ownerObjectId };
    if (serviceIdParam) {
      if (!mongoose.Types.ObjectId.isValid(serviceIdParam)) {
        return NextResponse.json(
          { error: "Invalid serviceId" },
          { status: 400 },
        );
      }
      filter.serviceId = new mongoose.Types.ObjectId(serviceIdParam);
    }

    const keys = await ApiKeyModel.find(filter)
      .sort({ createdAt: -1 })
      .select(
        "_id serviceId name encryptedKey prefix last4 rateLimitPerMinute monthlyRequestLimit revokedAt lastUsedAt createdAt updatedAt",
      )
      .lean();

    let usageByKeyId:
      | Record<
          string,
          {
            minute?: { windowStart: string; count: number };
            month?: { windowStart: string; count: number };
          }
        >
      | undefined;

    if (includeUsage && keys.length > 0) {
      const now = new Date();
      const minuteWindowStart = minuteStartUtc(now);
      const monthWindowStart = monthStartUtc(now);

      const keyObjectIds = keys.map(
        (k) => k._id as unknown as mongoose.Types.ObjectId,
      );

      const [minuteDocs, monthDocs] = await Promise.all([
        ApiKeyUsageModel.find({
          apiKeyId: { $in: keyObjectIds },
          kind: "minute",
          windowStart: minuteWindowStart,
        })
          .select("apiKeyId windowStart count")
          .lean(),
        ApiKeyUsageModel.find({
          apiKeyId: { $in: keyObjectIds },
          kind: "month",
          windowStart: monthWindowStart,
        })
          .select("apiKeyId windowStart count")
          .lean(),
      ]);

      usageByKeyId = {};

      for (const d of minuteDocs) {
        const id = (
          d as { apiKeyId: mongoose.Types.ObjectId }
        ).apiKeyId.toString();
        usageByKeyId[id] = usageByKeyId[id] ?? {};
        usageByKeyId[id].minute = {
          windowStart: (d as { windowStart: Date }).windowStart.toISOString(),
          count: (d as { count: number }).count,
        };
      }

      for (const d of monthDocs) {
        const id = (
          d as { apiKeyId: mongoose.Types.ObjectId }
        ).apiKeyId.toString();
        usageByKeyId[id] = usageByKeyId[id] ?? {};
        usageByKeyId[id].month = {
          windowStart: (d as { windowStart: Date }).windowStart.toISOString(),
          count: (d as { count: number }).count,
        };
      }
    }

    return NextResponse.json({
      apiKeys: keys.map((k) => ({
        id: k._id.toString(),
        serviceId: (
          k as { serviceId: mongoose.Types.ObjectId }
        ).serviceId.toString(),
        name: (k as { name: string }).name,
        apiKey: decryptApiKey((k as { encryptedKey?: string }).encryptedKey),
        prefix: (k as { prefix: string }).prefix,
        last4: (k as { last4: string }).last4,
        rateLimitPerMinute: (k as { rateLimitPerMinute?: number })
          .rateLimitPerMinute,
        monthlyRequestLimit: (k as { monthlyRequestLimit?: number })
          .monthlyRequestLimit,
        revokedAt: (k as { revokedAt?: Date }).revokedAt,
        lastUsedAt: (k as { lastUsedAt?: Date }).lastUsedAt,
        createdAt: k.createdAt,
        updatedAt: k.updatedAt,
        usage: usageByKeyId
          ? (usageByKeyId[k._id.toString()] ?? {})
          : undefined,
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
    const body = CreateApiKeySchema.parse(json);

    await dbConnect();

    const ownerObjectId = new mongoose.Types.ObjectId(userId);
    const serviceObjectId = requireObjectId(body.serviceId, "serviceId");

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

    const { apiKey, keyHash, prefix, last4 } = generateApiKey();
    const encryptedKey = encryptApiKey(apiKey);
    const limits = getServerControlledLimits();

    try {
      const created = await ApiKeyModel.create({
        ownerId: ownerObjectId,
        serviceId: serviceObjectId,
        name: body.name.trim(),
        keyHash,
        encryptedKey,
        prefix,
        last4,
        rateLimitPerMinute: limits.rateLimitPerMinute,
        monthlyRequestLimit: limits.monthlyRequestLimit,
      });

      return NextResponse.json(
        {
          apiKey,
          apiKeyMeta: {
            id: created._id.toString(),
            serviceId: created.serviceId.toString(),
            name: created.name,
            prefix: created.prefix,
            last4: created.last4,
            rateLimitPerMinute: created.rateLimitPerMinute,
            monthlyRequestLimit: created.monthlyRequestLimit,
            revokedAt: created.revokedAt,
            lastUsedAt: created.lastUsedAt,
            createdAt: created.createdAt,
            updatedAt: created.updatedAt,
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
          { error: "Please retry: API key collision" },
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
