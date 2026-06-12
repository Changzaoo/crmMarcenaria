import { Router } from "express";
import { deleteImageFromSupabase, uploadImageToSupabase } from "../storage/supabase.js";

const r = Router();

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const EXT_BY_MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function safeName(name = "imagem") {
  return String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "imagem";
}

function parseDataUrl(dataUrl) {
  const match = /^data:(image\/(?:png|jpe?g|webp|gif));base64,(.+)$/i.exec(String(dataUrl || ""));
  if (!match) return null;

  const mimeType = match[1].toLowerCase() === "image/jpg" ? "image/jpeg" : match[1].toLowerCase();
  return {
    mimeType,
    buffer: Buffer.from(match[2], "base64"),
  };
}

r.post("/imagens", async (req, res, next) => {
  try {
    const { dataUrl, nome, projetoId, etapaId } = req.body || {};
    const parsed = parseDataUrl(dataUrl);

    if (!parsed || !EXT_BY_MIME[parsed.mimeType]) {
      return res.status(400).json({ erro: "Envie uma imagem PNG, JPG, WEBP ou GIF." });
    }

    if (parsed.buffer.length > MAX_IMAGE_BYTES) {
      return res.status(400).json({ erro: "Imagem muito grande. O limite é 10 MB." });
    }

    const ext = EXT_BY_MIME[parsed.mimeType];
    const baseName = safeName(nome).replace(/\.[a-z0-9]+$/i, "");
    const folder = projetoId ? `projetos/${safeName(projetoId)}` : "avulsas";
    const etapa = etapaId ? `etapa-${safeName(etapaId)}-` : "";
    const path = `${folder}/${etapa}${Date.now()}-${baseName}.${ext}`;
    const uploaded = await uploadImageToSupabase({
      buffer: parsed.buffer,
      mimeType: parsed.mimeType,
      path,
    });

    res.json({
      ...uploaded,
      nome: nome || `${baseName}.${ext}`,
      tipo: parsed.mimeType,
      tamanho: parsed.buffer.length,
      criado_em: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

r.delete("/imagens", async (req, res, next) => {
  try {
    await deleteImageFromSupabase(req.body?.path);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default r;
