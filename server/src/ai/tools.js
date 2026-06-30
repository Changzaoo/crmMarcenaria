// Ferramentas (function calling) do Assistente NEXUS.
// registrar_lead: qualifica e grava o lead no CRM (leads_3d), vincula à conversa
// e devolve o código de acompanhamento (token) para o cliente enviar plantas/
// modelos 3D na Área do Cliente.
import { criarLeadEProjeto } from "../storage/leads3dStore.js";
import { vincularLead } from "../storage/conversaStore.js";

export const tools = [
  {
    type: "function",
    function: {
      name: "registrar_lead",
      description:
        "Registra o contato de um visitante interessado em um projeto de marcenaria (orçamento, proposta, visita/medição ou falar com a equipe). Use quando a pessoa quiser ser contatada e tiver fornecido nome e contato REAIS. Cria o lead no CRM e retorna um código de acompanhamento para o cliente enviar plantas e modelos 3D na Área do Cliente.",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome do visitante" },
          contato: { type: "string", description: "WhatsApp (com DDD) ou e-mail para retorno" },
          tipo_projeto: { type: "string", description: "Tipo de ambiente/projeto (ex.: cozinha, loja, escritório, restaurante, showroom)" },
          cidade_estado: { type: "string", description: "Cidade e estado, se informado" },
          prazo: { type: "string", description: "Prazo desejado, se mencionado (texto livre)" },
          faixa_orcamento: { type: "string", description: "Faixa de investimento, se mencionada (texto livre)" },
          descricao: { type: "string", description: "Resumo do que a pessoa precisa" },
        },
        required: ["nome", "contato"],
      },
    },
  },
];

// Valida nome + contato (e-mail OU telefone BR). Rejeita placeholders/lixo.
export function validarContato(nome, contato) {
  nome = String(nome || "").trim();
  contato = String(contato || "").trim();
  if (!nome || !contato) return "Informe nome e um contato (WhatsApp ou e-mail).";
  const blob = `${nome} ${contato}`.toLowerCase();
  if (/(seu[ _-]?nome|nome do|fulano|exemplo|example|email@|user@|placeholder|\bxxx\b|asdf|qwerty)/.test(blob))
    return "Parecem dados de exemplo. Informe dados reais.";
  if ((nome.match(/\p{L}/gu) || []).length < 2 || /^(.)\1+$/.test(nome.replace(/\s/g, ""))) return "Nome inválido.";
  const isEmail = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(contato);
  const fakeEmail =
    isEmail &&
    (/^(.)\1{3,}@/.test(contato) ||
      /@(example|exemplo|test|teste|mailinator|tempmail)\./i.test(contato) ||
      /\.(test|example|invalid|local)$/i.test(contato));
  const dig = (contato.match(/\d/g) || []).join("");
  const seq = /^(\d)\1+$/.test(dig) || /0123456789|1234567890|12345678/.test(dig);
  const isPhone = dig.length >= 10 && dig.length <= 13 && !seq;
  if (isEmail && fakeEmail) return "E-mail parece de teste. Informe um e-mail válido.";
  if (!isEmail && !isPhone) return "Contato inválido. Use um WhatsApp com DDD ou um e-mail válido.";
  return null; // ok
}

export async function runTool(name, args, meta = {}) {
  if (name === "registrar_lead") return registrarLead(args, meta);
  return { ok: false, erro: `Ferramenta desconhecida: ${name}` };
}

async function registrarLead(args, meta) {
  const nome = String(args?.nome || "").trim();
  const contato = String(args?.contato || "").trim();

  const erro = validarContato(nome, contato);
  if (erro) return { ok: false, erro };

  const isEmail = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(contato);
  const descricao = [
    String(args?.descricao || "").trim(),
    meta.conversa ? `Transcrição do chat:\n${meta.conversa}` : "",
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 4000);

  try {
    const { leadId, token } = await criarLeadEProjeto({
      nome,
      email: isEmail ? contato : null,
      whatsapp: isEmail ? null : contato,
      cidade_estado: String(args?.cidade_estado || "").trim() || null,
      tipo_projeto: String(args?.tipo_projeto || "").trim() || null,
      prazo: String(args?.prazo || "").trim() || null,
      faixa_orcamento: String(args?.faixa_orcamento || "").trim() || null,
      descricao: descricao || null,
      aceite: true,
      origem: "Atendimento IA (chat)",
      doc: {},
    });

    if (meta.conversaId) {
      try {
        vincularLead(meta.conversaId, leadId, {
          nome,
          email: isEmail ? contato : null,
          whatsapp: isEmail ? null : contato,
          cidade_estado: String(args?.cidade_estado || "").trim() || null,
          tipo_projeto: String(args?.tipo_projeto || "").trim() || null,
        });
      } catch {
        /* não bloqueia o registro do lead */
      }
    }

    return {
      ok: true,
      registered: true,
      token,
      codigo_acompanhamento: token,
      mensagem:
        "Contato registrado no CRM da NEXUS. Informe ao visitante este código de acompanhamento e diga que ele já pode enviar as plantas e modelos 3D na Área do Cliente do site usando esse código.",
    };
  } catch (e) {
    console.error("[ai-tool registrar_lead]", e?.message || e);
    return { ok: false, erro: "Falha ao registrar o contato. Tente novamente em instantes." };
  }
}
