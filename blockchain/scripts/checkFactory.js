const { ethers } = require("ethers");
async function main() {
  const factoryAddress = process.env.VITE_FACTORY_CONTRACT_ADDRESS || process.env.FACTORY_CONTRACT_ADDRESS || "0x9a025411bC0ac0806441DD970915Cde369DFc426";
  const rpc = process.env.GANACHE_RPC_URL || process.env.VITE_GANACHE_RPC_URL || "http://127.0.0.1:8545";
  console.log("RPC:", rpc);
  const provider = new ethers.providers.JsonRpcProvider(rpc);
  try {
    const code = await provider.getCode(factoryAddress);
    console.log(`Code at ${factoryAddress}:`, code && code !== '0x' ? 'deployed' : 'no code (0x)');
    if (code && code !== '0x') {
      // try to call getCampaignCount if ABI present
      const abi = ["function getCampaignCount() view returns (uint256)", "function allCampaigns(uint256) view returns (address)"];
      const contract = new ethers.Contract(factoryAddress, abi, provider);
      try {
        const count = await contract.getCampaignCount();
        console.log('Factory getCampaignCount ->', count.toString());
      } catch (e) {
        console.warn('Failed reading getCampaignCount:', e.message);
      }
    }
  } catch (err) {
    console.error('Error connecting to provider:', err.message);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
