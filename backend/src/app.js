// Override DNS to use Google's public resolver — fixes local ISP DNS failures
// with MongoDB Atlas SRV records (ECONNREFUSED on querySrv)
const dns = require("dns");
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch (err) {
  // Safe ignore in environments where custom DNS servers cannot be set (e.g. cloud containers)
}

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createYoga } = require("graphql-yoga");
const { connectDatabase } = require("./config/db");
const { getEnvConfig } = require("./config/env");
const { schema } = require("./graphql/schema");
const { errorHandler } = require("./middleware/errorHandler");
const { notFoundHandler } = require("./middleware/notFound");
const campaignRoutes = require("./routes/campaignRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const userRoutes = require("./routes/userRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const mediaRoutes = require("./routes/mediaRoutes");
const donationRoutes = require("./routes/donationRoutes");
const webhookRoutes = require("./routes/webhookRoutes");
const adminRoutes = require("./routes/adminRoutes");
const votingRoutes = require("./routes/votingRoutes");
const { serviceManager } = require("./services/serviceManager");

const app = express();
const env = getEnvConfig();
const port = env.port;

// ── Dynamic CORS: Supports Vercel preview/production, Render, and Localhost ──
const configuredOrigins = (env.allowedOrigin || "")
  .split(",")
  .map((o) => o.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const defaultAllowed = [
  `http://localhost:${port}`,
  `http://127.0.0.1:${port}`,
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
  "https://web3-crowdfunding-platform.onrender.com"
];

const allAllowedOrigins = new Set([...configuredOrigins, ...defaultAllowed]);

function isOriginAllowed(origin) {
  if (!origin) return true; // server-to-server, curl, mobile, cloud health probes
  const normalized = origin.trim().replace(/\/+$/, "");

  if (allAllowedOrigins.has(normalized) || allAllowedOrigins.has("*")) return true;

  // Allow localhost / 127.0.0.1 on any port for local development
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized)) return true;

  try {
    const { hostname } = new URL(normalized);
    // Automatically allow any Vercel preview or production deployment (*.vercel.app)
    if (hostname.endsWith(".vercel.app")) return true;
    // Automatically allow any Render deployment (*.onrender.com)
    if (hostname.endsWith(".onrender.com")) return true;
  } catch {
    return false;
  }

  return false;
}

app.use(
  cors({
    origin: function (origin, callback) {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true
  })
);

app.post("/api/webhooks/clerk", express.raw({ type: "application/json" }), require("./controllers/clerkWebhookController").handleClerkWebhook);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Root welcome & platform metadata route
app.get("/", (_req, res) => {
  res.json({
    name: "MilestoneChain API",
    status: "ok",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    chainId: env.chainId,
    blockchainMode: env.blockchainMode,
    health: "/health",
    graphql: "/graphql"
  });
});

app.get("/health", (_req, res) => {
  const diagnostics = serviceManager.getDiagnostics();
  res.json({
    status: "ok",
    chainId: env.chainId,
    services: diagnostics.services,
    notificationSystem: diagnostics.notificationSystem
  });
});

const yoga = createYoga({
  schema,
  graphqlEndpoint: "/graphql",
  landingPage: false
});

app.use("/graphql", yoga);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/upload-proof", uploadRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/voting", votingRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

async function startServer() {
  await connectDatabase(env.mongoUri);
  await serviceManager.initServices();
  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`Backend API listening on 0.0.0.0:${port} (chainId ${env.chainId}, mode ${env.blockchainMode})`);
  });
  return server;
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { app, startServer };
