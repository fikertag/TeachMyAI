import mongoose, { Schema, Document, Model, Types } from "mongoose";

interface IService extends Document {
  ownerId: Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  systemPrompt: string;
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
  },
  { timestamps: true },
);

const ServiceModel: Model<IService> =
  mongoose.models.Service || mongoose.model<IService>("Service", StoreSchema);

export default ServiceModel;
