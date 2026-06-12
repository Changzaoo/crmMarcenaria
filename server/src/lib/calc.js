// Motor de cálculo do orçamento — usado pelas rotas.
// perda: % aplicada sobre materiais marcados (aproveitamento de chapa)
// margem e impostos: % sobre o custo / preço.
export function calcularOrcamento(orc, ambientes) {
  const perda = Number(orc.perda) || 0;
  const margem = Number(orc.margem) || 0;
  const impostos = Number(orc.impostos) || 0;
  const frete = Number(orc.frete) || 0;

  const ambientesCalc = ambientes.map((amb) => {
    const itens = (amb.itens || []).map((item) => {
      const qtdItem = Number(item.quantidade) || 1;
      let custoMateriais = 0;
      for (const m of item.materiais || []) {
        const base = (Number(m.preco_custo) || 0) * (Number(m.quantidade) || 0);
        const comPerda = m.aplica_perda ? base * (1 + perda / 100) : base;
        custoMateriais += comPerda;
      }
      const maoDeObra = Number(item.mao_de_obra) || 0;
      const custoUnitario = custoMateriais + maoDeObra;
      const custo = custoUnitario * qtdItem;
      const preco = custo * (1 + margem / 100) * (1 + impostos / 100);
      return {
        ...item,
        custo_materiais: round(custoMateriais * qtdItem),
        custo: round(custo),
        preco: round(preco),
        lucro: round(preco - custo),
      };
    });
    const custo = itens.reduce((s, i) => s + i.custo, 0);
    const preco = custo * (1 + margem / 100) * (1 + impostos / 100);
    return { ...amb, itens, custo: round(custo), preco: round(preco), lucro: round(preco - custo) };
  });

  const custoDireto = ambientesCalc.reduce((s, a) => s + a.custo, 0);
  const custoTotal = custoDireto + frete;
  const precoBase = custoTotal * (1 + margem / 100);
  const valorImpostos = precoBase * (impostos / 100);
  const precoFinal = precoBase + valorImpostos;

  return {
    ambientes: ambientesCalc,
    resumo: {
      custo_direto: round(custoDireto),
      frete: round(frete),
      custo_total: round(custoTotal),
      valor_margem: round(precoBase - custoTotal),
      valor_impostos: round(valorImpostos),
      preco_final: round(precoFinal),
      lucro: round(precoBase - custoTotal),
      margem_pct: margem,
      impostos_pct: impostos,
      perda_pct: perda,
    },
  };
}

function round(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}
