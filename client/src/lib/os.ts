import { Projeto } from "../types";
import { moeda, data } from "./format";

// Ordem de Serviço imprimível — abre janela estilizada com a identidade Nexus Marcenaria.
export function imprimirOS(p: Projeto) {
  const etapas = (p.etapas || []).map((et) => {
    const itens = et.checklist.map((c) => `<li class="${c.concluido ? "ok" : ""}">${c.concluido ? "☑" : "☐"} ${c.texto}</li>`).join("");
    return `<div class="etapa">
      <div class="etapa-h"><span>${et.numero}. ${et.nome}</span><span>${et.concluida ? "✔ concluída" : ""}</span></div>
      ${itens ? `<ul>${itens}</ul>` : ""}
      ${et.observacoes ? `<p class="obs">${et.observacoes}</p>` : ""}
    </div>`;
  }).join("");

  const contatos = (p.contatos || []).map((c) => `${c.nome} (${c.cargo || "—"}) · ${c.telefone || ""}`).join("<br/>") || "—";

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/>
  <title>OS — ${p.nome}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Manrope', Arial, sans-serif; color: #1a1714; margin: 0; padding: 40px; background: #fff; }
    .head { display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 3px solid #D8B978; padding-bottom: 16px; }
    .brand { font-family: Georgia, serif; font-size: 28px; letter-spacing: 6px; }
    .brand small { display:block; font-size: 9px; letter-spacing: 3px; color: #9C7248; }
    h1 { font-size: 20px; margin: 24px 0 4px; }
    .grid { display:grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin: 16px 0; font-size: 13px; }
    .grid div span { color:#888; display:block; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
    .etapa { border:1px solid #eee; border-radius:8px; padding:12px 16px; margin-bottom:8px; page-break-inside: avoid; }
    .etapa-h { display:flex; justify-content:space-between; font-weight:700; }
    ul { margin: 8px 0 0; padding-left: 18px; font-size: 12px; color:#444; }
    li.ok { color:#9C7248; }
    .obs { font-size: 11px; color:#666; font-style: italic; margin-top:6px; }
    .sec { font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color:#9C7248; margin: 24px 0 8px; }
    .foot { margin-top: 40px; font-size: 10px; color:#999; border-top:1px solid #eee; padding-top:12px; }
    @media print { body { padding: 20px; } }
  </style></head><body>
    <div class="head">
      <div class="brand">NEXUS<small>MARCENARIA CORPORATIVA</small></div>
      <div style="text-align:right; font-size:12px;">
        <strong>ORDEM DE SERVIÇO</strong><br/>
        Emitida em ${data(new Date().toISOString())}<br/>
        OS Nº ${String(p.id).padStart(4, "0")}
      </div>
    </div>
    <h1>${p.nome}</h1>
    <div class="grid">
      <div><span>Cliente</span>${p.empresa_nome || "—"}</div>
      <div><span>Status</span>${p.status}</div>
      <div><span>Endereço da obra</span>${p.endereco_obra || "—"}</div>
      <div><span>Responsável</span>${p.responsavel || "—"}</div>
      <div><span>Valor do contrato</span>${moeda(p.valor)}</div>
      <div><span>Previsão de entrega</span>${data(p.previsao_entrega)}</div>
      <div><span>Data de instalação</span>${data(p.data_instalacao)}</div>
      <div><span>Progresso</span>${p.progresso}%</div>
    </div>
    <div class="sec">Contatos da obra</div>
    <div style="font-size:13px;">${contatos}</div>
    <div class="sec">Etapas e checklist</div>
    ${etapas}
    <div class="foot">Documento gerado pelo sistema de gestão Nexus Marcenaria. Sujeito a revisão conforme andamento da obra.</div>
  </body></html>`;

  // Sem <script> inline na janela (janelas about:blank herdam a CSP da página,
  // e script-src 'self' bloquearia um inline). O print é disparado pela própria app.
  const w = window.open("", "_blank", "width=900,height=1000");
  if (w) {
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  }
}
