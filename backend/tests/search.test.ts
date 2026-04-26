import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import postRoutes from '../src/routes/postRoutes';
import User from '../src/models/User';
import Post from '../src/models/Post';
import Chunk from '../src/models/Chunk';

jest.setTimeout(60000);

let testUserId: string;

jest.mock('../src/middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { _id: testUserId };
    next();
  },
}));

// Mock AI service for deterministic unit testing.
// To test with real Gemini tokens, comment this block and run ai.test.ts instead.
jest.mock('../src/services/aiService', () => {
  return {
    generateEmbedding: jest.fn(async (text: string, type: string) => {
      const t = text.toLowerCase();
      // PASTA RECEPIE vs SHAKSHUKA (must come first to avoid pie/recePIE substring overlap)
      if (t.includes('pasta recipe') || t.includes('pasta recepie')) return [1, 0, 0, 0, 0];
      if (t.includes('spagatti')) return [0.5, 0.866, 0, 0, 0];
      if (t.includes('shakshuka')) return [0, 1, 0, 0, 0];
      
      // Level 1: direct word match
      if (t.includes('apple')) return [1, 0, 0, 0, 0];
      // Level 2: synonym
      if (t.includes('pie') || t.includes('tarts') || t.includes('cake')) return [0, 1, 0, 0, 0];
      // Level 3: contextual rank (fries vs ghost pepper — orthogonal axes = 0 similarity)
      if (t.includes('children') || t.includes('fries')) return [0, 0, 1, 0, 0];
      if (t.includes('ghost pepper') || t.includes('adults')) return [0, 0, 0, 1, 0]; 
      
      // Broad query "italian pasta recipe"
      if (t.includes('italian') || t.includes('carbonara') || t.includes('alfredo') || t.includes('arrabbiata')) return [1, 1, 0, 0, 0];
      
      // Single post query "sweet dessert baking"
      if (t.includes('sweet') || t.includes('cookie')) return [0, 0, 0, 0, 1];
      
      return [0.01, 0.01, 0.01, 0.01, 0.01]; // base tiny vector
    }),
    chunkText: jest.fn((text: string) => [text]),
    cosineSimilarity: jest.fn((vecA: number[], vecB: number[]) => {
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;
      for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
      }
      if (normA === 0 || normB === 0) return 0;
      return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }),
    rerankWithLLM: jest.fn(async (query: string, candidates: { id: string; text: string }[]) => {
      const q = query.toLowerCase();
      // Simulate LLM contextual filtering
      return candidates
        .filter(c => {
          const t = c.text.toLowerCase();
          // Filter out "adults only" content when query mentions children
          if (q.includes('children') && (t.includes('adults only') || t.includes('dangerously'))) return false;
          return true;
        })
        .map(c => c.id);
    })
  };
});


const app = express();
app.use(express.json());
app.use('/api/posts', postRoutes);

describe('Search API - /api/posts/search', () => {
  beforeAll(async () => {
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

    const user = await User.create({ email: 'chef@test.com', name: 'Test Chef' });
    testUserId = user._id.toString();
  });

  async function createPost(text: string) {
    const res = await request(app)
      .post('/api/posts')
      .send({ text });
    expect(res.statusCode).toEqual(201);
    return res.body;
  }

  // --- Similarity Level Tests ---

  it('Level 1: returns post with direct word match', async () => {
    await createPost('Classic apple pie recipe with cinnamon and butter');

    const res = await request(app).get('/api/posts/search?query=apple');
    expect(res.statusCode).toEqual(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body.some((p: any) => p.text.toLowerCase().includes('apple'))).toBe(true);
  });

  it('Level 2: returns post based on synonym (cake → pies/tarts)', async () => {
    await createPost('Homemade pies and fruit tarts baking guide');

    const res = await request(app).get('/api/posts/search?query=cake');
    expect(res.statusCode).toEqual(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body.some((p: any) => p.text.toLowerCase().includes('pies'))).toBe(true);
  });

  it('Level 3: ranks contextually relevant post above unrelated food post', async () => {
    await createPost('Crispy golden fries served with ketchup dipping sauce');
    await createPost('Carolina Reaper ghost pepper extreme hot sauce challenge - dangerously spicy, adults only');

    const res = await request(app).get('/api/posts/search?query=recipe suitable for children');
    expect(res.statusCode).toEqual(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);

    const texts = res.body.map((p: any) => p.text as string);
    expect(texts.some((t: string) => t.toLowerCase().includes('fries'))).toBe(true);

    const friesIndex = texts.findIndex((t: string) => t.toLowerCase().includes('fries'));
    const ghostPepperIndex = texts.findIndex((t: string) => t.toLowerCase().includes('ghost pepper'));
    expect(ghostPepperIndex).toBe(-1); // Match must be low enough to be excluded
  });

  // --- Result Count Tests ---

  it('returns multiple posts for a broad query', async () => {
    await createPost('Spaghetti carbonara with pancetta and egg');
    await createPost('Fettuccine alfredo with heavy cream and parmesan');
    await createPost('Penne arrabbiata with tomato and garlic sauce');
    
    const res = await request(app).get('/api/posts/search?query=italian pasta recipe');
    expect(res.statusCode).toEqual(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });
  
  it('returns only one post when only one post exists', async () => {
    await createPost('Soft chocolate chip cookies fresh from the oven');
    
    const res = await request(app).get('/api/posts/search?query=sweet dessert baking');
    expect(res.statusCode).toEqual(200);
    expect(res.body.length).toEqual(1);
    expect(res.body[0].text.toLowerCase()).toContain('cookie');
  });
  
  it('returns highest matched query reliably', async () => {
    await createPost('ISREALY SHAKSHUKA - poached eggs in spicy tomato sauce with peppers and onions');
    await createPost('SPAGATTI BOLOGNESE - hearty meat sauce with garlic, onion, and herbs served over spaghetti');
    await createPost('PASTA RECEPIE - delicious pasta dish with tomato sauce, garlic, and basil');
    const res = await request(app).get('/api/posts/search?query=pasta recipe');
    expect(res.statusCode).toEqual(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].text).toContain('PASTA RECEPIE');
  });
});
