const { ethers } = require("ethers");
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
      // record factory event and process
      await ensureRecordedAndProcess("CampaignCreated", campaignAddress, event.transactionHash, event.blockNumber, {
        creator,
        goal: goal.toString()
      });
      // register listeners for the new campaign
      await registerCampaignListeners(campaignAddress);
    });
    console.log(`[ganache-listener] Listening for CampaignCreated on factory ${factoryAddress}`);
  }

  // Optionally: scan existing campaigns from DB and register their listeners
  // (lightweight, idempotent)
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

  // Also perform a historical sync: fetch past factory and campaign events so
  // any transactions mined before the listener started are still processed.
  try {
    const latestBlock = await prov.getBlockNumber();
    const fromBlock = Number(process.env.GANACHE_SYNC_FROM_BLOCK || 0);

    if (factoryAddress) {
      const factoryIface = new ethers.Interface(FACTORY_ABI);
      const logs = await prov.getLogs({ address: factoryAddress, fromBlock, toBlock: latestBlock });
      for (const log of logs) {
        try {
          const parsed = factoryIface.parseLog(log);
          if (parsed && parsed.name === 'CampaignCreated') {
            const campaignAddress = parsed.args.campaignAddress || parsed.args[0];
            await ensureRecordedAndProcess('CampaignCreated', campaignAddress, log.transactionHash, log.blockNumber, {
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

    // Historical sync for each campaign: fetch ContributionReceived/MilestoneVoted/etc.
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
            // normalize fields for event processor
            if (name === 'ContributionReceived') {
              data.contributor = parsed.args.contributor || parsed.args[0];
              data.amount = (parsed.args.amount || parsed.args[1]).toString();
              data.amountWei = data.amount;
              data.qvPower = (parsed.args.qvPower || parsed.args[2]).toString();
            } else if (name === 'MilestoneProofSubmitted') {
              data.milestoneIndex = Number(parsed.args.milestoneIndex || parsed.args[0]);
              data.cid = parsed.args.cid || parsed.args[1];
              data.snapshotTotalQVWeight = (parsed.args.snapshotTotalQVWeight || parsed.args[2]).toString();
            } else if (name === 'MilestoneVoted') {
              data.milestoneIndex = Number(parsed.args.milestoneIndex || parsed.args[0]);
              data.voter = parsed.args.voter || parsed.args[1];
              data.support = parsed.args.support || parsed.args[2];
              data.qvWeight = (parsed.args.qvWeight || parsed.args[3]).toString();
              data.rawContribution = (parsed.args.rawContribution || parsed.args[4]).toString();
            } else if (name === 'TrancheExecuted') {
              data.milestoneIndex = Number(parsed.args.milestoneIndex || parsed.args[0]);
              data.recipient = parsed.args.recipient || parsed.args[1];
              data.amount = (parsed.args.amount || parsed.args[2]).toString();
            } else if (name === 'RefundClaimed') {
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
    console.warn('[ganache-listener] Historical sync failed:', err.message);
  }

  console.log("[ganache-listener] Ganache event listener started and historical sync complete.");
}

module.exports = { startGanacheListener };
