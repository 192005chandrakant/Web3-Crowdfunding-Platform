# Architecture State

## System Boundaries

### 1. Client Interface Layer
- React.js + Next.js + Tailwind CSS.
- Wallet connectivity and transaction signing via wagmi and viem.
- Responsible only for presentation, wallet sessions, proof uploads, and user actions.

### 2. Off-Chain Storage Layer
- Node.js + Express.js API.
- MongoDB Atlas stores mutable metadata such as campaign descriptions, creator profiles, notifications, and cached contract addresses.
- IPFS via Pinata stores immutable proof artifacts and returns CID references.

### 3. On-Chain Ledger Layer
- Polygon EVM deployment target.
- Solidity ^0.8.20 smart contracts enforce escrow, milestone voting, tranche release, and refunds.
- CampaignFactory deploys standardized Campaign instances.

### 4. Advanced Indexing Layer
- The Graph subgraphs ingest contract events.
- GraphQL queries power fast historical reads and campaign timelines.

## Security Matrix

- Checks-Effects-Interactions is mandatory before any external value transfer.
- ReentrancyGuard is required on every function that moves funds.
- Snapshot voting must use a pre-approval snapshot block to prevent flash-loan voting power inflation.
- Pull-Over-Push patterns must be used for refunds and user claims.
- Custom errors are preferred over string reverts for gas efficiency.
- Campaign payout paths must mark state before value transfer.

## Identity Setup

- Donors and voters use World ID and Gitcoin Passport for proof-of-personhood and Sybil resistance.
- Creators use Sumsub or Stripe Identity for KYB and KYC checks.
- Creator verification can be funded through a small deposit, targeted at approximately 2 MATIC, to offset verification overhead.
- Medical workflows may hardcode a hospital treasury address for payout containment.

## Third-Party Free-Tier Mapping

- Alchemy: RPC access for Polygon networks.
- Clerk: authentication and session management.
- MongoDB Atlas: application metadata storage.
- Pinata IPFS: decentralized proof pinning.
- Resend: transactional email notifications.
- Cloudinary: image optimization and delivery.
- Upstash Redis: caching and throttling support.

## Endpoint Layout

### Backend REST API
- GET /health: service health and integration status.
- POST /api/campaigns: validate campaign metadata and persist cached campaign state linked to a factory-deployed contract address.
- GET /api/campaigns: paginated campaign discovery with category, creator, and search filters.
- GET /api/campaigns/:address: return cached metadata merged with live Polygon RPC reads (raised funds, milestones, voting state).
- PATCH /api/campaigns/:address: update mutable off-chain metadata (title, description, cover image, tags, status).
- POST /api/upload-proof: accept proof files, pin to IPFS via Pinata, optionally attach CID to a campaign milestone.
- POST /api/media/campaign-cover: upload and optimize campaign cover images via Cloudinary.
- POST /api/users: upsert donor/creator profile keyed by wallet address (Clerk ID optional).
- GET /api/users/:walletAddress: fetch profile and verification state.
- PATCH /api/users/:walletAddress/verification: update KYC/KYB verification status (Sumsub, Stripe, World ID, Gitcoin Passport).
- GET /api/notifications/:walletAddress: list in-app notifications for a wallet.
- POST /api/notifications: create a notification and optionally trigger Resend email delivery.
- PATCH /api/notifications/:id/read: mark a notification as read.

### Backend GraphQL API (`/graphql`)
- Query health: service status.
- Query campaigns: paginated campaign list with optional category and search filters.
- Query campaign(address): unified campaign + blockchainState view for frontend Apollo Client reads.

### Backend Services
- campaignService: MongoDB persistence, Redis cache invalidation, milestone proof linkage.
- blockchainService: ethers.js RPC reads against Campaign.sol on Polygon Amoy (chainId 80002).
- pinataService: IPFS proof pinning.
- cloudinaryService: campaign cover image optimization.
- emailService: Resend transactional notifications.
- cacheService: Upstash Redis TTL caching for campaigns and on-chain snapshots.

### Blockchain Contracts
- CampaignFactory.sol: deploys campaigns and indexes deployed addresses.
- Campaign.sol: contribution, milestone proof, voting, tranche release, and refund logic.

### Local Testing Network
- Polygon Amoy (chainId 80002) is the default development and deployment testnet.
- Ganache remains available for isolated Hardhat contract unit tests.
- Hardhat localhost remains available for alternate local execution.

### Frontend Surfaces
- WalletConnector: wallet login and SIWE entry point (persists auth in zustand `milestonechain-auth`).
- CreatorDashboard: IPFS proof upload via backend + on-chain `submitMilestoneProof`.
- DonorPortal: on-chain `contribute` and `voteOnMilestone` with backend cache refresh.
- CreateCampaignPage: factory deploy + POST `/api/campaigns` metadata registration.
- ExplorePage / CampaignDetailPage: REST-backed reads with mock fallback when API is offline.

