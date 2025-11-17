import { ChangeEvent, useCallback, useState, useMemo, useEffect } from "react";
import { ArrowLeft, User, Send, Plug } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";

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

type TransferFormState = {
	tokenId: string;
	recipient: string;
	amount: string;
};

export default function HolderPage() {
	const {
		accounts,
		status,
		contractInput,
		setContractInput,
		contract,
		balances,
		baseUri,
		log,
		isBusy,
		walletFor,
		pushLog,
		refreshAll,
		connectToContract,
		setUserType,
		selectedAccount,
		setSelectedAccount
	} = useApp();

	const [transferForm, setTransferForm] = useState<TransferFormState>({ tokenId: "1", recipient: "", amount: "1" });

	useEffect(() => {
		if (accounts.length >= 2 && !transferForm.recipient) {
			setTransferForm((prev) => ({
				...prev,
				recipient: accounts[0].address
			}));
		}
	}, [accounts, transferForm.recipient]);

	const handleRefresh = useCallback(async () => {
		if (!contract) {
			pushLog("Conecte um contrato antes de recarregar o estado.");
			return;
		}
		try {
			await refreshAll(contract);
			pushLog("🔄 Estado sincronizado com o contrato.");
		} catch (error) {
			pushLog(`❌ Erro ao atualizar estado: ${(error as Error).message}`);
		}
	}, [contract, refreshAll, pushLog]);

	const viewerBalances = useMemo(() => {
		if (!selectedAccount) return [];
		const bag = balances[selectedAccount] ?? {};
		return Object.entries(bag)
			.filter(([, qty]) => qty > 0n)
			.sort((a, b) => compareTokenIds(a[0], b[0]));
	}, [balances, selectedAccount]);

	const resolveTokenUri = (tokenId: string) => {
		if (!baseUri) return "-";
		if (!baseUri.includes("{id}")) return baseUri;
		try {
			return baseUri.replace("{id}", BigInt(tokenId).toString(16).padStart(64, "0"));
		} catch {
			return baseUri;
		}
	};

	const handleSelectAccount = (address: string) => {
		setSelectedAccount(address);
	};

	const handleBackToSelection = () => {
		setSelectedAccount(null);
	};

	const handleTransfer = useCallback(async () => {
		if (!contract || !selectedAccount) {
			pushLog("ℹ️ Conecte-se ao contrato e selecione uma conta antes de transferir.");
			return;
		}

		let tokenId: bigint;
		let amount: bigint;
		try {
			tokenId = BigInt(transferForm.tokenId.trim());
			amount = BigInt(transferForm.amount.trim());
			if (amount <= 0n) throw new Error("Quantidade deve ser positiva.");
		} catch (error) {
			pushLog(`⚠️ Valores informados inválidos: ${(error as Error).message}`);
			return;
		}

		// Verificar se o titular tem saldo suficiente
		const currentBalance = balances[selectedAccount]?.[transferForm.tokenId] ?? 0n;
		if (currentBalance < amount) {
			pushLog(`❌ Saldo insuficiente. Você possui ${currentBalance.toString()} do token #${transferForm.tokenId}.`);
			return;
		}

		try {
			const wallet = walletFor(selectedAccount);
			if (!wallet) throw new Error("Conta não encontrada entre as derivadas Hardhat.");
			const signer = contract.connect(wallet);
			const tx = await signer.safeTransferFrom(selectedAccount, transferForm.recipient, tokenId, amount, "0x");
			pushLog(`⏳ Transferência iniciada (tx ${tx.hash.slice(0, 10)}...).`);
			await tx.wait();
			pushLog(`✅ Transferência concluída! ${amount.toString()} ingresso(s) enviado(s) para ${transferForm.recipient}.`);
			await refreshAll(contract);
		} catch (error) {
			pushLog(`❌ Falha na transferência: ${(error as Error).message}`);
		}
	}, [contract, selectedAccount, transferForm, balances, walletFor, refreshAll, pushLog]);

	// Se nenhuma conta foi selecionada, mostrar seleção de conta
	if (!selectedAccount) {
		return (
			<div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 p-6">
				<header className="flex flex-col gap-2">
					<Button variant="ghost" onClick={() => setUserType(null)} className="w-fit">
						<ArrowLeft className="mr-2 h-4 w-4" /> Voltar
					</Button>
					<div className="flex items-center gap-2">
						<User className="h-8 w-8 text-green-600" />
						<h1 className="text-3xl font-semibold">Painel Titular</h1>
					</div>
					<p className="text-muted-foreground">
						Selecione uma conta para visualizar e gerenciar seus ingressos
					</p>
				</header>

				<Card>
					<CardHeader>
						<CardTitle>Conexão com Hardhat</CardTitle>
						<CardDescription>Conecte-se ao contrato antes de selecionar uma conta</CardDescription>
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
						<CardTitle>Selecione sua conta</CardTitle>
						<CardDescription>Escolha qual conta você deseja acessar</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-4 md:grid-cols-2">
						{accounts.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								Não foi possível derivar as contas.
							</p>
						) : (
							accounts.map((account) => {
								const ticketCount = Object.values(balances[account.address] ?? {}).reduce(
									(sum, qty) => sum + (qty > 0n ? 1n : 0n),
									0n
								);
								const totalTickets = Object.values(balances[account.address] ?? {}).reduce(
									(sum, qty) => sum + qty,
									0n
								);

								return (
									<Card
										key={account.address}
										className="cursor-pointer transition-all hover:shadow-lg hover:border-green-600"
										onClick={() => handleSelectAccount(account.address)}
									>
										<CardHeader>
											<CardTitle className="text-base">{account.label}</CardTitle>
											<p className="font-mono text-xs break-all text-muted-foreground">
												{account.address}
											</p>
										</CardHeader>
										<CardContent>
											<div className="space-y-1 text-sm">
												<p><strong>Tipos de ingressos:</strong> {ticketCount.toString()}</p>
												<p><strong>Total de ingressos:</strong> {totalTickets.toString()}</p>
											</div>
											<Button className="w-full mt-4" variant="outline">
												Acessar conta
											</Button>
										</CardContent>
									</Card>
								);
							})
						)}
					</CardContent>
				</Card>
			</div>
		);
	}

	// Se uma conta foi selecionada, mostrar painel de ingressos
	const selectedAccountInfo = accounts.find(acc => acc.address === selectedAccount);

	return (
		<div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 p-6">
			<header className="flex flex-col gap-2">
				<Button variant="ghost" onClick={handleBackToSelection} className="w-fit">
					<ArrowLeft className="mr-2 h-4 w-4" /> Voltar para seleção de contas
				</Button>
				<div className="flex items-center gap-2">
					<User className="h-8 w-8 text-green-600" />
					<h1 className="text-3xl font-semibold">Meus Ingressos</h1>
				</div>
				<p className="text-muted-foreground">
					{selectedAccountInfo?.label} · {selectedAccount}
				</p>
			</header>

			<Card>
				<CardHeader>
					<CardTitle>Conexão</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center gap-2">
						<Button type="button" variant="outline" onClick={handleRefresh} disabled={isBusy || !contract}>
							Recarregar
						</Button>
					</div>
					<p className="flex items-center gap-2 text-sm text-muted-foreground">
						<Plug className="h-4 w-4" /> {status}
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Seus ingressos</CardTitle>
					<CardDescription>Lista de todos os ingressos que você possui</CardDescription>
				</CardHeader>
				<CardContent className={cn("grid gap-3", viewerBalances.length === 0 && "text-muted-foreground")}>
					{viewerBalances.length === 0 ? (
						<p>Nenhum ingresso encontrado para esta conta.</p>
					) : (
						viewerBalances.map(([tokenId, quantity]) => (
							<div
								key={tokenId}
								className="flex items-center justify-between rounded-md border border-border px-4 py-3"
							>
								<div className="flex-1">
									<p className="font-medium">Token {formatToken(tokenId)}</p>
									<p className="text-sm text-muted-foreground">
										URI: {resolveTokenUri(tokenId)}
									</p>
								</div>
								<div className="text-right">
									<p className="text-2xl font-semibold">{quantity.toString()}</p>
									<p className="text-xs text-muted-foreground">unidades</p>
								</div>
							</div>
						))
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Send className="h-5 w-5" />
						Transferir ingresso
					</CardTitle>
					<CardDescription>Envie seus ingressos para outra conta</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-4 md:grid-cols-3">
					<div className="grid gap-2">
						<Label htmlFor="transfer-token">Token ID</Label>
						<Input
							id="transfer-token"
							value={transferForm.tokenId}
							onChange={(event) => setTransferForm((prev) => ({ ...prev, tokenId: event.target.value }))}
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="transfer-recipient">Destinatário</Label>
						<select
							id="transfer-recipient"
							value={transferForm.recipient}
							onChange={(event: ChangeEvent<HTMLSelectElement>) =>
								setTransferForm((prev) => ({ ...prev, recipient: event.target.value }))
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
						<Label htmlFor="transfer-amount">Quantidade</Label>
						<Input
							id="transfer-amount"
							value={transferForm.amount}
							onChange={(event) => setTransferForm((prev) => ({ ...prev, amount: event.target.value }))}
						/>
					</div>
					<Button type="button" onClick={handleTransfer} className="md:col-span-3" disabled={isBusy}>
						<Send className="mr-2 h-4 w-4" />
						Transferir ingressos
					</Button>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Log de eventos</CardTitle>
				</CardHeader>
				<CardContent>
					{log.length === 0 ? (
						<p className="text-muted-foreground">Nenhuma ação registrada ainda.</p>
					) : (
						<ul className="space-y-2 text-sm">
							{log.slice(0, 10).map((entry, index) => (
								<li key={index} className="flex items-start gap-2">
									<span className="text-primary">•</span>
									<span>{entry}</span>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

