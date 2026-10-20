const { ethers } = require("ethers");
const http = require("http");
const BlockchainEvent = require("../models/BlockchainEvent");
const { getEnvConfig } = require("../config/env");
const { processEvent } = require("./eventProcessorService");

const FACTORY_ABI = [
  "event CampaignCreated(address indexed campaignAddress, address indexed creator, uint256 goal)"
];

const CAMPAIGN_ABI = [
  "event ContributionReceived(address indexed contributor, uint256 amount, uint256 qvPower)",
  "event MilestoneProofSubmitted(uint256 indexed milestoneIndex, string cid, uint256 snapshotTotalQVWeight)",
  "event MilestoneVoted(uint256 indexed milestoneIndex, address indexed voter, bool support, uint256 qvWeight, uint256 rawContribution)",
  "event TrancheExecuted(uint256 indexed milestoneIndex, address indexed recipient, uint256 amount)",
  "event RefundClaimed(address indexed contributor, uint256 amount)"
];

let provider = null;
let registeredCampaigns = new Set();

/**
 * Probe whether the JSON-RPC endpoint is reachable before creating a provider.
 * Returns true if the node responds, false if the connection is refused / times out.
 * This prevents flooding the console with ECONNREFUSED / JsonRpcProvider retry
 * messages when Ganache has not been started yet.
 */
function isRpcReachable(rpcUrl) {
  return new Promise((resolve) => {
    try {
      const url = new URL(rpcUrl);
      const port = parseInt(url.port, 10) || (url.protocol === "https:" ? 443 : 80);
      const req = http.request(
        {
          hostname: url.hostname,
          port,
          method: "POST",
          path: url.pathname || "/",
          timeout: 2000
        },
        () => resolve(true)
      );
      req.on("error", () => resolve(false));
      req.on("timeout", () => { req.destroy(); resolve(false); });
      // Send a minimal JSON-RPC payload so the server actually processes the request
      req.write(JSON.stringify({ jsonrpc: "2.0", method: "net_version", params: [], id: 1 }));
      req.end();
    } catch {
      resolve(false);
    }
  });
}

function getProvider() {
  if (provider) return provider;
  const { rpcUrl } = getEnvConfig();
  provider = new ethers.JsonRpcProvider(rpcUrl);
  return provider;
}

async function ensureRecordedAndProcess(eventName, contractAddress, txHash, blockNumber, data) {
  try {
    const tx = txHash.toLowerCase();
    const existing = await BlockchainEvent.findOne({ txHash: tx }).lean();
    if (existing) return;

    const ev = await BlockchainEvent.create({
      eventName,
      contractAddress: contractAddress.toLowerCase(),
      txHash: tx,
      blockNumber,
      chainId: Number(process.env.CHAIN_ID) || 80002,
      data: data || {}
    });

    // Fire off processing asynchronously
    processEvent(ev.toObject())
      .then(async () => {
        await BlockchainEvent.findByIdAndUpdate(ev._id, { $set: { processedAt: new Date() } });
      })
      .catch(async (err) => {
        console.error(`[ganache-listener] Error processing event ${ev._id}:`, err.message);
        await BlockchainEvent.findByIdAndUpdate(ev._id, { $set: { processingError: err.message } });
      });
  } catch (err) {
    console.error("[ganache-listener] ensureRecordedAndProcess error:", err.message);
  }
}

