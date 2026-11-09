import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp({ jwtSecret: 'test-secret', corsOrigins: ['http://localhost:5173'] });

async function loginDemo() {
  const res = await request(app).post('/api/auth/login').send({ email: 'paulina@movierater.com', password: 'paulina123' });
  return res.body.token;
}

describe('JWT auth', () => {
  it('login returns a token and the token opens a protected endpoint', async () => {
    const token = await loginDemo();
    expect(token).toBeTruthy();
    const res = await request(app).get('/api/resenas').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('ERROR CASE: protected endpoint without token returns 401', async () => {
    const res = await request(app).get('/api/resenas');
    expect(res.status).toBe(401);
  });

  it('ERROR CASE: invalid token returns 401', async () => {
    const res = await request(app).get('/api/resenas').set('Authorization', 'Bearer basura');
    expect(res.status).toBe(401);
  });

  it('ERROR CASE: wrong password returns 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'paulina@movierater.com', password: 'mala' });
    expect(res.status).toBe(401);
  });
});

describe('CORS', () => {
  it('allows the configured frontend origin', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('does not allow other origins', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'http://malo.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
