import { Router } from "express";
import { listarConversas, obterConversaComMensagens, removerConversa } from "../storage/conversaStore.js";

// Rotas autenticadas — a equipe vê as conversas do Assistente de IA (chat do site).
const r = Router();

const asyncRoute = (fn) => (req, res) =>
  fn(req, res).catch((e) => {
    console.error("[conversas]", req.method, req.originalUrl, "->", e?.stack || e);
    res.status(500).json({ erro: e?.message || "Falha ao processar conversas." });
  });

r.get(
  "/",
  asyncRoute(async (_req, res) => {
    res.json(await listarConversas());
  })
);

r.get(
  "/:id",
  asyncRoute(async (req, res) => {
    const conversa = obterConversaComMensagens(req.params.id);
    if (!conversa) return res.status(404).json({ erro: "Conversa não encontrada." });
    res.json(conversa);
  })
);

r.delete(
  "/:id",
  asyncRoute(async (req, res) => {
    res.json(removerConversa(req.params.id));
  })
);

export default r;
