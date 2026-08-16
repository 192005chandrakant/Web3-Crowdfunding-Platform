# Ganache Local Testing Guide

Use Ganache when you want a fast local blockchain for full platform testing.

Important: Ganache is not the public Polygon Amoy testnet. You can run Ganache with chain ID `80002` to match Amoy wallet/app configuration, but it is still a separate local chain. Contracts deployed on real Amoy do not exist on Ganache, and contracts deployed on Ganache do not exist on real Amoy.

## Pick One Local Chain Profile

### Option A: Standard Ganache, chain ID 1337

Use this when you want normal local blockchain testing.

```bash
ganache --server.host 127.0.0.1 --server.port 7545 --chain.chainId 1337
```

Deploy:

```bash
cd blockchain
npm run deploy:ganache
```

Test:

```bash
cd blockchain
npm run test:ganache
```

Frontend:

```env
VITE_GANACHE_RPC_URL=http://127.0.0.1:7545
VITE_TARGET_CHAIN_ID=1337
VITE_FACTORY_CONTRACT_ADDRESS=<factory_from_deploy_output>
```

Backend:

```env
CHAIN_ID=1337
ALCHEMY_AMOY_URL=http://127.0.0.1:7545
```

MetaMask:

- Network name: Local Ganache
- RPC URL: `http://127.0.0.1:7545`
- Chain ID: `1337`
- Currency symbol: `ETH` or `MATIC`

### Option B: Ganache with Amoy chain ID 80002

Use this when you want local testing without changing app code or wallet flows that expect Polygon Amoy chain ID `80002`.

This guide uses port `8545` for local Amoy so it can run separately from a standard `1337` Ganache node on port `7545`.

```bash
ganache --server.host 127.0.0.1 --server.port 8545 --chain.chainId 80002
```

Deploy:

```bash
cd blockchain
npm run deploy:ganache-amoy
```

Test:

```bash
cd blockchain
npm run test:ganache-amoy
```

Frontend:

```env
VITE_GANACHE_RPC_URL=http://127.0.0.1:8545
VITE_TARGET_CHAIN_ID=80002
VITE_FACTORY_CONTRACT_ADDRESS=<factory_from_deploy_output>
```

Backend:

```env
CHAIN_ID=80002
ALCHEMY_AMOY_URL=http://127.0.0.1:8545
```

MetaMask:

- Network name: Local Ganache Amoy
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `80002`
- Currency symbol: `MATIC`

## Contract Structure

Contracts are deployed in this order:

1. Deploy `Campaign` once as the implementation contract.
2. Deploy `CampaignFactory` once with the implementation address.
3. Use the factory to clone new campaigns as needed.
4. Do not deploy `QuadraticMath.sol` separately. It is a library used by `Campaign.sol`.

Only the `CampaignFactory` address goes into `VITE_FACTORY_CONTRACT_ADDRESS`.

## Manual Platform Test Workflow

1. Start Ganache with either chain ID `1337` on port `7545`, or chain ID `80002` on port `8545`.
2. Deploy contracts with the matching npm script.
3. Copy the new `CampaignFactory deployed to:` address into `frontend/.env`.
4. Set frontend/backend chain IDs to match Ganache.
5. Restart backend and frontend.
6. Import one Ganache private key into MetaMask.
7. Switch MetaMask to the matching local network.
8. Create a campaign.
9. Contribute to the campaign.
10. Submit milestone proof.
11. Vote on the milestone.
12. Execute tranche release.
13. Cancel/refund where applicable.

## Getting Ganache Private Keys

When Ganache CLI starts, it prints:

```text
Available Accounts
Private Keys
```

Import one private key into MetaMask:

MetaMask account menu -> Import account -> Private Key -> paste key -> Import.

Use these keys only for local testing.

## Troubleshooting

### EADDRINUSE on 127.0.0.1:7545 or 127.0.0.1:8545

This means Ganache or another process is already running on that port.

Use the existing Ganache instance, or close the old Ganache terminal/window before starting another one.

To find the process on Windows:

```powershell
netstat -ano | findstr ":7545 :8545"
```

Then stop it from Task Manager, or with:

```powershell
taskkill /PID <PID_FROM_NETSTAT> /F
```

### uWS compatibility warning

This warning is usually harmless:

```text
This version of uWS is not compatible with your Node.js build.
Falling back to a NodeJS implementation; performance may be degraded.
```

Ganache still works. To remove the warning, use an LTS Node.js version such as Node 20 or Node 22 instead of a very new Node build.

### Chain ID mismatch

Every part must use the same chain ID:

- Ganache startup command
- Hardhat deploy/test script
- `frontend/.env`
- `backend/.env`
- MetaMask network

If you change Ganache from `1337` to `80002`, redeploy contracts and update `VITE_FACTORY_CONTRACT_ADDRESS`.
