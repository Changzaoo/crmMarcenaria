import { db } from "../db/index.js";
import { ETAPAS_PROJETO, CHECKLIST_PADRAO } from "../db/schema.js";

// Cria um projeto com as 10 etapas oficiais + checklists padrão.
export function criarProjetoComEtapas(dados) {
  const info = db
    .prepare(
      `INSERT INTO projetos (negocio_id, empresa_id, orcamento_id, nome, endereco_obra, valor, data_contrato, previsao_entrega, data_instalacao, status, responsavel)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      dados.negocio_id ?? null,
      dados.empresa_id ?? null,
      dados.orcamento_id ?? null,
      dados.nome,
      dados.endereco_obra ?? null,
      dados.valor ?? 0,
      dados.data_contrato ?? null,
      dados.previsao_entrega ?? null,
      dados.data_instalacao ?? null,
      dados.status ?? "Em andamento",
      dados.responsavel ?? null
    );
  const pid = info.lastInsertRowid;
  const insEt = db.prepare("INSERT INTO projeto_etapas (projeto_id, numero, nome, concluida) VALUES (?,?,?,0)");
  const insChk = db.prepare("INSERT INTO etapa_checklist (etapa_id, texto, concluido, ordem) VALUES (?,?,0,?)");
  ETAPAS_PROJETO.forEach((nome, idx) => {
    const eid = insEt.run(pid, idx + 1, nome).lastInsertRowid;
    (CHECKLIST_PADRAO[nome] || []).forEach((txt, ci) => insChk.run(eid, txt, ci));
  });
  return pid;
}
