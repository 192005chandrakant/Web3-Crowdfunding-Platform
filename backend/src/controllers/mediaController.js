const { uploadImageBuffer, isCloudinaryConfigured } = require("../services/cloudinaryService");

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

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

  const result = await uploadImageBuffer(req.file.buffer, {
    folder: "milestonechain/campaign-covers"
  });

  res.status(201).json({
    success: true,
    coverImageUrl: result.url,
    publicId: result.publicId,
    width: result.width,
    height: result.height
  });
}

module.exports = { uploadCampaignCover };
