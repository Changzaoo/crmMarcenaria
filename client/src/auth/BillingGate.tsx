import { ReactNode, useEffect, useState } from "react";
import { Spinner } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "./AuthContext";

interface BillingStatus {
  liberado: boolean;
  status: "trial" | "active" | "expired" | "canceled";
  emTrial: boolean;
  diasRestantes: number;
  ativoAte: string | null;
  trialAte: string | null;
  plano: string | null;
  checkoutUrl: string;
}

const CHECKOUT_FALLBACK = "https://kiwify.com.br"; // troque pelo link real da Kiwify

export default function BillingGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [erro, setErro] = useState(false);

  async function carregar() {
    try {
      setErro(false);
      const s = await api.get<BillingStatus>("/billing/status");
      setStatus(s);
    } catch {
      // Se a checagem falhar, não trava o usuário pagante: libera e tenta de novo depois.
      setErro(true);
      setStatus({
        liberado: true, status: "active", emTrial: false, diasRestantes: 0,
        ativoAte: null, trialAte: null, plano: null, checkoutUrl: "",
      });
    }
  }

  useEffect(() => {
    if (user) carregar();
  }, [user]);

  if (!status) {
    return (
      <div className="min-h-full bg-background grid place-items-center px-6">
        <div className="text-center">
          <Spinner />
          <p className="text-sm text-muted mt-3">Verificando assinatura...</p>
        </div>
      </div>
    );
  }

  if (!status.liberado) {
    const checkout = status.checkoutUrl || CHECKOUT_FALLBACK;
    const expirado = status.status === "expired";
    return (
      <div className="min-h-full bg-background grid place-items-center px-6">
        <div className="max-w-md w-full card p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-champagne/10 border border-white/10 grid place-items-center mx-auto mb-5 text-2xl">
            {expirado ? "🔒" : "⏳"}
          </div>
          <h1 className="text-xl font-bold text-text mb-2">
            {expirado ? "Seu período de teste terminou" : "Assinatura pausada"}
          </h1>
          <p className="text-sm text-muted mb-6">
            {expirado
              ? "Para continuar usando o LINEAR e manter seus dados ativos, assine o plano mensal. Leva 2 minutos pelo Pix."
              : "Sua assinatura está pendente ou foi cancelada. Reative para voltar a acessar o sistema."}
          </p>
          <a
            href={checkout}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-gradient-to-br from-champagne to-[#b9974f] text-[#1a1407] font-semibold rounded-lg py-3 mb-3 hover:opacity-90 transition"
          >
            Assinar por Pix — R$ 197/mês
          </a>
          <button
            onClick={carregar}
            className="text-sm text-muted hover:text-text transition"
          >
            Já paguei — atualizar acesso
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {status.emTrial && (
        <div className="bg-champagne/10 border-b border-champagne/20 text-center py-2 px-4 text-sm text-champagne">
          Período de teste — <b>{status.diasRestantes} dia(s)</b> restantes.{" "}
          <a
            href={status.checkoutUrl || CHECKOUT_FALLBACK}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-semibold"
          >
            Assinar agora
          </a>
        </div>
      )}
      {erro && null}
      {children}
    </>
  );
}
