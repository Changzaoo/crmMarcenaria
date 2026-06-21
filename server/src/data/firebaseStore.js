import { dumpDatabase, restoreDatabase } from "../db/snapshot.js";
import { db } from "../db/index.js";

const DEFAULT_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "device-streaming-20a455a9";
const DEFAULT_DATABASE_URL = `https://${DEFAULT_PROJECT_ID}-default-rtdb.firebaseio.com`;
const DATABASE_URL = (process.env.FIREBASE_DATABASE_URL || DEFAULT_DATABASE_URL).replace(/\/+$/, "");
const DATABASE_PATH = (process.env.FIREBASE_DATABASE_PATH || "linear-crm/database").replace(/^\/+|\/+$/g, "");
// Ativo por padrão sempre que há uma URL (hardcoded ou via env). Desabilite com FIREBASE_DATA_ENABLED=0.
const DATA_ENABLED = process.env.FIREBASE_DATA_ENABLED !== "0" && !!DATABASE_URL;
const DATA_STRICT = process.env.FIREBASE_DATA_STRICT === "1";
// Só ambientes serverless (Vercel) têm múltiplas instâncias que podem servir
// snapshots desatualizados — só aí vale a verificação de frescor por request.
// Num processo único (dev local / VPS), após a hidratação inicial o estado já é a
// fonte de verdade local; reler o marcador a cada request só adicionaria latência.
const MULTI_INSTANCE = !!process.env.VERCEL;

let hydrated = false;
let hydrating = null;
let disabledByError = false;
let lastError = null;
// `_salvo_em` do snapshot atualmente aplicado neste processo. Usado para detectar,
// em ambiente serverless (Vercel = várias instâncias), quando OUTRA instância
// gravou um snapshot mais novo — e então re-hidratar antes de servir a requisição.
let appliedSalvoEm = null;
let refreshing = null;

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
  const salvoEm = new Date().toISOString();
  const payload = {
    ...dumpDatabase(),
    _salvo_em: salvoEm,
  };
  await firebaseFetch(DATABASE_PATH, token, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  // Marca este snapshot como o aplicado localmente: evita que a verificação de
  // frescor re-hidrate por cima da nossa própria escrita na requisição seguinte.
  appliedSalvoEm = salvoEm;
}

// Leitura minúscula (só o marcador `_salvo_em`) para descobrir se o snapshot
// remoto está mais novo que o aplicado nesta instância, sem baixar o dump inteiro.
async function fetchRemoteSalvoEm(token) {
  try {
    return await firebaseFetch(`${DATABASE_PATH}/_salvo_em`, token);
  } catch {
    return null;
  }
}

// Persiste o estado atual no Firebase sob demanda. Útil para mutações que NÃO
// passam pelo middleware persistFirebaseData — em especial a auto-sincronização
// de Orçamentos 3D, que cria negócios dentro de um GET (que não persiste). Sem
// isto, uma re-hidratação posterior descartaria os leads recém-criados.
export async function persistFirebaseSnapshot(token) {
  if (!shouldSync()) return;
  try {
    await saveSnapshot(token);
  } catch (error) {
    recordSyncError(error, "Falha ao salvar snapshot");
  }
}

export async function hydrateFirebaseData(req, _res, next) {
  if (!shouldSync()) return next();

  try {
    if (!hydrated) {
      hydrating ||= (async () => {
        const snapshot = await firebaseFetch(DATABASE_PATH, req.firebaseToken);

        // O snapshot remoto é a FONTE DE VERDADE. Como cada mutação salva o
        // snapshot de forma síncrona (persistFirebaseData), o remoto está sempre
        // tão fresco quanto o estado real. Num processo novo o SQLite local é só
        // o seed de demonstração (ambiente efêmero do Vercel recria-o a cada cold
        // start) — restaurar o remoto por cima dele é o correto. NÃO usamos mais
        // a presença de dados locais como sinal: o seed parecia "dados reais" e
        // acabava SOBRESCREVENDO o snapshot bom no Firebase a cada reinício,
        // fazendo interações e posições de cards "sumirem" ao recarregar.
        if (snapshot && typeof snapshot === "object" && snapshot._versao) {
          console.log("[firebase-data] Restaurando snapshot do Firebase (fonte de verdade).");
          restoreDatabase(snapshot);
          appliedSalvoEm = snapshot._salvo_em || null;
        } else {
          // Não existe snapshot remoto ainda: promove o banco local (seed) ao remoto.
          console.log("[firebase-data] Sem snapshot remoto. Salvando estado local inicial.");
          await saveSnapshot(req.firebaseToken);
        }
        hydrated = true;
      })().finally(() => {
        hydrating = null;
      });

      await hydrating;
    } else if (MULTI_INSTANCE) {
      // Já hidratado NESTE processo. No Vercel há múltiplas instâncias: outra pode
      // ter gravado um snapshot mais novo que esta ainda não viu. Antes de servir,
      // confere o marcador `_salvo_em` (leitura ínfima) e, se o remoto for mais
      // novo, re-hidrata o snapshot completo. É isto que elimina o "card volta para
      // o lugar" — leituras de instâncias desatualizadas — SEM botão de sincronizar.
      const remoto = await fetchRemoteSalvoEm(req.firebaseToken);
      if (remoto && remoto !== appliedSalvoEm) {
        // Coalescing: requisições concorrentes aguardam a mesma re-hidratação.
        refreshing ||= (async () => {
          const snapshot = await firebaseFetch(DATABASE_PATH, req.firebaseToken);
          if (snapshot && typeof snapshot === "object" && snapshot._versao) {
            restoreDatabase(snapshot);
            appliedSalvoEm = snapshot._salvo_em || remoto;
          } else {
            // Remoto ausente/sem _versao: marca como visto para não rebaixar o dump
            // inteiro a cada request (thrash). Preserva o estado local atual.
            appliedSalvoEm = remoto;
          }
        })().finally(() => {
          refreshing = null;
        });
        await refreshing;
      }
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
