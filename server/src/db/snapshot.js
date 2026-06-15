import { db } from "./index.js";
import { TABELAS } from "./tables.js";
import { CATEGORIAS_PADRAO, FUNCIONARIOS_PADRAO, inferirModelo } from "./schema.js";

// Repopula SÓ quando o snapshot é antigo (não tinha a tabela = chave ausente).
// Se a chave existe (mesmo vazia), respeitamos: o usuário pode ter apagado tudo.
function garantirCategorias(dump) {
  if (dump.categorias !== undefined) return;
  if (db.prepare("SELECT COUNT(*) c FROM categorias").get().c > 0) return;
  const ins = db.prepare("INSERT OR IGNORE INTO categorias (nome, modelo, ordem) VALUES (?,?,?)");
  CATEGORIAS_PADRAO.forEach((c, i) => ins.run(c.nome, c.modelo, i));
  const extras = db.prepare("SELECT DISTINCT categoria FROM materiais").all().map((x) => x.categoria);
  extras.forEach((nome, i) => ins.run(nome, inferirModelo(nome), 100 + i));
}

function garantirFuncionarios(dump) {
  if (dump.funcionarios !== undefined) return;
  if (db.prepare("SELECT COUNT(*) c FROM funcionarios").get().c > 0) return;
  const ins = db.prepare("INSERT INTO funcionarios (nome, funcao, cor, ativo) VALUES (?,?,?,1)");
  FUNCIONARIOS_PADRAO.forEach((f) => ins.run(f.nome, f.funcao, f.cor));
}

export function dumpDatabase() {
  const dump = { _gerado_em: new Date().toISOString(), _versao: 1 };
  for (const tabela of TABELAS) dump[tabela] = db.prepare(`SELECT * FROM ${tabela}`).all();
  return dump;
}

export function restoreDatabase(dump) {
  if (!dump || typeof dump !== "object") {
    throw new Error("Snapshot de dados inválido.");
  }

  db.transaction(() => {
    db.pragma("foreign_keys = OFF");

    for (const tabela of [...TABELAS].reverse()) {
      if (tabela === "configuracoes") continue;
      db.prepare(`DELETE FROM ${tabela}`).run();
    }

    for (const tabela of TABELAS) {
      const rows = dump[tabela];
      if (!Array.isArray(rows) || rows.length === 0) continue;

      // configuracoes é linha única (id=1): atualiza só as colunas presentes no
      // snapshot, preservando colunas novas (ex.: WhatsApp) ao restaurar snapshots antigos.
      if (tabela === "configuracoes") {
        const row = rows[0];
        const cols = Object.keys(row).filter((c) => c !== "id");
        if (cols.length) {
          const sets = cols.map((c) => `${c}=?`).join(",");
          db.prepare(`UPDATE configuracoes SET ${sets} WHERE id = 1`).run(...cols.map((c) => row[c]));
        }
        continue;
      }

      const colunas = Object.keys(rows[0]);
      const placeholders = colunas.map(() => "?").join(",");
      const stmt = db.prepare(`INSERT OR REPLACE INTO ${tabela} (${colunas.join(",")}) VALUES (${placeholders})`);

      for (const row of rows) stmt.run(...colunas.map((coluna) => row[coluna]));
    }

    garantirCategorias(dump);
    garantirFuncionarios(dump);

    db.pragma("foreign_keys = ON");
  })();
}
