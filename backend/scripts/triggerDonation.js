const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

async function main() {
  const frontendEnvPath = path.join(__dirname, '..', '..', 'frontend', '.env');
  if (!fs.existsSync(frontendEnvPath)) {
    throw new Error('.env not found in frontend; ensure deploy wrote VITE_FACTORY_CONTRACT_ADDRESS');
  }
  const env = fs.readFileSync(frontendEnvPath, 'utf8');
  const match = env.match(/VITE_FACTORY_CONTRACT_ADDRESS=(0x[0-9a-fA-F]+)/);
  if (!match) throw new Error('Factory address not found in frontend/.env');
  const factoryAddress = match[1];

  const rpc = process.env.ALCHEMY_AMOY_URL || process.env.GANACHE_RPC_URL || 'http://127.0.0.1:8545';
  const provider = new ethers.JsonRpcProvider(rpc);

  const accounts = await provider.listAccounts();
  if (!accounts || accounts.length < 2) throw new Error('No unlocked accounts available on Ganache');

  console.log('Using RPC:', rpc);
  console.log('Accounts:', accounts.slice(0, 4));

  const factoryAbi = ['function allCampaigns(uint256) view returns (address)'];
  const campaignAbi = ['function contribute() payable', 'function totalFundsRaised() view returns (uint256)'];

  const factory = new ethers.Contract(factoryAddress, factoryAbi, provider);
  const campaignAddress = await factory.allCampaigns(0);
  console.log('Found campaign at', campaignAddress);

  // Use eth_sendTransaction (Ganache unlocks default accounts) by encoding the contribute() call
  const iface = new ethers.Interface(campaignAbi);
  const data = iface.encodeFunctionData('contribute', []);
  const valueWei = ethers.parseEther('0.01');
  const valueHex = '0x' + valueWei.toString(16);
  const txHash = await provider.send('eth_sendTransaction', [
    {
      from: accounts[1].address,
      to: campaignAddress,
      value: valueHex,
      data
    }
  ]);
  console.log('Contribution tx sent:', txHash);
  // Wait for receipt
  await provider.waitForTransaction(txHash);
  console.log('Contribution mined');

  // Wait briefly for backend event listener to ingest
  await new Promise((r) => setTimeout(r, 2000));

  // Query backend recent donations for this campaign
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
  const res = await fetch(`${backendUrl}/api/donations/campaign/${campaignAddress}/recent`);
  const json = await res.json();
  console.log('Backend /api/donations/campaign recent response:', JSON.stringify(json, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
