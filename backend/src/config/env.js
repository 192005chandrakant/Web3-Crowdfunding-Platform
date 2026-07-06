function requireEnv(name, { optional = false } = {}) {
  const value = process.env[name];
  if (!value && !optional) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value || null;
}

function getEnvConfig() {
  return {
    port: Number(process.env.PORT) || 5000,
    mongoUri: requireEnv("MONGODB_URI"),
    allowedOrigin: process.env.ALLOWED_ORIGIN || "http://localhost:5173",
    chainId: Number(process.env.CHAIN_ID) || 80002,
    rpcUrl:
      process.env.ALCHEMY_AMOY_URL ||
      process.env.ALCHEMY_RPC_URL ||
      "https://rpc-amoy.polygon.technology",
    pinata: {
      apiKey: process.env.PINATA_API_KEY,
      apiSecret: process.env.PINATA_API_SECRET,
      jwt: process.env.PINATA_JWT
    },
    redis: {
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN
    },
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET
    },
    resend: {
      apiKey: process.env.RESEND_API_KEY,
      fromEmail: process.env.RESEND_FROM_EMAIL || "notifications@milestonechain.dev"
    },
    clerk: {
      secretKey: process.env.CLERK_SECRET_KEY,
      webhookSecret: process.env.CLERK_WEBHOOK_SECRET
    }
  };
}

module.exports = { getEnvConfig, requireEnv };
