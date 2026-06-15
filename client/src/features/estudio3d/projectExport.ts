/* Exportação do resumo do projeto: JSON + HTML imprimível. */
import type { Project3D } from "./types";
import { brl } from "./pricingEngine";
import { MATERIAL_MAP } from "./materials";

export function exportJSON(project: Project3D) {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug(project.name)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportHTML(project: Project3D) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(buildHTML(project));
  win.document.close();
}

function slug(s: string) {
  return (s || "projeto").toLowerCase().normalize("NFD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "");
}

function buildHTML(p: Project3D): string {
  const rows = p.furniture
    .map(
      (f) => `<tr>
        <td>${escapeHtml(f.name)}</td>
        <td>${(f.floor ?? 0) === 0 ? "Térreo" : `${(f.floor ?? 0) + 1}º andar`}</td>
        <td>${f.width}×${f.height}×${f.depth} cm</td>
        <td>${escapeHtml(MATERIAL_MAP[f.config.material]?.label ?? f.config.material)}</td>
        <td>${f.config.doors} / ${f.config.drawers}</td>
        <td>${f.config.led ? "Sim" : "—"}</td>
        <td>${escapeHtml(f.note ?? "")}</td>
      </tr>`
    )
    .join("");

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
  <title>Resumo · ${escapeHtml(p.name)}</title>
  <style>
    body{font-family:'Manrope',system-ui,sans-serif;color:#1a1510;margin:40px;background:#faf7f1}
    h1{font-family:Georgia,serif;font-style:italic;margin:0 0 4px}
    .muted{color:#7a6f60;font-size:13px}
    .badge{display:inline-block;background:#1d1813;color:#D8B978;padding:6px 14px;border-radius:999px;font-size:13px;margin-top:8px}
    table{width:100%;border-collapse:collapse;margin-top:18px;font-size:13px}
    th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #e6ddcc}
    th{color:#9c7248;text-transform:uppercase;font-size:11px;letter-spacing:.05em}
    .grid{display:flex;gap:24px;flex-wrap:wrap;margin-top:14px}
    .card{border:1px solid #e6ddcc;border-radius:12px;padding:14px 18px;min-width:150px}
    .card b{font-size:18px}
    img{max-width:420px;border-radius:12px;margin-top:18px;border:1px solid #e6ddcc}
    @media print{.badge{-webkit-print-color-adjust:exact}}
  </style></head><body>
  <p class="muted">LINEAR · Estúdio 3D de Orçamento</p>
  <h1>${escapeHtml(p.name)}</h1>
  <p class="badge">Estimativa: ${brl(p.estimate.min)} a ${brl(p.estimate.max)}</p>
  <div class="grid">
    <div class="card"><div class="muted">Ambiente</div><b>${escapeHtml(p.environment.typeLabel)}</b></div>
    <div class="card"><div class="muted">Medidas</div><b>${p.environment.width}×${p.environment.depth}×${p.environment.height} cm · ${p.environment.floors} andar(es)</b></div>
    <div class="card"><div class="muted">Complexidade</div><b>${p.estimate.complexity}</b></div>
    <div class="card"><div class="muted">Prazo</div><b>${p.estimate.deadlineDays[0]}–${p.estimate.deadlineDays[1]} dias</b></div>
  </div>
  <div class="grid">
    <div class="card"><div class="muted">Cliente</div><b>${escapeHtml(p.client.name || "—")}</b><div class="muted">${escapeHtml(p.client.phone)} · ${escapeHtml(p.client.email)}</div></div>
    <div class="card"><div class="muted">Cidade</div><b>${escapeHtml(p.client.city || "—")}</b></div>
    <div class="card"><div class="muted">Tipo de projeto</div><b>${escapeHtml(p.client.projectType || p.environment.typeLabel)}</b></div>
    <div class="card"><div class="muted">Prazo desejado</div><b>${escapeHtml(p.client.desiredDeadline || "—")}</b></div>
    <div class="card"><div class="muted">Faixa estimada</div><b>${escapeHtml(p.client.budgetRange || "—")}</b></div>
  </div>
  ${p.thumbnail ? `<img src="${p.thumbnail}" alt="Prévia do projeto"/>` : ""}
  <table><thead><tr><th>Móvel</th><th>Andar</th><th>Dimensões</th><th>Material</th><th>P/G</th><th>LED</th><th>Obs.</th></tr></thead>
  <tbody>${rows || `<tr><td colspan="7" class="muted">Nenhum móvel.</td></tr>`}</tbody></table>
  ${p.client.notes ? `<p class="muted" style="margin-top:16px">Observações: ${escapeHtml(p.client.notes)}</p>` : ""}
  <p class="muted" style="margin-top:24px">Estimativa inicial. A equipe técnica enviará o orçamento final após análise.</p>
  </body></html>`;
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );
}
