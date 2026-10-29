require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("@nomicfoundation/hardhat-verify");
require("hardhat-gas-reporter");
require("solidity-coverage");

// ─── Strategy Pattern: BLOCKCHAIN_MODE selector ───────────────────────────────
// Set BLOCKCHAIN_MODE=local  → deploys/tests against local Ganache / Hardhat node
// Set BLOCKCHAIN_MODE=rpc    → deploys/tests against Polygon Amoy via Alchemy RPC
const BLOCKCHAIN_MODE = process.env.BLOCKCHAIN_MODE || "rpc";
console.log(`[Hardhat] Mode: ${BLOCKCHAIN_MODE.toUpperCase()} | Network: ${BLOCKCHAIN_MODE === "rpc" ? "Polygon Amoy (Alchemy)" : "Local Ganache"}`);

// ─── Helper: ensure 0x prefix on private keys ────────────────────────────────
function with0x(value) {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
}

// ─── Keys & URLs ──────────────────────────────────────────────────────────────
const deployerPrivateKey = with0x(
  process.env.DEPLOYER_PRIVATE_KEY ||
  process.env.PRIVATE_KEY ||
  process.env.GANACHE_PRIVATE_KEY ||
  ""
);
const deployerAccounts = deployerPrivateKey ? [deployerPrivateKey] : [];

const localRpcUrl  = process.env.LOCAL_RPC_URL  || process.env.GANACHE_RPC_URL || "http://127.0.0.1:7545";
const localChainId = parseInt(process.env.LOCAL_CHAIN_ID || "1337");
const amoyRpcUrl   = process.env.ALCHEMY_AMOY_URL || "https://rpc-amoy.polygon.technology";

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },

  networks: {
    // ── LOCAL mode: Ganache / Hardhat node ──────────────────────────────────
    local: {
      url:      localRpcUrl,
      chainId:  localChainId,
      accounts: deployerAccounts
    },
    // Legacy aliases kept for backward-compat
    ganache: {
      url:      localRpcUrl,
      chainId:  localChainId,
      accounts: deployerAccounts
    },
    ganache_amoy_local: {
      url:      process.env.GANACHE_RPC_URL || "http://127.0.0.1:8545",
      chainId:  80002,
      accounts: deployerAccounts
    },
    localhost: {
      url:      "http://127.0.0.1:8545",
      chainId:  31337,
      accounts: deployerAccounts
    },

    // ── RPC mode: Polygon Amoy Testnet via Alchemy ──────────────────────────
    polygon_amoy: {
      url:      amoyRpcUrl,
      chainId:  80002,
      accounts: deployerAccounts,
      gas:      "auto",
      gasMultiplier: 1.2
    },

    // ── Production: Polygon Mainnet ─────────────────────────────────────────
    polygon_mainnet: {
      url:      process.env.ALCHEMY_RPC_URL || "",
      chainId:  137,
      accounts: deployerAccounts
    }
  },

  // Polyscan verifier (for source verification after deployment)
  etherscan: {
    apiKey: {
      polygonAmoy: process.env.POLYGONSCAN_API_KEY || "",
      polygon:     process.env.POLYGONSCAN_API_KEY || ""
    },
    customChains: [
      {
        network: "polygonAmoy",
        chainId: 80002,
        urls: {
          apiURL:  "https://api-amoy.polygonscan.com/api",
          browserURL: "https://amoy.polygonscan.com"
        }
      }
    ]
  },

  // Sourcify verification (disabled to prevent legacy v1 endpoint warnings)
  sourcify: {
    enabled: false
  }
};
