const hre = require("hardhat");

async function main() {
  const CONTRACT = process.env.CONTRACT_ADDR;
  if (!CONTRACT) throw new Error("Defina CONTRACT_ADDR no env");

  const ticket = await hre.ethers.getContractAt("Ticket1155", CONTRACT);
  const [deployer, alice] = await hre.ethers.getSigners();

  const PISTA = 1;

  console.log("Mint 1x Pista para Alice:", await alice.getAddress());
  await (await ticket.mintTicket(await alice.getAddress(), PISTA, 1, "0x")).wait();

  let bal = await ticket.balanceOf(await alice.getAddress(), PISTA);
  console.log("Saldo Alice PISTA antes:", bal.toString()); // 1

  console.log("Check-in de Alice...");
  await (await ticket.checkIn(await alice.getAddress(), PISTA)).wait();

  bal = await ticket.balanceOf(await alice.getAddress(), PISTA);
  console.log("Saldo Alice PISTA depois:", bal.toString()); // 0
}

main().catch((e)=>{ console.error(e); process.exit(1); });
