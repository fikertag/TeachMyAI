import mongoose, { Schema, Document, Model, Types } from "mongoose";

interface IApiKey extends Document {
  serviceId: Types.ObjectId;
  title: string;
  content: string;
  sourceType: string;
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema: Schema<IApiKey> = new Schema(
  {
    serviceId: { type: Schema.Types.ObjectId, ref: "Service", required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    sourceType: { type: String, required: true },
  },
  { timestamps: true },
);

const ApiKeyModel: Model<IApiKey> =
  mongoose.models.ApiKey || mongoose.model<IApiKey>("ApiKey", ApiKeySchema);

export default ApiKeyModel;
