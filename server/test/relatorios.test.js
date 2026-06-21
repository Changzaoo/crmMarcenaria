import { describe, it, expect } from "vitest";
import {
  ultimosMeses,
  mesDe,
  rotuloMes,
  agregarFunil,
  agregarConversao,
  agregarReceita,
  agregarOrigem,
  agregarResumo,
  ETAPAS_ABERTAS,
} from "../src/lib/relatorios.js";

// Referência fixa para tornar os agrupamentos por mês determinísticos.
const REF = new Date(Date.UTC(2026, 5, 21)); // 2026-06-21

describe("helpers de data", () => {
  it("mesDe extrai YYYY-MM de vários formatos", () => {
    expect(mesDe("2026-06-21")).toBe("2026-06");
    expect(mesDe("2026-06-21 10:30:00")).toBe("2026-06");
    expect(mesDe("2026-06-21T10:30:00.000Z")).toBe("2026-06");
    expect(mesDe(null)).toBe(null);
    expect(mesDe("")).toBe(null);
  });

  it("ultimosMeses devolve N meses em ordem cronológica incluindo o de referência", () => {
    expect(ultimosMeses(3, REF)).toEqual(["2026-04", "2026-05", "2026-06"]);
    expect(ultimosMeses(1, REF)).toEqual(["2026-06"]);
  });

  it("ultimosMeses cruza a virada de ano corretamente", () => {
    const ref = new Date(Date.UTC(2026, 0, 15)); // jan/2026
    expect(ultimosMeses(3, ref)).toEqual(["2025-11", "2025-12", "2026-01"]);
  });

  it("ultimosMeses sanitiza entradas inválidas (mínimo 1)", () => {
    expect(ultimosMeses(0, REF)).toEqual(["2026-06"]);
    expect(ultimosMeses(-5, REF)).toEqual(["2026-06"]);
    expect(ultimosMeses(undefined, REF)).toEqual(["2026-06"]);
  });

  it("rotuloMes formata em pt-BR curto", () => {
    expect(rotuloMes("2026-06")).toBe("jun/26");
    expect(rotuloMes("2025-12")).toBe("dez/25");
  });
});

describe("agregarFunil", () => {
  it("conta, soma valor e pondera por probabilidade por etapa", () => {
    const rows = [
      { etapa: "Lead", valor_estimado: 1000, probabilidade: 30 },
      { etapa: "Lead", valor_estimado: 2000, probabilidade: 50 },
      { etapa: "Negociação", valor_estimado: 5000, probabilidade: 80 },
    ];
    const out = agregarFunil(rows);
    const lead = out.find((e) => e.etapa === "Lead");
    const neg = out.find((e) => e.etapa === "Negociação");
    expect(lead.qtd).toBe(2);
    expect(lead.valor).toBe(3000);
    // 1000*0.3 + 2000*0.5 = 300 + 1000 = 1300
    expect(lead.valor_ponderado).toBe(1300);
    expect(neg.valor_ponderado).toBe(4000); // 5000*0.8
  });

  it("inclui todas as etapas oficiais mesmo sem negócios (zeradas)", () => {
    const out = agregarFunil([]);
    expect(out.length).toBeGreaterThanOrEqual(ETAPAS_ABERTAS.length);
    expect(out.every((e) => e.qtd === 0 && e.valor === 0)).toBe(true);
    expect(out.find((e) => e.etapa === "Lead")).toBeTruthy();
  });

  it("é resiliente a valores ausentes/inválidos", () => {
    const out = agregarFunil([{ etapa: "Lead" }, { etapa: "Lead", valor_estimado: "x" }]);
    const lead = out.find((e) => e.etapa === "Lead");
    expect(lead.qtd).toBe(2);
    expect(lead.valor).toBe(0);
    expect(lead.valor_ponderado).toBe(0);
  });
});

