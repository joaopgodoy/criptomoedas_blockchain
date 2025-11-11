const { ethers } = require("hardhat");

async function main() {
  const net = await ethers.provider.getNetwork();
  console.log("Network:", net.name, net.chainId);
  const [acc] = await ethers.getSigners();
  console.log("Deployer:", await acc.getAddress());
}
main().catch((e)=>{ console.error(e); process.exit(1); });
