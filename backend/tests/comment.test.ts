import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import commentRoutes from '../src/routes/commentRoutes';
import User from '../src/models/User';
import Post from '../src/models/Post';
import Comment from '../src/models/Comment';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
app.use('/api/posts/:postId/comments', commentRoutes);

describe('Comment Controller - Full Coverage', () => {
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
    await Comment.deleteMany();
    jest.restoreAllMocks();

    const user = new User({ email: 'test@test.com', password: 'password', name: 'Test User' });
    await user.save();
    userId = user._id.toString();
    token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET as string, { expiresIn: '1h' });

    const post = new Post({ author: userId, text: 'Post for comments' });
    await post.save();
    postId = post._id.toString();
  });

  // ===== ADD COMMENT =====
  describe('POST /api/posts/:postId/comments', () => {
    it('should add a comment to a post (201)', async () => {
      const res = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'Nice recipe!' });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('text', 'Nice recipe!');
      expect(res.body).toHaveProperty('author');
    });

    it('should reject comment without text (400)', async () => {
      const res = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Comment text is required');
    });

    it('should increment post commentsCount', async () => {
      await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'Comment 1' });
      const post = await Post.findById(postId);
      expect(post?.commentsCount).toBe(1);
    });

    it('should handle server error (500)', async () => {
      jest.spyOn(Comment.prototype, 'save').mockRejectedValueOnce(new Error('DB error'));
      const res = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'Fail' });
      expect(res.status).toBe(500);
    });
  });

  // ===== GET COMMENTS =====
  describe('GET /api/posts/:postId/comments', () => {
    it('should fetch comments for a post (200)', async () => {
      await Comment.create({ postId, author: userId, text: 'Comment A' });
      await Comment.create({ postId, author: userId, text: 'Comment B' });

      const res = await request(app)
        .get(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
    });

    it('should return empty array when no comments (200)', async () => {
      const res = await request(app)
        .get(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should handle server error (500)', async () => {
      jest.spyOn(Comment, 'find').mockReturnValue({
        sort: jest.fn().mockReturnValue({
          populate: jest.fn().mockRejectedValue(new Error('DB error')),
        }),
      } as any);
      const res = await request(app)
        .get(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(500);
    });
  });
});
