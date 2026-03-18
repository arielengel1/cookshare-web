import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password?: string;
  name: string;
  profilePic?: string;
  googleId?: string;
  facebookId?: string;
  refreshToken?: string;
}

const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  password: { type: String },
  name: { type: String, required: true },
  profilePic: { type: String },
  googleId: { type: String },
  facebookId: { type: String },
  refreshToken: { type: String },
});

export default mongoose.model<IUser>('User', userSchema);
