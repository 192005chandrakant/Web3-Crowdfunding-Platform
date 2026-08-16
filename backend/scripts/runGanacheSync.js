require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { startGanacheListener } = require('../src/services/ganacheEventListener');

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set in backend .env');
    process.exit(1);
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log('Connected to MongoDB (standalone sync)');

  await startGanacheListener();
  console.log('Standalone ganache sync completed.');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Standalone ganache sync failed:', err.message);
  process.exit(1);
});
