# MilestoneChain Deployment Checklist

## Overview

This document provides a comprehensive checklist for deploying MilestoneChain to production, covering backend services, frontend deployment, smart contracts, and post-deployment verification.

---

## Pre-Deployment Requirements

### Infrastructure Access

- [ ] Domain name registered (e.g., `milestonechain.io`)
- [ ] SSL/TLS certificates obtained (Let's Encrypt or commercial)
- [ ] Cloud provider account (AWS, GCP, Azure, or Vercel/Netlify)
- [ ] CDN configured (Cloudflare recommended)
- [ ] MongoDB Atlas production cluster provisioned
- [ ] Upstash Redis production instance created
- [ ] Backup/disaster recovery plan documented

### Service Accounts

- [ ] Cloudinary production account
- [ ] Pinata production account with sufficient storage
- [ ] Resend production account with domain verified
- [ ] Alchemy production API key (Polygon Mainnet)
- [ ] WalletConnect production project ID
- [ ] Blockchain explorer API keys (Polygonscan)

### Development Verification

- [ ] All tests passing (`npm test` in backend)
- [ ] Frontend builds without errors (`npm run build`)
- [ ] TypeScript compilation successful (`npm run tsc`)
- [ ] Integration tests passed (run `node backend/test-services.js`)
- [ ] Smart contracts audited by security firm
- [ ] Code review completed

---

## Smart Contract Deployment

### 1. Testnet Deployment (Polygon Amoy)

```bash
cd blockchain
npm install
cp .env.example .env
# Configure testnet variables
npm run deploy:amoy
```

**Verify**:
- [ ] Factory contract deployed successfully
- [ ] Campaign contract template deployed
- [ ] Contract addresses saved to `.env` and documented
- [ ] Test campaign created and funded
- [ ] Milestone flow tested end-to-end
- [ ] Voting mechanism verified
- [ ] Refund logic tested

### 2. Mainnet Deployment (Polygon Mainnet)

```bash
npm run deploy:mainnet
```

**Critical Checks**:
- [ ] Factory contract deployed to Polygon Mainnet
- [ ] Contract verified on Polygonscan
- [ ] Ownership transferred to multi-sig wallet
- [ ] Emergency pause mechanism tested
- [ ] Gas limits verified for all functions
- [ ] Contract addresses documented in production `.env`

**Contract Addresses to Save**:
```
FACTORY_CONTRACT_ADDRESS=0x...
CAMPAIGN_TEMPLATE_ADDRESS=0x...
DEPLOYER_ADDRESS=0x...
MULTISIG_OWNER_ADDRESS=0x...
```

---

## Backend Deployment

### 1. Environment Configuration

Create production `.env`:

```bash
cd backend
cp .env.example .env.production
```

**Required Variables**:
```env
# Server
PORT=5000
NODE_ENV=production
ALLOWED_ORIGIN=https://milestonechain.io
FRONTEND_URL=https://milestonechain.io

# Database
MONGODB_URI=mongodb+srv://prod_user:secure_pass@cluster.mongodb.net/milestonechain_prod

# Blockchain
CHAIN_ID=137  # Polygon Mainnet
ALCHEMY_POLYGON_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_PROD_KEY

# Storage
PINATA_API_KEY=your_prod_key
PINATA_API_SECRET=your_prod_secret
CLOUDINARY_CLOUD_NAME=your_prod_cloud
CLOUDINARY_API_KEY=your_prod_key
CLOUDINARY_API_SECRET=your_prod_secret

# Cache
UPSTASH_REDIS_REST_URL=https://prod-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_prod_token
CACHE_TTL_SECONDS=300

# Email
RESEND_API_KEY=re_prod_key
RESEND_FROM_EMAIL=notifications@milestonechain.io

# Security
WEBHOOK_API_KEY=<generate-secure-random-key-64-chars>
ADMIN_WALLET_ADDRESSES=0xAdminAddress1,0xAdminAddress2
JWT_SECRET=<generate-secure-random-key-64-chars>

# Monitoring (optional)
SENTRY_DSN=https://your-sentry-dsn
LOG_LEVEL=info
```

### 2. Deployment Methods

#### Option A: Traditional VPS (DigitalOcean, AWS EC2)

```bash
# On server
git clone https://github.com/your-org/milestonechain.git
cd milestonechain/backend
npm install --production
npm run build  # if using TypeScript

# Using PM2 for process management
npm install -g pm2
pm2 start src/app.js --name milestonechain-api
pm2 save
pm2 startup
```

#### Option B: Docker

```bash
# Build image
docker build -t milestonechain-backend .

# Run container
docker run -d \
  --name milestonechain-api \
  -p 5000:5000 \
  --env-file .env.production \
  --restart unless-stopped \
  milestonechain-backend
```

#### Option C: Serverless (AWS Lambda + API Gateway)

See `backend/serverless.yml` for configuration.

### 3. Backend Verification

- [ ] Server responds at `/health` endpoint
- [ ] MongoDB connection successful
- [ ] Redis cache working
- [ ] CORS configured correctly
- [ ] API rate limiting active
- [ ] Webhook endpoint secured with API key
- [ ] Error logging to Sentry/CloudWatch
- [ ] SSL certificate valid

**Test Commands**:
```bash
# Health check
curl https://api.milestonechain.io/health

# Service integration test
node test-services.js

# Load test (optional)
artillery run load-test.yml
```

---

## Frontend Deployment

### 1. Build Configuration

Update `frontend/.env.production`:

```env
VITE_BACKEND_URL=https://api.milestonechain.io
VITE_FACTORY_CONTRACT_ADDRESS=0xYourProductionFactoryAddress
VITE_TARGET_CHAIN_ID=137
VITE_ALCHEMY_API_KEY=your_prod_alchemy_key
VITE_ALCHEMY_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
VITE_WALLETCONNECT_PROJECT_ID=your_prod_walletconnect_id
VITE_GRAPHQL_URL=https://api.milestonechain.io/graphql
VITE_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/
VITE_ENABLE_ANALYTICS=true
VITE_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
VITE_SENTRY_DSN=https://your-frontend-sentry-dsn
```

### 2. Build & Deploy

```bash
cd frontend
npm install
npm run build  # Generates dist/ directory
```

#### Option A: Vercel

```bash
npm install -g vercel
vercel --prod
```

**Vercel Configuration** (`vercel.json`):
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "env": {
    "VITE_BACKEND_URL": "https://api.milestonechain.io"
  }
}
```

#### Option B: Netlify

```bash
netlify deploy --prod --dir=dist
```

#### Option C: IPFS (Fully Decentralized)

```bash
npm install -g ipfs-deploy
ipd dist/
```

#### Option D: Traditional CDN

Upload `dist/` contents to S3/CloudFront, Google Cloud Storage, or similar.

### 3. Frontend Verification

- [ ] All pages load without errors
- [ ] Wallet connection works (MetaMask, WalletConnect)
- [ ] Campaign creation flow functional
- [ ] Donation flow works end-to-end
- [ ] Images load from Cloudinary
- [ ] IPFS proofs accessible
- [ ] Analytics tracking active
- [ ] Error boundaries catching errors
- [ ] Mobile responsive
- [ ] Accessibility audit passed (Lighthouse >90)

---

## Post-Deployment Configuration

### 1. DNS & SSL

- [ ] A record: `milestonechain.io` → Frontend IP
- [ ] A record: `api.milestonechain.io` → Backend IP
- [ ] SSL certificates installed and auto-renewing
- [ ] HTTPS redirect configured
- [ ] WWW redirect (if applicable)

### 2. Monitoring Setup

**Backend Monitoring**:
- [ ] Uptime monitoring (UptimeRobot, Pingdom)
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring (New Relic, Datadog)
- [ ] Log aggregation (CloudWatch, Loggly)

**Frontend Monitoring**:
- [ ] Google Analytics configured
- [ ] Sentry error tracking
- [ ] Core Web Vitals monitoring
- [ ] User session recording (FullStory, LogRocket)

**Blockchain Monitoring**:
- [ ] Contract event indexing (The Graph)
- [ ] Transaction failure alerts
- [ ] Gas price monitoring
- [ ] Wallet balance alerts

### 3. Security Hardening

- [ ] API rate limiting (100 req/min per IP)
- [ ] DDoS protection (Cloudflare)
- [ ] Security headers (CSP, HSTS, X-Frame-Options)
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitize user input)
- [ ] Webhook signature verification
- [ ] Admin routes protected with multi-factor auth
- [ ] Database backups automated (daily)
- [ ] Secrets stored in vault (AWS Secrets Manager, HashiCorp Vault)

### 4. Blockchain Event Listener

Deploy event listener to process blockchain events:

```bash
cd blockchain/listener
npm install
pm2 start listener.js --name event-listener

