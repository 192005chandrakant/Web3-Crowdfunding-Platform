const { isPinataConfigured, pinBuffer } = require("../services/pinataService");
const { recordProofSubmission } = require("../services/campaignService");

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain"
]);

const MAX_PROOF_SIZE_BYTES = 10 * 1024 * 1024;

async function uploadProof(req, res) {
  if (!isPinataConfigured()) {
    return res.status(503).json({
      success: false,
      message: "Pinata IPFS storage is not configured on this server"
    });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, message: "Proof file is required" });
  }

  if (req.file.size > MAX_PROOF_SIZE_BYTES) {
    return res.status(400).json({
      success: false,
      message: "Proof file exceeds 10 MB limit"
    });
  }

  if (!ALLOWED_MIME_TYPES.has(req.file.mimetype)) {
    return res.status(400).json({
      success: false,
      message: "Unsupported file type. Allowed: PDF, JPEG, PNG, WEBP, TXT"
    });
  }

  const metadata = req.validated.body || {};
  const { cid, fileName } = await pinBuffer(req.file.buffer, req.file.originalname, {
    contentType: req.file.mimetype,
    keyvalues: {
      uploadType: "milestone-proof",
      contractAddress: metadata.contractAddress ? metadata.contractAddress.toLowerCase() : "",
      milestoneIndex: metadata.milestoneIndex !== undefined ? String(metadata.milestoneIndex) : "",
      submittedBy: req.walletAddress || req.clerkUserId || "unknown"
    }
  });

  let campaign = null;
  if (metadata.contractAddress && metadata.milestoneIndex !== undefined) {
    campaign = await recordProofSubmission({
      contractAddress: metadata.contractAddress.toLowerCase(),
      milestoneIndex: metadata.milestoneIndex,
      cid,
      submittedBy: req.walletAddress || "unknown"
    });
  }

  res.status(201).json({
    success: true,
    cid,
    fileName,
    ipfsUrl: `ipfs://${cid}`,
    gatewayUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
    campaign
  });
}

module.exports = { uploadProof };
