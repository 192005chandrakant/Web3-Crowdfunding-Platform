const express = require("express");
const multer = require("multer");
const { uploadProof } = require("../controllers/campaignController");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/", upload.single("file"), uploadProof);

module.exports = router;