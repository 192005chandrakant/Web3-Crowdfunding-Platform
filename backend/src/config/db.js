const mongoose = require("mongoose");

async function connectDatabase(mongoUri) {
  if (!mongoUri) {
    throw new Error("Missing MONGODB_URI environment variable");
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 30000,  // 30s — gives time after IP whitelist is added
    connectTimeoutMS: 30000,
    family: 4 // Force IPv4
  });
}

module.exports = { connectDatabase };