## Implementation Status (Living Record)

### Completed
- Backend service layer (campaign, blockchain, pinata, cache, cloudinary, email, siwe).
- MongoDB models: Campaign, User, Notification.
- REST + GraphQL read paths with live Polygon Amoy RPC enrichment.
- SIWE header auth on POST `/api/campaigns`, PATCH `/api/campaigns/:address`, POST `/api/upload-proof`.
- Frontend API client (`frontend/src/lib/api.ts`) with typed payloads.
- wagmi contract actions for factory deploy, contribute, vote, submit proof.
- React Query hooks for campaign list/detail.
- Routes: `/create-campaign`, `/campaign/:id`, `/campaign/:id/manage`.
- **WalletPage** (`/wallet`) — SIWE + POST `/api/users` profile sync.
- **NotificationsPage** (`/notifications`) — GET `/api/notifications/:wallet`, mark read via PATCH.
- **MyCampaignsPage** (`/my-campaigns`) — GET `/api/campaigns?creator=wallet`.
- **HomePage** — featured campaigns from GET `/api/campaigns?limit=3` with mock fallback.
- **CreateCampaignPage** — optional cover image via POST `/api/media/campaign-cover`.
- **User route SIWE** — POST `/api/users` and PATCH verification require authenticated wallet match.
- **API client** — corrected SIWE headers (`x-wallet-address`) and upload path (`/api/upload-proof`).

### Environment Variables (canonical)

**Backend (`backend/.env`)**
- `MONGODB_URI`, `PORT`, `ALLOWED_ORIGIN`, `CHAIN_ID=80002`, `ALCHEMY_AMOY_URL`
- `PINATA_*`, `UPSTASH_REDIS_*`, `CLOUDINARY_*`, `RESEND_*`, `CLERK_SECRET_KEY`

**Frontend (`frontend/.env`)**
- `VITE_BACKEND_URL=http://localhost:5000`
- `VITE_GRAPHQL_ENDPOINT=http://localhost:5000/graphql`
- `VITE_ALCHEMY_RPC_URL` (Amoy RPC), `VITE_CHAIN_ID=80002`
- `VITE_FACTORY_CONTRACT_ADDRESS` (deployed CampaignFactory on Amoy)

**Blockchain (`blockchain/.env`)**
- `ALCHEMY_AMOY_URL`, `PRIVATE_KEY` → deploy with `npm run deploy:amoy`

### Auth Flow (SIWE)
1. Frontend `WalletConnector` signs EIP-4361-style message.
2. Payload stored in zustand and sent as headers on protected API calls:
   - `x-wallet-address`, `x-siwe-message`, `x-siwe-signature`
3. Backend `siweService.verifySiweSignature` recovers signer via ethers `verifyMessage`.
4. Creator-only routes compare `req.walletAddress` to `campaign.creatorAddress`.

### Campaign Creation Flow
1. Creator completes SIWE on `/create-campaign`.
2. Frontend calls `CampaignFactory.createCampaign` on Amoy.
3. Parses `CampaignCreated` event for new contract address.
4. POST metadata to `/api/campaigns` (SIWE required, creatorAddress must match wallet).
5. Campaign detail page reads unified view via GET `/api/campaigns/:address`.

### Proof Submission Flow
1. Creator opens `/campaign/:address/manage`.
2. Upload file → POST `/api/upload-proof` (Pinata CID + milestone index in MongoDB).
3. Same session calls on-chain `submitMilestoneProof(index, cid)`.

### Donor Flow
1. Donor SIWE + connect wallet on campaign detail page.
2. `DonorPortal` sends MATIC via `contribute()` on Campaign contract.
3. Votes via `voteOnMilestone(index, support)` when milestone is active on-chain.

## Future Work (ordered)

1. **The Graph subgraph** — index `ContributionReceived`, `MilestoneVoted`, `TrancheExecuted` for donor counts and history without RPC scans.
2. **Clerk integration** — link Clerk sessions to wallet profiles; webhook to `/api/users`.
3. **World ID / Gitcoin Passport** — donor Sybil resistance before voting (store scores on User model).
4. **Sumsub / Stripe Identity** — creator verification pipeline + 2 MATIC deposit gate.
5. **Subgraph-backed GraphQL** — migrate frontend Apollo reads from backend Yoga to The Graph when subgraph is live.
6. **Production Polygon mainnet** — duplicate env profiles for chainId 137 with separate factory address.
7. **My Donations page** — requires subgraph or indexed contribution history per wallet.
8. **Milestone Reviews page** — cross-campaign voting queue filtered by active on-chain milestones.

## Foundational Principles

- Keep contract execution logic isolated from off-chain cache and rendering logic.
- Keep secrets and RPC URLs in environment variables.
- Prefer deterministic, auditable state transitions over implicit behavior.