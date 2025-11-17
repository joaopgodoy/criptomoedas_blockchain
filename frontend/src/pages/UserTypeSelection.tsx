import { Shield, Check, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useApp } from "@/context/AppContext";
import { UserType } from "@/types";

export default function UserTypeSelection() {
	const { setUserType } = useApp();

	const handleSelectUserType = (type: UserType) => {
		setUserType(type);
	};

	return (
		<div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-8 p-6">
			<div className="text-center space-y-4">
				<h1 className="text-4xl font-bold">Painel Ticket1155</h1>
				<p className="text-lg text-muted-foreground">
					Selecione o tipo de usuário para continuar
				</p>
			</div>

			<div className="grid gap-6 md:grid-cols-3 w-full">
				<Card className="cursor-pointer transition-all hover:shadow-lg hover:border-primary" onClick={() => handleSelectUserType("admin")}>
					<CardHeader className="text-center">
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
							<Shield className="h-8 w-8 text-primary" />
						</div>
						<CardTitle>Admin</CardTitle>
						<CardDescription>Gerenciar contratos, emitir ingressos e conceder permissões</CardDescription>
					</CardHeader>
					<CardContent className="text-center">
						<Button className="w-full">Acessar como Admin</Button>
					</CardContent>
				</Card>

				<Card className="cursor-pointer transition-all hover:shadow-lg hover:border-blue-600" onClick={() => handleSelectUserType("checker")}>
					<CardHeader className="text-center">
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
							<Check className="h-8 w-8 text-blue-600" />
						</div>
						<CardTitle>Checker</CardTitle>
						<CardDescription>Validar ingressos e realizar check-ins no evento</CardDescription>
					</CardHeader>
					<CardContent className="text-center">
						<Button className="w-full" variant="outline">Acessar como Checker</Button>
					</CardContent>
				</Card>

				<Card className="cursor-pointer transition-all hover:shadow-lg hover:border-green-600" onClick={() => handleSelectUserType("holder")}>
					<CardHeader className="text-center">
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
							<User className="h-8 w-8 text-green-600" />
						</div>
						<CardTitle>Titular</CardTitle>
						<CardDescription>Visualizar e transferir seus ingressos</CardDescription>
					</CardHeader>
					<CardContent className="text-center">
						<Button className="w-full" variant="outline">Acessar como Titular</Button>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

