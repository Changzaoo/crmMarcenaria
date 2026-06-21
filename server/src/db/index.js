import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { SCHEMA, INDICES, CATEGORIAS_PADRAO, FUNCIONARIOS_PADRAO, inferirModelo } from "./schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.VERCEL ? join(tmpdir(), "linear-crm") : join(__dirname, "..", "..", "..", "data");
const DB_PATH = join(DATA_DIR, "linear.db");

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const isNew = !existsSync(DB_PATH);

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Antes de criar o schema: registra quais tabelas JÁ existiam. Assim semeamos os
// padrões apenas quando a tabela é criada agora (1ª vez / DB novo) — e nunca
// "ressuscitamos" registros que o usuário apagou de propósito.
const tabelaJaExistia = (nome) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(nome);
const categoriasJaExistia = tabelaJaExistia("categorias");
const funcionariosJaExistia = tabelaJaExistia("funcionarios");

db.exec(SCHEMA);
db.exec(INDICES);

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

// Responsável por etapa do projeto (quem cuida de cada passo: produção, logística…).
const etapaCols = db.prepare("PRAGMA table_info(projeto_etapas)").all().map((c) => c.name);
if (!etapaCols.includes("funcionario_id")) {
  db.exec("ALTER TABLE projeto_etapas ADD COLUMN funcionario_id INTEGER");
}

// Integração com a API do WhatsApp Business (Meta Cloud API).
const cfgCols = db.prepare("PRAGMA table_info(configuracoes)").all().map((c) => c.name);
for (const [col, ddl] of [
  ["whatsapp_token", "TEXT"],
  ["whatsapp_phone_id", "TEXT"],
  ["whatsapp_business_id", "TEXT"],
  ["whatsapp_numero", "TEXT"],
  ["whatsapp_ativo", "INTEGER NOT NULL DEFAULT 0"],
]) {
  if (!cfgCols.includes(col)) db.exec(`ALTER TABLE configuracoes ADD COLUMN ${col} ${ddl}`);
}

// Garante linha única de configurações
const cfg = db.prepare("SELECT id FROM configuracoes WHERE id = 1").get();
if (!cfg) {
  db.prepare(
    `INSERT INTO configuracoes (id, empresa_nome, empresa_cnpj, empresa_telefone, empresa_email, empresa_endereco, empresa_slogan)
     VALUES (1, 'NEXUS — Marcenaria Corporativa', '00.000.000/0001-00', '(11) 90000-0000', 'contato@nexusmarcenaria.com.br', 'São Paulo — SP', 'Mobiliário corporativo sob medida de alto padrão')`
  ).run();
}

// Popula categorias do catálogo SÓ na criação da tabela (não toda vez que está
// vazia) — assim apagar todas não as traz de volta no próximo start.
if (!categoriasJaExistia) {
  const ins = db.prepare("INSERT OR IGNORE INTO categorias (nome, modelo, ordem) VALUES (?,?,?)");
  const seedCats = db.transaction(() => {
    CATEGORIAS_PADRAO.forEach((c, i) => ins.run(c.nome, c.modelo, i));
    const extras = db.prepare("SELECT DISTINCT categoria FROM materiais").all().map((x) => x.categoria);
    extras.forEach((nome, i) => ins.run(nome, inferirModelo(nome), 100 + i));
  });
  seedCats();
}

// Equipe inicial — também só na criação da tabela (respeita exclusões do usuário).
if (!funcionariosJaExistia) {
  const insF = db.prepare("INSERT INTO funcionarios (nome, funcao, cor, ativo) VALUES (?,?,?,1)");
  const seedFunc = db.transaction(() => FUNCIONARIOS_PADRAO.forEach((f) => insF.run(f.nome, f.funcao, f.cor)));
  seedFunc();
}

export const DB_FIRST_RUN = isNew;
export { DB_PATH };
