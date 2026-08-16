const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function main() {
  const frontendEnv = path.join(__dirname, '..', '..', 'frontend', '.env');
  let factoryAddress = process.env.VITE_FACTORY_CONTRACT_ADDRESS || process.env.FACTORY_CONTRACT_ADDRESS;
  if (!factoryAddress && fs.existsSync(frontendEnv)) {
    const env = fs.readFileSync(frontendEnv, 'utf8');
    const m = env.match(/VITE_FACTORY_CONTRACT_ADDRESS=(0x[0-9a-fA-F]+)/);
    if (m) factoryAddress = m[1];
  }
  if (!factoryAddress) throw new Error('Factory address not found');

  const rpc = process.env.GANACHE_RPC_URL || 'http://127.0.0.1:8545';
  const provider = new ethers.providers.JsonRpcProvider(rpc);
  const accounts = await provider.listAccounts();
  if (!accounts || accounts.length === 0) throw new Error('No accounts');
  const from = typeof accounts[0] === 'string' ? accounts[0] : accounts[0].address;

  const factoryAbi = ["function createCampaign(uint256 goal,address hospitalAddress,string[] titles,uint256[] targetAmounts,uint256[] deadlines)"];
  const iface = new ethers.utils.Interface(factoryAbi);

  const goal = ethers.utils.parseEther('1');
  const hospital = '0x0000000000000000000000000000000000000000';
  const titles = ['Test A'];
  const targetAmounts = [ethers.utils.parseEther('1')];
  const deadlines = [BigInt(Math.floor(Date.now()/1000) + 3600)];

  const data = iface.encodeFunctionData('createCampaign', [goal, hospital, titles, targetAmounts, deadlines]);

  const tx = await provider.send('eth_sendTransaction', [{ from, to: factoryAddress, data }]);
  console.log('Sent tx:', tx);
  await provider.waitForTransaction(tx);
  console.log('Mined', tx);
}

main().catch(err => { console.error(err); process.exit(1); });
