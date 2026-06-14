import { db } from "./index.js";
import { TABELAS } from "./tables.js";
import { CATEGORIAS_PADRAO, inferirModelo } from "./schema.js";

// Garante categorias do catálogo após restaurar (snapshots antigos não as trazem).
function garantirCategorias() {
  if (db.prepare("SELECT COUNT(*) c FROM categorias").get().c > 0) return;
  const ins = db.prepare("INSERT OR IGNORE INTO categorias (nome, modelo, ordem) VALUES (?,?,?)");
  CATEGORIAS_PADRAO.forEach((c, i) => ins.run(c.nome, c.modelo, i));
  const extras = db.prepare("SELECT DISTINCT categoria FROM materiais").all().map((x) => x.categoria);
  extras.forEach((nome, i) => ins.run(nome, inferirModelo(nome), 100 + i));
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

      const colunas = Object.keys(rows[0]);
      const placeholders = colunas.map(() => "?").join(",");
      const stmt = db.prepare(`INSERT OR REPLACE INTO ${tabela} (${colunas.join(",")}) VALUES (${placeholders})`);

      for (const row of rows) stmt.run(...colunas.map((coluna) => row[coluna]));
    }

    garantirCategorias();

    db.pragma("foreign_keys = ON");
  })();
}
