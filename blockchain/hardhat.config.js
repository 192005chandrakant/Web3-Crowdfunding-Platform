require("dotenv").config();
require("@nomiclabs/hardhat-ethers");

function with0x(value) {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
}

const rawPrivateKey = process.env.GANACHE_PRIVATE_KEY || process.env.PRIVATE_KEY || "";
const accountList = with0x(rawPrivateKey) ? [with0x(rawPrivateKey)] : [];

const ganacheStandardUrl = process.env.GANACHE_RPC_URL_1337 || "http://127.0.0.1:7545";
const ganacheAmoyUrl = process.env.GANACHE_RPC_URL || process.env.GANACHE_RPC_URL_80002 || "http://127.0.0.1:8545";

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
    ganache: {
      url: ganacheStandardUrl,
      chainId: 1337,
      accounts: accountList
    },
    ganache_amoy_local: {
      url: ganacheAmoyUrl,
      chainId: 80002,
      accounts: accountList
    },
    localhost: {
      url: ganacheAmoyUrl,
      chainId: 80002,
      accounts: accountList
    },
    polygon_mainnet: {
      url: process.env.ALCHEMY_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    },
    polygon_amoy: {
      url:
        process.env.ALCHEMY_AMOY_URL ||
        process.env.ALCHEMY_RPC_URL ||
        "https://rpc-amoy.polygon.technology",
      chainId: 80002,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  }
};
