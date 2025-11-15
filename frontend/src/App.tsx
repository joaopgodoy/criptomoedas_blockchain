import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
	Contract,
	ContractTransactionResponse,
	HDNodeWallet,
	InterfaceAbi,
	JsonRpcProvider,
	Wallet,
	formatEther
} from "ethers";
import { Check, Plug, Shield, TicketsPlane } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import ticket1155Artifact from "@/contract/ticket1155-abi.json";

type Ticket1155Contract = Contract & {
	ROLE_ADMIN(): Promise<string>;
	ROLE_CHECKER(): Promise<string>;
	hasRole(role: string, account: string): Promise<boolean>;
	mintTicket(to: string, tokenId: bigint, amount: bigint, data: string): Promise<ContractTransactionResponse>;
	grantRole(role: string, account: string): Promise<ContractTransactionResponse>;
	setURI(uri: string): Promise<ContractTransactionResponse>;
	checkIn(holder: string, tokenId: bigint): Promise<ContractTransactionResponse>;
	balanceOf(account: string, id: bigint): Promise<bigint>;
	uri(id: bigint): Promise<string>;
	filters: {
		TransferSingle(operator?: string | null, from?: string | null, to?: string | null): unknown;
	};
	queryFilter(filter: unknown, fromBlock?: number | string, toBlock?: number | string): Promise<Array<{ args?: { id?: bigint } }>>;
};

interface Account {
	label: string;
	address: string;
}

type BalanceState = Record<string, Record<string, bigint>>;

type RoleState = {
	admins: string[];
	checkers: string[];
};

type AdminFormState = {
	actor: string;
	recipient: string;
	tokenId: string;
	amount: string;
};

type RoleFormState = {
	actor: string;
	target: string;
	role: "admin" | "checker";
};

type CheckInFormState = {
	actor: string;
	holder: string;
	tokenId: string;
};

const LOCAL_NODE_URL = "http://127.0.0.1:8545";
const DEMO_MNEMONIC = "test test test test test test test test test test test junk";
const ACCOUNT_COUNT = 4;

const artifact = ticket1155Artifact as { abi: InterfaceAbi };

const formatToken = (tokenId: string) => `#${tokenId}`;

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

