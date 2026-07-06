const express = require("express");
const multer = require("multer");
const { asyncHandler } = require("../middleware/asyncHandler");
const { uploadCampaignCover } = require("../controllers/mediaController");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/campaign-cover", upload.single("file"), asyncHandler(uploadCampaignCover));

module.exports = router;
