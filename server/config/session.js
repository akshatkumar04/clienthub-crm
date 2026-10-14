const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** Server-side sessions persisted in MongoDB; the browser only holds an httpOnly cookie. */
const sessionMiddleware = () =>
  session({
    name: 'clienthub.sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      client: mongoose.connection.getClient(),
      collectionName: 'sessions',
      ttl: SEVEN_DAYS_MS / 1000,
    }),
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: SEVEN_DAYS_MS,
    },
  });

module.exports = sessionMiddleware;