async function registerCampaignListeners(campaignAddress) {
  if (registeredCampaigns.has(campaignAddress.toLowerCase())) return;
  const prov = getProvider();
  const contract = new ethers.Contract(campaignAddress, CAMPAIGN_ABI, prov);

  contract.on("ContributionReceived", (contributor, amount, qvPower, event) => {
    ensureRecordedAndProcess("ContributionReceived", campaignAddress, event.transactionHash, event.blockNumber, {
      contributor,
      amount: amount.toString(),
      amountWei: amount.toString(),
      qvPower: qvPower.toString()
    });
  });

  contract.on("MilestoneProofSubmitted", (milestoneIndex, cid, snapshotTotalQVWeight, event) => {
    ensureRecordedAndProcess("MilestoneProofSubmitted", campaignAddress, event.transactionHash, event.blockNumber, {
      milestoneIndex: Number(milestoneIndex),
      cid,
      snapshotTotalQVWeight: snapshotTotalQVWeight.toString()
    });
  });

  contract.on("MilestoneVoted", (milestoneIndex, voter, support, qvWeight, rawContribution, event) => {
    ensureRecordedAndProcess("MilestoneVoted", campaignAddress, event.transactionHash, event.blockNumber, {
      milestoneIndex: Number(milestoneIndex),
      voter,
      support,
      qvWeight: qvWeight.toString(),
      rawContribution: rawContribution.toString()
    });
  });

  contract.on("TrancheExecuted", (milestoneIndex, recipient, amount, event) => {
    ensureRecordedAndProcess("TrancheExecuted", campaignAddress, event.transactionHash, event.blockNumber, {
      milestoneIndex: Number(milestoneIndex),
      recipient,
      amount: amount.toString()
    });
  });

  contract.on("RefundClaimed", (contributor, amount, event) => {
    ensureRecordedAndProcess("RefundClaimed", campaignAddress, event.transactionHash, event.blockNumber, {
      contributor,
      amount: amount.toString()
    });
  });

  registeredCampaigns.add(campaignAddress.toLowerCase());
  console.log(`[ganache-listener] Registered campaign listeners for ${campaignAddress}`);
}

