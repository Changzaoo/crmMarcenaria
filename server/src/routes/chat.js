// ============================================================
// Assistente NEXUS — endpoint PÚBLICO de chat (sem login), em /api/public/chat.
// Replica o padrão do projeto vnmax (NVIDIA NIM + tool calling), mas hospedado
// no CRM: toda conversa é persistida (conversas/mensagens) e, ao qualificar,
// vira um lead — tudo visível na aba "Atendimentos IA".
// ============================================================
import { Router } from "express";
import { chatCompletion } from "../ai/nvidia.js";
import { tools, runTool } from "../ai/tools.js";
import { buildSystemPrompt } from "../ai/prompt.js";
import { rateLimit } from "../lib/rateLimit.js";
import {
  garantirConversa,
  appendMensagem,
  atualizarConversa,
} from "../storage/conversaStore.js";

const r = Router();

const MODEL = process.env.NVIDIA_MODEL || "nvidia/llama-3.3-nemotron-super-49b-v1.5";
const TEMPERATURE = Number(process.env.TEMPERATURE || 0.4);
const MAX_MESSAGES = Number(process.env.CHAT_MAX_MESSAGES || 12);
const MAX_CHARS = Number(process.env.CHAT_MAX_CHARS || 4000);
const MAX_TOOL_ROUNDS = Number(process.env.CHAT_MAX_TOOL_ROUNDS || 3);
const REQUEST_TIMEOUT_MS = Number(process.env.CHAT_TIMEOUT_MS || 60_000);

const limiteChat = rateLimit({
  windowMs: 60_000,
  max: Number(process.env.CHAT_RATE_MAX || 30),
  message: "Muitas mensagens em pouco tempo. Aguarde um instante e tente de novo.",
});

function sanitizeMessages(raw) {
  if (!Array.isArray(raw)) return null;
  const out = [];
  for (const m of raw) {
    if (!m || typeof m.content !== "string") continue;
    const role = m.role === "assistant" ? "assistant" : "user";
    const content = m.content.trim().slice(0, MAX_CHARS);
    if (content) out.push({ role, content });
  }
  return out.slice(-MAX_MESSAGES);
}

// Filtro de saída (defesa em profundidade): bloqueia respostas que pareçam vazar
// o system prompt ou a stack/modelo.
const LEAK_MARKERS = [
  /assistente virtual oficial da nexus/i,
  /\bSOBRE A NEXUS\b/,
  /REGRAS DA FERRAMENTA/i,
  /CAPTURA DE CONTATO/i,
  /ESCOPO E LIMITES/i,
  /SEGURAN[ÇC]A \(cr[íi]tico\)/i,
  /nemotron/i,
  /system prompt/i,
  /prompt do sistema/i,
  /instru[çc][õo]es de sistema/i,
];
function filtrarSaida(text) {
  for (const re of LEAK_MARKERS) {
    if (re.test(text)) {
      console.warn("[chat] saída bloqueada pelo filtro (possível vazamento de instruções/stack).");
      return "Sobre esse ponto específico, prefiro confirmar com a equipe da NEXUS para te passar a informação correta. Posso registrar seu contato (nome + WhatsApp ou e-mail) para alguém falar com você?";
    }
  }
  return text;
}

r.post("/", limiteChat, async (req, res) => {
  const API_KEY = process.env.NVIDIA_API_KEY;
  if (!API_KEY) {
    return res.status(503).json({
      error: "O assistente está temporariamente indisponível. Tente o formulário de proposta ou o WhatsApp.",
    });
  }

  const body = req.body || {};
  const messages = sanitizeMessages(body.messages);
  if (!messages || !messages.length) {
    return res.status(400).json({ error: "Envie ao menos uma mensagem." });
  }

  // Conversa persistida (cria se for a primeira mensagem).
  const conversaId = garantirConversa(body.conversaId, { origem: body.origem });
  const ultima = messages[messages.length - 1];
  if (ultima.role === "user") appendMensagem(conversaId, "user", ultima.content);

  const convo = [{ role: "system", content: buildSystemPrompt() }, ...messages];
  const conversa = messages
    .map((m) => `${m.role === "user" ? "Visitante" : "Assistente"}: ${m.content}`)
    .join("\n")
    .slice(0, 4000);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    let resp = await chatCompletion({
      apiKey: API_KEY,
      model: MODEL,
      messages: convo,
      tools,
      temperature: TEMPERATURE,
      signal: controller.signal,
    });
    let msg = resp.choices?.[0]?.message || {};
    let registered = false;
    let token = null;

    // Loop de tool-calling limitado. Na última rodada omite as tools p/ forçar texto.
    for (let round = 0; round < MAX_TOOL_ROUNDS && Array.isArray(msg.tool_calls) && msg.tool_calls.length; round++) {
      convo.push(msg);
      for (const tc of msg.tool_calls) {
        let args = {};
        try {
          args = JSON.parse(tc.function?.arguments || "{}");
        } catch {
          /* args inválidos — segue com {} */
        }
        const result = await runTool(tc.function?.name, args, { conversa, conversaId });
        if (result.registered) registered = true;
        if (result.token) token = result.token;
        appendMensagem(conversaId, "tool", `${tc.function?.name}: ${JSON.stringify(result)}`);
        convo.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
      }
      const lastRound = round === MAX_TOOL_ROUNDS - 1;
      resp = await chatCompletion({
        apiKey: API_KEY,
        model: MODEL,
        messages: convo,
        tools: lastRound ? undefined : tools,
        temperature: TEMPERATURE,
        signal: controller.signal,
      });
      msg = resp.choices?.[0]?.message || {};
    }

    let reply = (msg.content || "").trim() || "Desculpe, não consegui responder agora. Pode tentar de novo?";
    reply = filtrarSaida(reply);

    appendMensagem(conversaId, "assistant", reply);
    // Resumo curto da conversa = última fala do visitante.
    if (ultima.role === "user") atualizarConversa(conversaId, { resumo: ultima.content.slice(0, 200) });

    return res.json({ reply, registered, conversaId, token });
  } catch (e) {
    const aborted = e.name === "AbortError";
    console.error("[chat] erro:", e?.message || e);
    return res.status(aborted ? 504 : 502).json({
      error: aborted
        ? "O assistente demorou para responder. Tente novamente."
        : "Falha ao falar com o assistente. Tente novamente em instantes.",
    });
  } finally {
    clearTimeout(timeout);
  }
});

export default r;
