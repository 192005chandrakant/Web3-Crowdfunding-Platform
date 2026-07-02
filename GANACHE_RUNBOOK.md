# Ganache Local Testing Runbook

Use Ganache when you want fast, local blockchain feedback without touching Polygon or Amoy.

## 1. Start Ganache

Choose one of the following:

- Ganache UI: open the desktop app and use Quickstart.
- Ganache CLI:

```bash
npm install -g ganache
ganache
```

Ganache UI usually runs on `http://127.0.0.1:7545` with chain ID `1337`.

## 2. Configure the project

The Hardhat config already includes a `ganache` network. If you need to override the default RPC URL, set:

```bash
GANACHE_RPC_URL=http://127.0.0.1:7545
```

## 3. Deploy to Ganache

From the blockchain workspace:

```bash
cd blockchain
npm run deploy:ganache
```

This sends the deployment script to the local Ganache chain.

## 4. Run tests against Ganache

From the blockchain workspace:

```bash
cd blockchain
npm test
```

The default test script is already configured to run Hardhat tests on the Ganache network.

## 5. Connect MetaMask

Add a custom network in MetaMask:

- Network name: Local Ganache
- RPC URL: `http://127.0.0.1:7545`
- Chain ID: `1337`
- Currency symbol: ETH or MATIC

Then import one of Ganache’s pre-funded account private keys into MetaMask for local donation and voting tests.

## 6. Recommended workflow

1. Start Ganache UI or CLI.
2. Deploy contracts to Ganache.
3. Open the frontend.
4. Import a Ganache wallet into MetaMask.
5. Test contribution, milestone approval, payout, and refund flows.

## Notes

- Ganache is the default local chain for this repo’s blockchain tests.
- Polygon mainnet and Amoy remain the production and public-testnet targets.