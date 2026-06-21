import { describe, it, expect } from "vitest";
import { calcularOrcamento } from "../src/lib/calc.js";

describe("calcularOrcamento", () => {
  it("aplica perda nos materiais, margem e impostos", () => {
    // 1 chapa: custo 100, com perda 30% => 130. Mão de obra 20 => custo 150.
    // margem 35% => 202.5 ; impostos 8% => 218.7
    const orc = { perda: 30, margem: 35, impostos: 8, frete: 0 };
    const ambientes = [
      {
        nome: "Cozinha",
        itens: [
          {
            descricao: "Balcão",
            quantidade: 1,
            mao_de_obra: 20,
            materiais: [{ preco_custo: 100, quantidade: 1, aplica_perda: 1 }],
          },
        ],
      },
    ];
    const out = calcularOrcamento(orc, ambientes);
    const item = out.ambientes[0].itens[0];
    expect(item.custo).toBeCloseTo(150, 2);
    expect(item.preco).toBeCloseTo(218.7, 2);
    expect(item.lucro).toBeCloseTo(68.7, 2);
    expect(out.resumo.custo_direto).toBeCloseTo(150, 2);
    expect(out.resumo.preco_final).toBeCloseTo(218.7, 2);
  });

  it("não aplica perda quando aplica_perda é falso", () => {
    const orc = { perda: 50, margem: 0, impostos: 0, frete: 0 };
    const ambientes = [
      { nome: "A", itens: [{ quantidade: 1, mao_de_obra: 0, materiais: [{ preco_custo: 100, quantidade: 1, aplica_perda: 0 }] }] },
    ];
    const out = calcularOrcamento(orc, ambientes);
    expect(out.ambientes[0].itens[0].custo).toBeCloseTo(100, 2);
  });

  it("soma frete no custo total e é resiliente a campos ausentes", () => {
    const out = calcularOrcamento({ frete: 50 }, [{ itens: [] }]);
    expect(out.resumo.frete).toBe(50);
    expect(out.resumo.custo_total).toBe(50);
    expect(Number.isFinite(out.resumo.preco_final)).toBe(true);
  });
});
