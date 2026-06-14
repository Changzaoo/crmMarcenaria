import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { SCHEMA } from "./schema.js";

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

// Garante linha única de configurações
const cfg = db.prepare("SELECT id FROM configuracoes WHERE id = 1").get();
if (!cfg) {
  db.prepare(
    `INSERT INTO configuracoes (id, empresa_nome, empresa_cnpj, empresa_telefone, empresa_email, empresa_endereco, empresa_slogan)
     VALUES (1, 'LINEAR — Marcenaria Corporativa', '00.000.000/0001-00', '(11) 90000-0000', 'contato@linear.com.br', 'São Paulo — SP', 'Mobiliário corporativo sob medida de alto padrão')`
  ).run();
}

export const DB_FIRST_RUN = isNew;
export { DB_PATH };
