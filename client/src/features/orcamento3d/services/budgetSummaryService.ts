import { getFurnitureDef } from "../furnitureCatalog";
import { getMaterial } from "../materials";
import type { Project3DDoc } from "../types";

export interface SummaryLine {
  catalogId: string;
  name: string;
  category: string;
  quantidade: number;
  material: string;
  estimativa: number;
}

export interface BudgetSummary {
  ambiente: { area: number; perimetro: number; volume: number };
  linhas: SummaryLine[];
  totalItens: number;
  estimativaMin: number;
  estimativaMax: number;
  geradoEm: string;
}

// Pré-orçamento VISUAL — estimativa de referência, não preço final.
// Ajusta o preço-base do catálogo pelo material, dimensões e quantidade.
export function gerarResumo(doc: Project3DDoc): BudgetSummary {
  const { largura, comprimento, peDireito } = doc.environment;
  const area = +(largura * comprimento).toFixed(2);
  const perimetro = +(2 * (largura + comprimento)).toFixed(2);
  const volume = +(area * peDireito).toFixed(2);

  const mapa = new Map<string, SummaryLine>();
  for (const f of doc.furniture) {
    const def = getFurnitureDef(f.catalogId);
    const mat = getMaterial(f.material);
    const base = def?.basePrice ?? 1500;
    // escala pela proporção volumétrica em relação ao tamanho padrão do catálogo
    const volPadrao = def ? def.width * def.height * def.depth : 0.5;
    const volAtual = f.width * f.height * f.depth;
    const escala = volPadrao > 0 ? Math.max(0.5, volAtual / volPadrao) : 1;
    const estimativa = Math.round(base * escala * mat.fator);

    const chave = `${f.catalogId}|${f.material}`;
    const linha = mapa.get(chave);
    if (linha) {
      linha.quantidade += 1;
      linha.estimativa += estimativa;
    } else {
      mapa.set(chave, {
        catalogId: f.catalogId,
        name: f.name,
        category: f.category,
        quantidade: 1,
        material: mat.nome,
        estimativa,
      });
    }
  }

  const linhas = [...mapa.values()];
  const total = linhas.reduce((s, l) => s + l.estimativa, 0);

  return {
    ambiente: { area, perimetro, volume },
    linhas,
    totalItens: doc.furniture.length,
    estimativaMin: Math.round(total * 0.85),
    estimativaMax: Math.round(total * 1.25),
    geradoEm: new Date().toISOString(),
  };
}
