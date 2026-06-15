import { Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import AuthGate from "./auth/AuthGate";
import Layout from "./components/Layout";
import { UIProvider, Spinner } from "./components/ui";
import { TourProvider } from "./components/Tutorial";
import { NotificationProvider } from "./components/Notifications";
import Dashboard from "./pages/Dashboard";
import CRM from "./pages/CRM";
import Clientes from "./pages/Clientes";
import ClienteDetalhe from "./pages/ClienteDetalhe";
import Orcamentos from "./pages/Orcamentos";
import OrcamentoEditor from "./pages/OrcamentoEditor";
import Projetos from "./pages/Projetos";
import ProjetoDetalhe from "./pages/ProjetoDetalhe";
import Catalogo from "./pages/Catalogo";
import Funcionarios from "./pages/Funcionarios";
import Whatsapp from "./pages/Whatsapp";
import Agenda from "./pages/Agenda";
import Financeiro from "./pages/Financeiro";
import PosVenda from "./pages/PosVenda";
import Configuracoes from "./pages/Configuracoes";

// Estúdio 3D — carregado sob demanda (three.js fica fora do bundle inicial).
// Editor portado do site público (visual idêntico, mesmo catálogo de móveis).
const Studio3DRoute = lazy(() => import("./features/estudio3d/Studio3DRoute"));
const ArchitectSupportPage = lazy(() => import("./features/orcamento3d/ArchitectSupportPage"));

const Loader = () => (
  <div className="min-h-full bg-background grid place-items-center"><Spinner /></div>
);

export default function App() {
  return (
    <UIProvider>
      <Routes>
        {/* Área pública do cliente (sem login) */}
        <Route
          path="/orcamento-3d"
          element={<Suspense fallback={<Loader />}><Studio3DRoute modo="publico" /></Suspense>}
        />
        <Route
          path="/orcamento-3d/:projetoId"
          element={<Suspense fallback={<Loader />}><Studio3DRoute modo="publico" /></Suspense>}
        />
        {/* Aplicação autenticada (CRM/operação) */}
        <Route path="/*" element={<AuthedApp />} />
      </Routes>
    </UIProvider>
  );
}

function AuthedApp() {
  return (
    <AuthGate>
      <NotificationProvider>
        <TourProvider>
          <Layout>
            <Suspense fallback={<Loader />}>
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
                <Route path="/funcionarios" element={<Funcionarios />} />
                <Route path="/whatsapp" element={<Whatsapp />} />
                <Route path="/agenda" element={<Agenda />} />
                <Route path="/financeiro" element={<Financeiro />} />
                <Route path="/pos-venda" element={<PosVenda />} />
                <Route path="/config" element={<Configuracoes />} />
                {/* Suporte 3D / Arquiteto */}
                <Route path="/suporte-3d" element={<ArchitectSupportPage />} />
                <Route path="/suporte-3d/ver/:projetoId" element={<Studio3DRoute modo="ver" />} />
                <Route path="/suporte-3d/sessao/:projetoId" element={<Studio3DRoute modo="arquiteto" />} />
              </Routes>
            </Suspense>
          </Layout>
        </TourProvider>
      </NotificationProvider>
    </AuthGate>
  );
}
