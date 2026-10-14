const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const sessionMiddleware = require('./config/session');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error');

/**
 * Builds the Express app. Must be called after the Mongoose connection is open
 * because the session store reuses that connection.
 */
const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
  app.use(express.json());
  if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));
  app.use(sessionMiddleware());

  app.use('/api', routes);
  app.use(notFound);
  app.use(errorHandler);

  return app;
};

module.exports = createApp;
