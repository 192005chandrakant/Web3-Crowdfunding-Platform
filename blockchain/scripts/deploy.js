/**
 * Dual-Mode Deployment Script
 * Usage:
 *   Local Ganache:     npx hardhat run scripts/deploy.js --network ganache
 *   Polygon Amoy:      npx hardhat run scripts/deploy.js --network polygon_amoy
 */
const hre = require("hardhat");
const fs  = require("fs");
const path = require("path");

const BLOCKCHAIN_MODE = process.env.BLOCKCHAIN_MODE || "rpc";

async function main() {
  const network = await hre.ethers.provider.getNetwork();
  const networkName = hre.network.name;
  const chainId = Number(network.chainId);

  console.log("=".repeat(60));
  console.log("  MILESTONECHAIN CONTRACT DEPLOYMENT");
  console.log("=".repeat(60));
  console.log(`  Mode:      ${BLOCKCHAIN_MODE.toUpperCase()}`);
  console.log(`  Network:   ${networkName} (chainId ${chainId})`);
  console.log("=".repeat(60));

  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`  Deployer:  ${deployer.address}`);
  console.log(`  Balance:   ${hre.ethers.formatEther(balance)} POL/ETH`);
  console.log("");

  if (balance === 0n) {
    console.error("ERROR: Deployer wallet has 0 balance. Fund it before deploying.");
    if (chainId === 80002) {
      console.error("   -> Faucet: https://faucet.polygon.technology/");
    }
    process.exit(1);
  }

  // ── Step 1: Deploy Campaign Implementation ─────────────────────────────────
  console.log("1. Deploying Campaign Implementation Contract...");
  const Campaign = await hre.ethers.getContractFactory("Campaign");
  const campaignImpl = await Campaign.deploy();
  await campaignImpl.waitForDeployment();
  const campaignImplAddress = await campaignImpl.getAddress();
  console.log(`   ✔ Campaign Implementation: ${campaignImplAddress}`);

  // ── Step 2: Deploy Factory using Implementation ────────────────────────────
  console.log("2. Deploying CampaignFactory...");
  const CampaignFactory = await hre.ethers.getContractFactory("CampaignFactory");
  const factory = await CampaignFactory.deploy(campaignImplAddress);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log(`   ✔ CampaignFactory: ${factoryAddress}`);

  // ── Step 3: Persist addresses to all three .env files ─────────────────────
  console.log("\n3. Writing contract addresses to environment files...");

  const updates = {
    CAMPAIGN_FACTORY_ADDRESS: factoryAddress,
    CAMPAIGN_IMPL_ADDRESS:    campaignImplAddress,
    CHAIN_ID:                 String(chainId)
  };

  // Backend .env
  const backendEnvPath = path.join(__dirname, "..", "..", "backend", ".env");
  writeEnvVars(backendEnvPath, updates, "backend");

  // Frontend .env
  const frontendEnvPath = path.join(__dirname, "..", "..", "frontend", ".env");
  writeEnvVars(frontendEnvPath, {
    VITE_FACTORY_CONTRACT_ADDRESS: factoryAddress,
    VITE_IMPL_CONTRACT_ADDRESS:    campaignImplAddress,
    VITE_TARGET_CHAIN_ID:          String(chainId),
    VITE_CHAIN_ID:                 String(chainId),
    ...(chainId === 80002
      ? { VITE_ALCHEMY_RPC_URL: process.env.ALCHEMY_AMOY_URL || "" }
      : { VITE_GANACHE_RPC_URL: process.env.LOCAL_RPC_URL || "http://127.0.0.1:7545" })
  }, "frontend");

  // ── Step 4: Summary ─────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log("  DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log(`  Campaign Implementation: ${campaignImplAddress}`);
  console.log(`  CampaignFactory:         ${factoryAddress}`);
  console.log(`  Chain:                   ${networkName} (${chainId})`);

  if (chainId === 80002) {
    console.log("\n  Explorer Links:");
    console.log(`  -> Factory: https://amoy.polygonscan.com/address/${factoryAddress}`);
    console.log(`  -> Impl:    https://amoy.polygonscan.com/address/${campaignImplAddress}`);
    console.log("\n  Next: Verify contracts (optional):");
    console.log(`  npx hardhat verify --network polygon_amoy ${campaignImplAddress}`);
    console.log(`  npx hardhat verify --network polygon_amoy ${factoryAddress} "${campaignImplAddress}"`);
  }
  console.log("=".repeat(60) + "\n");
}

/**
 * Writes or replaces key=value pairs in an .env file.
 * Existing keys are updated in-place; new keys are appended.
 */
function writeEnvVars(filePath, vars, label) {
  try {
    let contents = "";
    if (fs.existsSync(filePath)) {
      contents = fs.readFileSync(filePath, "utf8");
    }

    for (const [key, value] of Object.entries(vars)) {
      const re = new RegExp(`^(# *)?${key}=.*$`, "m");
      if (re.test(contents)) {
        contents = contents.replace(re, `${key}=${value}`);
      } else {
        contents += `\n${key}=${value}`;
      }
    }

    fs.writeFileSync(filePath, contents.trimEnd() + "\n", "utf8");
    const written = Object.keys(vars).join(", ");
    console.log(`   ✔ Updated ${label}/.env [${written}]`);
  } catch (err) {
    console.warn(`   ⚠ Failed to update ${label}/.env: ${err.message}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
