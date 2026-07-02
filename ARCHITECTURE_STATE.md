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

### Backend API
- POST /api/campaigns: validate campaign metadata and persist cached campaign state.
- GET /api/campaigns/:address: return cached metadata combined with placeholder on-chain state.
- POST /api/upload-proof: accept proof uploads, pin them to IPFS, and return the CID.

### Blockchain Contracts
- CampaignFactory.sol: deploys campaigns and indexes deployed addresses.
- Campaign.sol: contribution, milestone proof, voting, tranche release, and refund logic.

### Local Testing Network
- Ganache is the primary local chain for contract tests and rapid feedback loops.
- Hardhat localhost remains available for alternate local execution, but Ganache is the default testing target.

### Frontend Surfaces
- WalletConnector: wallet login and SIWE entry point.
- CreatorDashboard: proof upload and milestone management UI.
- DonorPortal: contribution and voting actions.

## Foundational Principles

- Keep contract execution logic isolated from off-chain cache and rendering logic.
- Keep secrets and RPC URLs in environment variables.
- Prefer deterministic, auditable state transitions over implicit behavior.