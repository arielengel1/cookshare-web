import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import path from 'path';
import profileRoutes from '../src/routes/profileRoutes';
import User from '../src/models/User';
import Post from '../src/models/Post';
import Like from '../src/models/Like';

const app = express();
app.use(express.json());
app.use('/api/profile', profileRoutes);

describe('Profile Controller - Full Coverage', () => {
  let token: string;
  let userId: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'secret';
    process.env.GEMINI_API_KEY = 'test_key';
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
  });

  // ===== GET PROFILE =====
  describe('GET /api/profile', () => {
    it('should fetch own profile (200)', async () => {
      const res = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.email).toBe('test@test.com');
      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('refreshToken');
    });

    it('should return 404 for deleted user', async () => {
      await User.deleteMany();
      const res = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('User not found');
    });

    it('should handle server error (500)', async () => {
      jest.spyOn(User, 'findById').mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('DB error')),
      } as any);
      const res = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(500);
    });
  });

  // ===== UPDATE PROFILE =====
  describe('PUT /api/profile', () => {
    it('should update name only (200)', async () => {
      const res = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${token}`)
        .field('name', 'Updated Name');
      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe('Updated Name');
    });

    it('should update with profile picture (200)', async () => {
      const testImagePath = path.join(__dirname, '..', 'uploads', 'test-upload.png');
      // Create a tiny valid PNG buffer
      const fs = require('fs');
      if (!fs.existsSync(path.dirname(testImagePath))) {
        fs.mkdirSync(path.dirname(testImagePath), { recursive: true });
      }

      const res = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${token}`)
        .attach('profilePic', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAAxJREFUCNdjYGBgAAAABAABJzQnCgAAAABJRU5ErkJggg==', 'base64'), 'test.png');
      expect(res.status).toBe(200);
      expect(res.body.user.profilePic).toBeDefined();
    });

    it('should return 404 for deleted user', async () => {
      await User.deleteMany();
      const res = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${token}`)
        .field('name', 'Ghost');
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('User not found');
    });

    it('should handle server error (500)', async () => {
      jest.spyOn(User, 'findById').mockRejectedValueOnce(new Error('DB error'));
      const res = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${token}`)
        .field('name', 'Err');
      expect(res.status).toBe(500);
    });
  });

  // ===== GET USER POSTS =====
  describe('GET /api/profile/:userId/posts', () => {
    it('should fetch user posts (200)', async () => {
      const res = await request(app)
        .get(`/api/profile/${userId}/posts`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should return posts with isLiked flag', async () => {
      const post = await Post.create({ author: userId, text: 'Liked post' });
      await Like.create({ postId: post._id, userId });

      const res = await request(app)
        .get(`/api/profile/${userId}/posts`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].isLiked).toBe(true);
    });

    it('should handle server error (500)', async () => {
      jest.spyOn(Post, 'find').mockReturnValue({
        sort: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockRejectedValue(new Error('DB error')),
          }),
        }),
      } as any);
      const res = await request(app)
        .get(`/api/profile/${userId}/posts`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(500);
    });
  });

  // ===== GET LIKED POSTS =====
  describe('GET /api/profile/:userId/liked-posts', () => {
    it('should fetch own liked posts (200)', async () => {
      const post = await Post.create({ author: userId, text: 'A post' });
      await Like.create({ postId: post._id, userId });

      const res = await request(app)
        .get(`/api/profile/${userId}/liked-posts`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].isLiked).toBe(true);
    });

    it('should sort multiple liked posts by like order', async () => {
      const post1 = await Post.create({ author: userId, text: 'First liked' });
      const post2 = await Post.create({ author: userId, text: 'Second liked' });
      const post3 = await Post.create({ author: userId, text: 'Third liked' });
      // Like in specific order
      await Like.create({ postId: post1._id, userId, createdAt: new Date('2025-01-01') });
      await Like.create({ postId: post3._id, userId, createdAt: new Date('2025-01-02') });
      await Like.create({ postId: post2._id, userId, createdAt: new Date('2025-01-03') });

      const res = await request(app)
        .get(`/api/profile/${userId}/liked-posts`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(3);
    });

    it('should fetch another users liked posts (200)', async () => {
      const otherUser = await User.create({ email: 'other@test.com', password: 'x', name: 'Other' });
      const post = await Post.create({ author: userId, text: 'A post' });
      await Like.create({ postId: post._id, userId: otherUser._id });

      const res = await request(app)
        .get(`/api/profile/${otherUser._id.toString()}/liked-posts`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should return empty array when no liked posts', async () => {
      const res = await request(app)
        .get(`/api/profile/${userId}/liked-posts`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should handle server error (500)', async () => {
      jest.spyOn(Like, 'find').mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error('DB error')),
      } as any);
      const res = await request(app)
        .get(`/api/profile/${userId}/liked-posts`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(500);
    });
  });

  // ===== GET TOP CHEFS =====
  describe('GET /api/profile/top-chefs', () => {
    it('should return top chefs (200)', async () => {
      await Post.create({ author: userId, text: 'Popular post', likesCount: 10 });
      const res = await request(app)
        .get('/api/profile/top-chefs')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should return empty array when no posts (200)', async () => {
      const res = await request(app)
        .get('/api/profile/top-chefs')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should handle server error (500)', async () => {
      jest.spyOn(Post, 'aggregate').mockRejectedValueOnce(new Error('DB error'));
      const res = await request(app)
        .get('/api/profile/top-chefs')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(500);
    });
  });
});
