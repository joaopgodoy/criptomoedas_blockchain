const hre = require("hardhat");

async function main() {
  const fd = await hre.ethers.provider.getFeeData();
  console.log("gasPrice (gwei):", Number(hre.ethers.formatUnits(fd.gasPrice ?? 0n, "gwei")));

  const NAME = "EventTickets";
  const SYMBOL = "ETIX";
  const BASE_URI = "https://example.com/metadata/{id}.json";

  const Ticket = await hre.ethers.getContractFactory("Ticket1155");
  const txReq = await Ticket.getDeployTransaction(NAME, SYMBOL, BASE_URI);
  const gas = await hre.ethers.provider.estimateGas(txReq);
  const price = fd.gasPrice ?? 0n;
  const cost = gas * price;
  console.log("estimated gas:", gas.toString());
  console.log("estimated cost (MATIC):", hre.ethers.formatEther(cost));
}
main().catch(e=>{console.error(e);process.exit(1);});
