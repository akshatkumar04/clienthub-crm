const mongoose = require('mongoose');

const connectDB = async (uri = process.env.MONGODB_URI) => {
  if (!uri) throw new Error('MONGODB_URI is not set. Copy server/.env.example to server/.env');
  await mongoose.connect(uri);
  return mongoose.connection;
};

module.exports = connectDB;
