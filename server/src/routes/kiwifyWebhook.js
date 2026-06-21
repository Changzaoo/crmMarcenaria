import { Router } from "express";
import { registrarPagamento, registrarCancelamento, computeAccess } from "../billing/store.js";

const r = Router();

// Webhook PÚBLICO da Kiwify (sem login). Protegido por um token compartilhado:
// configure a URL na Kiwify como  https://SEU-BACKEND/api/public/kiwify?token=SEU_TOKEN
// e defina KIWIFY_WEBHOOK_TOKEN no ambiente do servidor.
function tokenValido(req) {
  const esperado = process.env.KIWIFY_WEBHOOK_TOKEN;
  if (!esperado) return true; // sem token configurado = aceita (modo dev)
  const recebido = req.query.token || req.headers["x-kiwify-token"];
  return recebido === esperado;
}

// Normaliza os vários formatos de payload da Kiwify num evento simples.
function classificar(body) {
  const tipo = String(
    body.webhook_event_type || body.event || body.order_status || ""
  ).toLowerCase();
  const status = String(body.order_status || body.status || "").toLowerCase();
  const ordem = body.order_id || body.order_ref || body.id || null;

  const pago = ["paid", "approved", "order_approved", "subscription_renewed", "renewed"].some(
    (k) => tipo.includes(k) || status.includes(k)
  );
  const cancelado = [
    "refunded", "chargedback", "chargeback", "canceled", "cancelled",
    "subscription_canceled", "subscription_cancelled", "order_refunded",
  ].some((k) => tipo.includes(k) || status.includes(k));

  return { pago, cancelado, evento: tipo || status || "desconhecido", ordem };
}

r.post("/", (req, res) => {
  if (!tokenValido(req)) {
    return res.status(401).json({ erro: "Token de webhook inválido." });
  }

  const body = req.body || {};
  const { pago, cancelado, evento, ordem } = classificar(body);
  const plano = body.subscription_id || body.Subscription ? "mensal" : (body.product_name || "mensal");

  try {
    if (pago) {
      registrarPagamento({ plano, evento, ordem });
    } else if (cancelado) {
      registrarCancelamento({ evento, ordem });
    }
    // Outros eventos (pix gerado, aguardando pagamento) são apenas confirmados.
    return res.json({ ok: true, evento, acesso: computeAccess().status });
  } catch (error) {
    console.error("Erro no webhook Kiwify:", error);
    return res.status(500).json({ erro: "Falha ao processar webhook." });
  }
});

export default r;
