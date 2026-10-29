# MilestoneChain Dual-Mode Blockchain Runbook

MilestoneChain implements the **Strategy Design Pattern** across its entire stack. The platform can switch seamlessly between **Polygon Amoy Testnet (RPC Mode)** and **Local Ganache (Local Mode)** using a single environment variable: `BLOCKCHAIN_MODE`.

---

## 1. Quick Switch Matrix

To switch network modes, update `BLOCKCHAIN_MODE` across your environment files:

| Target Network | `backend/.env` | `blockchain/.env` | `frontend/.env` |
|---|---|---|---|
| **Polygon Amoy (Alchemy)** | `BLOCKCHAIN_MODE=rpc` | `BLOCKCHAIN_MODE=rpc` | `VITE_BLOCKCHAIN_MODE=rpc` |
| **Local Ganache (GUI/CLI)** | `BLOCKCHAIN_MODE=local` | `BLOCKCHAIN_MODE=local` | `VITE_BLOCKCHAIN_MODE=local` |

---

## 2. Deployed Smart Contracts (Live on Polygon Amoy)

| Contract | Network | Address | Explorer |
|---|---|---|---|
| **CampaignFactory** | Polygon Amoy (`80002`) | `0x4B3E9091e8A15AdcC8fcC1FCC7D6D273F4Cc2D01` | [View on PolygonScan](https://amoy.polygonscan.com/address/0x4B3E9091e8A15AdcC8fcC1FCC7D6D273F4Cc2D01) |
| **Campaign Implementation** | Polygon Amoy (`80002`) | `0xaC0ddA015c57407369033652e9a026c3021cb680` | [View on PolygonScan](https://amoy.polygonscan.com/address/0xaC0ddA015c57407369033652e9a026c3021cb680) |

- **Deployer Wallet**: `0xDb1e14A9970B4D6284e4ec9f2F8b78F61351694a`
- **RPC Provider**: Alchemy (`https://polygon-amoy.g.alchemy.com/v2/...`)
- **Gas Token**: POL (formerly MATIC)

---

## 3. Architecture Implementation

### A. Blockchain Layer (`blockchain/hardhat.config.js`)
- Dynamically selects network configurations based on `BLOCKCHAIN_MODE`.
- The deploy script (`scripts/deploy.js`) automatically updates `backend/.env` and `frontend/.env` with the new contract addresses upon deployment.

### B. Backend Layer (`backend/src/config/provider.js`)
- `BlockchainProviderFactory.getProvider()` instantiates an `ethers.JsonRpcProvider` bound to Alchemy Amoy when in `rpc` mode, or Ganache when in `local` mode.
- `ganacheEventListener.js` connects to the active RPC, observes `CampaignCreated` and campaign events, and respects Alchemy's free-tier `eth_getLogs` block limits.

### C. Frontend Layer (`frontend/src/lib/wagmi.ts` & `frontend/src/lib/chain.ts`)
- Configures Wagmi transports dynamically.
- In `rpc` mode, `polygonAmoy` is set as the primary chain with HTTP transport to Alchemy.
- In `local` mode, `ganacheLocal` (`chainId: 1337`) is set as the primary chain.
- `useCampaignContract.ts` automatically builds MetaMask chain addition parameters (`wallet_addEthereumChain`) for Polygon Amoy.

---

## 4. Running the Platform

### Terminal 1: Backend API
```bash
cd backend
npm run dev
```
- Listens on port `5000`.
- Connects to MongoDB Atlas, Pinata IPFS, Cloudinary, and starts the Amoy blockchain event listener.

### Terminal 2: Frontend Client
```bash
cd frontend
npm run dev
```
- Available at `http://localhost:5173`.
- Automatically connects to MetaMask on Polygon Amoy (`chainId: 80002`).

---

## 5. Testing & Verification

### Backend Verification
```bash
cd backend

# Syntax & route checks
npm run smoke

# Integration test for all off-chain services (MongoDB, IPFS, Cloudinary, Observer Notifications)
npm run test:services

# Service latency benchmarks
npm run benchmark
```

### Frontend Build Verification
```bash
cd frontend
npm run build
```

---

## 6. MetaMask Wallet Configuration for Polygon Amoy

When connecting to the frontend in `rpc` mode, MetaMask will prompt to switch or add Polygon Amoy:
- **Network Name**: Polygon Amoy Testnet
- **New RPC URL**: `https://polygon-amoy.g.alchemy.com/v2/_z2nXfyjzXKZgNaaGYaNe`
- **Chain ID**: `80002`
- **Currency Symbol**: `POL`
- **Block Explorer URL**: `https://amoy.polygonscan.com`

Test POL can be obtained from the official faucet:
- [Polygon Faucet](https://faucet.polygon.technology/)
