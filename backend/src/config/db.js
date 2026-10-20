// Override DNS to use Google's public resolver — fixes local ISP DNS failures with MongoDB Atlas SRV records
const dns = require("dns");
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch (err) {
  // Safe ignore if unsupported in environment
}

const mongoose = require("mongoose");

let listenersRegistered = false;

function registerConnectionEvents() {
  if (listenersRegistered) return;
  listenersRegistered = true;

  mongoose.connection.on("disconnected", () => {
    console.warn("⚠ MongoDB connection lost (disconnected).");
  });

  mongoose.connection.on("reconnected", () => {
    console.log("✔ MongoDB reconnected and running.");
  });

  mongoose.connection.on("error", (err) => {
    console.error("✗ MongoDB connection error:", err.message);
  });
}

function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

async function isMongoRunning() {
  if (mongoose.connection.readyState !== 1) return false;
  try {
    const res = await mongoose.connection.db.command({ ping: 1 });
    return Boolean(res && res.ok === 1);
  } catch {
    return false;
  }
}

async function connectDatabase(mongoUri, maxRetries = 5, retryDelay = 5000) {
  if (!mongoUri) {
    throw new Error("Missing MONGODB_URI environment variable");
  }

  registerConnectionEvents();
  mongoose.set("strictQuery", true);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,  // Fail fast on selection to trigger retry
        connectTimeoutMS: 10000,
        family: 4 // Force IPv4
      });

      // Ping to verify MongoDB is actively responding and running
      try {
        await mongoose.connection.db.command({ ping: 1 });
        console.log(`✔ MongoDB connected and running successfully (Host: ${mongoose.connection.host}, Database: ${mongoose.connection.name})`);
      } catch (pingErr) {
        console.log(`✔ MongoDB connected (ping check failed: ${pingErr.message})`);
      }
      return;
    } catch (error) {
      console.error(`MongoDB connection attempt ${attempt}/${maxRetries} failed:`);
      
      if (error.name === 'MongooseServerSelectionError') {
        console.error("-> CRITICAL: Could not connect to any servers in your MongoDB Atlas cluster.");
        console.error("-> ACTION REQUIRED: Ensure your current IP address is whitelisted in MongoDB Atlas.");
        console.error("-> Check https://www.mongodb.com/docs/atlas/security-whitelist/ for details.\n");
      } else {
        console.error(`-> Error: ${error.message}\n`);
      }

      if (attempt === maxRetries) {
        console.error("Max connection retries reached. Exiting...");
        throw error;
      }

      console.log(`Retrying in ${retryDelay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

module.exports = { connectDatabase, isMongoConnected, isMongoRunning };