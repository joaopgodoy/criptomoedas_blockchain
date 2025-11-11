const { ethers } = require("hardhat");
async function main() {
  const [acc] = await ethers.getSigners();
  console.log("Deployer:", await acc.getAddress());
  const bal = await ethers.provider.getBalance(await acc.getAddress());
  console.log("Balance:", ethers.formatEther(bal), "MATIC");
}
main().catch(e=>{console.error(e);process.exit(1);});
