const { expect } = require("chai");
const { ethers } = require("hardhat");

const ONE_POL = ethers.utils.parseEther("1");

async function deploySystem({ milestones = 1 } = {}) {
  const [creator, donor, voter, hospital] = await ethers.getSigners();

  const Campaign = await ethers.getContractFactory("Campaign");
  const impl = await Campaign.deploy();
  await impl.deployed();

  const Factory = await ethers.getContractFactory("CampaignFactory");
  const factory = await Factory.deploy(impl.address);
  await factory.deployed();

  const now = Math.floor(Date.now() / 1000);
  const titles = Array.from({ length: milestones }, (_, index) => `Milestone ${index + 1}`);
  const targetAmounts = Array.from({ length: milestones }, () => ONE_POL);
  const deadlines = Array.from({ length: milestones }, (_, index) => now + 3600 * (index + 1));

  const createTx = await factory.connect(creator).createCampaign(
    ONE_POL.mul(milestones),
    hospital.address,
    titles,
    targetAmounts,
    deadlines
  );
  await createTx.wait();

  const campaignAddress = await factory.allCampaigns(0);
  const campaign = Campaign.attach(campaignAddress);

  return { creator, donor, voter, hospital, impl, factory, campaign, campaignAddress, now };
}

describe("CampaignFactory & Campaign on Ganache", function () {
  it("deploys a campaign proxy and initializes it", async function () {
    const { creator, factory, campaign } = await deploySystem();

    expect((await factory.getCampaignCount()).toString()).to.equal("1");
    expect(await campaign.creator()).to.equal(creator.address);
    expect((await campaign.fundraisingGoal()).toString()).to.equal(ONE_POL.toString());
    expect(await campaign.state()).to.equal(0);
    expect((await campaign.milestoneCount()).toString()).to.equal("1");
  });

  it("accepts contributions and computes quadratic voting power", async function () {
    const { donor, campaign } = await deploySystem();

    await campaign.connect(donor).contribute({ value: ethers.utils.parseEther("2") });

    expect((await campaign.totalFundsRaised()).toString()).to.equal(ethers.utils.parseEther("2").toString());
    expect((await campaign.totalFundsRemaining()).toString()).to.equal(ethers.utils.parseEther("2").toString());

    const [qvPower, isEligible] = await campaign.getQVPower(donor.address);
    expect(qvPower.gt(0)).to.equal(true);
    expect(isEligible).to.equal(true);
  });

  it("submits a milestone proof and records active milestone state", async function () {
    const { creator, donor, campaign } = await deploySystem();

    await campaign.connect(donor).contribute({ value: ethers.utils.parseEther("1") });

    await campaign.connect(creator).submitMilestoneProof(0, "cid-proof-1");

    const milestone = await campaign.milestones(0);
    expect(milestone.ipfsProofHash).to.equal("cid-proof-1");
    expect(milestone.isCurrent).to.equal(true);

    const [voted, approved] = await campaign.getVoterStatus(0, donor.address);
    expect(voted).to.equal(false);
    expect(approved).to.equal(false);
  });

  it("allows QV voting and tranche execution after approval", async function () {
    const { creator, donor, voter, hospital, campaign } = await deploySystem();

    await campaign.connect(donor).contribute({ value: ethers.utils.parseEther("2") });
    await campaign.connect(voter).contribute({ value: ethers.utils.parseEther("1") });

    await campaign.connect(creator).submitMilestoneProof(0, "cid-proof-2");

    await campaign.connect(donor).voteOnMilestone(0, true);
    await campaign.connect(voter).voteOnMilestone(0, false);

    const [approvalQVWeight, rejectionQVWeight, snapshotTotalQVWeight, approved] = await campaign.getMilestoneQVState(0);
    expect(approvalQVWeight.gt(rejectionQVWeight)).to.equal(true);
    expect(snapshotTotalQVWeight.gt(0)).to.equal(true);
    expect(approved).to.equal(true);

    const hospitalBalanceBefore = await ethers.provider.getBalance(hospital.address);
    await campaign.connect(voter).executeTranche(0);

    const hospitalBalanceAfter = await ethers.provider.getBalance(hospital.address);
    expect(hospitalBalanceAfter.sub(hospitalBalanceBefore).toString()).to.equal(ethers.utils.parseEther("1").toString());

    const milestone = await campaign.milestones(0);
    expect(milestone.isPaid).to.equal(true);
    expect(milestone.isCurrent).to.equal(false);
  });

  it("cancels the campaign and distributes refunds pro rata", async function () {
    const { creator, donor, voter, campaign } = await deploySystem();

    await campaign.connect(donor).contribute({ value: ethers.utils.parseEther("1") });
    await campaign.connect(voter).contribute({ value: ethers.utils.parseEther("3") });

    await campaign.connect(creator).cancelCampaign();
    expect(await campaign.state()).to.equal(3);

    await campaign.connect(donor).claimRefund();
    await campaign.connect(voter).claimRefund();

    expect((await campaign.contributions(donor.address)).toString()).to.equal("0");
    expect((await campaign.contributions(voter.address)).toString()).to.equal("0");
    expect((await campaign.totalFundsRemaining()).toString()).to.equal("0");
    expect((await ethers.provider.getBalance(campaign.address)).toString()).to.equal("0");
  });
});