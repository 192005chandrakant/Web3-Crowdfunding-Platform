const express = require("express");
const { createCampaign, getCampaignByAddress } = require("../controllers/campaignController");

const router = express.Router();

router.post("/", createCampaign);
router.get("/:address", getCampaignByAddress);

module.exports = router;