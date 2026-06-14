import { randomUUID } from "crypto";
import { db } from "../db/index.js";

// Armazenamento dos leads/projetos do Estúdio 3D.
//
// Por que existe: o SQLite mora em /tmp no Vercel (efêmero e por-instância), e as
// tabelas leads_3d/projetos_3d ficam FORA do snapshot do Firebase. Resultado: o lead
// que o visitante grava numa instância some quando o arquiteto lê em outra.
// Solução: persistir esses registros no Postgres do Supabase (compartilhado entre
// instâncias). Em dev local, sem SUPABASE_SERVICE_KEY, cai no SQLite de sempre.

const SUPABASE_URL = (process.env.SUPABASE_URL || "https://fepyzmawcsetlyinztjc.supabase.co").replace(/\/+$/, "");
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SECRET_KEY || "";

const usarSupabase = () => !!SUPABASE_SERVICE_KEY;
const agora = () => new Date().toISOString();

// ---------------- PostgREST (Supabase) ----------------
async function rest(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message = data?.message || data?.error || `Supabase retornou ${response.status}`;
    throw new Error(message);
  }
  return data;
}

const lista = (q) => rest(q, { method: "GET" });
const insere = (tabela, row) =>
  rest(tabela, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(row) });
const atualiza = (q, patch) =>
  rest(q, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch) });

function normalizarDoc(projeto) {
  if (!projeto) return projeto;
  let doc = projeto.doc;
  if (typeof doc === "string") {
    try {
      doc = JSON.parse(doc);
    } catch {
      doc = {};
    }
  }
  return { ...projeto, doc: doc || {} };
}

