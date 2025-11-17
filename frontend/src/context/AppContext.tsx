import { createContext, useContext, ReactNode, useState, useMemo, useCallback, useEffect } from "react";
import { JsonRpcProvider, HDNodeWallet, Wallet, formatEther, InterfaceAbi, Contract } from "ethers";
import { Account, BalanceState, RoleState, Ticket1155Contract, UserType } from "@/types";
import ticket1155Artifact from "@/contract/ticket1155-abi.json";

const LOCAL_NODE_URL = "http://127.0.0.1:8545";
const DEMO_MNEMONIC = "test test test test test test test test test test test junk";
const ACCOUNT_COUNT = 4;

const artifact = ticket1155Artifact as { abi: InterfaceAbi };

interface AppContextType {
	provider: JsonRpcProvider;
	wallets: Wallet[];
	accounts: Account[];
	walletFor: (address: string) => Wallet | undefined;
	status: string;
	setStatus: (status: string) => void;
	contractInput: string;
	setContractInput: (input: string) => void;
	contract: Ticket1155Contract | null;
	setContract: (contract: Ticket1155Contract | null) => void;
	roleIds: { admin: string; checker: string } | null;
	setRoleIds: (roleIds: { admin: string; checker: string } | null) => void;
	roles: RoleState;
	setRoles: (roles: RoleState) => void;
	baseUri: string;
	setBaseUri: (uri: string) => void;
	balances: BalanceState;
	setBalances: (balances: BalanceState) => void;
	knownTokenIds: string[];
	setKnownTokenIds: (tokenIds: string[]) => void;
	ethBalances: Record<string, string>;
	log: string[];
	pushLog: (message: string) => void;
	isBusy: boolean;
	setIsBusy: (busy: boolean) => void;
	userType: UserType;
	setUserType: (type: UserType) => void;
	selectedAccount: string | null;
	setSelectedAccount: (account: string | null) => void;
	actingIsAdmin: (address: string) => boolean;
	actingIsChecker: (address: string) => boolean;
	refreshEthBalances: () => Promise<void>;
	refreshRoles: (instance: Ticket1155Contract, activeRoleIds: { admin: string; checker: string }) => Promise<void>;
	discoverTokenIds: (instance: Ticket1155Contract) => Promise<string[]>;
	refreshBalances: (instance: Ticket1155Contract, tokenIds: string[]) => Promise<void>;
	refreshAll: (instance: Ticket1155Contract, overrideRoleIds?: { admin: string; checker: string }, tokenHints?: string[]) => Promise<void>;
	connectToContract: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
	const context = useContext(AppContext);
	if (!context) {
		throw new Error("useApp must be used within AppProvider");
	}
	return context;
};

