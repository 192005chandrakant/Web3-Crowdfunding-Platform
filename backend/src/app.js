require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { connectDatabase } = require("./config/db");
const campaignRoutes = require("./routes/campaignRoutes");
const uploadRoutes = require("./routes/uploadRoutes");

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || true,
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/campaigns", campaignRoutes);
app.use("/api/upload-proof", uploadRoutes);

app.use((error, _req, res, _next) => {
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: error.message || "Internal Server Error",
    details: error.details || null
  });
});

async function startServer() {
  await connectDatabase(process.env.MONGODB_URI);
  app.listen(port, () => {
    console.log(`Backend API listening on port ${port}`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { app, startServer };