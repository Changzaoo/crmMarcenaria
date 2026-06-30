// ============================================================
// portalStore — leitura/escrita dos arquivos do Portal do Cliente.
// Metadados em lead_arquivos (SQLite, sempre local). O lead em si pode estar
// no SQLite (dev/local) ou no Postgres do Supabase (nuvem) — resolvido por
// obterLeadPorToken(). Não importa leads3dStore para evitar ciclo.
// ============================================================
import { randomUUID } from "crypto";
import { db } from "../db/index.js";
import { categoriaLabel, normalizarCategoria } from "../shared/contract.js";
import { removerArquivoDisco } from "./uploadsLocal.js";

const SUPABASE_URL = (process.env.SUPABASE_URL || "https://fepyzmawcsetlyinztjc.supabase.co").replace(/\/+$/, "");
const SUPABASE_SERVICE_KEY = (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SECRET_KEY || "").trim();
const usarSupabase = () => !!SUPABASE_SERVICE_KEY;

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
  if (!response.ok) throw new Error(data?.message || data?.error || `Supabase retornou ${response.status}`);
  return data;
}

/** Gera um código de acompanhamento (acesso ao portal, sem senha). */
export function gerarToken() {
  return randomUUID().replace(/-/g, "");
}

/** Busca o lead dono de um token. Retorna o registro mínimo ou null. */
export async function obterLeadPorToken(token) {
  const t = String(token || "").trim();
  if (!t) return null;
  if (usarSupabase()) {
    const rows = await rest(
      `leads_3d?token=eq.${encodeURIComponent(t)}&select=id,nome,tipo_projeto,status,projeto_id,criado_em&limit=1`
    );
    return rows?.[0] || null;
  }
  return (
    db
      .prepare(
        "SELECT id, nome, tipo_projeto, status, projeto_id, criado_em FROM leads_3d WHERE token = ? LIMIT 1"
      )
      .get(t) || null
  );
}

/** Converte uma linha de lead_arquivos no formato público (PortalArquivo). */
export function mapArquivo(row) {
  return {
    id: row.id,
    categoria: row.categoria,
    categoriaLabel: categoriaLabel(row.categoria),
    nome: row.nome,
    tipo: row.tipo || "application/octet-stream",
    tamanho: Number(row.tamanho) || 0,
    criadoEm: row.criado_em,
  };
}

/** Lista os arquivos (metadados) de um lead, mais recentes primeiro. */
export function listarArquivosPorLead(leadId) {
  if (!leadId) return [];
  return db
    .prepare("SELECT * FROM lead_arquivos WHERE lead_id = ? ORDER BY criado_em DESC, id DESC")
    .all(leadId)
    .map(mapArquivo);
}

/** Registra um arquivo recém-gravado no disco. Retorna o metadado público. */
export function registrarArquivo({ leadId, categoria, nome, path, tipo, tamanho }) {
  const id = randomUUID().replace(/-/g, "");
  const cat = normalizarCategoria(categoria);
  const agora = new Date().toISOString().slice(0, 19).replace("T", " ");
  db.prepare(
    `INSERT INTO lead_arquivos (id, lead_id, categoria, nome, path, tipo, tamanho, criado_em)
     VALUES (?,?,?,?,?,?,?,?)`
  ).run(id, leadId, cat, nome, path, tipo || null, Number(tamanho) || 0, agora);
  return mapArquivo({ id, categoria: cat, nome, path, tipo, tamanho, criado_em: agora });
}

/** Linha bruta de um arquivo (inclui path) — para servir/baixar/remover. */
export function obterArquivoRaw(leadId, arquivoId) {
  return (
    db.prepare("SELECT * FROM lead_arquivos WHERE id = ? AND lead_id = ? LIMIT 1").get(arquivoId, leadId) || null
  );
}

/** Remove um arquivo (registro + binário em disco). */
export function removerArquivo(leadId, arquivoId) {
  const row = obterArquivoRaw(leadId, arquivoId);
  if (!row) return false;
  db.prepare("DELETE FROM lead_arquivos WHERE id = ?").run(arquivoId);
  removerArquivoDisco(row.path);
  return true;
}

/** Remove TODOS os arquivos de um lead (chamado ao excluir o lead). */
export function removerArquivosDoLead(leadId) {
  const rows = db.prepare("SELECT path FROM lead_arquivos WHERE lead_id = ?").all(leadId);
  rows.forEach((r) => removerArquivoDisco(r.path));
  db.prepare("DELETE FROM lead_arquivos WHERE lead_id = ?").run(leadId);
}
