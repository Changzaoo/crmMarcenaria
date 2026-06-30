// ============================================================
// Armazenamento LOCAL dos arquivos do Portal do Cliente.
// Os binários (plantas, modelos 3D, PDFs) ficam em data/uploads/leads/<leadId>/.
// No SQLite (tabela lead_arquivos) guardamos apenas os metadados + o caminho
// relativo a UPLOADS_DIR. 100% local — não depende de Supabase/nuvem.
// ============================================================
import { join, normalize, sep } from "path";
import { existsSync, mkdirSync, rmSync } from "fs";
import { UPLOADS_DIR } from "../db/index.js";

export { UPLOADS_DIR };

/** Sanitiza um nome de arquivo para uso seguro no disco. */
export function safeName(name = "arquivo") {
  return (
    String(name)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 120) || "arquivo"
  );
}

/** Corrige nomes que o multer entrega em latin1 (acentos quebrados). */
export function nomeOriginalLegivel(originalname = "") {
  try {
    const utf8 = Buffer.from(originalname, "latin1").toString("utf8");
    // Se a reinterpretação introduziu o caractere de substituição, mantém o original.
    return utf8.includes("�") ? originalname : utf8;
  } catch {
    return originalname;
  }
}

/** Caminho absoluto da pasta de um lead (cria se não existir). */
export function pastaDoLead(leadId) {
  const dir = join(UPLOADS_DIR, "leads", safeName(leadId));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

/** Resolve um caminho relativo (guardado no DB) para absoluto, barrando
    qualquer tentativa de escapar de UPLOADS_DIR (path traversal). */
export function caminhoAbsoluto(relPath) {
  const abs = normalize(join(UPLOADS_DIR, relPath));
  if (!abs.startsWith(UPLOADS_DIR + sep) && abs !== UPLOADS_DIR) return null;
  return abs;
}

/** Caminho relativo (POSIX) a UPLOADS_DIR a partir de um caminho absoluto. */
export function caminhoRelativo(absPath) {
  return absPath
    .slice(UPLOADS_DIR.length)
    .replace(/^[\\/]+/, "")
    .split(sep)
    .join("/");
}

/** Remove o binário do disco (silencioso se já não existe). */
export function removerArquivoDisco(relPath) {
  const abs = caminhoAbsoluto(relPath);
  if (abs && existsSync(abs)) {
    try {
      rmSync(abs);
    } catch {
      /* ignore */
    }
  }
}
