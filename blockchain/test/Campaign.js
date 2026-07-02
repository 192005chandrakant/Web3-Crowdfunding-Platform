const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CampaignFactory", function () {
  it("deploys a campaign and indexes it", async function () {
    const Factory = await ethers.getContractFactory("CampaignFactory");
    const factory = await Factory.deploy();
    await factory.deployed();

    const tx = await factory.createCampaign(
      ethers.utils.parseEther("1"),
      ethers.constants.AddressZero,
      ["Prototype"],
      [ethers.utils.parseEther("1")],
      [Math.floor(Date.now() / 1000) + 3600]
    );
    await tx.wait();

    expect(await factory.getCampaignCount()).to.equal(1);
  });
});