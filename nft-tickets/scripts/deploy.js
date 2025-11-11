const hre = require("hardhat");

async function main() {
  const NAME = "EventTickets";
  const SYMBOL = "ETIX";
  const BASE_URI = "https://example.com/metadata/{id}.json";

  const Ticket = await hre.ethers.getContractFactory("Ticket1155");
  const ticket = await Ticket.deploy(NAME, SYMBOL, BASE_URI, {
    // tente 1 gwei; se não minerar, suba pra 2–3 gwei
    maxFeePerGas: hre.ethers.parseUnits("1", "gwei"),
    maxPriorityFeePerGas: hre.ethers.parseUnits("1", "gwei"),
  });
  await ticket.waitForDeployment();

  const addr = await ticket.getAddress();
  console.log("Ticket1155 deployed at:", addr);

  // concede ROLE_CHECKER ao deployer
  const [deployer] = await hre.ethers.getSigners();
  const { keccak256, toUtf8Bytes } = hre.ethers; // v6 helpers
  const ROLE_CHECKER = keccak256(toUtf8Bytes("ROLE_CHECKER"));
  await (await ticket.grantRole(ROLE_CHECKER, await deployer.getAddress())).wait();
  console.log("Granted ROLE_CHECKER to:", await deployer.getAddress());
}

main().catch((e) => { console.error(e); process.exit(1); });
