const express = require("express");
const multer = require("multer");
const { asyncHandler } = require("../middleware/asyncHandler");
const { validateRequest } = require("../middleware/validateRequest");
const { requireSiweAuth } = require("../middleware/siweAuth");
const { requireRole } = require("../middleware/roleAccess");
const { proofUploadMetadataSchema } = require("../config/validators");
const { uploadProof } = require("../controllers/uploadController");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/",
  requireSiweAuth,
  upload.single("file"),
  validateRequest(proofUploadMetadataSchema, "body"),
  requireRole("creator"),
  asyncHandler(uploadProof)
);

module.exports = router;
