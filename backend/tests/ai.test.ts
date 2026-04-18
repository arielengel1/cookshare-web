import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import postRoutes from '../src/routes/postRoutes';
import User from '../src/models/User';
import Post from '../src/models/Post';
import Chunk from '../src/models/Chunk';

jest.setTimeout(120000);

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

const POSTS = [
  'Classic margherita pizza with fresh mozzarella and basil',
  'Spicy Thai green curry with coconut milk and jasmine rice',
  'Grilled salmon with lemon butter and asparagus',
  'Chocolate lava cake with vanilla ice cream',
  'Caesar salad with homemade croutons and parmesan',
  'Beef tacos with salsa verde and pickled jalapeños',
  'Creamy mushroom risotto with white wine and parmesan',
  'Banana pancakes with maple syrup and fresh berries',
  'Homemade hummus with olive oil and zaatar',
  'Crispy fried chicken with coleslaw and hot honey',
  'Avocado toast with poached eggs and red pepper flakes',
  'French onion soup with gruyere crouton topping',
  'Vegan lentil stew with turmeric and cumin',
  'Sushi rolls with tuna, cucumber, and sesame',
  'Tiramisu with espresso-soaked ladyfingers and mascarpone',
  'Greek gyros with tzatziki, tomato, and pita bread',
  'Pad thai with shrimp, peanuts, and lime',
  'Slow-cooked BBQ ribs with smoky dry rub',
  'Spinach and feta stuffed pastry spanakopita',
  'Mango lassi smoothie with cardamom and honey',
];

function printResults(query: string, results: any[]) {
  console.log(`\n--- Query: "${query}" ---`);
  if (results.length === 0) {
    console.log('  (no results)');
  } else {
      console.log(results.map(p => `  { dish: "${p.text}", similarity: ${p.similarity?.toFixed(4) ?? 'N/A'} }`));
    };
  }

async function search(query: string) {
  const res = await request(app).get(`/api/posts/search?query=${encodeURIComponent(query)}`);
  expect(res.statusCode).toEqual(200);
  expect(Array.isArray(res.body)).toBe(true);
  printResults(query, res.body);
  return res.body as any[];
}

describe('AI Search - /api/posts/search', () => {
  beforeAll(async () => {
    await mongoose.connect('mongodb://127.0.0.1:27017/cookshare_test');

    await User.deleteMany();
    await Post.deleteMany();
    await Chunk.deleteMany();

    const user = await User.create({ email: 'chef@test.com', name: 'Test Chef' });
    testUserId = user._id.toString();

    for (const text of POSTS) {
      const res = await request(app).post('/api/posts').send({ text });
      expect(res.statusCode).toEqual(201);
    }

    console.log(`\nCreated ${POSTS.length} posts. Running queries...\n`);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  it('query: pizza', async () => {
    const results = await search('pizza');
    expect(results.some((p) => p.text.toLowerCase().includes('pizza'))).toBe(true);
  });

  it('query: healthy vegetarian protein meal', async () => {
    const results = await search('healthy vegetarian protein meal');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('query: fish seafood dinner', async () => {
    const results = await search('fish seafood dinner');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('query: sweet chocolate dessert', async () => {
    const results = await search('sweet chocolate dessert');
    expect(results.some((p) => p.text.toLowerCase().includes('chocolate') || p.text.toLowerCase().includes('tiramisu'))).toBe(true);
  });

  it('query: breakfast morning meal', async () => {
    const results = await search('breakfast morning meal');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('query: spicy food with heat', async () => {
    const results = await search('spicy food with heat');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('query: Italian pasta or rice dish', async () => {
    const results = await search('Italian pasta or rice dish');
    expect(results.some((p) => p.text.toLowerCase().includes('risotto') || p.text.toLowerCase().includes('pizza'))).toBe(true);
  });

  it('query: Asian cuisine noodles', async () => {
    const results = await search('Asian cuisine noodles');
    expect(results.some((p) => p.text.toLowerCase().includes('pad thai') || p.text.toLowerCase().includes('sushi'))).toBe(true);
  });

  it('query: summer refreshing drink', async () => {
    const results = await search('summer refreshing drink');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('query: dip or spread for bread', async () => {
    const results = await search('dip or spread for bread');
    expect(results.some((p) => p.text.toLowerCase().includes('hummus'))).toBe(true);
  });

  it('query: slow cooked meat', async () => {
    const results = await search('slow cooked meat');
    expect(results.some((p) => p.text.toLowerCase().includes('ribs') || p.text.toLowerCase().includes('beef'))).toBe(true);
  });

  it('query: street food wrap', async () => {
    const results = await search('street food wrap');
    expect(results.some((p) => p.text.toLowerCase().includes('gyros') || p.text.toLowerCase().includes('tacos'))).toBe(true);
  });

  it('query: vegetable soup', async () => {
    const results = await search('vegetable soup');
    expect(results.some((p) => p.text.toLowerCase().includes('soup') || p.text.toLowerCase().includes('stew'))).toBe(true);
  });

  it('query: egg based brunch', async () => {
    const results = await search('egg based brunch');
    expect(results.some((p) => p.text.toLowerCase().includes('egg') || p.text.toLowerCase().includes('pancakes'))).toBe(true);
  });

  it('query: baked pastry with cheese', async () => {
    const results = await search('baked pastry with cheese');
    expect(results.some((p) => p.text.toLowerCase().includes('spanakopita') || p.text.toLowerCase().includes('pizza'))).toBe(true);
  });

  it('query: recipe suitable for children', async () => {
    const results = await search('recipe suitable for children');
    expect(results.length).toBeGreaterThanOrEqual(0);
  });

  it('query: grilled outdoor cooking', async () => {
    const results = await search('grilled outdoor cooking');
    expect(results.some((p) => p.text.toLowerCase().includes('salmon') || p.text.toLowerCase().includes('ribs'))).toBe(true);
  });

  it('query: creamy rich comfort food', async () => {
    const results = await search('creamy rich comfort food');
    expect(results.some((p) => p.text.toLowerCase().includes('risotto') || p.text.toLowerCase().includes('soup'))).toBe(true);
  });

  it('query: raw fresh salad', async () => {
    const results = await search('raw fresh salad');
    expect(results.some((p) => p.text.toLowerCase().includes('salad'))).toBe(true);
  });

  it('query: car engine mechanical parts', async () => {
    const results = await search('car engine mechanical parts');
    // Unrelated query — may return empty or very low similarity results
    expect(Array.isArray(results)).toBe(true);
  });
});
