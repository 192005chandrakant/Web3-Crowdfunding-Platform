const { uploadImageBuffer, isCloudinaryConfigured } = require("../services/cloudinaryService");

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ETH_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

async function uploadCampaignCover(req, res) {
  if (!isCloudinaryConfigured()) {
    return res.status(503).json({
      success: false,
      message: "Cloudinary is not configured on this server"
    });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, message: "Image file is required" });
  }

  if (req.file.size > MAX_IMAGE_SIZE_BYTES) {
    return res.status(400).json({
      success: false,
      message: "Image exceeds 5 MB limit"
    });
  }

  if (!ALLOWED_IMAGE_TYPES.has(req.file.mimetype)) {
    return res.status(400).json({
      success: false,
      message: "Unsupported image type. Allowed: JPEG, PNG, WEBP"
    });
  }

  const contractAddress = String(req.body?.contractAddress || "").trim().toLowerCase();
  if (contractAddress && !ETH_ADDRESS_PATTERN.test(contractAddress)) {
    return res.status(400).json({
      success: false,
      message: "contractAddress must be a valid 0x campaign address"
    });
  }

  const uploadScope = contractAddress || "pending";
  const result = await uploadImageBuffer(req.file.buffer, {
    folder: `milestonechain/campaign-covers/${uploadScope}`,
    filename: req.file.originalname,
    context: {
      uploadType: "campaign-cover",
      contractAddress: contractAddress || "",
      uploadedBy: req.walletAddress || req.clerkUserId || "unknown"
    }
  });

  res.status(201).json({
    success: true,
    coverImageUrl: result.url,
    publicId: result.publicId,
    assetId: result.assetId,
    width: result.width,
    height: result.height,
    bytes: result.bytes,
    format: result.format
  });
}

module.exports = { uploadCampaignCover };
