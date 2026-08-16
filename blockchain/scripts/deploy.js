const hre = require("hardhat");

async function main() {
  const network = await hre.ethers.provider.getNetwork();
  console.log("Network:", hre.network.name, `(chainId ${network.chainId})`);

  // 1. Deploy Implementation Contract
  console.log("Deploying Campaign Implementation...");
  const Campaign = await hre.ethers.getContractFactory("Campaign");
  const campaignImpl = await Campaign.deploy();
  await campaignImpl.deployed();
  console.log("Campaign Implementation deployed to:", campaignImpl.address);

  // 2. Deploy Factory Contract using Implementation Address
  console.log("Deploying CampaignFactory...");
  const CampaignFactory = await hre.ethers.getContractFactory("CampaignFactory");
  const factory = await CampaignFactory.deploy(campaignImpl.address);
  await factory.deployed();
  console.log("CampaignFactory deployed to:", factory.address);

  // If deploying to local Ganache, write the factory address into frontend/.env for developer convenience
  try {
    const fs = require("fs");
    const path = require("path");
    const frontendEnv = path.join(__dirname, "..", "..", "frontend", ".env");
    let contents = "";
    if (fs.existsSync(frontendEnv)) {
      contents = fs.readFileSync(frontendEnv, "utf8");
    }

    const setOrReplace = (key, value) => {
      const re = new RegExp(`^${key}=.*$`, "m");
      if (re.test(contents)) {
        contents = contents.replace(re, `${key}=${value}`);
      } else {
        contents += `\n${key}=${value}`;
      }
    };

    setOrReplace("VITE_FACTORY_CONTRACT_ADDRESS", factory.address);
    setOrReplace("VITE_TARGET_CHAIN_ID", network.chainId);
    setOrReplace("VITE_GANACHE_RPC_URL", process.env.GANACHE_RPC_URL || "http://127.0.0.1:8545");

    fs.writeFileSync(frontendEnv, contents, "utf8");
    console.log(`Wrote frontend/.env with VITE_FACTORY_CONTRACT_ADDRESS=${factory.address}`);
  } catch (err) {
    console.warn("Failed to write frontend/.env:", err.message);
  }

  if (network.chainId === 80002) {
    console.log("Verify Implementation on Amoy explorer: https://amoy.polygonscan.com/address/" + campaignImpl.address);
    console.log("Verify Factory on Amoy explorer: https://amoy.polygonscan.com/address/" + factory.address);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
