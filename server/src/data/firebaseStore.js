import { dumpDatabase, restoreDatabase } from "../db/snapshot.js";

const DEFAULT_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "device-streaming-20a455a9";
const DEFAULT_DATABASE_URL = `https://${DEFAULT_PROJECT_ID}-default-rtdb.firebaseio.com`;
const DATABASE_URL = (process.env.FIREBASE_DATABASE_URL || DEFAULT_DATABASE_URL).replace(/\/+$/, "");
const DATABASE_PATH = (process.env.FIREBASE_DATABASE_PATH || "linear-crm/database").replace(/^\/+|\/+$/g, "");
const DATA_ENABLED =
  process.env.FIREBASE_DATA_ENABLED !== "0" &&
  (process.env.FIREBASE_DATA_ENABLED === "1" || !!process.env.FIREBASE_DATABASE_URL);

let hydrated = false;
let hydrating = null;
let saving = null;

function firebaseUrl(path, token) {
  const cleanPath = path.replace(/^\/+|\/+$/g, "");
  const url = new URL(`${DATABASE_URL}/${cleanPath}.json`);
  url.searchParams.set("auth", token);
  return url;
}

function shouldSync() {
  return DATA_ENABLED && !!DATABASE_URL;
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
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const erro = data?.error || `Firebase Realtime Database retornou ${response.status}`;
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
        if (snapshot && typeof snapshot === "object" && snapshot._versao) {
          restoreDatabase(snapshot);
        } else {
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
    return next(error);
  }
}

export function persistFirebaseData(req, res, next) {
  if (!shouldSync() || req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode < 400) {
      saving = (saving || Promise.resolve())
        .then(() => saveSnapshot(req.firebaseToken))
        .catch((error) => {
          console.error("[firebase-data] Falha ao salvar snapshot:", error.message);
        })
        .finally(() => {
          saving = null;
        });
    }

    return originalJson(body);
  };

  return next();
}

export function firebaseDataStatus() {
  return {
    enabled: shouldSync(),
    databaseUrl: DATABASE_URL.replace(/^https?:\/\//, ""),
    path: DATABASE_PATH,
    hydrated,
  };
}
