import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import likeRoutes from '../src/routes/likeRoutes';
import User from '../src/models/User';
import Post from '../src/models/Post';
import Like from '../src/models/Like';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
app.use('/api/posts/:postId/likes', likeRoutes);

describe('Like Controller - Full Coverage', () => {
  let token: string;
  let userId: string;
  let postId: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'secret';
    await mongoose.connect('mongodb://127.0.0.1:27017/cookshare_test');
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany();
    await Post.deleteMany();
    await Like.deleteMany();
    jest.restoreAllMocks();

    const user = new User({ email: 'test@test.com', password: 'password', name: 'Test User' });
    await user.save();
    userId = user._id.toString();
    token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET as string, { expiresIn: '1h' });

    const post = new Post({ author: userId, text: 'Post to like' });
    await post.save();
    postId = post._id.toString();
  });

  // ===== TOGGLE LIKE =====
  describe('POST /api/posts/:postId/likes', () => {
    it('should like a post (200)', async () => {
      const res = await request(app)
        .post(`/api/posts/${postId}/likes`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('liked', true);
      expect(res.body.message).toBe('Liked successfully');

      const post = await Post.findById(postId);
      expect(post?.likesCount).toBe(1);
    });

    it('should unlike a previously liked post (200)', async () => {
      // First like
      await Like.create({ postId, userId });
      await Post.findByIdAndUpdate(postId, { $inc: { likesCount: 1 } });

      // Then unlike
      const res = await request(app)
        .post(`/api/posts/${postId}/likes`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('liked', false);
      expect(res.body.message).toBe('Unliked successfully');

      const post = await Post.findById(postId);
      expect(post?.likesCount).toBe(0);
    });

    it('should handle server error (500)', async () => {
      jest.spyOn(Like, 'findOne').mockRejectedValueOnce(new Error('DB error'));
      const res = await request(app)
        .post(`/api/posts/${postId}/likes`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(500);
    });
  });

  // ===== CHECK LIKE STATUS =====
  describe('GET /api/posts/:postId/likes/status', () => {
    it('should return liked: true when post is liked (200)', async () => {
      await Like.create({ postId, userId });

      const res = await request(app)
        .get(`/api/posts/${postId}/likes/status`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('liked', true);
    });

    it('should return liked: false when post is not liked (200)', async () => {
      const res = await request(app)
        .get(`/api/posts/${postId}/likes/status`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('liked', false);
    });

    it('should handle server error (500)', async () => {
      jest.spyOn(Like, 'findOne').mockRejectedValueOnce(new Error('DB error'));
      const res = await request(app)
        .get(`/api/posts/${postId}/likes/status`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(500);
    });
  });
});
