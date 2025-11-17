import { ChangeEvent, useCallback, useState, useEffect } from "react";
import { ArrowLeft, Plug, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/context/AppContext";

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

export default function AdminPage() {
	const {
		accounts,
		status,
		contractInput,
		setContractInput,
		contract,
		roleIds,
		roles,
		baseUri,
		log,
		isBusy,
		actingIsAdmin,
		walletFor,
		pushLog,
		refreshAll,
		connectToContract,
		knownTokenIds,
		setUserType
	} = useApp();

	const [uriActor, setUriActor] = useState<string>("");
	const [uriDraft, setUriDraft] = useState<string>("");
	const [adminForm, setAdminForm] = useState<AdminFormState>({ actor: "", recipient: "", tokenId: "1", amount: "1" });
	const [roleForm, setRoleForm] = useState<RoleFormState>({ actor: "", target: "", role: "checker" });

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
		}
	}, [accounts]);

	useEffect(() => {
		setUriDraft(baseUri);
	}, [baseUri]);

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
		try {
			const wallet = walletFor(uriActor);
			if (!wallet) throw new Error("Conta não encontrada entre as derivadas Hardhat.");
			const signer = contract.connect(wallet);
			const tx = await signer.setURI(uriDraft);
			pushLog(`⏳ Atualizando URI (tx ${tx.hash.slice(0, 10)}...).`);
			await tx.wait();
			pushLog(`🔧 URI atualizada por ${uriActor}.`);
			await refreshAll(contract);
		} catch (error) {
			pushLog(`❌ Falha ao atualizar URI: ${(error as Error).message}`);
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
		try {
			const wallet = walletFor(adminForm.actor);
			if (!wallet) throw new Error("Conta não encontrada entre as derivadas Hardhat.");
			const signer = contract.connect(wallet);
			const tx = await signer.mintTicket(adminForm.recipient, tokenId, amount, "0x");
			pushLog(`⏳ Mint iniciado (tx ${tx.hash.slice(0, 10)}...).`);
			await tx.wait();
			pushLog(`🎟️ Mint concluído para ${adminForm.recipient}.`);
			const tokenHints = Array.from(new Set([...knownTokenIds, adminForm.tokenId.trim()])).filter(Boolean);
			await refreshAll(contract, undefined, tokenHints);
		} catch (error) {
			pushLog(`❌ Falha no mint: ${(error as Error).message}`);
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
		try {
			const wallet = walletFor(roleForm.actor);
			if (!wallet) throw new Error("Conta não encontrada entre as derivadas Hardhat.");
			const signer = contract.connect(wallet);
			const tx = await signer.grantRole(roleId, roleForm.target);
			pushLog(`⏳ Concedendo ROLE_${roleForm.role.toUpperCase()} (tx ${tx.hash.slice(0, 10)}...).`);
			await tx.wait();
			pushLog(`🛡️ ${roleForm.target} agora possui ROLE_${roleForm.role.toUpperCase()}.`);
			await refreshAll(contract);
		} catch (error) {
			pushLog(`❌ Falha ao conceder papel: ${(error as Error).message}`);
		}
	}, [actingIsAdmin, contract, refreshAll, roleForm, roleIds, walletFor, pushLog]);

	return (
		<div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 p-6">
			<header className="flex flex-col gap-2">
				<Button variant="ghost" onClick={() => setUserType(null)} className="w-fit">
					<ArrowLeft className="mr-2 h-4 w-4" /> Voltar
				</Button>
				<div className="flex items-center gap-2">
					<Shield className="h-8 w-8 text-primary" />
					<h1 className="text-3xl font-semibold">Painel Admin</h1>
				</div>
				<p className="text-muted-foreground">
					Gerencie o contrato, emita ingressos e conceda permissões
				</p>
			</header>

			<Card>
				<CardHeader>
					<CardTitle>Conexão com Hardhat</CardTitle>
					<CardDescription>Conecte-se ao contrato para começar</CardDescription>
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
					<CardTitle>Contas com permissões Admin</CardTitle>
					<CardDescription>Contas que podem executar ações administrativas</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-3 md:grid-cols-2">
					{accounts.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							Não foi possível derivar as contas.
						</p>
					) : (
						accounts
							.filter(account => actingIsAdmin(account.address))
							.map((account) => (
								<div key={account.address} className="rounded-md border border-border p-3 text-sm">
									<div className="flex items-center justify-between">
										<span className="font-medium">{account.label}</span>
										<span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-medium uppercase text-primary">
											ROLE_ADMIN
										</span>
									</div>
									<p className="mt-1 font-mono text-xs break-all">{account.address}</p>
								</div>
							))
					)}
					{accounts.length > 0 && accounts.filter(account => actingIsAdmin(account.address)).length === 0 && (
						<p className="text-sm text-muted-foreground col-span-2">
							Nenhuma conta com ROLE_ADMIN encontrada. Conceda permissões primeiro.
						</p>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Atualizar URI base</CardTitle>
					<CardDescription>Somente contas com ROLE_ADMIN podem alterar a URI</CardDescription>
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
					<CardDescription>Emitir novos ingressos para uma conta</CardDescription>
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
					<CardDescription>Conceda ROLE_ADMIN ou ROLE_CHECKER</CardDescription>
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

