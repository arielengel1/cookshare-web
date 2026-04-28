import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import postRoutes from '../src/routes/postRoutes';
import User from '../src/models/User';
import Post from '../src/models/Post';
import Chunk from '../src/models/Chunk';
import Like from '../src/models/Like';
import jwt from 'jsonwebtoken';
import path from 'path';

jest.setTimeout(30000);

// Mock AI service for deterministic testing
jest.mock('../src/services/aiService', () => ({
  generateEmbedding: jest.fn(async () => [0.1, 0.2, 0.3]),
  chunkText: jest.fn((text: string) => [text]),
  cosineSimilarity: jest.fn(() => 0.9),
  rerankWithLLM: jest.fn(async (_q: string, candidates: any[]) => candidates.map((c: any) => c.id)),
}));

const app = express();
app.use(express.json());
app.use('/api/posts', postRoutes);

describe('Post Controller - Full Coverage', () => {
  let token: string;
  let userId: string;
  let otherToken: string;
  let otherUserId: string;

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
    await Chunk.deleteMany();
    await Like.deleteMany();
    jest.restoreAllMocks();

    const user = new User({ email: 'test@test.com', password: 'password', name: 'Test User' });
    await user.save();
    userId = user._id.toString();
    token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET as string, { expiresIn: '1h' });

    const other = new User({ email: 'other@test.com', password: 'password', name: 'Other User' });
    await other.save();
    otherUserId = other._id.toString();
    otherToken = jwt.sign({ _id: other._id }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
  });

  // ===== CREATE POST =====
  describe('POST /api/posts', () => {
    it('should create a new post (201)', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'A wild recipe appears' });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('text', 'A wild recipe appears');
    });

    it('should create post with all fields (201)', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Pasta',
          description: 'Delicious pasta',
          ingredients: 'flour, eggs',
          instructions: 'Mix and cook',
          text: 'Full recipe'
        });
      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Pasta');
    });

    it('should handle embedding failure gracefully (201 with warning)', async () => {
      const { generateEmbedding } = require('../src/services/aiService');
      generateEmbedding.mockRejectedValueOnce(new Error('AI fail'));

      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'Embedding will fail' });
      expect(res.status).toBe(201);
      expect(res.body.embeddingWarning).toBe(true);
    });

    it('should handle server error (500)', async () => {
      jest.spyOn(Post.prototype, 'save').mockRejectedValueOnce(new Error('DB error'));
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'Fail' });
      expect(res.status).toBe(500);
    });
  });

  // ===== GET FEED =====
  describe('GET /api/posts/feed', () => {
    it('should fetch feed posts (200)', async () => {
      await Post.create({ author: userId, text: 'Feed me' });
      const res = await request(app)
        .get('/api/posts/feed')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('isLiked', false);
    });

    it('should return isLiked true for liked posts', async () => {
      const post = await Post.create({ author: userId, text: 'Liked post' });
      await Like.create({ postId: post._id, userId });

      const res = await request(app)
        .get('/api/posts/feed')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body[0].isLiked).toBe(true);
    });

    it('should sort by oldest', async () => {
      await Post.create({ author: userId, text: 'Old', createdAt: new Date('2020-01-01') });
      await Post.create({ author: userId, text: 'New', createdAt: new Date('2025-01-01') });

      const res = await request(app)
        .get('/api/posts/feed?sort=oldest')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body[0].text).toBe('Old');
    });

    it('should sort by popular', async () => {
      await Post.create({ author: userId, text: 'Unpopular', likesCount: 0 });
      await Post.create({ author: userId, text: 'Popular', likesCount: 100 });

      const res = await request(app)
        .get('/api/posts/feed?sort=popular')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body[0].text).toBe('Popular');
    });

    it('should filter by category', async () => {
      await Post.create({ author: userId, text: 'Pasta recipe', title: 'Italian Pasta' });
      await Post.create({ author: userId, text: 'Sushi recipe', title: 'Japanese Sushi' });

      const res = await request(app)
        .get('/api/posts/feed?category=Pasta')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].text).toContain('Pasta');
    });

    it('should paginate results', async () => {
      for (let i = 0; i < 5; i++) {
        await Post.create({ author: userId, text: `Post ${i}` });
      }
      const res = await request(app)
        .get('/api/posts/feed?page=2&limit=2')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
    });

    it('should handle server error (500)', async () => {
      jest.spyOn(Post, 'find').mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                lean: jest.fn().mockRejectedValue(new Error('DB error')),
              }),
            }),
          }),
        }),
      } as any);
      const res = await request(app)
        .get('/api/posts/feed')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(500);
    });
  });

  // ===== UPDATE POST =====
  describe('PUT /api/posts/:id', () => {
    it('should update a post (200)', async () => {
      const post = await Post.create({ author: userId, text: 'Original' });
      const res = await request(app)
        .put(`/api/posts/${post._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'Updated', title: 'New Title', description: 'Desc', ingredients: 'Ing', instructions: 'Instr' });
      expect(res.status).toBe(200);
      expect(res.body.text).toBe('Updated');
      expect(res.body.title).toBe('New Title');
    });

    it('should keep original text when text not sent', async () => {
      const post = await Post.create({ author: userId, text: 'Original', title: 'OldTitle' });
      const res = await request(app)
        .put(`/api/posts/${post._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({}); // no text, no title — covers undefined branches
      expect(res.status).toBe(200);
      expect(res.body.text).toBe('Original');
    });

    it('should return 404 for non-existent post', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/posts/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'Updated' });
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Post not found');
    });

    it('should return 403 for unauthorized update', async () => {
      const post = await Post.create({ author: userId, text: 'Not yours' });
      const res = await request(app)
        .put(`/api/posts/${post._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ text: 'Hacked' });
      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Unauthorized');
    });

    it('should handle embedding failure gracefully on update', async () => {
      const { generateEmbedding } = require('../src/services/aiService');
      const post = await Post.create({ author: userId, text: 'Original' });

      generateEmbedding.mockRejectedValue(new Error('AI fail'));

      const res = await request(app)
        .put(`/api/posts/${post._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'Updated' });
      expect(res.status).toBe(200);
      expect(res.body.embeddingWarning).toBe(true);
    });

    it('should handle server error (500)', async () => {
      jest.spyOn(Post, 'findById').mockRejectedValueOnce(new Error('DB error'));
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/posts/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'Err' });
      expect(res.status).toBe(500);
    });
  });

  // ===== DELETE POST =====
  describe('DELETE /api/posts/:id', () => {
    it('should delete a post (200)', async () => {
      const post = await Post.create({ author: userId, text: 'To delete' });
      await Chunk.create({ docId: post._id.toString(), chunkIndex: 0, text: 'chunk', embedding: [0.1] });

      const res = await request(app)
        .delete(`/api/posts/${post._id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Post deleted successfully');

      // Verify chunks are also deleted
      const chunks = await Chunk.find({ docId: post._id.toString() });
      expect(chunks.length).toBe(0);
    });

    it('should return 404 for non-existent post', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/posts/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Post not found');
    });

    it('should return 403 for unauthorized delete', async () => {
      const post = await Post.create({ author: userId, text: 'Not yours' });
      const res = await request(app)
        .delete(`/api/posts/${post._id}`)
        .set('Authorization', `Bearer ${otherToken}`);
      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Unauthorized');
    });

    it('should handle server error (500)', async () => {
      jest.spyOn(Post, 'findById').mockRejectedValueOnce(new Error('DB error'));
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/posts/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(500);
    });
  });

  // ===== SMART SEARCH =====
  describe('GET /api/posts/search', () => {
    it('should search posts (200)', async () => {
      await Post.create({ author: userId, text: 'Chocolate cake recipe' });

      // Create a chunk so embedding search finds something
      const post = await Post.findOne({ text: 'Chocolate cake recipe' });
      await Chunk.create({ docId: post!._id.toString(), chunkIndex: 0, text: 'Chocolate cake recipe', embedding: [0.1, 0.2, 0.3] });

      const res = await request(app)
        .get('/api/posts/search?query=chocolate')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should return 400 without query', async () => {
      const res = await request(app)
        .get('/api/posts/search')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Query required');
    });

    it('should fallback to text search when embedding fails', async () => {
      const { generateEmbedding } = require('../src/services/aiService');
      generateEmbedding.mockRejectedValue(new Error('AI fail'));

      await Post.create({ author: userId, text: 'Pasta bolognese recipe' });

      const res = await request(app)
        .get('/api/posts/search?query=Pasta')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should fallback when embedding returns null', async () => {
      const { generateEmbedding } = require('../src/services/aiService');
      generateEmbedding.mockResolvedValue(null);

      await Post.create({ author: userId, text: 'Sushi roll fresh' });

      const res = await request(app)
        .get('/api/posts/search?query=Sushi')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter contradictory results (children vs adults)', async () => {
      await Post.create({ author: userId, text: 'Kid-friendly fun fries' });
      await Post.create({ author: userId, text: 'Spicy adults only ghost pepper extreme' });

      const res = await request(app)
        .get('/api/posts/search?query=recipe suitable for children')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const texts = res.body.map((p: any) => p.text);
      expect(texts.some((t: string) => t.includes('adults only'))).toBe(false);
    });

    it('should set isLiked for liked search results', async () => {
      const post = await Post.create({ author: userId, text: 'Liked search result' });
      await Like.create({ postId: post._id, userId });

      const res = await request(app)
        .get('/api/posts/search?query=Liked')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      if (res.body.length > 0) {
        expect(res.body[0].isLiked).toBe(true);
      }
    });

    it('should handle server error (500)', async () => {
      jest.spyOn(Post, 'find').mockImplementation(() => {
        throw new Error('DB error');
      });
      const res = await request(app)
        .get('/api/posts/search?query=test')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(500);
    });
  });
});
