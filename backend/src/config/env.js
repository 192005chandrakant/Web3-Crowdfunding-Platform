// Automatically trim leading/trailing whitespace from all environment variable strings
Object.keys(process.env).forEach((key) => {
  if (typeof process.env[key] === "string") {
    process.env[key] = process.env[key].trim();
  }
});

function requireEnv(name, { optional = false } = {}) {
  const value = process.env[name];
  if (!value && !optional) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ? value.trim() : null;
}

function getEnvConfig() {
  const blockchainMode = (process.env.BLOCKCHAIN_MODE || "rpc").toLowerCase();

  // Strategy pattern: resolve RPC URL based on BLOCKCHAIN_MODE
  let rpcUrl;
  if (blockchainMode === "local") {
    rpcUrl =
      process.env.LOCAL_RPC_URL ||
      process.env.GANACHE_RPC_URL ||
      process.env.BLOCKCHAIN_RPC_URL ||
      "http://127.0.0.1:7545";
  } else {
    rpcUrl =
      process.env.ALCHEMY_AMOY_URL ||
      process.env.BLOCKCHAIN_RPC_URL ||
      process.env.RPC_URL ||
      "https://rpc-amoy.polygon.technology";
  }

  return {
    port: Number(process.env.PORT) || 5000,
    mongoUri: requireEnv("MONGODB_URI"),
    allowedOrigin: process.env.ALLOWED_ORIGIN || "http://localhost:5173",
    blockchainMode,
    chainId: Number(process.env.CHAIN_ID) || 80002,
    rpcUrl,
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
      fromEmail: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"
    },
    clerk: {
      secretKey: process.env.CLERK_SECRET_KEY,
      webhookSecret: process.env.CLERK_WEBHOOK_SECRET
    }
  };
}

module.exports = { getEnvConfig, requireEnv };
