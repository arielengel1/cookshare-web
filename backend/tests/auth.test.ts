import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import authRoutes from '../src/routes/authRoutes';
import User from '../src/models/User';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth API Unit Tests', () => {
  beforeAll(async () => {
    // Connect to a local test db or mock mongoose
    const url = `mongodb://127.0.0.1:27017/cookshare_test`;
    await mongoose.connect(url);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany();
  });

  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@test.com',
        password: 'password123',
        name: 'Test User'
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('message', 'User registered successfully');
  });

  it('should not register user with existing email', async () => {
    await request(app).post('/api/auth/register').send({
      email: 'test@test.com',
      password: 'password123',
      name: 'Test User'
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@test.com',
        password: 'password123',
        name: 'Another User'
      });
    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('message', 'Email already exists');
  });
});
