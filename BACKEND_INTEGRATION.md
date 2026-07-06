# MilestoneChain Backend Integration Guide

## Overview

This document provides a comprehensive guide to the backend services integration, verification steps, and best practices for MilestoneChain platform.

## Architecture Overview

```
┌─────────────────┐
│   Frontend      │
│  (React + wagmi)│
└────────┬────────┘
         │
         ├─── REST API ────► Backend Express Server
         │                   └─► MongoDB (Campaign/User data)
         │                   └─► Upstash Redis (Cache)
         │                   └─► Cloudinary (Images)
         │                   └─► Pinata (IPFS proofs)
         │                   └─► Resend (Emails)
         │
         └─── Web3 RPC ────► Smart Contracts
                             └─► Factory Contract
                             └─► Campaign Contracts
                             └─► Event Webhooks → Backend
```

## Service Integration Status

### ✅ MongoDB Atlas
**Status**: Fully Integrated  
**Purpose**: Primary database for campaigns, users, donations, notifications

**Models**:
- `Campaign.js` - Campaign metadata, milestones, donations
- `User.js` - User profiles, wallet addresses
- `Donation.js` - Donation records with blockchain tx hashes
- `Notification.js` - User notification queue
- `BlockchainEvent.js` - Event log for webhook processing

**Configuration**:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
```

**Verification**:
```bash
cd backend
npm test # Runs connection tests
```

### ✅ Upstash Redis
**Status**: Fully Integrated  
**Purpose**: Response caching layer for expensive queries

**Service**: `src/services/cacheService.js`

**Features**:
- Campaign list caching (5 min TTL)
- User profile caching (15 min TTL)
- Automatic cache invalidation on updates
- Graceful degradation if Redis unavailable

**Configuration**:
```env
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token
CACHE_TTL_SECONDS=300
```

**Usage Example**:
```javascript
const { getCached, setCached, invalidate } = require('./services/cacheService');

// Get with auto-population
const campaigns = await getCached('campaigns:active', async () => {
  return await Campaign.find({ status: 'active' });
}, 300);

// Invalidate on update
await campaign.save();
await invalidate('campaigns:*');
```

### ✅ Pinata (IPFS)
**Status**: Fully Integrated  
**Purpose**: Decentralized storage for milestone proof documents

**Service**: `src/services/pinataService.js`  
**Controller**: `src/controllers/uploadController.js`  
**Route**: `POST /api/upload/proof`

**Supported File Types**:
- PDF documents
- Images (JPEG, PNG, WebP)
- Text files
- Max size: 10 MB

**Configuration**:
```env
PINATA_API_KEY=your_pinata_api_key
PINATA_API_SECRET=your_pinata_api_secret
# OR use JWT:
PINATA_JWT=your_pinata_jwt
```

**API Usage**:
```bash
# Upload milestone proof
curl -X POST http://localhost:5000/api/upload/proof \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@milestone-proof.pdf" \
  -F "contractAddress=0x123..." \
  -F "milestoneIndex=0"
```

**Response**:
```json
{
  "success": true,
  "cid": "Qm...",
  "ipfsUrl": "ipfs://Qm...",
  "gatewayUrl": "https://gateway.pinata.cloud/ipfs/Qm...",
  "campaign": { ... }
}
```

**Frontend Integration**:
```typescript
// In CreatorDashboard.tsx or MilestoneManagement component
const uploadProof = async (file: File, milestoneIndex: number) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('contractAddress', campaignAddress);
  formData.append('milestoneIndex', milestoneIndex.toString());

  const response = await fetch(`${API_URL}/upload/proof`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
    body: formData,
  });

  const data = await response.json();
  // Use data.cid to call smart contract submitMilestoneProof(milestoneIndex, cid)
};
```

### ✅ Cloudinary
**Status**: Fully Integrated  
**Purpose**: Campaign cover image hosting with automatic optimization

**Service**: `src/services/cloudinaryService.js`  
**Controller**: `src/controllers/mediaController.js`  
**Route**: `POST /api/media/campaign-cover`

**Features**:
- Automatic image optimization (WebP, quality:auto)
- Organized folder structure: `milestonechain/campaigns/`
- Returns optimized URL for frontend use

**Configuration**:
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_secret
```

