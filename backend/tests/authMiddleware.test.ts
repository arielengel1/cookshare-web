import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { authenticate } from '../src/middleware/auth';

// Create a test app with the real auth middleware
const app = express();
app.use(express.json());

app.get('/protected', authenticate, (req: any, res) => {
  res.json({ userId: req.user._id });
});

describe('Auth Middleware - Full Coverage', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'secret';
  });

  it('should pass with valid Bearer token', async () => {
    const token = jwt.sign({ _id: 'user123' }, 'secret', { expiresIn: '1h' });
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('user123');
  });

  it('should reject request with no Authorization header (401)', async () => {
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('No token provided');
  });

  it('should reject request with non-Bearer auth header (401)', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Basic abc123');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('No token provided');
  });

  it('should reject request with invalid token (401)', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalid-token');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid token');
  });

  it('should reject request with expired token (401)', async () => {
    const token = jwt.sign({ _id: 'user123' }, 'secret', { expiresIn: '-1s' });
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid token');
  });

  it('should use fallback secret when JWT_SECRET is not set', async () => {
    const saved = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;

    // Token signed with fallback 'secret' should still work
    const token = jwt.sign({ _id: 'user456' }, 'secret', { expiresIn: '1h' });
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('user456');

    process.env.JWT_SECRET = saved;
  });
});

