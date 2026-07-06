const {
  createOrUpdateCampaign,
  getCampaignWithBlockchainState,
  listCampaigns,
  updateCampaignMetadata
} = require("../services/campaignService");

async function createCampaign(req, res) {
  const payload = req.validated.body;
  const campaign = await createOrUpdateCampaign({
    ...payload,
    contractAddress: payload.contractAddress.toLowerCase(),
    creatorAddress: payload.creatorAddress.toLowerCase(),
    hospitalAddress: payload.hospitalAddress ? payload.hospitalAddress.toLowerCase() : null
  });

  res.status(201).json({ success: true, campaign });
}

async function getCampaignByAddress(req, res) {
  const { address } = req.validated.params;
  const normalizedAddress = address.toLowerCase();
  const result = await getCampaignWithBlockchainState(normalizedAddress);

  if (!result) {
    return res.status(404).json({ success: false, message: "Campaign not found" });
  }

  res.json({
    success: true,
    campaign: result.campaign,
    blockchainState: result.blockchainState
  });
}

async function listCampaignsHandler(req, res) {
  const query = req.validated.query;
  const result = await listCampaigns({
    page: query.page,
    limit: query.limit,
    category: query.category,
    creatorAddress: query.creator ? query.creator.toLowerCase() : undefined,
    search: query.search
  });

  res.json({ success: true, ...result });
}

async function patchCampaign(req, res) {
  const { address } = req.validated.params;
  const updates = req.validated.body;
  const campaign = await updateCampaignMetadata(address.toLowerCase(), updates);

  if (!campaign) {
    return res.status(404).json({ success: false, message: "Campaign not found" });
  }

  res.json({ success: true, campaign });
}

module.exports = {
  createCampaign,
  getCampaignByAddress,
  listCampaignsHandler,
  patchCampaign
};