**API Usage**:
```bash
curl -X POST http://localhost:5000/api/media/campaign-cover \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@cover.jpg"
```

**Response**:
```json
{
  "success": true,
  "url": "https://res.cloudinary.com/.../image.webp",
  "publicId": "milestonechain/campaigns/xyz",
  "width": 1920,
  "height": 1080
}
```

**Frontend Integration**:
```typescript
// In CreateCampaignPage.tsx
const uploadCoverImage = async (file: File) => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_URL}/media/campaign-cover`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
    body: formData,
  });

  const data = await response.json();
  return data.url; // Store this in campaign.image field
};
```

### ✅ Resend Email
**Status**: Fully Integrated  
**Purpose**: Transactional email notifications

**Service**: `src/services/emailService.js`  
**Integrated in**: `src/services/eventProcessorService.js`

**Email Types Implemented**:
1. ✅ **Milestone Proof Submitted** - Notifies donors/validators when proof is uploaded
2. ✅ **Donation Received** - Notifies campaign creator of new donation
3. ⚠️ **Milestone Voting** - TODO: Send when voting period opens
4. ⚠️ **Funds Released** - TODO: Send when milestone funds are released

**Configuration**:
```env
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=notifications@yourdomain.com
```

**Current Integration Points**:
```javascript
// src/services/eventProcessorService.js
async function processTrancheExecuted(event) {
  // ... existing logic ...
  
  // Email notification on fund release
  if (creator.email) {
    await sendNotificationEmail({
      to: creator.email,
      subject: `Milestone funds released: ${campaign.title}`,
      html: `<p>Milestone ${milestoneIndex} funds have been released!</p>`
    });
  }
}
```

**Extending Email Notifications**:
```javascript
// Add to eventProcessorService.js
async function processDonationReceived(event) {
  const { campaignAddress, donor, amount } = event.returnValues;
  const campaign = await Campaign.findOne({ contractAddress: campaignAddress });
  
  if (campaign.creator.email) {
    await sendDonationReceivedNotification({
      email: campaign.creator.email,
      campaignTitle: campaign.title,
      amount: formatEther(amount),
      actionUrl: `${FRONTEND_URL}/campaigns/${campaign._id}/manage`
    });
  }
}
```

### ❌ Clerk Authentication
**Status**: NOT Integrated (by design)  
**Decision**: Keep custom SIWE (Sign-In with Ethereum) implementation

**Reasoning**:
- MilestoneChain is a Web3-native platform
- SIWE provides decentralized authentication without third-party dependencies
- Current implementation using wagmi + viem is production-ready
- Clerk would add centralized dependency counter to platform ethos

**Current Auth Flow**:
```
1. User connects wallet (MetaMask, WalletConnect, etc.) via wagmi
2. Frontend generates SIWE message
3. User signs message with private key
4. Backend verifies signature and issues session
5. Session stored in Zustand (frontend) + Redis (backend)
```

**Middleware**: `src/middleware/siweAuth.js`  
**Frontend Store**: `src/store/authStore.ts`

---

## Integration Testing Checklist

### 1. MongoDB Connection
```bash
cd backend
node -e "require('./src/config/db').then(() => console.log('✅ MongoDB connected'))"
```

### 2. Redis Caching
```bash
# Set test value
curl -X POST http://localhost:5000/api/test/cache-set \
  -H "Content-Type: application/json" \
  -d '{"key":"test","value":"hello"}'

# Get test value
curl http://localhost:5000/api/test/cache-get?key=test
```

### 3. Cloudinary Upload
```bash
# Upload test image
curl -X POST http://localhost:5000/api/media/campaign-cover \
  -F "image=@test-image.jpg"

# Expected: Returns Cloudinary URL
```

### 4. Pinata IPFS Upload
```bash
# Upload test proof
curl -X POST http://localhost:5000/api/upload/proof \
  -F "file=@test-proof.pdf"

# Expected: Returns IPFS CID and gateway URL
```

### 5. Email Sending
```bash
# Test email (requires valid recipient)
node -e "
  const { sendNotificationEmail } = require('./src/services/emailService');
  sendNotificationEmail({
    to: 'your@email.com',
    subject: 'Test',
    html: '<p>Test email</p>'
  }).then(() => console.log('✅ Email sent'));
