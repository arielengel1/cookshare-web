import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import postRoutes from '../src/routes/postRoutes';
import User from '../src/models/User';
import Post from '../src/models/Post';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
app.use('/api/posts', postRoutes);

describe('Post API Unit Tests', () => {
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

    const user = new User({ email: 'test@test.com', password: 'password', name: 'Test User' });
    await user.save();
    userId = user._id.toString();
    token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
  });

  it('should create a new post', async () => {
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'A wild recipe appears' });
    console.log("POST RES:", res.body);
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('text', 'A wild recipe appears');
  });

  it('should fetch feed posts', async () => {
    const post = new Post({ author: userId, text: 'Feed me' });
    await post.save();

    const res = await request(app)
      .get('/api/posts/feed')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('isLiked', false);
  });
});
