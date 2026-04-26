import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import postRoutes from '../src/routes/postRoutes';
import likeRoutes from '../src/routes/likeRoutes';
import User from '../src/models/User';
import Post from '../src/models/Post';
import Like from '../src/models/Like';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
app.use('/api/posts', postRoutes);
app.use('/api/posts/:postId/likes', likeRoutes);

describe('Like API Unit Tests', () => {
  let token: string;
  let userId: string;
  let postId: string;

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

    const post = new Post({ author: userId, text: 'Post to like' });
    await post.save();
    postId = post._id.toString();
  });

  it('should toggle like on a post', async () => {
    const res = await request(app)
      .post(`/api/posts/${postId}/likes`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('liked', true);
  });
});
