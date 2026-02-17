import mongoose, { Schema, Document, Model, Types } from "mongoose";

type WindowKind = "minute" | "month";

interface IApiKeyUsage extends Document {
  apiKeyId: Types.ObjectId;
  kind: WindowKind;
  windowStart: Date;
  count: number;
  expiresAt: Date;
}

const ApiKeyUsageSchema: Schema<IApiKeyUsage> = new Schema(
  {
    apiKeyId: { type: Schema.Types.ObjectId, ref: "ApiKey", required: true },
    kind: { type: String, enum: ["minute", "month"], required: true },
    windowStart: { type: Date, required: true },
    count: { type: Number, required: true, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

ApiKeyUsageSchema.index(
  { apiKeyId: 1, kind: 1, windowStart: 1 },
  { unique: true },
);
ApiKeyUsageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const ApiKeyUsageModel: Model<IApiKeyUsage> =
  mongoose.models.ApiKeyUsage ||
  mongoose.model<IApiKeyUsage>("ApiKeyUsage", ApiKeyUsageSchema);

export default ApiKeyUsageModel;
