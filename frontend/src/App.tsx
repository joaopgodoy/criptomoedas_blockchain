import { useApp } from "@/context/AppContext";
import UserTypeSelection from "@/pages/UserTypeSelection";
import AdminPage from "@/pages/AdminPage";
import CheckerPage from "@/pages/CheckerPage";
import HolderPage from "@/pages/HolderPage";

export default function App() {
	const { userType } = useApp();

	// Renderizar a página baseada no tipo de usuário selecionado
	if (userType === "admin") {
		return <AdminPage />;
	}

	if (userType === "checker") {
		return <CheckerPage />;
	}

	if (userType === "holder") {
		return <HolderPage />;
	}

	// Página inicial - seleção de tipo de usuário
	return <UserTypeSelection />;
}
