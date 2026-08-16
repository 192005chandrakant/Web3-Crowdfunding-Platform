require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const path = require('path');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set in backend .env');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log('Connected to MongoDB');

  const BlockchainEvent = require(path.join(__dirname, '..', 'src', 'models', 'BlockchainEvent'));
  const Donation = require(path.join(__dirname, '..', 'src', 'models', 'Donation'));

  const recentEvents = await BlockchainEvent.find({}).sort({ createdAt: -1 }).limit(20).lean();
  console.log('Recent BlockchainEvent items:', recentEvents.length);
  recentEvents.forEach((e) => console.log(e.eventName, e.contractAddress, e.txHash, e.processedAt));

  const recentDonations = await Donation.find({}).sort({ createdAt: -1 }).limit(20).lean();
  console.log('Recent Donation items:', recentDonations.length);
  recentDonations.forEach((d) => console.log(d.campaignAddress, d.amount, d.txHash, d.createdAt));

  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
