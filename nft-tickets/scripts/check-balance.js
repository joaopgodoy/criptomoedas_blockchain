// scripts/check-balance.js
const hre = require("hardhat");
(async () => {
  const CONTRACT = process.env.CONTRACT_ADDR;
  const ID = 1; // PISTA
  const ticket = await hre.ethers.getContractAt("Ticket1155", CONTRACT);
  const [deployer, alice] = await hre.ethers.getSigners();
  console.log("Alice:", await alice.getAddress());
  console.log("balance:", (await ticket.balanceOf(await alice.getAddress(), ID)).toString());
})();
