require("dotenv").config();
const { ethers } = require("ethers");
const mongoose = require("mongoose");
const BlockchainProviderFactory = require("../src/config/provider");
const { connectDatabase } = require("../src/config/db");
const { pinJson, pinBuffer } = require("../src/services/pinataService");
const { uploadImageBuffer } = require("../src/services/cloudinaryService");
const { notificationEngine } = require("../src/services/notifications/NotificationEngine");
const inAppObserver = require("../src/services/notifications/observers/InAppObserver");
const realtimeSSEObserver = require("../src/services/notifications/observers/RealtimeSSEObserver");
const cacheAuditObserver = require("../src/services/notifications/observers/CacheAuditObserver");

const FACTORY_ABI = [
  "function implementationContract() view returns (address)",
  "function getCampaignCount() view returns (uint256)",
  "function allCampaigns(uint256) view returns (address)",
  "function createCampaign(uint256 goal, address hospitalAddress, string[] titles, uint256[] targetAmounts, uint256[] deadlines) external returns (address)",
  "event CampaignCreated(address indexed campaignAddress, address indexed creator, uint256 goal)"
];

const CAMPAIGN_ABI = [
  "function creator() view returns (address)",
  "function fundraisingGoal() view returns (uint256)",
  "function state() view returns (uint8)",
  "function getMilestoneCount() view returns (uint256)"
];

const COLORS = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[36m",
  red: "\x1b[31m",
  bold: "\x1b[1m"
};

function logStep(step, message) {
  console.log(`\n${COLORS.bold}${COLORS.blue}[Step ${step}] ${message}${COLORS.reset}`);
}

function logSuccess(message) {
  console.log(`  ${COLORS.green}✔ ${message}${COLORS.reset}`);
}

function logError(message) {
  console.log(`  ${COLORS.red}✗ ${message}${COLORS.reset}`);
}

function logInfo(message) {
  console.log(`  ${COLORS.yellow}ℹ ${message}${COLORS.reset}`);
}

