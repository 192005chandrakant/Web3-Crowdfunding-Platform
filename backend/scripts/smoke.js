const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const filesToCompile = [
  "src/app.js",
  "src/routes/adminRoutes.js",
  "src/routes/campaignRoutes.js",
  "src/routes/donationRoutes.js",
  "src/routes/userRoutes.js",
  "src/routes/notificationRoutes.js",
  "src/controllers/adminController.js",
  "src/controllers/campaignController.js",
  "src/controllers/donationController.js",
  "src/controllers/userController.js",
  "src/controllers/notificationController.js"
];

function compile(relativePath) {
  const absolutePath = path.join(root, relativePath);
  const source = fs.readFileSync(absolutePath, "utf8");
  new Function("require", "module", "exports", "__filename", "__dirname", source);
  console.log(`[ok] syntax ${relativePath}`);
}

function assertNoCampaignCoverUpdateConflict() {
  const { buildCampaignUpsertUpdate } = require(path.join(root, "src/services/campaignService"));
  const update = buildCampaignUpsertUpdate({
    contractAddress: "0x1111111111111111111111111111111111111111",
    creatorAddress: "0x2222222222222222222222222222222222222222",
    title: "Clean Water Campaign",
    descriptionMarkdown: "A long enough campaign story for backend validation context.",
    targetGoal: 10,
    milestones: [{ title: "Phase 1", targetAmount: 10, deadline: "1893456000" }],
    coverImageUrl: " https://res.cloudinary.com/demo/image/upload/sample.webp "
  });

  if (update.$set.coverImageUrl !== "https://res.cloudinary.com/demo/image/upload/sample.webp") {
    throw new Error("coverImageUrl should be trimmed into $set");
  }

  if (update.$setOnInsert?.coverImageUrl !== undefined) {
    throw new Error("coverImageUrl must not be present in both $set and $setOnInsert");
  }

  const insertDefaultUpdate = buildCampaignUpsertUpdate({
    contractAddress: "0x1111111111111111111111111111111111111111",
    creatorAddress: "0x2222222222222222222222222222222222222222",
    title: "Clean Water Campaign",
    descriptionMarkdown: "A long enough campaign story for backend validation context.",
    targetGoal: 10,
    milestones: [{ title: "Phase 1", targetAmount: 10, deadline: "1893456000" }],
    coverImageUrl: ""
  });

  if (insertDefaultUpdate.$set.coverImageUrl !== undefined) {
    throw new Error("empty coverImageUrl should not overwrite existing campaigns");
  }

  if (insertDefaultUpdate.$setOnInsert?.coverImageUrl !== "") {
    throw new Error("new campaigns without an image should default coverImageUrl on insert");
  }

  console.log("[ok] campaign cover image upsert has no duplicate MongoDB paths");
}

function main() {
  for (const file of filesToCompile) {
    compile(file);
  }

  assertNoCampaignCoverUpdateConflict();

  const { app, startServer } = require(path.join(root, "src/app"));
  if (!app || typeof app.use !== "function") {
    throw new Error("Express app export is missing or invalid");
  }
  if (typeof startServer !== "function") {
    throw new Error("startServer export is missing or invalid");
  }

  console.log("[ok] backend app imports successfully");
  console.log("Backend smoke checks passed.");
  process.exit(0);
}

try {
  main();
} catch (error) {
  console.error("Backend smoke checks failed:");
  console.error(error.stack || error.message);
  process.exit(1);
}


