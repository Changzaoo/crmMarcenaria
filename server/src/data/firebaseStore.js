import { dumpDatabase, restoreDatabase } from "../db/snapshot.js";
import { db } from "../db/index.js";

const DEFAULT_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "device-streaming-20a455a9";
const DEFAULT_DATABASE_URL = `https://${DEFAULT_PROJECT_ID}-default-rtdb.firebaseio.com`;
const DATABASE_URL = (process.env.FIREBASE_DATABASE_URL || DEFAULT_DATABASE_URL).replace(/\/+$/, "");
const DATABASE_PATH = (process.env.FIREBASE_DATABASE_PATH || "linear-crm/database").replace(/^\/+|\/+$/g, "");
// Ativo por padrão sempre que há uma URL (hardcoded ou via env). Desabilite com FIREBASE_DATA_ENABLED=0.
const DATA_ENABLED = process.env.FIREBASE_DATA_ENABLED !== "0" && !!DATABASE_URL;
const DATA_STRICT = process.env.FIREBASE_DATA_STRICT === "1";

let hydrated = false;
let hydrating = null;
let saving = null;
let disabledByError = false;
let lastError = null;

function firebaseUrl(path, token) {
  const cleanPath = path.replace(/^\/+|\/+$/g, "");
  const url = new URL(`${DATABASE_URL}/${cleanPath}.json`);
  url.searchParams.set("auth", token);
  return url;
}

function shouldSync() {
  return DATA_ENABLED && !!DATABASE_URL && !disabledByError;
}

function recordSyncError(error, action) {
  const message = error?.message || String(error);
  lastError = {
    action,
    message,
    at: new Date().toISOString(),
  };
  console.error(`[firebase-data] ${action}: ${message}`);

  // Só desabilita o sync permanentemente se for erro de HIDRATAÇÃO (leitura).
  // Erros de save (escrita) são tolerados — o SQLite local mantém os dados
  // e a próxima tentativa pode funcionar (ex.: token renovado, rede instável).
  if (!DATA_STRICT && action.startsWith("Falha ao sincronizar")) {
    disabledByError = true;
  }
}

async function firebaseFetch(path, token, options = {}) {
  const response = await fetch(firebaseUrl(path, token), {
    ...options,
    headers: {
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
    const erro =
      (data && typeof data === "object" && data.error) ||
      (typeof data === "string" && data) ||
      `Firebase Realtime Database retornou ${response.status}`;
    throw new Error(erro);
  }

  return data;
}

async function saveSnapshot(token) {
  if (!shouldSync()) return;
  const payload = {
    ...dumpDatabase(),
    _salvo_em: new Date().toISOString(),
  };
  await firebaseFetch(DATABASE_PATH, token, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function hydrateFirebaseData(req, _res, next) {
  if (!shouldSync()) return next();

  try {
    if (!hydrated) {
      hydrating ||= (async () => {
        const snapshot = await firebaseFetch(DATABASE_PATH, req.firebaseToken);

          // Só restaura o snapshot se o SQLite local estiver VAZIO (primeira
          // inicialização / ambiente efêmero tipo Vercel). Se já tem dados no
          // SQLite local (que é persistente em dev), o snapshot remoto NÃO
          // deve sobrescrever — senão interações, movimentações de cards etc.
          // que foram feitas após o último save bem-sucedido são perdidas.
          let temDadosLocais = false;
          try {
            const row = db.prepare("SELECT COUNT(*) c FROM negocios").get();
            temDadosLocais = row && row.c > 0;
          } catch {
            temDadosLocais = false;
          }

          if (snapshot && typeof snapshot === "object" && snapshot._versao && !temDadosLocais) {
            console.log("[firebase-data] Restaurando snapshot do Firebase (banco local vazio).");
            restoreDatabase(snapshot);
          } else if (!temDadosLocais) {
            // Banco vazio e sem snapshot remoto: salva o banco atual (seed).
            console.log("[firebase-data] Banco vazio, sem snapshot remoto. Salvando seed.");
            await saveSnapshot(req.firebaseToken);
          } else {
            // Banco local já tem dados — atualiza o snapshot remoto com os dados locais.
            console.log("[firebase-data] Banco local já populado. Atualizando snapshot remoto...");
            await saveSnapshot(req.firebaseToken);
          }
        hydrated = true;
      })().finally(() => {
        hydrating = null;
      });

      await hydrating;
    }

    return next();
  } catch (error) {
    recordSyncError(error, "Falha ao sincronizar snapshot; usando SQLite local");
    if (DATA_STRICT) return next(error);
    return next();
  }
}

export function persistFirebaseData(req, res, next) {
  if (!shouldSync() || req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();

  const originalJson = res.json.bind(res);
  // Salva o snapshot ANTES de enviar a resposta para garantir que um reload
  // imediato já encontre os dados persistidos no Firebase.
  res.json = async (body) => {
    if (res.statusCode < 400) {
      try {
        await saveSnapshot(req.firebaseToken);
      } catch (error) {
        recordSyncError(error, "Falha ao salvar snapshot");
      }
    }
    return originalJson(body);
  };

  return next();
}

export function firebaseDataStatus() {
  return {
    enabled: DATA_ENABLED && !!DATABASE_URL,
    active: shouldSync(),
    strict: DATA_STRICT,
    disabledByError,
    databaseUrl: DATABASE_URL.replace(/^https?:\/\//, ""),
    path: DATABASE_PATH,
    hydrated,
    lastError,
  };
}