const compareTokenIds = (left: string, right: string) => {
	try {
		const a = BigInt(left);
		const b = BigInt(right);
		if (a === b) return 0;
		return a > b ? 1 : -1;
	} catch {
		return left.localeCompare(right);
	}
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
	const provider = useMemo(() => new JsonRpcProvider(LOCAL_NODE_URL), []);

	const wallets = useMemo(() => {
		try {
			const root = HDNodeWallet.fromPhrase(DEMO_MNEMONIC, undefined, "m/44'/60'/0'/0");
			return Array.from({ length: ACCOUNT_COUNT }, (_, index) => {
				const child = root.deriveChild(index);
				return new Wallet(child.privateKey, provider);
			});
		} catch (error) {
			console.error("Erro ao derivar wallets Hardhat:", error);
			return [] as Wallet[];
		}
	}, [provider]);

	const accounts = useMemo<Account[]>(
		() => wallets.map((wallet, index) => ({ label: `Conta ${index}`, address: wallet.address })),
		[wallets]
	);

	const walletByAddress = useMemo(() => {
		const map: Record<string, Wallet> = {};
		wallets.forEach((wallet) => {
			map[wallet.address.toLowerCase()] = wallet;
		});
		return map;
	}, [wallets]);

	const walletFor = useCallback(
		(address: string) => walletByAddress[address.toLowerCase()],
		[walletByAddress]
	);

	const [status, setStatus] = useState<string>("Aguardando conexão com o nó Hardhat local...");
	const [contractInput, setContractInput] = useState<string>("");
	const [contract, setContract] = useState<Ticket1155Contract | null>(null);
	const [roleIds, setRoleIds] = useState<{ admin: string; checker: string } | null>(null);
	const [roles, setRoles] = useState<RoleState>({ admins: [], checkers: [] });
	const [baseUri, setBaseUri] = useState<string>("");
	const [balances, setBalances] = useState<BalanceState>({});
	const [knownTokenIds, setKnownTokenIds] = useState<string[]>([]);
	const [ethBalances, setEthBalances] = useState<Record<string, string>>({});
	const [log, setLog] = useState<string[]>([]);
	const [isBusy, setIsBusy] = useState<boolean>(false);
	const [userType, setUserType] = useState<UserType>(null);
	const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

	const pushLog = useCallback((message: string) => {
		setLog((prev) => [message, ...prev].slice(0, 20));
	}, []);

	const actingIsAdmin = useCallback(
		(address: string) => roles.admins.some((admin) => admin.toLowerCase() === address.toLowerCase()),
		[roles.admins]
	);

	const actingIsChecker = useCallback(
		(address: string) => roles.checkers.some((checker) => checker.toLowerCase() === address.toLowerCase()),
		[roles.checkers]
	);

	const refreshEthBalances = useCallback(async () => {
		if (accounts.length === 0) return;
		try {
			const entries = await Promise.all(
				accounts.map(async (account) => {
					const balance = await provider.getBalance(account.address);
					return [account.address, formatEther(balance)] as const;
				})
			);
			setEthBalances(Object.fromEntries(entries));
		} catch (error) {
			pushLog(`⚠️ Falha ao atualizar saldos em ETH: ${(error as Error).message}`);
		}
	}, [accounts, provider, pushLog]);

	const refreshRoles = useCallback(
		async (instance: Ticket1155Contract, activeRoleIds: { admin: string; checker: string }) => {
			const admins: string[] = [];
			const checkers: string[] = [];
			await Promise.all(
				accounts.map(async (account) => {
					const [isAdmin, isChecker] = await Promise.all([
						instance.hasRole(activeRoleIds.admin, account.address),
						instance.hasRole(activeRoleIds.checker, account.address)
					]);
					if (isAdmin) admins.push(account.address);
					if (isChecker) checkers.push(account.address);
				})
			);
			setRoles({ admins, checkers });
		},
		[accounts]
	);

	const discoverTokenIds = useCallback(
		async (instance: Ticket1155Contract) => {
			try {
				const filter = instance.filters.TransferSingle();
				const events = await instance.queryFilter(filter, 0, "latest");
				const ids = new Set<string>();
				events.forEach((event) => {
					const id = event.args?.id;
					if (id !== undefined) {
						ids.add(id.toString());
					}
				});
				return Array.from(ids).sort(compareTokenIds);
			} catch (error) {
				pushLog(`⚠️ Não foi possível ler eventos TransferSingle: ${(error as Error).message}`);
				return knownTokenIds;
			}
		},
		[knownTokenIds, pushLog]
	);

	const refreshBalances = useCallback(
		async (instance: Ticket1155Contract, tokenIds: string[]) => {
			if (tokenIds.length === 0) {
				setBalances({});
				return;
			}
			const balancesMap: BalanceState = {};
			await Promise.all(
				accounts.map(async (account) => {
					const walletBalances: Record<string, bigint> = {};
					for (const tokenId of tokenIds) {
						try {
							const amount = await instance.balanceOf(account.address, BigInt(tokenId));
							walletBalances[tokenId] = amount;
						} catch (error) {
							pushLog(
								`⚠️ Falha ao ler balanceOf(${account.address}, ${tokenId}): ${(error as Error).message}`
							);
						}
					}
					balancesMap[account.address] = walletBalances;
				})
			);
			setBalances(balancesMap);
		},
		[accounts, pushLog]
	);

	const refreshAll = useCallback(
		async (
			instance: Ticket1155Contract,
			overrideRoleIds?: { admin: string; checker: string },
			tokenHints?: string[]
		) => {
			const activeRoleIds = overrideRoleIds ?? roleIds;
			if (!activeRoleIds) {
				throw new Error("IDs de papéis ainda não carregados.");
			}
			if (overrideRoleIds) {
				setRoleIds(overrideRoleIds);
			}
			const tokenIds = tokenHints ?? (await discoverTokenIds(instance));
			await refreshRoles(instance, activeRoleIds);
			await refreshBalances(instance, tokenIds);
			setKnownTokenIds(tokenIds);
			try {
				const sample = tokenIds[0] ? BigInt(tokenIds[0]) : 0n;
				const uriValue = await instance.uri(sample);
				setBaseUri(uriValue);
			} catch (error) {
				pushLog(`⚠️ Não foi possível consultar a URI: ${(error as Error).message}`);
			}
			await refreshEthBalances();
		},
		[discoverTokenIds, refreshBalances, refreshEthBalances, refreshRoles, roleIds, pushLog]
	);

	useEffect(() => {
		(async () => {
			try {
				await provider.getBlockNumber();
				setStatus("Conectado ao nó Hardhat local. Informe o endereço do contrato Ticket1155.");
				await refreshEthBalances();
			} catch (error) {
				setStatus(`Não foi possível conectar ao nó local: ${(error as Error).message}`);
			}
		})();
	}, [provider, refreshEthBalances]);

	const connectToContract = useCallback(async () => {
		if (!contractInput) {
			setStatus("Informe o endereço do contrato antes de conectar.");
			return;
		}
		setIsBusy(true);
		try {
			const instance = new Contract(contractInput, artifact.abi, provider) as Ticket1155Contract;
			const [adminRole, checkerRole] = await Promise.all([
				instance.ROLE_ADMIN(),
				instance.ROLE_CHECKER()
			]);
			await refreshAll(instance, { admin: adminRole, checker: checkerRole });
			setContract(instance);
			pushLog(`🔌 Conectado ao contrato ${contractInput}.`);
			setStatus(`Conectado ao contrato ${contractInput}.`);
		} catch (error) {
			const message = (error as Error).message;
			setStatus(`Falha ao conectar ao contrato: ${message}`);
			pushLog(`❌ Falha ao conectar: ${message}`);
		} finally {
			setIsBusy(false);
		}
	}, [contractInput, provider, refreshAll, pushLog]);

	const value: AppContextType = {
		provider,
		wallets,
		accounts,
		walletFor,
		status,
		setStatus,
		contractInput,
		setContractInput,
		contract,
		setContract,
		roleIds,
		setRoleIds,
		roles,
		setRoles,
		baseUri,
		setBaseUri,
		balances,
		setBalances,
		knownTokenIds,
		setKnownTokenIds,
		ethBalances,
		log,
		pushLog,
		isBusy,
		setIsBusy,
		userType,
		setUserType,
		selectedAccount,
		setSelectedAccount,
		actingIsAdmin,
		actingIsChecker,
		refreshEthBalances,
		refreshRoles,
		discoverTokenIds,
		refreshBalances,
		refreshAll,
		connectToContract
	};

	return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

