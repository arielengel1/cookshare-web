import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import authRoutes from '../src/routes/authRoutes';
import User from '../src/models/User';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Controller - Full Coverage', () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = 'secret';
    process.env.JWT_REFRESH_SECRET = 'refresh_secret';
    await mongoose.connect('mongodb://127.0.0.1:27017/cookshare_test');
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany();
    jest.restoreAllMocks();
  });

  // ===== REGISTER =====
  describe('POST /api/auth/register', () => {
    it('should register a new user (201)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@test.com', password: 'pass123', name: 'Test' });
      expect(res.status).toBe(201);
      expect(res.body.message).toBe('User registered successfully');
    });

    it('should reject duplicate email (400)', async () => {
      await User.create({ email: 'dup@test.com', password: 'hashed', name: 'Dup' });
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'dup@test.com', password: 'pass123', name: 'Test2' });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Email already exists');
    });

    it('should reject missing fields (400)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@test.com' });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Missing required fields');
    });

    it('should handle server error (500)', async () => {
      jest.spyOn(User, 'findOne').mockRejectedValueOnce(new Error('DB error'));
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'err@test.com', password: 'pass123', name: 'Err' });
      expect(res.status).toBe(500);
    });
  });

  // ===== LOGIN =====
  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      const hashed = await bcrypt.hash('password123', 10);
      await User.create({ email: 'login@test.com', password: hashed, name: 'Login' });
    });

    it('should login successfully (200)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@test.com', password: 'password123' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user.email).toBe('login@test.com');
    });

    it('should reject non-existent user (400)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@test.com', password: 'password123' });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should reject wrong password (400)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@test.com', password: 'wrongpass' });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should reject user without password field (400)', async () => {
      await User.create({ email: 'google@test.com', name: 'Google', googleId: '123' });
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'google@test.com', password: 'anything' });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should handle server error (500)', async () => {
      jest.spyOn(User, 'findOne').mockRejectedValueOnce(new Error('DB error'));
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@test.com', password: 'password123' });
      expect(res.status).toBe(500);
    });
  });

  // ===== REFRESH =====
  describe('POST /api/auth/refresh', () => {
    it('should refresh tokens successfully (200)', async () => {
      const user = await User.create({ email: 'ref@test.com', password: 'x', name: 'Ref' });
      const refreshToken = jwt.sign({ _id: user._id }, 'refresh_secret', { expiresIn: '7d' });
      user.refreshToken = refreshToken;
      await user.save();

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });

    it('should reject missing refresh token (401)', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({});
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Refresh token required');
    });

    it('should reject invalid refresh token (403)', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' });
      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Invalid or expired refresh token');
    });

    it('should reject mismatched stored token (403)', async () => {
      const user = await User.create({ email: 'mis@test.com', password: 'x', name: 'Mis' });
      const refreshToken = jwt.sign({ _id: user._id }, 'refresh_secret', { expiresIn: '7d' });
      user.refreshToken = 'different-stored-token';
      await user.save();

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });
      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Invalid refresh token');
    });

    it('should reject token for non-existent user (403)', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const refreshToken = jwt.sign({ _id: fakeId }, 'refresh_secret', { expiresIn: '7d' });
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });
      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Invalid refresh token');
    });
  });

  // ===== GOOGLE AUTH =====
  describe('POST /api/auth/google', () => {
    it('should create new user from Google JWT token (200)', async () => {
      const googleToken = jwt.sign(
        { email: 'guser@test.com', name: 'G User', picture: 'http://pic.jpg', sub: 'g123' },
        'any-secret'
      );
      const res = await request(app)
        .post('/api/auth/google')
        .send({ token: googleToken });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user.email).toBe('guser@test.com');
    });

    it('should login existing Google user (200)', async () => {
      await User.create({ email: 'gexist@test.com', name: 'GExist', googleId: 'g456' });
      const res = await request(app)
        .post('/api/auth/google')
        .send({ email: 'gexist@test.com', name: 'GExist', googleId: 'g456' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
    });

    it('should link Google to existing email user and set profilePic (200)', async () => {
      await User.create({ email: 'link@test.com', password: 'hashed', name: 'Link' });
      const res = await request(app)
        .post('/api/auth/google')
        .send({ email: 'link@test.com', name: 'Link', googleId: 'g789', profilePic: 'http://pic.jpg' });
      expect(res.status).toBe(200);
      const user = await User.findOne({ email: 'link@test.com' });
      expect(user?.googleId).toBe('g789');
      expect(user?.profilePic).toBe('http://pic.jpg');
    });

    it('should not overwrite existing profilePic when linking (200)', async () => {
      await User.create({ email: 'pic@test.com', password: 'hashed', name: 'Pic', profilePic: 'existing.jpg' });
      const res = await request(app)
        .post('/api/auth/google')
        .send({ email: 'pic@test.com', name: 'Pic', googleId: 'g000', profilePic: 'http://new.jpg' });
      expect(res.status).toBe(200);
      const user = await User.findOne({ email: 'pic@test.com' });
      expect(user?.profilePic).toBe('existing.jpg');
    });

    it('should handle non-JWT token string gracefully (200)', async () => {
      const res = await request(app)
        .post('/api/auth/google')
        .send({ token: 'not-a-jwt', email: 'nj@test.com', name: 'NJ' });
      expect(res.status).toBe(200);
    });

    it('should reject missing email/name (400)', async () => {
      const res = await request(app)
        .post('/api/auth/google')
        .send({ googleId: 'g123' });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('missing email or name');
    });

    it('should reject token without email/name decoded (400)', async () => {
      const token = jwt.sign({ sub: 'g123' }, 'any-secret');
      const res = await request(app)
        .post('/api/auth/google')
        .send({ token });
      expect(res.status).toBe(400);
    });

    it('should handle server error (500)', async () => {
      jest.spyOn(User, 'findOne').mockRejectedValueOnce(new Error('DB error'));
      const res = await request(app)
        .post('/api/auth/google')
        .send({ email: 'err@test.com', name: 'Err' });
      expect(res.status).toBe(500);
    });
  });

  // ===== LOGOUT =====
  describe('POST /api/auth/logout', () => {
    it('should logout with valid refresh token (200)', async () => {
      const user = await User.create({ email: 'lo@test.com', password: 'x', name: 'Lo' });
      const refreshToken = jwt.sign({ _id: user._id }, 'refresh_secret');
      user.refreshToken = refreshToken;
      await user.save();

      const res = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken });
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged out successfully');
      const updated = await User.findById(user._id);
      expect(updated?.refreshToken).toBeNull();
    });

    it('should logout without refresh token (200)', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .send({});
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged out successfully');
    });

    it('should logout with invalid refresh token (200)', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: 'invalid-token' });
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged out successfully');
    });
  });

  // ===== ENV VAR FALLBACK BRANCHES =====
  describe('Fallback secrets (no env vars)', () => {
    let savedSecret: string | undefined;
    let savedRefreshSecret: string | undefined;

    beforeEach(() => {
      savedSecret = process.env.JWT_SECRET;
      savedRefreshSecret = process.env.JWT_REFRESH_SECRET;
      delete process.env.JWT_SECRET;
      delete process.env.JWT_REFRESH_SECRET;
    });

    afterEach(() => {
      process.env.JWT_SECRET = savedSecret;
      process.env.JWT_REFRESH_SECRET = savedRefreshSecret;
    });

    it('should login using fallback secret when env vars unset', async () => {
      const hashed = await bcrypt.hash('password123', 10);
      await User.create({ email: 'fallback@test.com', password: hashed, name: 'Fallback' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'fallback@test.com', password: 'password123' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });

    it('should refresh using fallback secret when env vars unset', async () => {
      const user = await User.create({ email: 'fb2@test.com', password: 'x', name: 'FB2' });
      // Sign with the fallback secret 'refresh_secret'
      const refreshToken = jwt.sign({ _id: user._id }, 'refresh_secret', { expiresIn: '7d' });
      user.refreshToken = refreshToken;
      await user.save();

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });
      expect(res.status).toBe(200);
    });

    it('should logout using fallback secret when env vars unset', async () => {
      const user = await User.create({ email: 'fb3@test.com', password: 'x', name: 'FB3' });
      const refreshToken = jwt.sign({ _id: user._id }, 'refresh_secret');
      user.refreshToken = refreshToken;
      await user.save();

      const res = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken });
      expect(res.status).toBe(200);
    });
  });
});

