import mongoose, { Schema, Document, Model, Types } from "mongoose";

interface IService extends Document {
  ownerId: Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  systemPrompt: string;
  promptConfig?: Record<string, unknown>;
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
    promptConfig: { type: Schema.Types.Mixed, default: undefined },
  },
  { timestamps: true },
);

StoreSchema.index({ ownerId: 1, createdAt: -1 });

const ServiceModel: Model<IService> =
  mongoose.models.Service || mongoose.model<IService>("Service", StoreSchema);

export default ServiceModel;
