import { Router } from "express";
import { listarLeads, obterLead, atualizarLead, removerLead } from "../storage/leads3dStore.js";

// Rotas do arquiteto/suporte (autenticadas) para acompanhar os leads do 3D.
const r = Router();

const STATUS = ["Novo", "Em atendimento", "Projeto analisado", "Proposta enviada", "Fechado", "Perdido"];

const asyncRoute = (fn) => (req, res) =>
  fn(req, res).catch((e) => {
    console.error("[leads-3d]", req.method, req.originalUrl, "->", e?.stack || e);
    res.status(500).json({ erro: e?.message || "Falha ao processar leads 3D." });
  });

r.get(
  "/",
  asyncRoute(async (_req, res) => {
    res.json(await listarLeads());
  })
);

r.get(
  "/:id",
  asyncRoute(async (req, res) => {
    const lead = await obterLead(req.params.id);
    if (!lead) return res.status(404).json({ erro: "Lead não encontrado." });
    res.json(lead);
  })
);

r.patch(
  "/:id",
  asyncRoute(async (req, res) => {
    const lead = await atualizarLead(req.params.id, req.body || {});
    if (!lead) return res.status(404).json({ erro: "Lead não encontrado." });
    res.json(lead);
  })
);

r.delete(
  "/:id",
  asyncRoute(async (req, res) => {
    await removerLead(req.params.id);
    res.json({ ok: true });
  })
);

r.get("/meta/status", (_req, res) => res.json({ status: STATUS }));

export default r;
