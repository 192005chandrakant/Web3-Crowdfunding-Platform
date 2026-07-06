// Override DNS to use Google's public resolver — fixes local ISP DNS failures
// with MongoDB Atlas SRV records (ECONNREFUSED on querySrv)
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

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

const app = express();
const env = getEnvConfig();
const port = env.port;

const allowedOrigins = env.allowedOrigin.split(",").map(o => o.trim());
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      // or origins that are explicitly in the allowed list.
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true
  })
);
app.post("/api/webhooks/clerk", express.raw({ type: "application/json" }), require("./controllers/clerkWebhookController").handleClerkWebhook);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    chainId: env.chainId,
    services: {
      mongodb: Boolean(env.mongoUri),
      redis: Boolean(env.redis.url && env.redis.token),
      pinata: Boolean(env.pinata.apiKey || env.pinata.jwt),
      cloudinary: Boolean(env.cloudinary.cloudName),
      resend: Boolean(env.resend.apiKey)
    }
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

app.use(notFoundHandler);
app.use(errorHandler);

async function startServer() {
  await connectDatabase(env.mongoUri);
  app.listen(port, () => {
    console.log(`Backend API listening on port ${port} (chainId ${env.chainId})`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { app, startServer };
