const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Ticket1155", function () {
  async function deployTicketFixture() {

    // instancia o contrato em rede Hardhat com 4 contas para teste
    const [deployer, checker, alice, bob] = await ethers.getSigners();
    const Ticket = await ethers.getContractFactory("Ticket1155");

    // define nome, símbolo
    const ticket = await Ticket.deploy(
      "EventTickets",
      "ETIX",
      "https://example.com/metadata/{id}.json"
    );
    await ticket.waitForDeployment();

    // define os papéis dentro da rede
    const defaultAdminRole = await ticket.DEFAULT_ADMIN_ROLE();
    const roleAdmin = await ticket.ROLE_ADMIN();
    const roleChecker = await ticket.ROLE_CHECKER();

    return {
      ticket,
      deployer,
      checker,
      alice,
      bob,
      defaultAdminRole,
      roleAdmin,
      roleChecker,
    };
  }

  it("sets initial metadata and roles for deployer", async function () {
    const { ticket, deployer, defaultAdminRole, roleAdmin, roleChecker } =
      await loadFixture(deployTicketFixture);

    // validação de nome, símbolo e conta que criou e enviou o contrato para rede 
    // tem os dois papéis principais (defaultAdminRole e roleAdmin)
    expect(await ticket.name()).to.equal("EventTickets");
    expect(await ticket.symbol()).to.equal("ETIX");
    expect(await ticket.hasRole(defaultAdminRole, deployer.address)).to.equal(true);
    expect(await ticket.hasRole(roleAdmin, deployer.address)).to.equal(true);
    expect(await ticket.hasRole(roleChecker, deployer.address)).to.equal(false);
  });

  it("allows ROLE_ADMIN to update the base URI", async function () {

    // valida se o admin com papel de roleAdmin consegue trocar o template da URI
    const { ticket, checker, roleAdmin } = await loadFixture(deployTicketFixture);
    const newUri = "https://tickets.example/api/{id}.json";
    const tokenId = 42n;

    await ticket.setURI(newUri);
    const resolvedUri = await ticket.uri(tokenId);
    expect(resolvedUri).to.equal(newUri);

    // valida que checker não consegue mudar o template da URI
    await expect(ticket.connect(checker).setURI(newUri)).to.be.revertedWithCustomError(
      ticket,
      "AccessControlUnauthorizedAccount"
    ).withArgs(checker.address, roleAdmin);
  });

  it("mints tickets when caller holds ROLE_ADMIN", async function () {
    const { ticket, alice } = await loadFixture(deployTicketFixture);
    const tokenId = 1;
    const amount = 3;
    
    // admin concede 3 unidades de tokenId = 1 para Alice 
    // (poderia ser um ingresso de pista, por exemplo)
    await ticket.mintTicket(alice.address, tokenId, amount, "0x");
    
    // verifica se o saldo de Alice bate com as 3 unidades concedidas
    expect(await ticket.balanceOf(alice.address, tokenId)).to.equal(amount);
  });


  it("blocks minting for accounts without ROLE_ADMIN", async function () {
    const { ticket, checker, alice, roleAdmin } = await loadFixture(deployTicketFixture);

    // valida que checker (outro papel que não é admin) não consegue conceder um ticket
    await expect(
      ticket.connect(checker).mintTicket(alice.address, 1, 1, "0x")
    ).to.be.revertedWithCustomError(ticket, "AccessControlUnauthorizedAccount").withArgs(
      checker.address,
      roleAdmin
    );
  });

  it("allows ROLE_CHECKER to burn one ticket on check-in", async function () {
    
    const { ticket, checker, alice, roleChecker } = await loadFixture(deployTicketFixture);
    const tokenId = 7;

    await ticket.grantRole(roleChecker, checker.address);

    // concede 2 tickets do tipo 7 (poderia ser um ingresso VIP por exemplo)
    await ticket.mintTicket(alice.address, tokenId, 2, "0x");

    await ticket.connect(checker).checkIn(alice.address, tokenId);

    // verifica funcionamento do checkIn (após checkIn sobra apenas um ticket do tipo 7)
    expect(await ticket.balanceOf(alice.address, tokenId)).to.equal(1);
  });

  it("blocks check-in for accounts without ROLE_CHECKER", async function () {
    const { ticket, alice, roleChecker } = await loadFixture(deployTicketFixture);

    // concede ticket para Alice e tenha fazer checkIn de Alice com a conta da própria Alice
    // valida que não é possível fazer isso aguardando o revert
    await ticket.mintTicket(alice.address, 1, 1, "0x");
    await expect(
      ticket.connect(alice).checkIn(alice.address, 1)
    ).to.be.revertedWithCustomError(ticket, "AccessControlUnauthorizedAccount").withArgs(
      alice.address,
      roleChecker
    );
  });

  it("allows ROLE_ADMIN to revoke one ticket", async function () {
    const { ticket, checker, alice, roleAdmin } = await loadFixture(deployTicketFixture);
    const tokenId = 3;

    // concede dois tickets para Alice e testa o revoke
    await ticket.mintTicket(alice.address, tokenId, 2, "0x");
    await ticket.revokeOne(alice.address, tokenId);

    // valida verificando se sobra 1 único ticket para Alice
    expect(await ticket.balanceOf(alice.address, tokenId)).to.equal(1);

    // testa usar o revoke com a conta do checker, o que não é possível
    await expect(
      ticket.connect(checker).revokeOne(alice.address, tokenId)
    ).to.be.revertedWithCustomError(ticket, "AccessControlUnauthorizedAccount").withArgs(
      checker.address,
      roleAdmin
    );
  });

  it("enforces pause permissions and behavior", async function () {
    const { ticket, deployer, checker, alice, roleAdmin, roleChecker } = await loadFixture(
      deployTicketFixture
    );
    const tokenId = 5;

    // garante que o checker receba o papel de Checker
    await ticket.grantRole(roleChecker, checker.address);

    // concede 1 ticket para Alice
    await ticket.mintTicket(alice.address, tokenId, 1, "0x");

    // tenta pausar com o checker, mas ele não tem permissão
    await expect(ticket.connect(checker).pause()).to.be.revertedWithCustomError(
      ticket,
      "AccessControlUnauthorizedAccount"
    ).withArgs(checker.address, roleAdmin);

    // pausa como Admin
    await ticket.pause();

    // valida se está pausado
    expect(await ticket.paused()).to.equal(true);

    // tenta conceder ticket a Alice mas como está pausado não consegue conceder, mesmo sendo Admin
    await expect(ticket.mintTicket(alice.address, tokenId, 1, "0x")).to.be.revertedWithCustomError(
      ticket,
      "EnforcedPause"
    );
    
    // tenta realizar checkIn com o checker que tem permissão, mas como está pausado não consegue
    await expect(
      ticket.connect(checker).checkIn(alice.address, tokenId)
    ).to.be.revertedWithCustomError(ticket, "EnforcedPause");

    // despausa como Admin
    await ticket.unpause();

    // valida que realmente não está mais pausado
    expect(await ticket.paused()).to.equal(false);

    // realiza o checkIn
    await ticket.connect(checker).checkIn(alice.address, tokenId);

    // verifica que realmente diminuiu o saldo de tickets de Alice
    expect(await ticket.balanceOf(alice.address, tokenId)).to.equal(0);
  });
});
