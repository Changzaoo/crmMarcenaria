import { Router } from "express";
import crypto from "crypto";
import { registrarPagamento, registrarCancelamento, computeAccess } from "../billing/store.js";
import { rateLimit } from "../lib/rateLimit.js";

const r = Router();

// Webhook PÚBLICO da Kiwify (sem login). Limite por IP para não virar alvo de flood.
const limiteWebhook = rateLimit({ windowMs: 60_000, max: 60 });

/** Compara strings em tempo constante (evita timing attacks). */
export function igualSeguro(a, b) {
  const ba = Buffer.from(String(a), "utf8");
  const bb = Buffer.from(String(b), "utf8");
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

// Segurança do webhook, em ordem de preferência:
//  1) HMAC sobre o corpo cru (Kiwify envia ?signature=...). Defina KIWIFY_WEBHOOK_SECRET.
//     Suporta SHA1 (padrão da Kiwify) e SHA256.
//  2) Token compartilhado simples (?token= ou header x-kiwify-token) via KIWIFY_WEBHOOK_TOKEN.
//  3) Modo dev: sem nenhum segredo configurado, aceita (apenas para desenvolvimento).
export function webhookAutorizado(req) {
  const secret = process.env.KIWIFY_WEBHOOK_SECRET;
  const assinatura = req.query.signature || req.headers["x-kiwify-signature"];

  if (secret) {
    // Com segredo configurado, a assinatura é OBRIGATÓRIA e precisa bater.
    if (!assinatura || !req.rawBody) return false;
    for (const algo of ["sha1", "sha256"]) {
      const calc = crypto.createHmac(algo, secret).update(req.rawBody).digest("hex");
      if (igualSeguro(assinatura, calc)) return true;
    }
    return false;
  }

  const token = process.env.KIWIFY_WEBHOOK_TOKEN;
  if (token) {
    const recebido = req.query.token || req.headers["x-kiwify-token"];
    return recebido != null && igualSeguro(recebido, token);
  }

  return true; // modo dev (nenhum segredo definido)
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

r.post("/", limiteWebhook, (req, res) => {
  if (!webhookAutorizado(req)) {
    return res.status(401).json({ erro: "Assinatura/token de webhook inválido." });
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