export default function App() {
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
	const [uriDraft, setUriDraft] = useState<string>("");
	const [balances, setBalances] = useState<BalanceState>({});
	const [knownTokenIds, setKnownTokenIds] = useState<string[]>([]);
	const [ethBalances, setEthBalances] = useState<Record<string, string>>({});
	const [log, setLog] = useState<string[]>([]);
	const [isBusy, setIsBusy] = useState<boolean>(false);

	const [uriActor, setUriActor] = useState<string>("");
	const [adminForm, setAdminForm] = useState<AdminFormState>({ actor: "", recipient: "", tokenId: "1", amount: "1" });
	const [roleForm, setRoleForm] = useState<RoleFormState>({ actor: "", target: "", role: "checker" });
	const [checkInForm, setCheckInForm] = useState<CheckInFormState>({ actor: "", holder: "", tokenId: "1" });
	const [viewer, setViewer] = useState<string>("");

	useEffect(() => {
		if (accounts.length >= 3) {
			setUriActor((prev) => prev || accounts[0].address);
			setAdminForm((prev) => ({
				actor: prev.actor || accounts[0].address,
				recipient: prev.recipient || accounts[2].address,
				tokenId: prev.tokenId,
				amount: prev.amount
			}));
			setRoleForm((prev) => ({
				actor: prev.actor || accounts[0].address,
				target: prev.target || accounts[1].address,
				role: prev.role
			}));
			setCheckInForm((prev) => ({
				actor: prev.actor || accounts[1].address,
				holder: prev.holder || accounts[2].address,
				tokenId: prev.tokenId
			}));
			setViewer((prev) => prev || accounts[2].address);
		}
	}, [accounts]);

	const pushLog = useCallback((message: string) => {
		setLog((prev) => [message, ...prev].slice(0, 10));
	}, []);

	const actingIsAdmin = useCallback(
		(address: string) => roles.admins.some((admin) => admin.toLowerCase() === address.toLowerCase()),
		[roles.admins]
	);

	const actingIsChecker = useCallback(
		(address: string) => roles.checkers.some((checker) => checker.toLowerCase() === address.toLowerCase()),
		[roles.checkers]
	);

	const viewerBalances = useMemo(() => {
		const bag = balances[viewer] ?? {};
		return Object.entries(bag)
			.filter(([, qty]) => qty > 0n)
			.sort((a, b) => compareTokenIds(a[0], b[0]));
	}, [balances, viewer]);

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
				setUriDraft(uriValue);
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

	const handleRefresh = useCallback(async () => {
		if (!contract) {
			setStatus("Conecte um contrato antes de recarregar o estado.");
			return;
		}
		setIsBusy(true);
		try {
			await refreshAll(contract);
			pushLog("🔄 Estado sincronizado com o contrato.");
		} catch (error) {
			pushLog(`❌ Erro ao atualizar estado: ${(error as Error).message}`);
		} finally {
			setIsBusy(false);
		}
	}, [contract, refreshAll, pushLog]);

	const handleSetUri = useCallback(async () => {
		if (!contract || !roleIds) {
			pushLog("ℹ️ Conecte-se ao contrato antes de atualizar a URI.");
			return;
		}
		if (!uriActor) {
			pushLog("⚠️ Selecione uma conta para executar a transação.");
			return;
		}
		if (!actingIsAdmin(uriActor)) {
			pushLog(`❌ ${uriActor} não possui ROLE_ADMIN.`);
			return;
		}
		setIsBusy(true);
		try {
			const wallet = walletFor(uriActor);
			if (!wallet) throw new Error("Conta não encontrada entre as derivadas Hardhat.");
			const signer = contract.connect(wallet) as Ticket1155Contract;
			const tx = await signer.setURI(uriDraft);
			pushLog(`⏳ Atualizando URI (tx ${tx.hash.slice(0, 10)}...).`);
			await tx.wait();
			pushLog(`🔧 URI atualizada por ${uriActor}.`);
			await refreshAll(contract);
		} catch (error) {
			pushLog(`❌ Falha ao atualizar URI: ${(error as Error).message}`);
		} finally {
			setIsBusy(false);
		}
	}, [actingIsAdmin, contract, refreshAll, roleIds, uriActor, uriDraft, walletFor, pushLog]);

	const handleMint = useCallback(async () => {
		if (!contract) {
			pushLog("ℹ️ Conecte-se ao contrato antes de mintar.");
			return;
		}
		if (!actingIsAdmin(adminForm.actor)) {
			pushLog(`❌ ${adminForm.actor} não possui ROLE_ADMIN.`);
			return;
		}
		let tokenId: bigint;
		let amount: bigint;
		try {
			tokenId = BigInt(adminForm.tokenId.trim());
			amount = BigInt(adminForm.amount.trim());
			if (amount <= 0n) throw new Error("Quantidade deve ser positiva.");
		} catch (error) {
			pushLog(`⚠️ Valores informados inválidos: ${(error as Error).message}`);
			return;
		}
		setIsBusy(true);
		try {
			const wallet = walletFor(adminForm.actor);
			if (!wallet) throw new Error("Conta não encontrada entre as derivadas Hardhat.");
			const signer = contract.connect(wallet) as Ticket1155Contract;
			const tx = await signer.mintTicket(adminForm.recipient, tokenId, amount, "0x");
			pushLog(`⏳ Mint iniciado (tx ${tx.hash.slice(0, 10)}...).`);
			await tx.wait();
			pushLog(`🎟️ Mint concluído para ${adminForm.recipient}.`);
			const tokenHints = Array.from(new Set([...knownTokenIds, adminForm.tokenId.trim()])).filter(Boolean);
			await refreshAll(contract, undefined, tokenHints);
		} catch (error) {
			pushLog(`❌ Falha no mint: ${(error as Error).message}`);
		} finally {
			setIsBusy(false);
		}
	}, [actingIsAdmin, adminForm, contract, knownTokenIds, refreshAll, walletFor, pushLog]);

	const handleGrantRole = useCallback(async () => {
		if (!contract || !roleIds) {
			pushLog("ℹ️ Conecte-se ao contrato antes de gerenciar papéis.");
			return;
		}
		if (!actingIsAdmin(roleForm.actor)) {
			pushLog(`❌ ${roleForm.actor} não possui ROLE_ADMIN.`);
			return;
		}
		const roleId = roleForm.role === "admin" ? roleIds.admin : roleIds.checker;
		setIsBusy(true);
		try {
			const wallet = walletFor(roleForm.actor);
			if (!wallet) throw new Error("Conta não encontrada entre as derivadas Hardhat.");
			const signer = contract.connect(wallet) as Ticket1155Contract;
			const tx = await signer.grantRole(roleId, roleForm.target);
			pushLog(`⏳ Concedendo ROLE_${roleForm.role.toUpperCase()} (tx ${tx.hash.slice(0, 10)}...).`);
			await tx.wait();
			pushLog(`🛡️ ${roleForm.target} agora possui ROLE_${roleForm.role.toUpperCase()}.`);
			await refreshAll(contract);
		} catch (error) {
			pushLog(`❌ Falha ao conceder papel: ${(error as Error).message}`);
		} finally {
			setIsBusy(false);
		}
	}, [actingIsAdmin, contract, refreshAll, roleForm, roleIds, walletFor, pushLog]);

	const handleCheckIn = useCallback(async () => {
		if (!contract) {
			pushLog("ℹ️ Conecte-se ao contrato antes de realizar check-in.");
			return;
		}
		if (!actingIsChecker(checkInForm.actor)) {
			pushLog(`❌ ${checkInForm.actor} não possui ROLE_CHECKER.`);
			return;
		}
		let tokenId: bigint;
		try {
			tokenId = BigInt(checkInForm.tokenId.trim());
		} catch (error) {
			pushLog(`⚠️ Token ID inválido: ${(error as Error).message}`);
			return;
		}
		setIsBusy(true);
		try {
			const wallet = walletFor(checkInForm.actor);
			if (!wallet) throw new Error("Conta não encontrada entre as derivadas Hardhat.");
			const signer = contract.connect(wallet) as Ticket1155Contract;
			const tx = await signer.checkIn(checkInForm.holder, tokenId);
			pushLog(`⏳ Check-in em andamento (tx ${tx.hash.slice(0, 10)}...).`);
			await tx.wait();
			pushLog(`✅ ${checkInForm.holder} teve um ingresso validado.`);
			await refreshAll(contract);
		} catch (error) {
			pushLog(`❌ Falha no check-in: ${(error as Error).message}`);
		} finally {
			setIsBusy(false);
		}
	}, [actingIsChecker, checkInForm, contract, refreshAll, walletFor, pushLog]);

	const resolveTokenUri = (tokenId: string) => {
		if (!baseUri) return "-";
		if (!baseUri.includes("{id}")) return baseUri;
		try {
			return baseUri.replace("{id}", BigInt(tokenId).toString(16).padStart(64, "0"));
		} catch {
			return baseUri;
		}
	};

	return (
		<div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 p-6">
			<header className="flex flex-col gap-2">
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<TicketsPlane className="h-5 w-5" />
					<span>Integração local · Transações assinadas com contas Hardhat</span>
				</div>
				<h1 className="text-3xl font-semibold">Painel Ticket1155</h1>
				<p className="text-muted-foreground">
					Controle os papéis de administrador, checker e titulares interagindo com o contrato real em execução no nó Hardhat local.
				</p>
			</header>

			<Card>
				<CardHeader>
					<CardTitle>Conexão com Hardhat</CardTitle>
					<CardDescription>Utiliza o mnemonic padrão para assinar as chamadas sem depender do MetaMask.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-4 md:grid-cols-3">
						<div className="md:col-span-2 grid gap-2">
							<Label htmlFor="contract-address">Endereço do contrato Ticket1155</Label>
							<Input
								id="contract-address"
								placeholder="0x..."
								value={contractInput}
								onChange={(event: ChangeEvent<HTMLInputElement>) => setContractInput(event.target.value)}
							/>
						</div>
						<div className="flex items-end gap-2">
							<Button type="button" onClick={connectToContract} disabled={isBusy || !contractInput}>
								Conectar
							</Button>
							<Button type="button" variant="outline" onClick={handleRefresh} disabled={isBusy || !contract}>
								Recarregar
							</Button>
						</div>
					</div>
					<p className="flex items-center gap-2 text-sm text-muted-foreground">
						<Plug className="h-4 w-4" /> {status}
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Contas simuladas</CardTitle>
					<CardDescription>Geradas a partir do mnemonic padrão do Hardhat, cada uma com 10.000 ETH no nó local.</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-3 md:grid-cols-2">
					{accounts.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							Não foi possível derivar as contas a partir do mnemonic padrão.
						</p>
					) : (
						accounts.map((account) => (
							<div key={account.address} className="rounded-md border border-border p-3 text-sm">
								<div className="flex items-center justify-between">
									<span>{account.label}</span>
									<span className="font-mono text-xs">{ethBalances[account.address] ?? "…"} ETH</span>
								</div>
								<p className="mt-1 font-mono text-xs break-all">{account.address}</p>
								<div className="mt-2 flex flex-wrap gap-2 text-[11px] font-medium uppercase">
									{actingIsAdmin(account.address) && (
										<span className="rounded bg-primary/10 px-2 py-0.5 text-primary">ROLE_ADMIN</span>
									)}
									{actingIsChecker(account.address) && (
										<span className="rounded bg-blue-100 px-2 py-0.5 text-blue-700">ROLE_CHECKER</span>
									)}
								</div>
							</div>
						))
					)}
				</CardContent>
			</Card>

			<Tabs defaultValue="admin" className="w-full">
				<TabsList>
					<TabsTrigger value="admin">Admin</TabsTrigger>
					<TabsTrigger value="checker">Checker</TabsTrigger>
					<TabsTrigger value="user">Titular</TabsTrigger>
				</TabsList>

				<TabsContent value="admin" className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Atualizar URI base</CardTitle>
							<CardDescription>Somente contas com ROLE_ADMIN podem alterar a URI usada pelo contrato.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-2">
								<Label htmlFor="uri-actor">Conta que executa</Label>
								<select
									id="uri-actor"
									value={uriActor}
									onChange={(event: ChangeEvent<HTMLSelectElement>) => setUriActor(event.target.value)}
									className="h-10 rounded-md border border-input bg-white px-3 text-sm"
								>
									{accounts.map((account) => (
										<option key={account.address} value={account.address}>
											{account.label} · {account.address}
										</option>
									))}
								</select>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="uri-input">Nova URI base</Label>
								<Input
									id="uri-input"
									value={uriDraft}
									onChange={(event: ChangeEvent<HTMLInputElement>) => setUriDraft(event.target.value)}
								/>
							</div>
							<Button type="button" onClick={handleSetUri} disabled={isBusy}>
								Atualizar URI
							</Button>
							<p className="text-sm text-muted-foreground">URI atual: {baseUri || "―"}</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Mintar ingressos</CardTitle>
							<CardDescription>Executa a função <code>mintTicket</code> do contrato real.</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-4 md:grid-cols-2">
							<div className="grid gap-2">
								<Label htmlFor="mint-actor">Conta admin</Label>
								<select
									id="mint-actor"
									value={adminForm.actor}
									onChange={(event: ChangeEvent<HTMLSelectElement>) =>
										setAdminForm((prev) => ({ ...prev, actor: event.target.value }))
									}
									className="h-10 rounded-md border border-input bg-white px-3 text-sm"
								>
									{accounts.map((account) => (
										<option key={account.address} value={account.address}>
											{account.label} · {account.address}
										</option>
									))}
								</select>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="mint-recipient">Destinatário</Label>
								<select
									id="mint-recipient"
									value={adminForm.recipient}
									onChange={(event: ChangeEvent<HTMLSelectElement>) =>
										setAdminForm((prev) => ({ ...prev, recipient: event.target.value }))
									}
									className="h-10 rounded-md border border-input bg-white px-3 text-sm"
								>
									{accounts.map((account) => (
										<option key={account.address} value={account.address}>
											{account.label} · {account.address}
										</option>
									))}
								</select>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="mint-id">Token ID</Label>
								<Input
									id="mint-id"
									value={adminForm.tokenId}
									onChange={(event: ChangeEvent<HTMLInputElement>) =>
										setAdminForm((prev) => ({ ...prev, tokenId: event.target.value }))
									}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="mint-amount">Quantidade</Label>
								<Input
									id="mint-amount"
									value={adminForm.amount}
									onChange={(event: ChangeEvent<HTMLInputElement>) =>
										setAdminForm((prev) => ({ ...prev, amount: event.target.value }))
									}
								/>
							</div>
							<Button type="button" onClick={handleMint} className="md:col-span-2" disabled={isBusy}>
								Mintar ingressos
							</Button>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Gerenciar papéis</CardTitle>
							<CardDescription>Concede ROLE_ADMIN ou ROLE_CHECKER diretamente pelo contrato.</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-4 md:grid-cols-2">
							<div className="grid gap-2">
								<Label htmlFor="role-actor">Conta admin</Label>
								<select
									id="role-actor"
									value={roleForm.actor}
									onChange={(event: ChangeEvent<HTMLSelectElement>) =>
										setRoleForm((prev) => ({ ...prev, actor: event.target.value }))
									}
									className="h-10 rounded-md border border-input bg-white px-3 text-sm"
								>
									{accounts.map((account) => (
										<option key={account.address} value={account.address}>
											{account.label} · {account.address}
										</option>
									))}
								</select>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="role-target">Conta alvo</Label>
								<select
									id="role-target"
									value={roleForm.target}
									onChange={(event: ChangeEvent<HTMLSelectElement>) =>
										setRoleForm((prev) => ({ ...prev, target: event.target.value }))
									}
									className="h-10 rounded-md border border-input bg-white px-3 text-sm"
								>
									{accounts.map((account) => (
										<option key={account.address} value={account.address}>
											{account.label} · {account.address}
										</option>
									))}
								</select>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="role-select">Papel</Label>
								<select
									id="role-select"
									value={roleForm.role}
									onChange={(event: ChangeEvent<HTMLSelectElement>) =>
										setRoleForm((prev) => ({ ...prev, role: event.target.value as RoleFormState["role"] }))
									}
									className="h-10 rounded-md border border-input bg-white px-3 text-sm"
								>
									<option value="admin">ROLE_ADMIN</option>
									<option value="checker">ROLE_CHECKER</option>
								</select>
							</div>
							<Button type="button" onClick={handleGrantRole} className="md:col-span-2" disabled={isBusy}>
								Conceder papel
							</Button>
							<div className="md:col-span-2 grid gap-2 text-sm text-muted-foreground">
								<div>
									<strong>ROLE_ADMIN:</strong> {roles.admins.join(", ") || "―"}
								</div>
								<div>
									<strong>ROLE_CHECKER:</strong> {roles.checkers.join(", ") || "―"}
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="checker">
					<Card>
						<CardHeader>
							<CardTitle>Check-in</CardTitle>
							<CardDescription>Executa <code>checkIn</code>, queimando um ingresso do titular.</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-4 md:grid-cols-3">
							<div className="grid gap-2">
								<Label htmlFor="checker-actor">Conta checker</Label>
								<select
									id="checker-actor"
									value={checkInForm.actor}
									onChange={(event) => setCheckInForm((prev) => ({ ...prev, actor: event.target.value }))}
									className="h-10 rounded-md border border-input bg-white px-3 text-sm"
								>
									{accounts.map((account) => (
										<option key={account.address} value={account.address}>
											{account.label} · {account.address}
										</option>
									))}
								</select>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="checker-holder">Titular</Label>
								<select
									id="checker-holder"
									value={checkInForm.holder}
									onChange={(event) => setCheckInForm((prev) => ({ ...prev, holder: event.target.value }))}
									className="h-10 rounded-md border border-input bg-white px-3 text-sm"
								>
									{accounts.map((account) => (
										<option key={account.address} value={account.address}>
											{account.label} · {account.address}
										</option>
									))}
								</select>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="checker-token">Token ID</Label>
								<Input
									id="checker-token"
									value={checkInForm.tokenId}
									onChange={(event) => setCheckInForm((prev) => ({ ...prev, tokenId: event.target.value }))}
								/>
							</div>
							<Button type="button" onClick={handleCheckIn} className="md:col-span-3" disabled={isBusy}>
								Processar check-in
							</Button>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="user" className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Meus ingressos</CardTitle>
							<CardDescription>Consulta <code>balanceOf</code> para listar os tokens disponíveis no contrato.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="grid gap-2">
								<Label htmlFor="viewer-select">Conta</Label>
								<select
									id="viewer-select"
									value={viewer}
									onChange={(event) => setViewer(event.target.value)}
									className="h-10 rounded-md border border-input bg-white px-3 text-sm"
								>
									{accounts.map((account) => (
										<option key={account.address} value={account.address}>
											{account.label} · {account.address}
										</option>
									))}
								</select>
							</div>
							<div className={cn("grid gap-3", viewerBalances.length === 0 && "text-muted-foreground")}>
								{viewerBalances.length === 0 ? (
									<p>Nenhum ingresso encontrado para esta conta.</p>
								) : (
									viewerBalances.map(([tokenId, quantity]) => (
										<div
											key={tokenId}
											className="flex items-center justify-between rounded-md border border-border px-4 py-2"
										>
											<div>
												<p className="font-medium">Token {formatToken(tokenId)}</p>
												<p className="text-sm text-muted-foreground">
													URI resolvida: {resolveTokenUri(tokenId)}
												</p>
											</div>
											<span className="text-lg font-semibold">{quantity.toString()}</span>
										</div>
									))
								)}
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			<aside className="rounded-lg border border-dashed border-border bg-white p-4 text-sm">
				<h2 className="mb-2 flex items-center gap-2 font-semibold">
					<Shield className="h-4 w-4" /> Eventos recentes
				</h2>
				{log.length === 0 ? (
					<p className="text-muted-foreground">Nenhuma ação registrada ainda.</p>
				) : (
					<ul className="space-y-2">
						{log.map((entry, index) => (
							<li key={index} className="flex items-start gap-2">
								<Check className="mt-0.5 h-4 w-4 text-primary" />
								<span>{entry}</span>
							</li>
						))}
					</ul>
				)}
			</aside>
		</div>
	);
}