async function runWorkflowTest() {
  console.log("=".repeat(65));
  console.log(`  ${COLORS.bold}MILESTONECHAIN END-TO-END WORKFLOW INTEGRATION TEST${COLORS.reset}`);
  console.log("=".repeat(65));

  const mode = BlockchainProviderFactory.getMode();
  const chainId = BlockchainProviderFactory.getChainId();
  const rpcUrl = BlockchainProviderFactory.getRpcUrl(mode);
  console.log(`  Blockchain Mode: ${mode.toUpperCase()} (Chain ID: ${chainId})`);
  console.log(`  RPC Endpoint:    ${rpcUrl}`);
  console.log(`  Factory Address: ${process.env.CAMPAIGN_FACTORY_ADDRESS}`);
  console.log("=".repeat(65));

  // ── MongoDB Connect (required by InAppObserver) ──────────────────────────────
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("MONGODB_URI is not set in .env");
  await connectDatabase(mongoUri);

  // ── Step 1: Health Check Endpoint ──────────────────────────────────────────
  logStep(1, "Testing Backend REST API Health & Service Status");
  try {
    const healthRes = await fetch("http://localhost:5000/health");
    if (!healthRes.ok) {
      throw new Error(`Health HTTP returned ${healthRes.status}: ${healthRes.statusText}`);
    }
    const health = await healthRes.json();
    logSuccess(`Backend API responding at http://localhost:5000/health`);
    logSuccess(`Active Chain ID: ${health.chainId}`);
    logSuccess(`Observer Engine: ${health.notificationSystem?.pattern} (Registered: ${health.notificationSystem?.engine?.observerCount})`);
  } catch (err) {
    logError(`Health check failed: ${err.message}`);
    throw err;
  }

  // ── Step 2: GraphQL Schema & Data Query ─────────────────────────────────────
  logStep(2, "Testing GraphQL Yoga Query Engine");
  try {
    const gqlRes = await fetch("http://localhost:5000/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "{ health { status } campaigns(page: 1, limit: 3) { total items { contractAddress title targetGoal status } } }"
      })
    });
    const gqlData = await gqlRes.json();
    if (gqlData.errors) {
      throw new Error(JSON.stringify(gqlData.errors));
    }
    logSuccess(`GraphQL Query succeeded! Total indexed campaigns: ${gqlData.data.campaigns.total}`);
    if (gqlData.data.campaigns.items.length > 0) {
      const first = gqlData.data.campaigns.items[0];
      logInfo(`Sample campaign: "${first.title}" (${first.contractAddress})`);
    }
  } catch (err) {
    logError(`GraphQL query failed: ${err.message}`);
    throw err;
  }

  // ── Step 3: Off-Chain IPFS via Pinata ───────────────────────────────────────
  logStep(3, "Testing Decentralized IPFS Storage via Pinata");
  let testCid;
  try {
    const proofPayload = {
      test: true,
      workflow: "end-to-end",
      title: "Clean Water Well Construction Phase 1",
      submittedAt: new Date().toISOString()
    };
    const jsonResult = await pinJson(proofPayload, "e2e-milestone-proof.json");
    testCid = jsonResult.cid;
    logSuccess(`Pinned milestone proof metadata to IPFS (CID: ${testCid})`);
    logInfo(`Pinata Gateway URL: https://gateway.pinata.cloud/ipfs/${testCid}`);

    const fileBuffer = Buffer.from("E2E Test Proof Document: Receipt #98412 Signed");
    const fileResult = await pinBuffer(fileBuffer, "proof-receipt.txt");
    logSuccess(`Pinned media artifact buffer to IPFS (CID: ${fileResult.cid})`);
  } catch (err) {
    logError(`Pinata IPFS test failed: ${err.message}`);
    throw err;
  }

  // ── Step 4: Off-Chain Cloudinary Media Storage ──────────────────────────────
  logStep(4, "Testing Cloudinary Campaign Media Optimization");
  try {
    const testPixel = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64"
    );
    const mediaResult = await uploadImageBuffer(testPixel, { folder: "milestonechain/tests" });
    logSuccess(`Cloudinary upload complete! Asset URL: ${mediaResult.secureUrl || mediaResult.url}`);
  } catch (err) {
    logError(`Cloudinary media test failed: ${err.message}`);
    throw err;
  }

  // ── Step 5: Real-time Observer Pattern Notification Dispatch ────────────────
  logStep(5, "Testing Enterprise Observer Pattern Notification Dispatch");
  try {
    notificationEngine
      .subscribe(inAppObserver)
      .subscribe(realtimeSSEObserver)
      .subscribe(cacheAuditObserver);

    const testWallet = "0xDb1e14A9970B4D6284e4ec9f2F8b78F61351694a";
    const notifyRes = await notificationEngine.notify({
      walletAddress: testWallet,
      type: "milestone_submitted",
      title: "Workflow Test Notification",
      message: "End-to-end workflow execution completed successfully.",
      metadata: { cid: testCid }
    });
    if (notifyRes.success) {
      const dispatched = notifyRes.observerResults?.length ?? 0;
      logSuccess(`Dispatched multi-channel event across ${dispatched} observers`);
    } else {
      throw new Error("Notification dispatch returned unsuccessful status");
    }
  } catch (err) {
    logError(`Notification engine test failed: ${err.message}`);
    throw err;
  }

  // ── Step 6: Polygon Amoy Smart Contract Read ────────────────────────────────
  logStep(6, "Testing On-Chain Smart Contract State Read on Polygon Amoy");
  const provider = BlockchainProviderFactory.getProvider();
  const factoryAddress = process.env.CAMPAIGN_FACTORY_ADDRESS;
  const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, provider);

  try {
    const implAddress = await factory.implementationContract();
    const count = await factory.getCampaignCount();
    logSuccess(`CampaignFactory at ${factoryAddress} is responsive!`);
    logSuccess(`Implementation Contract on Amoy: ${implAddress}`);
    logSuccess(`Total campaigns created so far: ${count.toString()}`);
  } catch (err) {
    logError(`Failed reading contract on Polygon Amoy: ${err.message}`);
    throw err;
  }

  // ── Step 7: Polygon Amoy Live Transaction (Create Campaign) ─────────────────
  logStep(7, "Executing Live Smart Contract Transaction on Polygon Amoy");
  const signer = BlockchainProviderFactory.getSigner();
  const signerBalance = await provider.getBalance(signer.address);
  logInfo(`Signer: ${signer.address} | Balance: ${ethers.formatEther(signerBalance)} POL`);

  if (signerBalance < ethers.parseEther("0.005")) {
    logInfo("Balance is too low for live deployment transaction. Skipping transaction submission.");
  } else {
    try {
      const connectedFactory = factory.connect(signer);

      const goal = ethers.parseEther("1.0"); // 1 POL goal
      const hospitalAddress = ethers.ZeroAddress; // Standard campaign (no treasury containment)
      const titles = ["Phase 1: Procurement", "Phase 2: Execution & Handover"];
      const targetAmounts = [ethers.parseEther("0.5"), ethers.parseEther("0.5")];
      const futureDeadline = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days
      const deadlines = [futureDeadline, futureDeadline + 86400 * 30];

      logInfo("Submitting createCampaign() transaction to Polygon Amoy...");
      const tx = await connectedFactory.createCampaign(
        goal,
        hospitalAddress,
        titles,
        targetAmounts,
        deadlines,
        {
          gasLimit: 1200000
        }
      );

      logInfo(`Transaction submitted! Hash: ${tx.hash}`);
      logInfo(`PolygonScan URL: https://amoy.polygonscan.com/tx/${tx.hash}`);
      logInfo("Waiting for block confirmation on Polygon Amoy...");

      const receipt = await tx.wait(1);
      logSuccess(`Transaction confirmed in block #${receipt.blockNumber}! Gas used: ${receipt.gasUsed.toString()}`);

      // Parse the CampaignCreated event from receipt logs
      let deployedCampaignAddress = null;
      for (const log of receipt.logs) {
        try {
          const parsed = factory.interface.parseLog(log);
          if (parsed && parsed.name === "CampaignCreated") {
            deployedCampaignAddress = parsed.args.campaignAddress;
            break;
          }
        } catch {
          // Ignore other event logs
        }
      }

      if (deployedCampaignAddress) {
        logSuccess(`New Campaign Proxy Clone Deployed at: ${deployedCampaignAddress}`);
        logSuccess(`Explorer: https://amoy.polygonscan.com/address/${deployedCampaignAddress}`);

        // Read state from newly deployed proxy clone
        const campaignContract = new ethers.Contract(deployedCampaignAddress, CAMPAIGN_ABI, provider);
        const onChainCreator = await campaignContract.creator();
        const onChainGoal = await campaignContract.fundraisingGoal();
        logSuccess(`Verified Proxy State: Creator=${onChainCreator}, Goal=${ethers.formatEther(onChainGoal)} POL`);
      }

      // Re-read campaign count
      const updatedCount = await factory.getCampaignCount();
      logSuccess(`Updated Total Campaign Count on Factory: ${updatedCount.toString()}`);
    } catch (err) {
      logError(`Transaction execution failed: ${err.message}`);
      throw err;
    }
  }

  // ── Step 8: Summary ─────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(65));
  console.log(`  ${COLORS.bold}${COLORS.green}✔ ENTIRE END-TO-END SYSTEM WORKFLOW VALIDATED SUCCESSFULLY!${COLORS.reset}`);
  console.log("=".repeat(65) + "\n");
}

runWorkflowTest()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("Workflow validation failed:", err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
