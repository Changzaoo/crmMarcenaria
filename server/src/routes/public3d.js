import { Router } from "express";
import { heartbeat, leave, pushDoc, getState } from "../lib/collab3d.js";
import { rateLimit } from "../lib/rateLimit.js";
import { validarLead, LEAD_ORIGINS } from "../shared/contract.js";
import {
  criarLeadEProjeto,
  lerProjeto,
  salvarProjeto,
  enviarParaAnalise,
  solicitarArquiteto,
} from "../storage/leads3dStore.js";

// Rotas PÚBLICAS do Orçamento 3D (sem autenticação) — usadas pelo visitante
// que monta o ambiente. Montadas em /api/public ANTES do middleware de auth.
const r = Router();

// Criação de lead é o alvo natural de abuso/spam — limite estrito por IP.
const limiteCriacaoLead = rateLimit({
  windowMs: 60_000,
  max: 12,
  message: "Você enviou muitas solicitações. Aguarde um minuto e tente novamente.",
});

const asyncRoute = (fn) => (req, res) =>
  fn(req, res).catch((e) => {
    console.error("[public-3d]", req.method, req.originalUrl, "->", e?.stack || e);
    res.status(500).json({ erro: e?.message || "Falha ao processar o Estúdio 3D." });
  });

// ---------- Lead obrigatório antes do 3D ----------
r.post(
  "/leads-3d",
  limiteCriacaoLead,
  asyncRoute(async (req, res) => {
    const b = req.body || {};
    const valido = validarLead(b);
    if (!valido.ok) {
      return res.status(400).json({ erro: valido.motivo });
    }
    const { leadId, projetoId } = await criarLeadEProjeto(b);
    res.json({ leadId, projetoId });
  })
);

// ---------- Solicitar proposta (formulário do site → fileira Lead) ----------
r.post(
  "/solicitar-proposta",
  limiteCriacaoLead,
  asyncRoute(async (req, res) => {
    const b = req.body || {};
    const valido = validarLead(b);
    if (!valido.ok) {
      return res.status(400).json({ erro: valido.motivo });
    }
    const { leadId } = await criarLeadEProjeto({
      nome: b.nome,
      email: b.email,
      whatsapp: b.whatsapp,
      cidade_estado: b.cidade_estado,
      tipo_projeto: b.tipo_projeto,
      descricao: b.mensagem || b.descricao,
      aceite: !!b.aceite,
      origem: LEAD_ORIGINS.solicitarProposta,
      doc: {},
    });
    res.json({ leadId });
  })
);

// ---------- Projeto 3D (carregar / salvar) ----------
r.get(
  "/projetos-3d/:id",
  asyncRoute(async (req, res) => {
    const p = await lerProjeto(req.params.id);
    if (!p) return res.status(404).json({ erro: "Projeto não encontrado." });
    res.json(p);
  })
);

r.put(
  "/projetos-3d/:id",
  asyncRoute(async (req, res) => {
    const p = await salvarProjeto(req.params.id, req.body || {});
    if (!p) return res.status(404).json({ erro: "Projeto não encontrado." });
    res.json(p);
  })
);

// ---------- Pré-orçamento / enviar para análise ----------
r.post(
  "/projetos-3d/:id/enviar",
  asyncRoute(async (req, res) => {
    const out = await enviarParaAnalise(req.params.id, (req.body || {}).doc);
    if (!out) return res.status(404).json({ erro: "Projeto não encontrado." });
    res.json(out);
  })
);

// ---------- Cliente sinaliza que precisa de um arquiteto ----------
r.post(
  "/projetos-3d/:id/chamar-arquiteto",
  asyncRoute(async (req, res) => {
    const out = await solicitarArquiteto(req.params.id);
    if (!out) return res.status(404).json({ erro: "Projeto não encontrado." });
    res.json(out);
  })
);

// ---------- Sessão colaborativa (relay por polling) ----------
r.post("/sessao/:id/heartbeat", (req, res) => {
  res.json(heartbeat(req.params.id, req.body || {}));
});

r.get("/sessao/:id/state", (req, res) => {
  res.json(getState(req.params.id));
});

r.post("/sessao/:id/doc", (req, res) => {
  const body = req.body || {};
  res.json(pushDoc(req.params.id, body.doc, { seed: !!body.seed }));
});

r.post("/sessao/:id/leave", (req, res) => {
  leave(req.params.id, (req.body || {}).peerId);
  res.json({ ok: true });
});

export default r;
