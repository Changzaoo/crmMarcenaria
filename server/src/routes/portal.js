// ============================================================
// Portal do Cliente — rotas PÚBLICAS (sem login), montadas em /api/public/portal.
// O acesso é por "código de acompanhamento" (token do lead). O cliente envia
// arquivos técnicos (plantas, modelos 3D, PDFs) que ficam vinculados ao lead
// e aparecem para a equipe no Suporte 3D / Arquiteto do CRM.
// ============================================================
import { Router } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { extensaoAceita, ARQUIVO_MAX_BYTES } from "../shared/contract.js";
import {
  obterLeadPorToken,
  listarArquivosPorLead,
  registrarArquivo,
  obterArquivoRaw,
  removerArquivo,
} from "../storage/portalStore.js";
import {
  pastaDoLead,
  safeName,
  nomeOriginalLegivel,
  caminhoRelativo,
  caminhoAbsoluto,
} from "../storage/uploadsLocal.js";

const r = Router();

// Grava direto no disco, em data/uploads/leads/<leadId>/. O lead é resolvido
// por resolverLead() ANTES do multer, então req.lead.id já está disponível.
const storage = multer.diskStorage({
  destination(req, _file, cb) {
    try {
      cb(null, pastaDoLead(req.lead.id));
    } catch (e) {
      cb(e);
    }
  },
  filename(_req, file, cb) {
    cb(null, `${Date.now()}-${randomUUID().slice(0, 8)}-${safeName(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: ARQUIVO_MAX_BYTES, files: 20 },
  fileFilter(req, file, cb) {
    if (extensaoAceita(nomeOriginalLegivel(file.originalname))) return cb(null, true);
    req.arquivosRejeitados = req.arquivosRejeitados || [];
    req.arquivosRejeitados.push(nomeOriginalLegivel(file.originalname));
    cb(null, false);
  },
});

const asyncRoute = (fn) => (req, res, next) =>
  fn(req, res, next).catch((e) => {
    console.error("[portal]", req.method, req.originalUrl, "->", e?.stack || e);
    if (!res.headersSent) res.status(500).json({ erro: e?.message || "Falha ao processar o Portal do Cliente." });
  });

// Resolve o lead pelo token. Sem token válido → 404 (código inválido).
const resolverLead = asyncRoute(async (req, res, next) => {
  const lead = await obterLeadPorToken(req.params.token);
  if (!lead) return res.status(404).json({ erro: "Código de acompanhamento inválido ou expirado." });
  req.lead = lead;
  next();
});

function leadPublico(lead) {
  return {
    nome: lead.nome,
    tipoProjeto: lead.tipo_projeto || undefined,
    status: lead.status || undefined,
    projetoId: lead.projeto_id || undefined,
    criadoEm: lead.criado_em || undefined,
  };
}

// ---------- abrir o portal (valida o código + lista arquivos) ----------
r.get(
  "/:token",
  resolverLead,
  asyncRoute(async (req, res) => {
    res.json({ lead: leadPublico(req.lead), arquivos: listarArquivosPorLead(req.lead.id) });
  })
);

// ---------- enviar arquivos (multipart/form-data) ----------
// Campos: `categoria` (string) + `arquivos` (1..N files).
r.post(
  "/:token/arquivos",
  resolverLead,
  (req, res, next) => {
    upload.array("arquivos", 20)(req, res, (err) => {
      if (err) {
        const msg =
          err.code === "LIMIT_FILE_SIZE"
            ? `Arquivo grande demais. O limite é ${Math.round(ARQUIVO_MAX_BYTES / (1024 * 1024))} MB por arquivo.`
            : err.message || "Falha no envio.";
        return res.status(400).json({ erro: msg });
      }
      next();
    });
  },
  asyncRoute(async (req, res) => {
    const categoria = (req.body && req.body.categoria) || "memorial";
    const files = req.files || [];
    const rejeitados = req.arquivosRejeitados || [];
    if (!files.length) {
      return res.status(400).json({
        erro: rejeitados.length
          ? `Formato não aceito: ${rejeitados.join(", ")}.`
          : "Nenhum arquivo recebido.",
      });
    }
    const criados = files.map((f) =>
      registrarArquivo({
        leadId: req.lead.id,
        categoria,
        nome: nomeOriginalLegivel(f.originalname),
        path: caminhoRelativo(f.path),
        tipo: f.mimetype,
        tamanho: f.size,
      })
    );
    res.json({ ok: true, arquivos: criados, rejeitados });
  })
);

// ---------- baixar/visualizar um arquivo (cliente e CRM usam) ----------
r.get(
  "/:token/arquivos/:arquivoId",
  resolverLead,
  asyncRoute(async (req, res) => {
    const row = obterArquivoRaw(req.lead.id, req.params.arquivoId);
    if (!row) return res.status(404).json({ erro: "Arquivo não encontrado." });
    const abs = caminhoAbsoluto(row.path);
    if (!abs) return res.status(404).json({ erro: "Arquivo indisponível." });
    res.setHeader("Content-Type", row.tipo || "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${safeName(row.nome)}"; filename*=UTF-8''${encodeURIComponent(row.nome)}`
    );
    res.sendFile(abs, (err) => {
      if (err && !res.headersSent) res.status(404).json({ erro: "Arquivo indisponível." });
    });
  })
);

// ---------- remover um arquivo (antes da análise da equipe) ----------
r.delete(
  "/:token/arquivos/:arquivoId",
  resolverLead,
  asyncRoute(async (req, res) => {
    const ok = removerArquivo(req.lead.id, req.params.arquivoId);
    if (!ok) return res.status(404).json({ erro: "Arquivo não encontrado." });
    res.json({ ok: true });
  })
);

export default r;