"
```

### 6. Webhook Processing
```bash
# Send test webhook
curl -X POST http://localhost:5000/api/webhooks/blockchain \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_WEBHOOK_API_KEY" \
  -d '{
    "event": "CampaignCreated",
    "returnValues": {
      "campaignAddress": "0x123...",
      "creator": "0xabc...",
      "targetAmount": "1000000000000000000"
    },
    "transactionHash": "0xdef...",
    "blockNumber": 12345
  }'
```

---

## Environment Configuration

### Backend `.env` Template
```env
# Server
PORT=5000
ALLOWED_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/milestonechain

# Blockchain
CHAIN_ID=80002
ALCHEMY_AMOY_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_KEY

# Storage
PINATA_API_KEY=
PINATA_API_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Cache
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
CACHE_TTL_SECONDS=300

# Email
RESEND_API_KEY=
RESEND_FROM_EMAIL=notifications@yourdomain.com

# Security
WEBHOOK_API_KEY=generate_secure_random_string
ADMIN_WALLET_ADDRESSES=0xYourAdminAddress
```

### Frontend `.env` Template
```env
# Backend
VITE_BACKEND_URL=http://localhost:5000

# Blockchain
VITE_FACTORY_CONTRACT_ADDRESS=0x...
VITE_TARGET_CHAIN_ID=80002
VITE_ALCHEMY_API_KEY=
VITE_ALCHEMY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_KEY

# Wallet
VITE_WALLETCONNECT_PROJECT_ID=

# Optional
VITE_GRAPHQL_URL=http://localhost:5000/graphql
VITE_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/
```

---

## Best Practices

### 1. Error Handling
All service calls include graceful degradation:
```javascript
// Example from cacheService.js
async function getCached(key, fetchFn, ttl) {
  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    console.warn('Cache read failed, falling back to DB:', err);
  }
  
  const fresh = await fetchFn();
  
  try {
    await redis.set(key, JSON.stringify(fresh), { ex: ttl });
  } catch (err) {
    console.warn('Cache write failed:', err);
  }
  
  return fresh;
}
```

### 2. File Upload Security
- Validate MIME types before processing
- Enforce size limits (10 MB for proofs, 5 MB for images)
- Sanitize file names
- Use streaming for large files

### 3. Webhook Security
- Verify API key: `x-api-key` header
- Validate event structure before processing
- Idempotency: Check `transactionHash` to prevent duplicate processing
- Rate limiting: Max 100 events per minute per source

### 4. Cache Invalidation
```javascript
// Invalidate on mutations
await campaign.save();
await invalidate('campaigns:*');
await invalidate(`campaign:${campaign.contractAddress}`);

// Pattern matching
await invalidate('user:0x123*'); // Invalidates all user cache entries
```

---

## Troubleshooting

### Cloudinary 401 Unauthorized
**Cause**: Invalid API credentials  
**Fix**: Verify `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` in `.env`

### Pinata 403 Forbidden
**Cause**: Rate limit exceeded or invalid credentials  
**Fix**: Check Pinata dashboard for usage limits. Use JWT auth instead of API key/secret.

### Resend Emails Not Sending
**Cause**: Domain not verified  
**Fix**: Add and verify your domain in Resend dashboard, or use `onboarding@resend.dev` for testing.

### Redis Connection Timeout
**Cause**: Upstash URL/token incorrect  
**Fix**: Copy REST URL/token from Upstash dashboard, ensure no trailing slashes.

### MongoDB Connection Error
**Cause**: IP not whitelisted or invalid URI  
**Fix**: Add `0.0.0.0/0` to MongoDB Atlas Network Access (for dev) or your server IP (for prod).

---

## Next Steps

1. **Deploy Smart Contracts**: Deploy Factory and Campaign contracts to Polygon Amoy testnet
2. **Configure Webhooks**: Set up blockchain event listener to call `/api/webhooks/blockchain`
3. **Email Templates**: Create branded HTML email templates for Resend
4. **Frontend Integration**: Connect upload forms to Cloudinary and Pinata endpoints
5. **Testing**: Run integration tests on staging environment
6. **Monitoring**: Set up logging (Winston) and error tracking (Sentry)

---

## Support

- **Backend Issues**: Check `backend/logs/` directory
- **API Documentation**: Available at `/api/docs` (if Swagger configured)
- **Smart Contract Docs**: See `blockchain/README.md`

