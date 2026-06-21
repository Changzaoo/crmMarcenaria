import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.VERCEL ? join(tmpdir(), "linear-crm") : join(__dirname, "..", "..", "..", "data");
const BILLING_PATH = join(DATA_DIR, "billing.json");

const TRIAL_DAYS = Number(process.env.TRIAL_DAYS || 14);
const PERIODO_DIAS = Number(process.env.BILLING_PERIODO_DIAS || 31); // 1 ciclo mensal de tolerância

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function read() {
  try {
    return JSON.parse(readFileSync(BILLING_PATH, "utf8"));
  } catch {
    return null;
  }
}

function write(state) {
  ensureDir();
  writeFileSync(BILLING_PATH, JSON.stringify(state, null, 2));
  return state;
}

// Inicializa o estado na primeira execução: começa em TRIAL por TRIAL_DAYS dias.
function init() {
  const now = new Date();
  const trialEnd = new Date(now.getTime() + TRIAL_DAYS * 86400000);
  return write({
    status: "trial",          // trial | active | expired | canceled
    instaladoEm: now.toISOString(),
    trialAte: trialEnd.toISOString(),
    ativoAte: null,           // ISO — até quando o acesso pago está liberado
    plano: null,
    ultimoEvento: null,
    ultimaAtualizacao: now.toISOString(),
    historico: [],
  });
}

export function getBillingState() {
  return read() || init();
}

export function setBillingState(patch) {
  const atual = getBillingState();
  const novo = { ...atual, ...patch, ultimaAtualizacao: new Date().toISOString() };
  return write(novo);
}

// Calcula o status efetivo (considerando datas) e se o acesso deve ser liberado.
export function computeAccess() {
  const s = getBillingState();
  const agora = Date.now();

  const trialAtivo = s.trialAte && new Date(s.trialAte).getTime() > agora;
  const pagoAtivo = s.ativoAte && new Date(s.ativoAte).getTime() > agora;

  let statusEfetivo;
  if (s.status === "canceled" && !pagoAtivo) statusEfetivo = "canceled";
  else if (pagoAtivo) statusEfetivo = "active";
  else if (trialAtivo) statusEfetivo = "trial";
  else statusEfetivo = "expired";

  const liberado = statusEfetivo === "active" || statusEfetivo === "trial";

  const diasRestantes = (() => {
    const alvo = pagoAtivo ? s.ativoAte : trialAtivo ? s.trialAte : null;
    if (!alvo) return 0;
    return Math.max(0, Math.ceil((new Date(alvo).getTime() - agora) / 86400000));
  })();

  return {
    liberado,
    status: statusEfetivo,
    emTrial: statusEfetivo === "trial",
    diasRestantes,
    ativoAte: s.ativoAte,
    trialAte: s.trialAte,
    plano: s.plano,
    checkoutUrl: process.env.KIWIFY_CHECKOUT_URL || "",
  };
}

// Registra um pagamento aprovado: estende o acesso por PERIODO_DIAS a partir de hoje
// (ou a partir do fim do período atual, se ainda estiver dentro dele).
export function registrarPagamento({ plano, evento, ordem }) {
  const s = getBillingState();
  const base = s.ativoAte && new Date(s.ativoAte).getTime() > Date.now()
    ? new Date(s.ativoAte)
    : new Date();
  const novoAte = new Date(base.getTime() + PERIODO_DIAS * 86400000);
  const hist = (s.historico || []).slice(-49);
  hist.push({ tipo: "pagamento", em: new Date().toISOString(), evento, ordem: ordem || null });
  return setBillingState({
    status: "active",
    ativoAte: novoAte.toISOString(),
    plano: plano || s.plano || "mensal",
    ultimoEvento: evento || "pagamento_aprovado",
    historico: hist,
  });
}

// Cancela / suspende o acesso (reembolso, chargeback, assinatura cancelada).
export function registrarCancelamento({ evento, ordem }) {
  const s = getBillingState();
  const hist = (s.historico || []).slice(-49);
  hist.push({ tipo: "cancelamento", em: new Date().toISOString(), evento, ordem: ordem || null });
  return setBillingState({
    status: "canceled",
    ativoAte: null,
    ultimoEvento: evento || "cancelamento",
    historico: hist,
  });
}
