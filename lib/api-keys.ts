import crypto from "crypto";
import mongoose from "mongoose";

import dbConnect from "@/lib/mongoose";
import ApiKeyModel from "@/model/apiKey";
import ApiKeyUsageModel from "@/model/apiKeyUsage";

export type ApiKeyAuthResult =
  | {
      ok: true;
      apiKeyId: string;
      serviceId: string;
      ownerId: string;
      name: string;
      rateLimitPerMinute?: number;
      monthlyRequestLimit?: number;
    }
  | { ok: false; status: number; error: string };

function base64Url(bytes: Buffer) {
  return bytes
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function generateApiKey(): {
  apiKey: string;
  keyHash: string;
  prefix: string;
  last4: string;
} {
  const random = base64Url(crypto.randomBytes(32));
  const apiKey = `tmai_${random}`;
  const keyHash = hashApiKey(apiKey);
  const prefix = apiKey.slice(0, 12);
  const last4 = apiKey.slice(-4);
  return { apiKey, keyHash, prefix, last4 };
}

export function hashApiKey(apiKey: string) {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

export function getApiKeyFromHeaders(headers: Headers): string | null {
  const direct = headers.get("x-api-key")?.trim();
  if (direct) return direct;

  const auth = headers.get("authorization")?.trim();
  if (!auth) return null;

  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function minuteStartUtc(now: Date) {
  return new Date(Math.floor(now.getTime() / 60000) * 60000);
}

function monthStartUtc(now: Date) {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0),
  );
}

async function consumeWindow(params: {
  apiKeyObjectId: mongoose.Types.ObjectId;
  kind: "minute" | "month";
  windowStart: Date;
  limit: number;
  expiresAt: Date;
}) {
  const { apiKeyObjectId, kind, windowStart, limit, expiresAt } = params;

  if (!Number.isFinite(limit) || limit <= 0) {
    return { ok: false as const, status: 429, error: "API key limit reached" };
  }

  const doc = await ApiKeyUsageModel.findOneAndUpdate(
    {
      apiKeyId: apiKeyObjectId,
      kind,
      windowStart,
      $or: [{ count: { $lt: limit } }, { count: { $exists: false } }],
    },
    {
      $inc: { count: 1 },
      $setOnInsert: {
        apiKeyId: apiKeyObjectId,
        kind,
        windowStart,
        expiresAt,
      },
    },
    { upsert: true, new: true },
  ).lean();

  if (!doc) {
    return { ok: false as const, status: 429, error: "API key limit reached" };
  }

  return { ok: true as const };
}

export async function authenticateAndConsumeApiKey(params: {
  apiKey: string;
}): Promise<ApiKeyAuthResult> {
  const { apiKey } = params;
  const trimmed = apiKey.trim();

  if (!trimmed || !trimmed.startsWith("tmai_")) {
    return { ok: false, status: 401, error: "Missing or invalid API key" };
  }

  await dbConnect();

  const keyHash = hashApiKey(trimmed);

  const keyDoc = await ApiKeyModel.findOne({ keyHash })
    .select(
      "_id serviceId ownerId name revokedAt rateLimitPerMinute monthlyRequestLimit",
    )
    .lean();

  if (!keyDoc) {
    return { ok: false, status: 401, error: "Invalid API key" };
  }

  if ((keyDoc as { revokedAt?: Date | null }).revokedAt) {
    return { ok: false, status: 401, error: "API key revoked" };
  }

  const now = new Date();

  const rateLimitPerMinute = (keyDoc as { rateLimitPerMinute?: number })
    .rateLimitPerMinute;
  const monthlyRequestLimit = (keyDoc as { monthlyRequestLimit?: number })
    .monthlyRequestLimit;

  const apiKeyObjectId = keyDoc._id as unknown as mongoose.Types.ObjectId;

  if (typeof rateLimitPerMinute === "number") {
    const windowStart = minuteStartUtc(now);
    const expiresAt = new Date(windowStart.getTime() + 2 * 60 * 60 * 1000);

    const res = await consumeWindow({
      apiKeyObjectId,
      kind: "minute",
      windowStart,
      limit: rateLimitPerMinute,
      expiresAt,
    });

    if (!res.ok) return { ok: false, status: res.status, error: res.error };
  }

  if (typeof monthlyRequestLimit === "number") {
    const windowStart = monthStartUtc(now);
    const expiresAt = new Date(
      Date.UTC(
        windowStart.getUTCFullYear(),
        windowStart.getUTCMonth() + 2,
        1,
        0,
        0,
        0,
      ),
    );

    const res = await consumeWindow({
      apiKeyObjectId,
      kind: "month",
      windowStart,
      limit: monthlyRequestLimit,
      expiresAt,
    });

    if (!res.ok) return { ok: false, status: res.status, error: res.error };
  }

  await ApiKeyModel.updateOne(
    { _id: apiKeyObjectId },
    { $set: { lastUsedAt: now } },
  );

  return {
    ok: true,
    apiKeyId: keyDoc._id.toString(),
    serviceId: (
      keyDoc as { serviceId: mongoose.Types.ObjectId }
    ).serviceId.toString(),
    ownerId: (
      keyDoc as { ownerId: mongoose.Types.ObjectId }
    ).ownerId.toString(),
    name: (keyDoc as { name: string }).name,
    rateLimitPerMinute:
      typeof rateLimitPerMinute === "number" ? rateLimitPerMinute : undefined,
    monthlyRequestLimit:
      typeof monthlyRequestLimit === "number" ? monthlyRequestLimit : undefined,
  };
}
