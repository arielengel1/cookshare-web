import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import postRoutes from '../src/routes/postRoutes';
import User from '../src/models/User';
import Post from '../src/models/Post';
import Comment from '../src/models/Comment';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
app.use('/api/posts', postRoutes);

describe('Comment API Unit Tests', () => {
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
    await Comment.deleteMany();

    const user = new User({ email: 'test@test.com', password: 'password', name: 'Test User' });
    await user.save();
    userId = user._id.toString();
    token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const post = new Post({ author: userId, text: 'Post for comments' });
    await post.save();
    postId = post._id.toString();
  });

  it('should add a comment to a post', async () => {
    const res = await request(app)
      .post(`/api/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'Nice recipe!' });
    
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('text', 'Nice recipe!');
  });
});
