import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IRagChunks extends Document {
  documentId: Types.ObjectId;
  serviceId: Types.ObjectId;
  chunkText: string;
  index: number;
  embedding: Types.Array<number>;
  createdAt: Date;
  updatedAt: Date;
}

const RagChunksSchema: Schema<IRagChunks> = new Schema<IRagChunks>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: "KnowledgeDocument",
      required: true,
    },
    serviceId: { type: Schema.Types.ObjectId, ref: "Service", required: true },
    chunkText: { type: String, required: true },
    index: { type: Number, required: true },
    embedding: { type: [Number], required: true },
  },
  { timestamps: true },
);

RagChunksSchema.index({ docName: 1, index: 1 }, { unique: true });

const RagChunks: Model<IRagChunks> =
  mongoose.models.RagChunks ||
  mongoose.model<IRagChunks>("RagChunks", RagChunksSchema);

export default RagChunks;
