const SUPABASE_URL = (process.env.SUPABASE_URL || "https://fepyzmawcsetlyinztjc.supabase.co").replace(/\/+$/, "");
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SECRET_KEY || "";
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "linear-images";

let bucketReady = false;

function requireSupabaseKey() {
  if (!SUPABASE_SERVICE_KEY) {
    throw new Error("Configure SUPABASE_SERVICE_KEY no servidor para enviar imagens.");
  }
}

function storageUrl(path = "") {
  return `${SUPABASE_URL}/storage/v1${path}`;
}

async function supabaseFetch(path, options = {}) {
  requireSupabaseKey();

  const response = await fetch(storageUrl(path), {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
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
    const message = data?.message || data?.error || `Supabase Storage retornou ${response.status}`;
    throw new Error(message);
  }

  return data;
}

async function ensureBucket() {
  if (bucketReady) return;

  try {
    await supabaseFetch(`/bucket/${SUPABASE_BUCKET}`);
  } catch (error) {
    if (!String(error.message || "").toLowerCase().includes("not found")) throw error;

    await supabaseFetch("/bucket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: SUPABASE_BUCKET,
        name: SUPABASE_BUCKET,
        public: true,
        file_size_limit: 10485760,
        allowed_mime_types: ["image/png", "image/jpeg", "image/webp", "image/gif"],
      }),
    });
  }

  bucketReady = true;
}

export function supabasePublicUrl(path) {
  return `${storageUrl(`/object/public/${SUPABASE_BUCKET}/${path}`)}`;
}

export async function uploadImageToSupabase({ buffer, mimeType, path }) {
  await ensureBucket();

  await supabaseFetch(`/object/${SUPABASE_BUCKET}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": "3600",
      "x-upsert": "true",
    },
    body: buffer,
  });

  return {
    bucket: SUPABASE_BUCKET,
    path,
    url: supabasePublicUrl(path),
  };
}

export async function deleteImageFromSupabase(path) {
  if (!path) return;
  await ensureBucket();

  await supabaseFetch(`/object/${SUPABASE_BUCKET}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: [path] }),
  });
}
