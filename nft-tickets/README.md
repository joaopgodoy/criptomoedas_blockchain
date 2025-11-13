# NFT Tickets (Hardhat + ERC1155)

Projeto Hardhat que implementa um sistema de bilhetes digitais baseado no padrão ERC-1155. O contrato `Ticket1155` permite que uma conta administrativa crie diferentes tipos de ingressos, pause operações e revogue bilhetes. Contas autorizadas como `ROLE_CHECKER` conseguem realizar o check-in queimando um único ingresso do usuário.

## Visão geral do contrato

- **Padrão ERC-1155**: múltiplos tipos de tokens fungíveis no mesmo contrato.
- **Controle de acesso**: utiliza `AccessControl` com três papéis principais:
	- `DEFAULT_ADMIN_ROLE`: concede e revoga outros papéis.
	- `ROLE_ADMIN`: ajusta URI, pausa/despausa, cunha ingressos (`mintTicket`) e revoga (`revokeOne`).
	- `ROLE_CHECKER`: executa check-in queimando 1 ingresso via `checkIn`.
- **Pausabilidade**: herda `ERC1155Pausable` permitindo suspender transferências, mint e burn.

## Stack

- Node.js 18+ (recomendado)
- Hardhat 2.27 com `@nomicfoundation/hardhat-toolbox`
- OpenZeppelin Contracts 5.4
- Rede local Hardhat ou Polygon Amoy (testnet)

## Pré-requisitos

1. Instale dependências globais necessárias (opcional, caso já use o binário local do `npx`):
	 ```bash
	 npm install --global yarn
	 ```
2. No diretório `nft-tickets`, instale as dependências do projeto:
	 ```bash
	 npm install
	 ```

## Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com as credenciais da rede desejada:

```
RPC_URL=https://polygon-amoy.g.alchemy.com/v2/<SUA_CHAVE>
PRIVATE_KEY=0x<VSUA_CHAVE_PRIVADA>
```

- `RPC_URL`: endpoint HTTPS da rede. Use Amoy para Polygon ou provedor local.
- `PRIVATE_KEY`: chave privada da conta que fará deploy/execução (sem `"`).

O arquivo `.env` já está ignorado pelo git.

## Comandos principais

- **Compilar contratos**
	```bash
	npx hardhat compile
	```
- **Rodar um nó Hardhat local**
	```bash
	npx hardhat node
	```
- **Executar scripts**
	```bash
	npx hardhat run scripts/deploy.js --network hardhat
	npx hardhat run scripts/deploy.js --network amoy
	```
- **Abrir console interativo**
	```bash
	npx hardhat console --network hardhat
	```
- **Gerar relatório de gás dos testes (quando existirem)**
	```bash
	REPORT_GAS=true npx hardhat test
	```

## Deploy

### Em rede local (Hardhat)

1. Inicie o nó: `npx hardhat node`.
2. Em outro terminal, faça o deploy:
	 ```bash
	 npx hardhat run scripts/deploy.js --network hardhat
	 ```
3. Copie o endereço exibido (`Ticket1155 deployed at: ...`) para reutilizar nos scripts.

### Na Polygon Amoy

1. Preencha `.env` com `RPC_URL` e `PRIVATE_KEY` válidos.
2. Rode o deploy com o alvo `amoy`:
	 ```bash
	 npx hardhat run scripts/deploy.js --network amoy
	 ```
3. O script já concede `ROLE_CHECKER` para o deployer ao final.

## Scripts utilitários

Todos os scripts esperam que você informe a rede via `--network` e, quando necessário, o endereço do contrato com a variável `CONTRACT_ADDR`.

| Script | Descrição | Exemplo |
| ------ | --------- | ------- |
| `scripts/ping.js` | Mostra rede conectada e endereço do deployer | `npx hardhat run scripts/ping.js --network amoy` |
| `scripts/balance.js` | Exibe saldo em MATIC do deployer | `npx hardhat run scripts/balance.js --network amoy` |
| `scripts/gas-info.js` | Consulta gas price atual e estima custo de deploy | `npx hardhat run scripts/gas-info.js --network amoy` |
| `scripts/check-role.js` | Verifica se o deployer possui `ROLE_CHECKER` | `CONTRACT_ADDR=0x... npx hardhat run scripts/check-role.js --network amoy` |
| `scripts/check-balance.js` | Mostra saldo de um token ID para a segunda conta (`alice`) | `CONTRACT_ADDR=0x... npx hardhat run scripts/check-balance.js --network hardhat` |
| `scripts/dev-flow.js` | Fluxo completo: mint para Alice e check-in | `CONTRACT_ADDR=0x... npx hardhat run scripts/dev-flow.js --network hardhat` |

## Fluxo de uso sugerido

1. **Cunhar ingressos**: use `mintTicket(to, tokenId, amount, data)` como conta `ROLE_ADMIN`.
2. **Atribuir papéis**: `grantRole(ROLE_CHECKER, address)` via deployer/admin.
3. **Check-in**: operador com `ROLE_CHECKER` chama `checkIn(holder, tokenId)`, que queima 1 unidade do ingresso.
4. **Revogação manual**: admin pode chamar `revokeOne(holder, tokenId)`.
5. **Pause/Unpause**: `pause()` e `unpause()` para suspender operações em caso de emergência.

### Exemplos no console Hardhat

```bash
npx hardhat console --network hardhat
```
```javascript
const ticket = await ethers.getContractAt("Ticket1155", "0xSeuContrato");
const ROLE_CHECKER = ethers.keccak256(ethers.toUtf8Bytes("ROLE_CHECKER"));
await ticket.grantRole(ROLE_CHECKER, "0xOperador");
await ticket.mintTicket("0xUsuario", 1, 3, "0x");
await ticket.balanceOf("0xUsuario", 1);
```

## Testes

Os testes automatizados estão em `test/Ticket1155.test.js` e cobrem:

- Concessão de papéis (`DEFAULT_ADMIN_ROLE`, `ROLE_ADMIN`, `ROLE_CHECKER`).
- Restrições de acesso em `setURI`, `mintTicket`, `checkIn` e `revokeOne`.
- Comportamento de pausa/despausa (`pause`/`unpause`).
- Atualização de URI base e queima de ingressos no check-in.

Execute:

```bash
npx hardhat test
```

Para capturar métricas de gás forneça `REPORT_GAS=true`:

```bash
REPORT_GAS=true npx hardhat test
```

## Dicas adicionais

- Ajuste o `BASE_URI` no deploy para apontar para a sua API/IPFS de metadata.
- Os IDs dos ingressos (`tokenId`) podem representar setores, datas ou lotes.
- O script de deploy utiliza limites de gás de 1 gwei; aumente se notar pending transactions em redes públicas.

---

Com isso você tem um guia completo para instalar, configurar, implantar e testar o contrato de ingressos NFT no padrão ERC-1155.
