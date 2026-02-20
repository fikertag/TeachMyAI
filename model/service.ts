import mongoose, { Schema, Document, Model, Types } from "mongoose";

interface IService extends Document {
  ownerId: Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  systemPrompt: string;
  allowedOrigins?: string[];
  geminiApiKeyEncrypted?: string;
  geminiApiKeyLast4?: string;
  geminiApiKeyUpdatedAt?: Date;
  promptConfig?: Record<string, unknown>;
  color?: string;
  quickPrompts?: Array<{
    title: string;
    prompt: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const StoreSchema: Schema<IService> = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    systemPrompt: { type: String, default: "" },
    allowedOrigins: { type: [String], default: [] },
    geminiApiKeyEncrypted: { type: String, default: undefined },
    geminiApiKeyLast4: { type: String, default: undefined },
    geminiApiKeyUpdatedAt: { type: Date, default: undefined },
    promptConfig: { type: Schema.Types.Mixed, default: undefined },
    color: { type: String },
    quickPrompts: {
      type: [
        {
          title: { type: String, required: true },
          prompt: { type: String, required: true },
        },
      ],
      default: [
        {
          title: "Get started",
          prompt: "Tell me more about this service",
        },
        {
          title: "Explore capabilities",
          prompt: "What can you help me with?",
        },
        {
          title: "Ask a question",
          prompt: "I have a specific question",
        },
      ],
    },
  },
  { timestamps: true },
);

StoreSchema.index({ ownerId: 1, createdAt: -1 });

const ServiceModel: Model<IService> =
  mongoose.models.Service || mongoose.model<IService>("Service", StoreSchema);

export default ServiceModel;
