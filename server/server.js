require('dotenv').config();
const connectDB = require('./config/db');
const createApp = require('./app');

const start = async () => {
  if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET is not set');
  await connectDB();
  const port = process.env.PORT || 5000;
  createApp().listen(port, () =>
    console.log(`ClientHub API listening on http://localhost:${port}`)
  );
};

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