// ---------------- API do store ----------------
export async function criarLeadEProjeto(b) {
  const leadId = randomUUID();
  const projetoId = randomUUID();
  const doc = b.doc || {};

  if (usarSupabase()) {
    await insere("leads_3d", {
      id: leadId,
      nome: b.nome,
      email: b.email || null,
      whatsapp: b.whatsapp || null,
      cidade_estado: b.cidade_estado || null,
      tipo_projeto: b.tipo_projeto || null,
      prazo: b.prazo || null,
      faixa_orcamento: b.faixa_orcamento || null,
      descricao: b.descricao || null,
      aceite: !!b.aceite,
      projeto_id: projetoId,
    });
    await insere("projetos_3d", {
      id: projetoId,
      lead_id: leadId,
      nome: b.tipo_projeto || "Projeto 3D",
      doc,
      status: "rascunho",
    });
    return { leadId, projetoId };
  }

  db.prepare(
    `INSERT INTO leads_3d (id, nome, email, whatsapp, cidade_estado, tipo_projeto, prazo, faixa_orcamento, descricao, aceite, projeto_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    leadId,
    b.nome,
    b.email || null,
    b.whatsapp || null,
    b.cidade_estado || null,
    b.tipo_projeto || null,
    b.prazo || null,
    b.faixa_orcamento || null,
    b.descricao || null,
    b.aceite ? 1 : 0,
    projetoId
  );
  db.prepare("INSERT INTO projetos_3d (id, lead_id, nome, doc, status) VALUES (?,?,?,?,?)").run(
    projetoId,
    leadId,
    b.tipo_projeto || "Projeto 3D",
    JSON.stringify(doc),
    "rascunho"
  );
  return { leadId, projetoId };
}

export async function lerProjeto(id) {
  if (usarSupabase()) {
    const rows = await lista(`projetos_3d?id=eq.${id}&select=*&limit=1`);
    return rows?.[0] ? normalizarDoc(rows[0]) : null;
  }
  const p = db.prepare("SELECT * FROM projetos_3d WHERE id = ?").get(id);
  return p ? normalizarDoc(p) : null;
}

export async function salvarProjeto(id, b) {
  if (usarSupabase()) {
    const patch = { atualizado_em: agora() };
    if (b.doc !== undefined) patch.doc = b.doc;
    if (b.nome) patch.nome = b.nome;
    if (b.status) patch.status = b.status;
    const rows = await atualiza(`projetos_3d?id=eq.${id}`, patch);
    return rows?.[0] ? normalizarDoc(rows[0]) : null;
  }
  const p = db.prepare("SELECT id FROM projetos_3d WHERE id = ?").get(id);
  if (!p) return null;
  db.prepare(
    "UPDATE projetos_3d SET doc = COALESCE(?, doc), nome = COALESCE(?, nome), status = COALESCE(?, status), atualizado_em = ? WHERE id = ?"
  ).run(b.doc !== undefined ? JSON.stringify(b.doc) : null, b.nome || null, b.status || null, sqliteAgora(), id);
  return lerProjeto(id);
}

export async function enviarParaAnalise(id, doc) {
  const projeto = await lerProjeto(id);
  if (!projeto) return null;

  if (usarSupabase()) {
    const patch = { status: "enviado_analise", atualizado_em: agora() };
    if (doc) patch.doc = doc;
    await atualiza(`projetos_3d?id=eq.${id}`, patch);
    if (projeto.lead_id) {
      await atualiza(`leads_3d?id=eq.${projeto.lead_id}`, {
        status: "Projeto 3D enviado para análise",
        atualizado_em: agora(),
      });
    }
    return { ok: true };
  }

  if (doc) {
    db.prepare("UPDATE projetos_3d SET doc = ?, atualizado_em = ? WHERE id = ?").run(
      JSON.stringify(doc),
      sqliteAgora(),
      id
    );
  }
  db.prepare("UPDATE projetos_3d SET status = ?, atualizado_em = ? WHERE id = ?").run(
    "enviado_analise",
    sqliteAgora(),
    id
  );
  if (projeto.lead_id) {
    db.prepare("UPDATE leads_3d SET status = ?, atualizado_em = ? WHERE id = ?").run(
      "Projeto 3D enviado para análise",
      sqliteAgora(),
      projeto.lead_id
    );
  }
  return { ok: true };
}

// Cliente clicou em "Chamar arquiteto": destaca o lead no Suporte 3D.
export async function solicitarArquiteto(projetoId) {
  if (usarSupabase()) {
    const rows = await atualiza(`leads_3d?projeto_id=eq.${projetoId}`, {
      arquiteto_solicitado: true,
      arquiteto_solicitado_em: agora(),
      atualizado_em: agora(),
    });
    return rows?.length ? { ok: true } : null;
  }
  const lead = db.prepare("SELECT id FROM leads_3d WHERE projeto_id = ?").get(projetoId);
  if (!lead) return null;
  db.prepare(
    "UPDATE leads_3d SET arquiteto_solicitado = 1, arquiteto_solicitado_em = ?, atualizado_em = ? WHERE id = ?"
  ).run(sqliteAgora(), sqliteAgora(), lead.id);
  return { ok: true };
}

export async function listarLeads() {
  if (usarSupabase()) {
    const leads = (await lista("leads_3d?select=*&order=criado_em.desc")) || [];
    const ids = leads.map((l) => l.projeto_id).filter(Boolean);
    let projetos = [];
    if (ids.length) {
      projetos = (await lista(`projetos_3d?id=in.(${ids.join(",")})&select=id,status,atualizado_em`)) || [];
    }
    const porId = new Map(projetos.map((p) => [p.id, p]));
    return leads.map((l) => ({
      ...l,
      projeto_status: porId.get(l.projeto_id)?.status,
      projeto_atualizado_em: porId.get(l.projeto_id)?.atualizado_em,
    }));
  }
  return db
    .prepare(
      `SELECT l.*, p.status AS projeto_status, p.atualizado_em AS projeto_atualizado_em
         FROM leads_3d l
         LEFT JOIN projetos_3d p ON p.id = l.projeto_id
        ORDER BY l.criado_em DESC`
    )
    .all();
}

export async function obterLead(id) {
  if (usarSupabase()) {
    const leads = await lista(`leads_3d?id=eq.${id}&select=*&limit=1`);
    const lead = leads?.[0];
    if (!lead) return null;
    let projeto = null;
    if (lead.projeto_id) {
      const ps = await lista(`projetos_3d?id=eq.${lead.projeto_id}&select=*&limit=1`);
      projeto = ps?.[0] ? normalizarDoc(ps[0]) : null;
    }
    return { ...lead, projeto };
  }
  const lead = db.prepare("SELECT * FROM leads_3d WHERE id = ?").get(id);
  if (!lead) return null;
  let projeto = lead.projeto_id ? db.prepare("SELECT * FROM projetos_3d WHERE id = ?").get(lead.projeto_id) : null;
  if (projeto) projeto = normalizarDoc(projeto);
  return { ...lead, projeto };
}

export async function atualizarLead(id, b) {
  if (usarSupabase()) {
    const patch = { atualizado_em: agora() };
    if (b.status != null) patch.status = b.status;
    if (b.anotacoes != null) patch.anotacoes = b.anotacoes;
    if (b.arquiteto_solicitado != null) patch.arquiteto_solicitado = !!b.arquiteto_solicitado;
    const rows = await atualiza(`leads_3d?id=eq.${id}`, patch);
    return rows?.[0] || null;
  }
  const lead = db.prepare("SELECT id FROM leads_3d WHERE id = ?").get(id);
  if (!lead) return null;
  const arq = b.arquiteto_solicitado == null ? null : b.arquiteto_solicitado ? 1 : 0;
  db.prepare(
    "UPDATE leads_3d SET status = COALESCE(?, status), anotacoes = COALESCE(?, anotacoes), arquiteto_solicitado = COALESCE(?, arquiteto_solicitado), atualizado_em = ? WHERE id = ?"
  ).run(b.status ?? null, b.anotacoes ?? null, arq, sqliteAgora(), id);
  return db.prepare("SELECT * FROM leads_3d WHERE id = ?").get(id);
}

function sqliteAgora() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}
