import mongoose, { Document, Schema } from 'mongoose';

export interface IChunk extends Document {
  docId: string;
  chunkIndex: number;
  text: string;
  embedding: number[];
  metadata?: any;
}

const chunkSchema = new Schema<IChunk>({
  docId: { type: String, required: true, index: true },
  chunkIndex: { type: Number, required: true },
  text: { type: String, required: true },
  embedding: { type: [Number], required: false },
  metadata: { type: mongoose.Schema.Types.Mixed, required: false },
});

export default mongoose.model<IChunk>('Chunk', chunkSchema);
