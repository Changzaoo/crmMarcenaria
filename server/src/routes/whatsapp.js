import { Router } from "express";
import { db } from "../db/index.js";

// Integração com a API oficial do WhatsApp Business (Meta Cloud API).
const r = Router();
const GRAPH = "https://graph.facebook.com/v21.0";

function getCfg() {
  return (
    db
      .prepare(
        "SELECT whatsapp_token, whatsapp_phone_id, whatsapp_business_id, whatsapp_numero, whatsapp_ativo FROM configuracoes WHERE id = 1"
      )
      .get() || {}
  );
}

async function graphPost(path, token, body) {
  const resp = await fetch(`${GRAPH}/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data?.error?.message || `WhatsApp API retornou ${resp.status}`);
  return data;
}

r.get("/config", (_req, res) => {
  const c = getCfg();
  res.json({
    phone_id: c.whatsapp_phone_id || "",
    business_id: c.whatsapp_business_id || "",
    numero: c.whatsapp_numero || "",
    ativo: !!c.whatsapp_ativo,
    token_set: !!c.whatsapp_token,
    token: c.whatsapp_token || "",
  });
});

r.put("/config", (req, res) => {
  const b = req.body || {};
  db.prepare(
    "UPDATE configuracoes SET whatsapp_token=?, whatsapp_phone_id=?, whatsapp_business_id=?, whatsapp_numero=?, whatsapp_ativo=? WHERE id=1"
  ).run(
    (b.token || "").trim() || null,
    (b.phone_id || "").trim() || null,
    (b.business_id || "").trim() || null,
    (b.numero || "").trim() || null,
    b.ativo ? 1 : 0
  );
  res.json({ ok: true });
});

// Verifica as credenciais consultando o número conectado.
r.get("/status", async (_req, res) => {
  const c = getCfg();
  if (!c.whatsapp_token || !c.whatsapp_phone_id) return res.json({ conectado: false, erro: "Configuração incompleta." });
  try {
    const resp = await fetch(`${GRAPH}/${c.whatsapp_phone_id}?fields=display_phone_number,verified_name,quality_rating`, {
      headers: { Authorization: `Bearer ${c.whatsapp_token}` },
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return res.json({ conectado: false, erro: data?.error?.message || `Graph ${resp.status}` });
    res.json({ conectado: true, numero: data.display_phone_number, nome: data.verified_name, qualidade: data.quality_rating });
  } catch (e) {
    res.json({ conectado: false, erro: e.message });
  }
});

// Envia a mensagem-modelo padrão "hello_world" (funciona sem janela de 24h aberta).
r.post("/test", async (req, res) => {
  const c = getCfg();
  if (!c.whatsapp_token || !c.whatsapp_phone_id) return res.status(400).json({ erro: "Configure o token e o Phone Number ID primeiro." });
  const to = String(req.body?.to || "").replace(/\D/g, "");
  if (!to) return res.status(400).json({ erro: "Informe o número de destino (com DDI, ex.: 5521999999999)." });
  try {
    const data = await graphPost(`${c.whatsapp_phone_id}/messages`, c.whatsapp_token, {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: { name: "hello_world", language: { code: "en_US" } },
    });
    res.json({ ok: true, id: data?.messages?.[0]?.id });
  } catch (e) {
    res.status(400).json({ erro: e.message });
  }
});

// Envia texto livre (válido dentro da janela de 24h iniciada pelo cliente).
r.post("/send", async (req, res) => {
  const c = getCfg();
  if (!c.whatsapp_token || !c.whatsapp_phone_id) return res.status(400).json({ erro: "WhatsApp não configurado." });
  const to = String(req.body?.to || "").replace(/\D/g, "");
  const text = String(req.body?.text || "");
  if (!to || !text) return res.status(400).json({ erro: "Informe o destino e a mensagem." });
  try {
    const data = await graphPost(`${c.whatsapp_phone_id}/messages`, c.whatsapp_token, {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { preview_url: true, body: text },
    });
    res.json({ ok: true, id: data?.messages?.[0]?.id });
  } catch (e) {
    res.status(400).json({ erro: e.message });
  }
});

export default r;
