import mongoose, { Document, Schema } from 'mongoose';

export interface IPost extends Document {
  author: mongoose.Types.ObjectId;
  title?: string;
  description?: string;
  ingredients?: string;
  instructions?: string;
  text?: string;
  image?: string;
  likesCount: number;
  commentsCount: number;
  createdAt: Date;
}

const postSchema = new Schema<IPost>({
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String },
  description: { type: String },
  ingredients: { type: String },
  instructions: { type: String },
  text: { type: String },
  image: { type: String },
  likesCount: { type: Number, default: 0 },
  commentsCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IPost>('Post', postSchema);
