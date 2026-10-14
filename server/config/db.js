const dns = require('dns');
const mongoose = require('mongoose');

const connectDB = async (uri = process.env.MONGODB_URI) => {
  if (!uri) throw new Error('MONGODB_URI is not set. Copy server/.env.example to server/.env');
  // Optional: some routers/ISPs refuse the SRV lookups that mongodb+srv:// needs.
  // Setting DNS_SERVERS=8.8.8.8,1.1.1.1 makes Node resolve through those servers instead.
  if (process.env.DNS_SERVERS)
    dns.setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()));
  await mongoose.connect(uri);
  return mongoose.connection;
};

module.exports = connectDB;
