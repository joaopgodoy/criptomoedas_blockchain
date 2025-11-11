// scripts/check-role.js
const hre = require("hardhat");
(async () => {
  const CONTRACT = process.env.CONTRACT_ADDR;
  const ticket = await hre.ethers.getContractAt("Ticket1155", CONTRACT);
  const [deployer] = await hre.ethers.getSigners();
  const { keccak256, toUtf8Bytes } = hre.ethers;
  const ROLE_CHECKER = keccak256(toUtf8Bytes("ROLE_CHECKER"));
  console.log("hasRole?", await ticket.hasRole(ROLE_CHECKER, await deployer.getAddress()));
})();
