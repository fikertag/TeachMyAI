import mongoose, { Schema, Document, Model, Types } from "mongoose";

interface IApiKey extends Document {
  name: string;
  serviceId: Types.ObjectId;
  ownerId: Types.ObjectId;
  keyHash: string;
  prefix: string;
  last4: string;
  rateLimitPerMinute?: number;
  monthlyRequestLimit?: number;
  revokedAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema: Schema<IApiKey> = new Schema(
  {
    serviceId: { type: Schema.Types.ObjectId, ref: "Service", required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    keyHash: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    prefix: { type: String, required: true },
    last4: { type: String, required: true },
    rateLimitPerMinute: { type: Number, default: undefined },
    monthlyRequestLimit: { type: Number, default: undefined },
    revokedAt: { type: Date, default: undefined },
    lastUsedAt: { type: Date, default: undefined },
  },
  { timestamps: true },
);

ApiKeySchema.index({ ownerId: 1, serviceId: 1 });

const ApiKeyModel: Model<IApiKey> =
  mongoose.models.ApiKey || mongoose.model<IApiKey>("ApiKey", ApiKeySchema);

export default ApiKeyModel;
