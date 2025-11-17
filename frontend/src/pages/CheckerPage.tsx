import { ChangeEvent, useCallback, useState, useEffect } from "react";
import { ArrowLeft, Check, Plug } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/context/AppContext";

type CheckInFormState = {
	actor: string;
	holder: string;
	tokenId: string;
};

export default function CheckerPage() {
	const {
		accounts,
		status,
		contractInput,
		setContractInput,
		contract,
		log,
		isBusy,
		actingIsChecker,
		walletFor,
		pushLog,
		refreshAll,
		connectToContract,
		setUserType
	} = useApp();

	const [checkInForm, setCheckInForm] = useState<CheckInFormState>({ actor: "", holder: "", tokenId: "1" });

	useEffect(() => {
		if (accounts.length >= 3) {
			setCheckInForm((prev) => ({
				actor: prev.actor || accounts[1].address,
				holder: prev.holder || accounts[2].address,
				tokenId: prev.tokenId
			}));
		}
	}, [accounts]);

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
		try {
			const wallet = walletFor(checkInForm.actor);
			if (!wallet) throw new Error("Conta não encontrada entre as derivadas Hardhat.");
			const signer = contract.connect(wallet);
			const tx = await signer.checkIn(checkInForm.holder, tokenId);
			pushLog(`⏳ Check-in em andamento (tx ${tx.hash.slice(0, 10)}...).`);
			await tx.wait();
			pushLog(`✅ ${checkInForm.holder} teve um ingresso validado.`);
			await refreshAll(contract);
		} catch (error) {
			pushLog(`❌ Falha no check-in: ${(error as Error).message}`);
		}
	}, [actingIsChecker, checkInForm, contract, refreshAll, walletFor, pushLog]);

	return (
		<div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 p-6">
			<header className="flex flex-col gap-2">
				<Button variant="ghost" onClick={() => setUserType(null)} className="w-fit">
					<ArrowLeft className="mr-2 h-4 w-4" /> Voltar
				</Button>
				<div className="flex items-center gap-2">
					<Check className="h-8 w-8 text-blue-600" />
					<h1 className="text-3xl font-semibold">Painel Checker</h1>
				</div>
				<p className="text-muted-foreground">
					Valide ingressos e realize check-ins no evento
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
					<CardTitle>Contas com permissões Checker</CardTitle>
					<CardDescription>Contas que podem validar ingressos</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-3 md:grid-cols-2">
					{accounts.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							Não foi possível derivar as contas.
						</p>
					) : (
						accounts
							.filter(account => actingIsChecker(account.address))
							.map((account) => (
								<div key={account.address} className="rounded-md border border-border p-3 text-sm">
									<div className="flex items-center justify-between">
										<span className="font-medium">{account.label}</span>
										<span className="rounded bg-blue-100 px-2 py-0.5 text-[11px] font-medium uppercase text-blue-700">
											ROLE_CHECKER
										</span>
									</div>
									<p className="mt-1 font-mono text-xs break-all">{account.address}</p>
								</div>
							))
					)}
					{accounts.length > 0 && accounts.filter(account => actingIsChecker(account.address)).length === 0 && (
						<p className="text-sm text-muted-foreground col-span-2">
							Nenhuma conta com ROLE_CHECKER encontrada. Um admin precisa conceder permissões primeiro.
						</p>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Realizar Check-in</CardTitle>
					<CardDescription>Valida e queima um ingresso do titular</CardDescription>
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

