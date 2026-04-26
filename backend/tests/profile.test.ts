import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import profileRoutes from '../src/routes/profileRoutes';
import User from '../src/models/User';
import Post from '../src/models/Post';
import Like from '../src/models/Like';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
app.use('/api/profile', profileRoutes);

describe('Profile API Unit Tests', () => {
  let token: string;
  let userId: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'secret';
    process.env.GEMINI_API_KEY = 'test_key';
    const url = `mongodb://127.0.0.1:27017/cookshare_test`;
    await mongoose.connect(url);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany();
    await Post.deleteMany();
    await Like.deleteMany();

    const user = new User({ email: 'test@test.com', password: 'password', name: 'Test User' });
    await user.save();
    userId = user._id.toString();
    token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
  });

  it('should fetch liked posts', async () => {
    const res = await request(app)
      .get(`/api/profile/${userId}/liked-posts`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
  });

  it('should fetch user posts', async () => {
    const res = await request(app)
      .get(`/api/profile/${userId}/posts`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
  });
});
