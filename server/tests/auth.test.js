const request = require('supertest');
const User = require('../models/User');
const {
  startTestApp,
  stopTestApp,
  clearDatabase,
  createUser,
  loginAs,
} = require('./helpers/setup');

let app;
beforeAll(async () => {
  app = await startTestApp();
});
afterAll(stopTestApp);
beforeEach(clearDatabase);

describe('Authentication', () => {
  test('login succeeds with valid credentials and returns the standard envelope', async () => {
    const user = await createUser({ email: 'asha@example.com' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'asha@example.com', password: 'Password@123' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, message: expect.any(String) });
    expect(res.body.data._id).toBe(user._id.toString());
    expect(res.body.data.password).toBeUndefined(); // hash never leaves the server
    expect(res.headers['set-cookie'][0]).toMatch(/clienthub\.sid=.*HttpOnly/i);
  });

  test('passwords are stored hashed with bcrypt', async () => {
    const user = await createUser();
    const stored = await User.findById(user._id).select('+password');
    expect(stored.password).not.toBe('Password@123');
    expect(stored.password).toMatch(/^\$2[aby]\$/);
  });

  test('login fails with a wrong password (401)', async () => {
    const user = await createUser();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('login validates the request body (422)', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email' });
    expect(res.status).toBe(422);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  test('/auth/me requires a session (401)', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('/auth/me returns the logged-in user, and logout ends the session', async () => {
    const user = await createUser();
    const agent = await loginAs(app, user);

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe(user.email);

    await agent.post('/api/auth/logout').expect(200);
    await agent.get('/api/auth/me').expect(401);
  });

  test('protected routes reject anonymous requests', async () => {
    const paths = ['leads', 'contacts', 'deals', 'activities', 'dashboard'];
    for (const path of paths) {
      const res = await request(app).get(`/api/${path}`);
      expect(res.status).toBe(401);
    }
  });

  test('unknown routes return a JSON 404', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('User management (admin only)', () => {
  test('admin can create a user; the new user can log in', async () => {
    const admin = await createUser({ role: 'admin' });
    const agent = await loginAs(app, admin);

    const res = await agent.post('/api/users').send({
      name: 'New Exec',
      email: 'new@example.com',
      password: 'Password@123',
      role: 'sales_exec',
    });
    expect(res.status).toBe(201);

    await request(app)
      .post('/api/auth/login')
      .send({ email: 'new@example.com', password: 'Password@123' })
      .expect(200);
  });

  test('sales exec cannot create or list users (403)', async () => {
    const exec = await createUser();
    const agent = await loginAs(app, exec);

    await agent
      .post('/api/users')
      .send({ name: 'X', email: 'x@example.com', password: 'Password@123', role: 'admin' })
      .expect(403);
    await agent.get('/api/users').expect(403);
  });

  test('duplicate email returns 409', async () => {
    const admin = await createUser({ role: 'admin' });
    const agent = await loginAs(app, admin);
    const body = { name: 'Dup', email: 'dup@example.com', password: 'Password@123' };
    await agent.post('/api/users').send(body).expect(201);
    await agent.post('/api/users').send(body).expect(409);
  });

  test('the only admin cannot be demoted or delete themselves', async () => {
    const admin = await createUser({ role: 'admin' });
    const agent = await loginAs(app, admin);
    await agent.put(`/api/users/${admin._id}`).send({ role: 'sales_exec' }).expect(400);
    await agent.delete(`/api/users/${admin._id}`).expect(400);
  });
});
