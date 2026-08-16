const express = require("express");
const multer = require("multer");
const { asyncHandler } = require("../middleware/asyncHandler");
const { requireSiweAuth } = require("../middleware/siweAuth");
const { requireRole } = require("../middleware/roleAccess");
const { uploadCampaignCover } = require("../controllers/mediaController");

const router = express.Router();
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 }
});

router.post(
	"/campaign-cover",
	requireSiweAuth,
	requireRole("creator", { requireActive: false }),
	upload.single("file"),
	asyncHandler(uploadCampaignCover)
);

module.exports = router;