async function startGanacheListener() {
  const env = getEnvConfig();
  const chainId = env.chainId;
  if (chainId !== 1337 && chainId !== 80002) {
    console.log("[ganache-listener] Skipping listener: not running on Ganache (chainId not 1337 or 80002)");
    return;
  }

  // -- Reachability probe ----------------------------------------------------
  // Only attempt to connect if the local RPC node is actually up.
  // This prevents flooding the console with ECONNREFUSED / JsonRpcProvider
  // retry messages when Ganache has not been started yet.
  const reachable = await isRpcReachable(env.rpcUrl);
  if (!reachable) {
    console.warn(
      `[ganache-listener] WARNING: RPC node not reachable at ${env.rpcUrl}.\n` +
      `   Start Ganache first (Option B - Amoy chain ID):\n` +
      `     ganache --server.host 127.0.0.1 --server.port 8545 --chain.chainId ${chainId}\n` +
      `   Then deploy contracts:\n` +
      `     cd blockchain && npm run deploy:ganache-amoy\n` +
      `   Blockchain event listener will be INACTIVE for this session.`
    );
    return;
  }
  // --------------------------------------------------------------------------

  const prov = getProvider();
  const factoryAddress =
    process.env.CAMPAIGN_FACTORY_ADDRESS ||
    process.env.VITE_FACTORY_CONTRACT_ADDRESS ||
    process.env.FACTORY_CONTRACT_ADDRESS;
  if (!factoryAddress) {
    console.warn("[ganache-listener] No factory address configured (CAMPAIGN_FACTORY_ADDRESS, VITE_FACTORY_CONTRACT_ADDRESS or FACTORY_CONTRACT_ADDRESS)");
  } else {
    const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, prov);
    factory.on("CampaignCreated", async (campaignAddress, creator, goal, event) => {
      console.log(`[ganache-listener] CampaignCreated: ${campaignAddress} by ${creator}`);
      await ensureRecordedAndProcess("CampaignCreated", campaignAddress, event.transactionHash, event.blockNumber, {
        creator,
        goal: goal.toString()
      });
      await registerCampaignListeners(campaignAddress);
    });
    console.log(`[ganache-listener] Listening for CampaignCreated on factory ${factoryAddress}`);
  }

  // Scan existing campaigns from DB and register their listeners (idempotent)
  const Campaign = require("../models/Campaign");
  const campaigns = await Campaign.find({}).lean().select("contractAddress");
  for (const c of campaigns) {
    if (c.contractAddress) {
      try {
        await registerCampaignListeners(c.contractAddress);
      } catch (err) {
        console.warn(`[ganache-listener] Failed registering ${c.contractAddress}:`, err.message);
      }
    }
  }

  // Historical sync: fetch past events so transactions mined before the listener
  // started are still processed.
  try {
    const latestBlock = await prov.getBlockNumber();
    const fromBlock = Number(process.env.GANACHE_SYNC_FROM_BLOCK || 0);

    if (factoryAddress) {
      const factoryIface = new ethers.Interface(FACTORY_ABI);
      const logs = await prov.getLogs({ address: factoryAddress, fromBlock, toBlock: latestBlock });
      for (const log of logs) {
        try {
          const parsed = factoryIface.parseLog(log);
          if (parsed && parsed.name === "CampaignCreated") {
            const campaignAddress = parsed.args.campaignAddress || parsed.args[0];
            await ensureRecordedAndProcess("CampaignCreated", campaignAddress, log.transactionHash, log.blockNumber, {
              creator: parsed.args.creator || parsed.args[1],
              goal: (parsed.args.goal || parsed.args[2]).toString()
            });
            await registerCampaignListeners(campaignAddress);
          }
        } catch (e) {
          // ignore unparsable logs
        }
      }
    }

    const campaignIface = new ethers.Interface(CAMPAIGN_ABI);
    for (const c of campaigns) {
      const addr = c.contractAddress;
      try {
        const logs = await prov.getLogs({ address: addr, fromBlock, toBlock: latestBlock });
        for (const log of logs) {
          try {
            const parsed = campaignIface.parseLog(log);
            if (!parsed) continue;
            const name = parsed.name;
            const data = {};
            if (name === "ContributionReceived") {
              data.contributor = parsed.args.contributor || parsed.args[0];
              data.amount = (parsed.args.amount || parsed.args[1]).toString();
              data.amountWei = data.amount;
              data.qvPower = (parsed.args.qvPower || parsed.args[2]).toString();
            } else if (name === "MilestoneProofSubmitted") {
              data.milestoneIndex = Number(parsed.args.milestoneIndex || parsed.args[0]);
              data.cid = parsed.args.cid || parsed.args[1];
              data.snapshotTotalQVWeight = (parsed.args.snapshotTotalQVWeight || parsed.args[2]).toString();
            } else if (name === "MilestoneVoted") {
              data.milestoneIndex = Number(parsed.args.milestoneIndex || parsed.args[0]);
              data.voter = parsed.args.voter || parsed.args[1];
              data.support = parsed.args.support || parsed.args[2];
              data.qvWeight = (parsed.args.qvWeight || parsed.args[3]).toString();
              data.rawContribution = (parsed.args.rawContribution || parsed.args[4]).toString();
            } else if (name === "TrancheExecuted") {
              data.milestoneIndex = Number(parsed.args.milestoneIndex || parsed.args[0]);
              data.recipient = parsed.args.recipient || parsed.args[1];
              data.amount = (parsed.args.amount || parsed.args[2]).toString();
            } else if (name === "RefundClaimed") {
              data.contributor = parsed.args.contributor || parsed.args[0];
              data.amount = (parsed.args.amount || parsed.args[1]).toString();
            } else {
              continue;
            }
            await ensureRecordedAndProcess(name, addr, log.transactionHash, log.blockNumber, data);
          } catch (e) {
            // ignore parsing errors
          }
        }
      } catch (err) {
        console.warn(`[ganache-listener] Failed historical logs for ${addr}:`, err.message);
      }
    }
  } catch (err) {
    console.warn("[ganache-listener] Historical sync failed:", err.message);
  }

  console.log("[ganache-listener] Ganache event listener started and historical sync complete.");
}

module.exports = { startGanacheListener };
