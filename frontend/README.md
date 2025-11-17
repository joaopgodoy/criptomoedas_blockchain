# Frontend Ticket1155 - Estrutura Atualizada

## Visão Geral

O frontend foi reorganizado para separar as interfaces de cada tipo de usuário (Admin, Checker e Titular), proporcionando uma experiência mais clara e focada para cada papel no sistema.

## Estrutura de Páginas

### 1. Página Inicial - Seleção de Tipo de Usuário
Ao abrir a aplicação, o usuário é apresentado com três opções:
- **Admin**: Gerenciar contratos, emitir ingressos e conceder permissões
- **Checker**: Validar ingressos e realizar check-ins no evento
- **Titular**: Visualizar e transferir seus ingressos

### 2. Painel Admin (`AdminPage.tsx`)
Funcionalidades disponíveis:
- Conectar ao contrato Ticket1155
- Atualizar URI base do contrato
- Mintar (criar) novos ingressos para qualquer conta
- Gerenciar papéis (conceder ROLE_ADMIN e ROLE_CHECKER)
- Visualizar contas com permissões de admin
- Log de eventos

### 3. Painel Checker (`CheckerPage.tsx`)
Funcionalidades disponíveis:
- Conectar ao contrato Ticket1155
- Realizar check-in de ingressos (queima 1 ingresso do titular)
- Visualizar contas com permissões de checker
- Log de eventos

### 4. Painel Titular (`HolderPage.tsx`)
Funcionalidades disponíveis:
- Seleção de conta (escolher qual das contas simuladas usar)
- Visualizar todos os ingressos da conta selecionada
- **Transferir ingressos** para outras contas (NOVA FUNCIONALIDADE)
- Ver detalhes de cada token (ID, quantidade, URI)
- Log de eventos

## Nova Funcionalidade: Transferência de Ingressos

A funcionalidade de transferência permite que um titular envie seus ingressos para outra conta. Isso é útil para:
- Revenda de ingressos
- Transferência de cortesia
- Redistribuição de tokens

### Como usar:
1. Acesse como "Titular"
2. Selecione a conta que possui os ingressos
3. No painel "Transferir ingresso", preencha:
   - **Token ID**: ID do ingresso que deseja transferir
   - **Destinatário**: Conta que receberá os ingressos
   - **Quantidade**: Número de ingressos a transferir
4. Clique em "Transferir ingressos"

A transação será assinada pela conta selecionada e executada usando a função `safeTransferFrom` do contrato ERC-1155.

## Arquitetura Técnica

### Context API (`AppContext.tsx`)
Todo o estado da aplicação é gerenciado centralmente pelo contexto, incluindo:
- Conexão com o provider Ethereum
- Wallets e contas derivadas do mnemonic
- Estado do contrato (endereço, roles, balances, tokens)
- Tipo de usuário selecionado
- Conta selecionada (para titulares)
- Log de eventos

### Tipos (`types/index.ts`)
Definições TypeScript compartilhadas:
- `Account`: Informações de uma conta
- `UserType`: Tipo de usuário (admin | checker | holder | null)
- `BalanceState`: Mapeamento de balances por conta e token
- `RoleState`: Listas de admins e checkers
- `Ticket1155Contract`: Interface tipada do contrato

### Páginas
- `UserTypeSelection.tsx`: Tela inicial de seleção
- `AdminPage.tsx`: Interface completa para administradores
- `CheckerPage.tsx`: Interface para validadores de ingressos
- `HolderPage.tsx`: Interface para titulares de ingressos

## Fluxo de Navegação

```
UserTypeSelection (Página Inicial)
    │
    ├─> [Seleciona Admin] ──> AdminPage
    │
    ├─> [Seleciona Checker] ──> CheckerPage
    │
    └─> [Seleciona Titular] ──> HolderPage
                                    │
                                    ├─> Seleção de Conta
                                    │
                                    └─> Painel de Ingressos
                                        (com transferência)
```

Cada página possui um botão "Voltar" que retorna à tela de seleção de tipo de usuário.

## Como Executar

```bash
# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm run dev

# Acessar em http://localhost:5173
```

## Pré-requisitos

1. Ter o nó Hardhat rodando localmente:
   ```bash
   cd ../nft-tickets
   npx hardhat node
   ```

2. Deploy do contrato Ticket1155:
   ```bash
   npx hardhat run scripts/deploy.js --network localhost
   ```

3. Copiar o endereço do contrato retornado pelo deploy e colar na interface web.

## Tecnologias Utilizadas

- **React 18** com TypeScript
- **Vite** como bundler
- **ethers.js v6** para interação com blockchain
- **Tailwind CSS** para estilização
- **shadcn/ui** para componentes de UI
- **Lucide React** para ícones

