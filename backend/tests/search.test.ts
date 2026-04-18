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
    expect(ghostPepperIndex).toBe(-1); // Should not be returned at all, but if it is, it must be ranked lower than fries
    // if (ghostPepperIndex !== -1) {
    //   expect(friesIndex).toBeLessThan(ghostPepperIndex);
    // }
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
  
  it('returns empty array when no posts exist and relevant', async () => {
    await createPost('ISREALY SHAKSHUKA - poached eggs in spicy tomato sauce with peppers and onions');
    await createPost('SPAGATTI BOLOGNESE - hearty meat sauce with garlic, onion, and herbs served over spaghetti');
    await createPost('PASTA RECEPIE - delicious pasta dish with tomato sauce, garlic, and basil');
    const res = await request(app).get('/api/posts/search?query=pasta recipe');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual([]);
  });
});
