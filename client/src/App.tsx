import { Routes, Route } from "react-router-dom";
import AuthGate from "./auth/AuthGate";
import Layout from "./components/Layout";
import { UIProvider } from "./components/ui";
import Dashboard from "./pages/Dashboard";
import CRM from "./pages/CRM";
import Clientes from "./pages/Clientes";
import ClienteDetalhe from "./pages/ClienteDetalhe";
import Orcamentos from "./pages/Orcamentos";
import OrcamentoEditor from "./pages/OrcamentoEditor";
import Projetos from "./pages/Projetos";
import ProjetoDetalhe from "./pages/ProjetoDetalhe";
import Catalogo from "./pages/Catalogo";
import Agenda from "./pages/Agenda";
import Financeiro from "./pages/Financeiro";
import PosVenda from "./pages/PosVenda";
import Configuracoes from "./pages/Configuracoes";

export default function App() {
  return (
    <UIProvider>
      <AuthGate>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/crm" element={<CRM />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/clientes/:id" element={<ClienteDetalhe />} />
            <Route path="/orcamentos" element={<Orcamentos />} />
            <Route path="/orcamentos/:id" element={<OrcamentoEditor />} />
            <Route path="/projetos" element={<Projetos />} />
            <Route path="/projetos/:id" element={<ProjetoDetalhe />} />
            <Route path="/catalogo" element={<Catalogo />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/financeiro" element={<Financeiro />} />
            <Route path="/pos-venda" element={<PosVenda />} />
            <Route path="/config" element={<Configuracoes />} />
          </Routes>
        </Layout>
      </AuthGate>
    </UIProvider>
  );
}
