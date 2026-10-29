/**
 * BlockchainProviderFactory — Strategy Pattern
 * ─────────────────────────────────────────────
 * Abstracts the ethers.js provider creation behind a single factory.
 * The active strategy is selected by BLOCKCHAIN_MODE in the environment:
 *
 *   BLOCKCHAIN_MODE=local  → connects to local Ganache / Hardhat node
 *   BLOCKCHAIN_MODE=rpc    → connects to Polygon Amoy via Alchemy (default)
 *
 * All backend services (blockchainService, eventListener, etc.) should use
 * this factory instead of creating providers directly.
 */
const { ethers } = require("ethers");

class BlockchainProviderFactory {
  /**
   * Returns a read-only JsonRpcProvider pointed at the configured network.
   * Implements the Strategy pattern — the caller never needs to know which
   * RPC endpoint is active; it just calls getProvider().
   *
   * @returns {ethers.JsonRpcProvider}
   */
  static getProvider() {
    const mode   = (process.env.BLOCKCHAIN_MODE || "rpc").toLowerCase();
    const rpcUrl = BlockchainProviderFactory.getRpcUrl(mode);

    if (mode === "rpc") {
      console.log(`[BlockchainProvider] Strategy: RPC → Polygon Amoy (Alchemy): ${rpcUrl}`);
    } else {
      console.log(`[BlockchainProvider] Strategy: LOCAL → Ganache/Hardhat: ${rpcUrl}`);
    }

    return new ethers.JsonRpcProvider(rpcUrl);
  }

  /**
   * Returns a Wallet (signer) backed by DEPLOYER_PRIVATE_KEY / BLOCKCHAIN_PRIVATE_KEY.
   * Used for backend-initiated transactions (e.g. event replay, admin ops).
   *
   * @returns {ethers.Wallet}
   */
  static getSigner() {
    const privateKey =
      process.env.DEPLOYER_PRIVATE_KEY ||
      process.env.BLOCKCHAIN_PRIVATE_KEY ||
      process.env.PRIVATE_KEY;

    if (!privateKey) {
      throw new Error(
        "[BlockchainProvider] No private key found. Set DEPLOYER_PRIVATE_KEY in .env."
      );
    }

    const provider = BlockchainProviderFactory.getProvider();
    return new ethers.Wallet(
      privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`,
      provider
    );
  }

  /**
   * Returns the RPC URL for the given mode.
   * @param {"local"|"rpc"} mode
   * @returns {string}
   */
  static getRpcUrl(mode) {
    if (mode === "rpc") {
      const url =
        process.env.ALCHEMY_AMOY_URL ||
        process.env.BLOCKCHAIN_RPC_URL ||
        process.env.RPC_URL;
      if (!url) {
        throw new Error(
          "[BlockchainProvider] RPC mode requires ALCHEMY_AMOY_URL in .env."
        );
      }
      return url;
    }

    // local mode
    return (
      process.env.LOCAL_RPC_URL ||
      process.env.GANACHE_RPC_URL ||
      process.env.BLOCKCHAIN_RPC_URL ||
      "http://127.0.0.1:7545"
    );
  }

  /**
   * Returns the chain ID for the active mode.
   * @returns {number}
   */
  static getChainId() {
    const mode = (process.env.BLOCKCHAIN_MODE || "rpc").toLowerCase();
    if (mode === "rpc") {
      return parseInt(process.env.CHAIN_ID || "80002");
    }
    return parseInt(process.env.LOCAL_CHAIN_ID || "1337");
  }

  /**
   * Returns the active BLOCKCHAIN_MODE string.
   * @returns {"local"|"rpc"}
   */
  static getMode() {
    return (process.env.BLOCKCHAIN_MODE || "rpc").toLowerCase();
  }

  /**
   * Returns true if running against live Polygon Amoy/Mainnet.
   * @returns {boolean}
   */
  static isRpcMode() {
    return BlockchainProviderFactory.getMode() === "rpc";
  }

  /**
   * Returns true if running against a local node (Ganache / Hardhat).
   * @returns {boolean}
   */
  static isLocalMode() {
    return BlockchainProviderFactory.getMode() === "local";
  }
}

module.exports = BlockchainProviderFactory;
