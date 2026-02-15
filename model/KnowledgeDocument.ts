import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IKnowledgeDocument extends Document {
  serviceId: Types.ObjectId;
  title: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

const KnowledgeDocumentSchema: Schema<IKnowledgeDocument> =
  new Schema<IKnowledgeDocument>(
    {
      serviceId: {
        type: Schema.Types.ObjectId,
        ref: "Service",
        required: true,
      },
      title: { type: String, required: true },
      source: { type: String, default: "api" },
    },
    { timestamps: true },
  );

KnowledgeDocumentSchema.index({ serviceId: 1, createdAt: -1 });

const KnowledgeDocumentModel: Model<IKnowledgeDocument> =
  mongoose.models.KnowledgeDocument ||
  mongoose.model<IKnowledgeDocument>(
    "KnowledgeDocument",
    KnowledgeDocumentSchema,
  );

export default KnowledgeDocumentModel;
