# Painel Ticket1155

Projeto de referência para a disciplina **Blockchain e Criptomoedas**, composto por um contrato inteligente ERC-1155, scripts Hardhat e um front-end React que simula o fluxo de emissão e validação de ingressos tokenizados.

> **Resumo:** o contrato `Ticket1155` permite cunhar diferentes lotes de ingressos, gerenciar papéis de administradores e validadores (checkers) e registrar o check-in queimando 1 ingresso da carteira do titular. O front-end interage com o nó Hardhat local usando a derivação padrão de contas.

## 1. Objetivo e motivação

- **Problema escolhido:** controle de acesso a eventos presenciais ou digitais com múltiplos tipos de ingressos, revogação e check-in auditável.
- **Justificativa pessoal:** é um cenário recorrente em eventos universitários, corporativos e shows, no qual é importante evitar falsificações, reentradas e emissão não autorizada de convites.
- **O que se ganha com blockchain:**
  - Registro imutável das emissões e dos check-ins (auditoria pós-evento).
  - Custódia descentralizada: os ingressos ficam nas carteiras dos usuários.
  - Possibilidade de integração com marketplaces e automação de revenda controlada.
- **Metodologia de decisão:**
  - Levantamento de riscos (falsificação, dupla entrada, falta de transparência) x benefícios de blockchain.
  - Avaliação de requisitos de confiança: é desejável reduzir dependência de uma base de dados central.
  - Conclusão: apesar do custo de gás em redes públicas, a auditabilidade e a interoperabilidade justificam o uso em Ethereum ou redes compatíveis (Polygon, Arbitrum, etc.). Para prototipagem, o nó Hardhat local permite medir desempenho e custos.
  - **Perdas percebidas:** custos de transação em produção e necessidade de UX com carteira digital. A mitigação proposta é usar sidechains/layer-2 ou operar em rede privada quando custos forem impeditivos.

## 2. Plataforma escolhida

- **Ethereum / EVM** foi selecionado por:
  - Ecossistema maduro, vasta biblioteca (OpenZeppelin) e ferramentas (Hardhat, ethers.js).
  - Compatibilidade com Polygon Amoy (testnet) e possibilidade de migração para mainnet ou outras L2 sem reescrever o contrato.
  - Suporte amplo de carteiras (Metamask, WalletConnect), facilitando adoção.
- Alternativas analisadas:
  - **Hyperledger Fabric:** excelente para consórcios permissionados, mas não atende bem a necessidade de interoperabilidade pública e marketplaces.
  - **Ignite/Cosmos SDK:** oferece soberania de cadeia, porém exigiria operar a própria camada de consenso e escrever o módulo em Go, aumentando a complexidade.

## 3. Soluções similares

| Solução | Resumo | Diferenças/Observações |
| --- | --- | --- |
| [POAP](https://poap.xyz/) | Tokens de presença ERC-721 emitidos para participantes | Foco em badges colecionáveis; não queima ingressos na entrada. |
| [Ticketmaster NFT](https://help.ticketmaster.com/s/article/NFT-Tickets) | Tickets NFT em parceria com Flow/Polygon | Plataforma proprietária, sem código aberto. |
| [Gigalixir Pass](https://www.gigalixirpass.com/) | Solução de ingressos ERC-1155 para eventos | Uso comercial, mas sem código público; validação por app próprio. |

Essas referências mostram espaço para uma alternativa open source orientada a check-in on-chain e controle granular de papéis.

## 4. Estrutura do repositório

```
criptomoedas_blockchain/
├─ LICENSE                       → licença MIT (projeto inteiro)
├─ README.md                     → este documento
├─ nft-tickets/                  → contrato, testes e scripts Hardhat
│  ├─ contracts/Ticket1155.sol   → contrato ERC-1155 (75 linhas)
│  ├─ test/Ticket1155.test.js    → testes automatizados (191 linhas)
│  ├─ scripts/                   → deploy, checagem de saldo, papéis etc.
│  └─ README.md                  → instruções detalhadas de Hardhat
└─ frontend/                     → painel React + Vite + Tailwind + ethers
   └─ src/App.tsx                → interface conectada ao nó local (865 linhas)
```

> **Quantidade total de código relevante:** ~1.131 linhas (contrato + testes + front). Conteúdo de bibliotecas externas não é contabilizado.

## 5. Instalação e execução

### 5.1 Pré-requisitos

- Node.js ≥ 18
- npm ≥ 9
- Git

### 5.2 Passos (contrato e scripts)

```bash
cd nft-tickets
npm install
# opcional: configurar .env para Polygon Amoy
npx hardhat compile
npx hardhat test
npx hardhat node                       # manter aberto
npx hardhat run scripts/deploy.js --network localhost
```

No deploy local serão exibidos o endereço do contrato e a conta admin/checker utilizada.

### 5.3 Passos (front-end)

```bash
cd frontend
npm install
npm run dev
```

1. Acesse `http://localhost:5173`.
2. Informe o endereço retornado no deploy e clique em **Conectar**.
3. Utilize as abas **Admin**, **Checker** e **Titular** para executar transações reais contra o nó Hardhat (mint, concessão de papéis, check-in).

### 5.4 Métricas de desempenho

- `npx hardhat test` executa 8 cenários em ~2 segundos na máquina local.
- `REPORT_GAS=true npx hardhat test` registra o consumo médio de gás por função (útil para apresentar no vídeo). Exibir resultado durante a demonstração.

## 6. Licença

O repositório está licenciado sob **MIT License**, com arquivo `LICENSE` na raiz. Cada arquivo Solidity também inclui o cabeçalho SPDX correspondente.

## 7. Referências

- [Documentação Hardhat](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [EIP-1155: Multi Token Standard](https://eips.ethereum.org/EIPS/eip-1155)
- [Polygon Amoy Testnet](https://wiki.polygon.technology/docs/amoy/)

---

> O protótipo comprova o uso de blockchain para controle de ingressos, permitindo discutir custos, vantagens e limitações em sala.
