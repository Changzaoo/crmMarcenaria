import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { SCHEMA, CATEGORIAS_PADRAO, inferirModelo } from "./schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.VERCEL ? join(tmpdir(), "linear-crm") : join(__dirname, "..", "..", "..", "data");
const DB_PATH = join(DATA_DIR, "linear.db");

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const isNew = !existsSync(DB_PATH);

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(SCHEMA);

// Migrações idempotentes para colunas adicionadas após a 1ª versão do schema.
const leadCols = db.prepare("PRAGMA table_info(leads_3d)").all().map((c) => c.name);
if (!leadCols.includes("arquiteto_solicitado")) {
  db.exec("ALTER TABLE leads_3d ADD COLUMN arquiteto_solicitado INTEGER NOT NULL DEFAULT 0");
}
if (!leadCols.includes("arquiteto_solicitado_em")) {
  db.exec("ALTER TABLE leads_3d ADD COLUMN arquiteto_solicitado_em TEXT");
}

// Vínculo do funil comercial com o Orçamento 3D: cada negócio pode referenciar
// um projeto do Estúdio 3D e guardar um resumo (valores + móveis) para exibição.
const negCols = db.prepare("PRAGMA table_info(negocios)").all().map((c) => c.name);
if (!negCols.includes("projeto_3d_id")) {
  db.exec("ALTER TABLE negocios ADD COLUMN projeto_3d_id TEXT");
}
if (!negCols.includes("dados_3d")) {
  db.exec("ALTER TABLE negocios ADD COLUMN dados_3d TEXT");
}

// Garante linha única de configurações
const cfg = db.prepare("SELECT id FROM configuracoes WHERE id = 1").get();
if (!cfg) {
  db.prepare(
    `INSERT INTO configuracoes (id, empresa_nome, empresa_cnpj, empresa_telefone, empresa_email, empresa_endereco, empresa_slogan)
     VALUES (1, 'LINEAR — Marcenaria Corporativa', '00.000.000/0001-00', '(11) 90000-0000', 'contato@linear.com.br', 'São Paulo — SP', 'Mobiliário corporativo sob medida de alto padrão')`
  ).run();
}

// Popula categorias do catálogo (idempotente): defaults + categorias já usadas
// em materiais que ainda não estejam na tabela. Roda também em bancos antigos.
const catCount = db.prepare("SELECT COUNT(*) c FROM categorias").get().c;
if (catCount === 0) {
  const ins = db.prepare("INSERT OR IGNORE INTO categorias (nome, modelo, ordem) VALUES (?,?,?)");
  const seedCats = db.transaction(() => {
    CATEGORIAS_PADRAO.forEach((c, i) => ins.run(c.nome, c.modelo, i));
    const extras = db.prepare("SELECT DISTINCT categoria FROM materiais").all().map((x) => x.categoria);
    extras.forEach((nome, i) => ins.run(nome, inferirModelo(nome), 100 + i));
  });
  seedCats();
}

export const DB_FIRST_RUN = isNew;
export { DB_PATH };