# Or use systemd service
sudo systemctl start milestonechain-listener
```

**Verify**:
- [ ] Listener connects to Polygon RPC
- [ ] Events detected and processed
- [ ] Webhook calls backend successfully
- [ ] Notifications sent on events
- [ ] Failed events retried

---

## Operational Procedures

### 1. Backup & Recovery

**Database Backups**:
```bash
# MongoDB Atlas: Enable automated daily backups
# Manual backup:
mongodump --uri="mongodb+srv://..." --out=/backups/$(date +%Y%m%d)
```

**Contract Recovery**:
- [ ] Multi-sig wallet controls critical functions
- [ ] Emergency pause mechanism documented
- [ ] Upgrade path defined (if using proxy pattern)

### 2. Incident Response

**Critical Issues**:
1. Smart contract exploit → Pause contract, contact auditors
2. Database breach → Rotate credentials, notify users
3. API downtime → Failover to backup, investigate root cause

**Contacts**:
- On-call engineer: [phone/email]
- Security team: [contact]
- Blockchain auditor: [contact]

### 3. Scaling

**Backend Scaling**:
- [ ] Load balancer configured (Nginx, ALB)
- [ ] Horizontal scaling ready (stateless servers)
- [ ] Database read replicas for high traffic
- [ ] CDN caching static assets

**Frontend Scaling**:
- [ ] Global CDN (Cloudflare, CloudFront)
- [ ] Image optimization (Cloudinary auto-format)
- [ ] Code splitting implemented

---

## Launch Checklist

### Pre-Launch (T-7 days)

- [ ] Staging environment mirrors production
- [ ] Load testing completed (1000 concurrent users)
- [ ] Security audit report reviewed
- [ ] Legal compliance verified (Terms, Privacy Policy)
- [ ] Customer support ready
- [ ] Documentation published (Help Center)

### Launch Day (T-0)

- [ ] Final database migration
- [ ] Smart contracts deployed to mainnet
- [ ] Backend deployed and healthy
- [ ] Frontend deployed and verified
- [ ] DNS propagated (check with `dig`)
- [ ] All monitoring alerts configured
- [ ] Social media announcements ready
- [ ] Press release distributed (if applicable)

### Post-Launch (T+1 day)

- [ ] Monitor error rates (<1%)
- [ ] Verify first production transactions
- [ ] Check response times (<200ms p95)
- [ ] Review user feedback
- [ ] Hotfix plan ready
- [ ] Celebrate launch! 🎉

---

## Maintenance Schedule

### Daily

- Check error logs
- Monitor uptime (should be >99.9%)
- Review user support tickets

### Weekly

- Review performance metrics
- Check database growth
- Verify backup integrity
- Update dependencies (security patches)

### Monthly

- Security audit
- Cost optimization review
- Feature usage analysis
- Capacity planning

### Quarterly

- Full disaster recovery test
- Contract upgrade review (if proxy)
- Performance benchmarking
- User survey

---

## Rollback Procedure

If critical issues arise post-deployment:

1. **Frontend Rollback**:
   ```bash
   vercel rollback  # or
   netlify rollback
   ```

2. **Backend Rollback**:
   ```bash
   pm2 reload milestonechain-api --update-env
   # or redeploy previous Docker image
   docker run milestonechain-backend:previous-tag
   ```

3. **Database Rollback**:
   ```bash
   mongorestore --uri="mongodb+srv://..." /backups/YYYYMMDD
   ```

4. **Smart Contract**: Cannot rollback on-chain code. Use emergency pause if available.

---

## Support Contacts

- **DevOps**: devops@milestonechain.io
- **Security**: security@milestonechain.io
- **Support**: support@milestonechain.io
- **Emergency**: [on-call rotation]

---

## Additional Resources

- [Backend Integration Guide](./BACKEND_INTEGRATION.md)
- [Frontend Setup Guide](./frontend/FRONTEND_SETUP.md)
- [Smart Contract Documentation](./blockchain/README.md)
- [API Documentation](https://api.milestonechain.io/docs)
- [Status Page](https://status.milestonechain.io)

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Owner**: Platform Engineering Team
