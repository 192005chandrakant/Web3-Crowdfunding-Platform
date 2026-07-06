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

  if (network.chainId === 80002) {
    console.log("Verify Implementation on Amoy explorer: https://amoy.polygonscan.com/address/" + campaignImpl.address);
    console.log("Verify Factory on Amoy explorer: https://amoy.polygonscan.com/address/" + factory.address);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