describe("agregarConversao", () => {
  it("conta criados no mês de criação e fechados no mês de fechamento", () => {
    const criados = [
      { criado_em: "2026-05-02" },
      { criado_em: "2026-06-10" },
      { criado_em: "2026-06-15" },
      { criado_em: "2026-01-01" }, // fora da janela de 3 meses
    ];
    const fechados = [
      { etapa: "Fechado (ganho)", fechado_em: "2026-06-12" },
      { etapa: "Fechado (ganho)", fechado_em: "2026-06-20" },
      { etapa: "Perdido", fechado_em: "2026-06-18" },
      { etapa: "Fechado (ganho)", fechado_em: "2026-04-05" },
    ];
    const out = agregarConversao(criados, fechados, 3, REF);
    expect(out.map((m) => m.mes)).toEqual(["2026-04", "2026-05", "2026-06"]);

    const jun = out.find((m) => m.mes === "2026-06");
    expect(jun.criados).toBe(2);
    expect(jun.ganhos).toBe(2);
    expect(jun.perdidos).toBe(1);
    expect(jun.fechados).toBe(3);
    // 2 ganhos / 3 fechados = 66.67% -> 67 arredondado
    expect(jun.taxa).toBe(67);

    const abr = out.find((m) => m.mes === "2026-04");
    expect(abr.ganhos).toBe(1);
    expect(abr.taxa).toBe(100);

    const mai = out.find((m) => m.mes === "2026-05");
    expect(mai.criados).toBe(1);
    expect(mai.taxa).toBe(0); // sem fechamentos -> 0
  });
});

describe("agregarReceita", () => {
  it("separa recebido, a_receber e atrasado por mês", () => {
    const rows = [
      { valor: 1000, status: "recebido", recebido_em: "2026-06-05", vencimento: "2026-06-01" },
      { valor: 500, status: "recebido", recebido_em: null, vencimento: "2026-05-10" }, // cai no vencimento
      { valor: 2000, status: "a_receber", vencimento: "2026-06-30" }, // futuro -> a_receber
      { valor: 300, status: "a_receber", vencimento: "2026-06-01" }, // venceu antes de hoje -> atrasado
      { valor: 900, status: "atrasado", vencimento: "2026-05-20" },
    ];
    const out = agregarReceita(rows, 3, REF, "2026-06-21");
    const jun = out.find((m) => m.mes === "2026-06");
    const mai = out.find((m) => m.mes === "2026-05");

    expect(jun.recebido).toBe(1000);
    expect(jun.a_receber).toBe(2000);
    expect(jun.atrasado).toBe(300);
    expect(mai.recebido).toBe(500);
    expect(mai.atrasado).toBe(900);
  });

  it("ignora parcelas fora da janela de meses", () => {
    const rows = [{ valor: 1000, status: "recebido", recebido_em: "2025-01-01", vencimento: "2025-01-01" }];
    const out = agregarReceita(rows, 3, REF, "2026-06-21");
    expect(out.every((m) => m.recebido === 0)).toBe(true);
  });
});

describe("agregarOrigem", () => {
  it("agrupa por origem, soma valor e ordena por valor desc", () => {
    const rows = [
      { origem: "site", valor_estimado: 1000 },
      { origem: "Orçamento 3D", valor_estimado: 5000 },
      { origem: "site", valor_estimado: 500 },
      { origem: null, valor_estimado: 100 },
    ];
    const out = agregarOrigem(rows);
    expect(out[0]).toEqual({ origem: "Orçamento 3D", qtd: 1, valor: 5000 });
    const site = out.find((o) => o.origem === "site");
    expect(site).toEqual({ origem: "site", qtd: 2, valor: 1500 });
    expect(out.find((o) => o.origem === "Sem origem")).toBeTruthy();
  });
});

describe("agregarResumo", () => {
  it("calcula ticket médio, status, a receber e win rate", () => {
    const projetos = [
      { valor: 10000, status: "Em andamento" },
      { valor: 20000, status: "Concluído" },
      { valor: 0, status: "Em andamento" }, // valor 0 não entra no ticket médio
    ];
    const negocios = [
      { etapa: "Fechado (ganho)" },
      { etapa: "Fechado (ganho)" },
      { etapa: "Fechado (ganho)" },
      { etapa: "Perdido" },
      { etapa: "Lead" }, // não conta no win rate
    ];
    const out = agregarResumo(projetos, negocios, 7500);
    expect(out.ticket_medio).toBe(15000); // (10000+20000)/2
    expect(out.total_projetos).toBe(3);
    expect(out.total_a_receber).toBe(7500);
    expect(out.ganhos).toBe(3);
    expect(out.perdidos).toBe(1);
    expect(out.win_rate).toBe(75); // 3 / 4
    expect(out.projetos_por_status.find((s) => s.status === "Em andamento").qtd).toBe(2);
  });

  it("não quebra com listas vazias", () => {
    const out = agregarResumo([], [], 0);
    expect(out.ticket_medio).toBe(0);
    expect(out.win_rate).toBe(0);
    expect(out.projetos_por_status).toEqual([]);
  });
});
