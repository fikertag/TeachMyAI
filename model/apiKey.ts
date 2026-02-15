import mongoose, { Schema, Document, Model, Types } from "mongoose";

interface IApiKey extends Document {
  name: string;
  serviceId: Types.ObjectId;
  keyHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema: Schema<IApiKey> = new Schema(
  {
    serviceId: { type: Schema.Types.ObjectId, ref: "Service", required: true },
    keyHash: { type: String, required: true, unique: true },
    name: { type: String, required: true },
  },
  { timestamps: true },
);

const ApiKeyModel: Model<IApiKey> =
  mongoose.models.ApiKey || mongoose.model<IApiKey>("ApiKey", ApiKeySchema);

export default ApiKeyModel;
