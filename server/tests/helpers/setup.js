const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const User = require('../../models/User');
const createApp = require('../../app');

let mongod;

/** Starts an in-memory MongoDB, connects Mongoose and returns a ready Express app. */
const startTestApp = async () => {
  process.env.SESSION_SECRET = 'test-secret';
  process.env.NODE_ENV = 'test';
  mongod = await MongoMemoryServer.create();
  // Jest's VM sandbox cannot run the driver's dynamic import('os'), which would drop the
  // handshake metadata and make newer mongod versions refuse the connection.
  await mongoose.connect(mongod.getUri(), {
    serverSelectionTimeoutMS: 10000,
    runtimeAdapters: { os: require('os') },
  });
  return createApp();
};

const stopTestApp = async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
};

const clearDatabase = async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
};

const createUser = (overrides = {}) =>
  User.create({
    name: 'Test User',
    email: `user${Math.random().toString(36).slice(2)}@example.com`,
    password: 'Password@123',
    role: 'sales_exec',
    ...overrides,
  });

/** Returns a supertest agent that keeps the session cookie after logging in. */
const loginAs = async (app, user) => {
  const agent = request.agent(app);
  await agent
    .post('/api/auth/login')
    .send({ email: user.email, password: 'Password@123' })
    .expect(200);
  return agent;
};

module.exports = { startTestApp, stopTestApp, clearDatabase, createUser, loginAs };
