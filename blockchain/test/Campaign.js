const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CampaignFactory & Campaign", function () {
  let factory, impl, creator, donor;

  beforeEach(async function () {
    [creator, donor] = await ethers.getSigners();

    const Campaign = await ethers.getContractFactory("Campaign");
    impl = await Campaign.deploy();
    await impl.deployed();

    const Factory = await ethers.getContractFactory("CampaignFactory");
    factory = await Factory.deploy(impl.address);
    await factory.deployed();
  });

  it("deploys a campaign proxy and initializes it", async function () {
    const tx = await factory.connect(creator).createCampaign(
      ethers.utils.parseEther("1"),
      ethers.constants.AddressZero,
      ["Prototype"],
      [ethers.utils.parseEther("1")],
      [Math.floor(Date.now() / 1000) + 3600]
    );
    await tx.wait();

    expect((await factory.getCampaignCount()).toString()).to.equal("1");
    const cloneAddress = await factory.allCampaigns(0);
    
    // Check initialization
    const Campaign = await ethers.getContractFactory("Campaign");
    const campaign = Campaign.attach(cloneAddress);
    
    expect(await campaign.creator()).to.equal(creator.address);
    expect((await campaign.fundraisingGoal()).toString()).to.equal(ethers.utils.parseEther("1").toString());
    expect(await campaign.state()).to.equal(0); // 0 = Active
  });
});