import { Contract, ContractTransactionResponse, Wallet } from "ethers";

export interface Account {
	label: string;
	address: string;
}

export type UserType = "admin" | "checker" | "holder" | null;

export type BalanceState = Record<string, Record<string, bigint>>;

export type RoleState = {
	admins: string[];
	checkers: string[];
};

export type Ticket1155Contract = Contract & {
	ROLE_ADMIN(): Promise<string>;
	ROLE_CHECKER(): Promise<string>;
	hasRole(role: string, account: string): Promise<boolean>;
	mintTicket(to: string, tokenId: bigint, amount: bigint, data: string): Promise<ContractTransactionResponse>;
	grantRole(role: string, account: string): Promise<ContractTransactionResponse>;
	setURI(uri: string): Promise<ContractTransactionResponse>;
	checkIn(holder: string, tokenId: bigint): Promise<ContractTransactionResponse>;
	balanceOf(account: string, id: bigint): Promise<bigint>;
	uri(id: bigint): Promise<string>;
	safeTransferFrom(from: string, to: string, id: bigint, amount: bigint, data: string): Promise<ContractTransactionResponse>;
	filters: {
		TransferSingle(operator?: string | null, from?: string | null, to?: string | null): unknown;
	};
	queryFilter(filter: unknown, fromBlock?: number | string, toBlock?: number | string): Promise<Array<{ args?: { id?: bigint } }>>;
};

