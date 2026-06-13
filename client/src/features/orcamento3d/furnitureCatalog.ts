// Catálogo de móveis de marcenaria. Cada item gera uma instância no ambiente.

export type FurnitureKind =
  | "cabinet" // armário / caixaria fechada
  | "counter" // balcão / bancada baixa
  | "shelf" // prateleira / estante aberta
  | "gondola" // gôndola dupla face
  | "display" // expositor / vitrine
  | "table" // mesa
  | "tvpanel" // painel de TV
  | "niche" // nicho
  | "bench" // bancada
  | "reception" // recepção
  | "wardrobe" // closet / guarda-roupa
  | "island"; // ilha de cozinha

export interface FurnitureDef {
  id: string;
  category: string;
  name: string;
  kind: FurnitureKind;
  width: number; // m
  height: number; // m
  depth: number; // m
  material: string; // material default (id)
  icon: string; // emoji para a biblioteca
  basePrice: number; // R$ base (referência interna p/ estimativa)
}

export const FURNITURE_CATEGORIES = [
  "Cozinhas",
  "Armários",
  "Closets",
  "Painéis de TV",
  "Balcões comerciais",
  "Gôndolas",
  "Expositores de loja",
  "Prateleiras",
  "Mesas",
  "Nichos",
  "Bancadas",
  "Recepção",
  "Escritório",
  "Shopping / Lojas grandes",
] as const;

export const FURNITURE: FurnitureDef[] = [
  // Cozinhas
  { id: "cozinha_balcao", category: "Cozinhas", name: "Balcão de cozinha", kind: "counter", width: 2.0, height: 0.9, depth: 0.6, material: "mdf_branco", icon: "🍽️", basePrice: 2800 },
  { id: "cozinha_aereo", category: "Cozinhas", name: "Armário aéreo", kind: "cabinet", width: 1.6, height: 0.7, depth: 0.35, material: "mdf_branco", icon: "🗄️", basePrice: 1900 },
  { id: "cozinha_ilha", category: "Cozinhas", name: "Ilha de cozinha", kind: "island", width: 1.8, height: 0.9, depth: 0.9, material: "marmore_claro", icon: "🧊", basePrice: 4200 },
  { id: "cozinha_torre", category: "Cozinhas", name: "Torre quente", kind: "cabinet", width: 0.7, height: 2.2, depth: 0.6, material: "mdf_preto", icon: "🔥", basePrice: 3600 },

  // Armários
  { id: "armario_2p", category: "Armários", name: "Armário 2 portas", kind: "cabinet", width: 0.9, height: 2.1, depth: 0.55, material: "carvalho", icon: "🚪", basePrice: 2400 },
  { id: "armario_multiuso", category: "Armários", name: "Multiuso", kind: "cabinet", width: 1.2, height: 2.0, depth: 0.45, material: "mdf_branco", icon: "📦", basePrice: 2100 },
  { id: "armario_baixo", category: "Armários", name: "Armário baixo", kind: "counter", width: 1.2, height: 0.8, depth: 0.45, material: "cinza_fosco", icon: "🗃️", basePrice: 1500 },

  // Closets
  { id: "closet_modulo", category: "Closets", name: "Módulo de closet", kind: "wardrobe", width: 1.5, height: 2.4, depth: 0.6, material: "freijo", icon: "👔", basePrice: 4800 },
  { id: "closet_gaveteiro", category: "Closets", name: "Gaveteiro de closet", kind: "cabinet", width: 0.9, height: 1.0, depth: 0.55, material: "freijo", icon: "🧦", basePrice: 2200 },
  { id: "closet_sapateira", category: "Closets", name: "Sapateira", kind: "shelf", width: 1.0, height: 1.6, depth: 0.35, material: "madeira_clara", icon: "👟", basePrice: 1800 },

  // Painéis de TV
  { id: "tv_painel", category: "Painéis de TV", name: "Painel de TV", kind: "tvpanel", width: 2.2, height: 1.8, depth: 0.12, material: "nogueira", icon: "📺", basePrice: 2600 },
  { id: "tv_rack", category: "Painéis de TV", name: "Rack baixo", kind: "counter", width: 1.8, height: 0.5, depth: 0.45, material: "nogueira", icon: "🎬", basePrice: 1900 },

  // Balcões comerciais
  { id: "balcao_caixa", category: "Balcões comerciais", name: "Balcão de caixa", kind: "reception", width: 1.6, height: 1.1, depth: 0.7, material: "madeira_escura", icon: "💳", basePrice: 3400 },
  { id: "balcao_atendimento", category: "Balcões comerciais", name: "Balcão de atendimento", kind: "counter", width: 2.4, height: 1.05, depth: 0.6, material: "marmore_escuro", icon: "🛎️", basePrice: 3900 },

  // Gôndolas
  { id: "gondola_central", category: "Gôndolas", name: "Gôndola central", kind: "gondola", width: 1.3, height: 1.5, depth: 0.7, material: "metal_preto", icon: "🛒", basePrice: 2200 },
  { id: "gondola_parede", category: "Gôndolas", name: "Gôndola de parede", kind: "shelf", width: 1.3, height: 1.8, depth: 0.45, material: "metal_preto", icon: "🧱", basePrice: 1900 },

  // Expositores
  { id: "expositor_vitrine", category: "Expositores de loja", name: "Vitrine de vidro", kind: "display", width: 1.0, height: 1.6, depth: 0.5, material: "vidro", icon: "💎", basePrice: 3200 },
  { id: "expositor_mesa", category: "Expositores de loja", name: "Mesa expositora", kind: "table", width: 1.2, height: 0.9, depth: 0.8, material: "madeira_clara", icon: "🪟", basePrice: 2100 },

  // Prateleiras
  { id: "prateleira_simples", category: "Prateleiras", name: "Prateleira", kind: "shelf", width: 1.2, height: 0.04, depth: 0.3, material: "carvalho", icon: "📚", basePrice: 320 },
  { id: "prateleira_estante", category: "Prateleiras", name: "Estante aberta", kind: "shelf", width: 1.0, height: 2.0, depth: 0.35, material: "carvalho", icon: "🗂️", basePrice: 1700 },

  // Mesas
  { id: "mesa_jantar", category: "Mesas", name: "Mesa de jantar", kind: "table", width: 1.6, height: 0.76, depth: 0.9, material: "nogueira", icon: "🍷", basePrice: 2400 },
  { id: "mesa_centro", category: "Mesas", name: "Mesa de centro", kind: "table", width: 1.0, height: 0.4, depth: 0.6, material: "freijo", icon: "☕", basePrice: 1200 },

  // Nichos
  { id: "nicho_quadro", category: "Nichos", name: "Nicho decorativo", kind: "niche", width: 0.5, height: 0.5, depth: 0.25, material: "madeira_escura", icon: "🔲", basePrice: 420 },
  { id: "nicho_composicao", category: "Nichos", name: "Composição de nichos", kind: "niche", width: 1.4, height: 1.2, depth: 0.25, material: "madeira_escura", icon: "🪟", basePrice: 1600 },

  // Bancadas
  { id: "bancada_pedra", category: "Bancadas", name: "Bancada de pedra", kind: "bench", width: 2.0, height: 0.9, depth: 0.6, material: "marmore_claro", icon: "⬜", basePrice: 3000 },
  { id: "bancada_home", category: "Bancadas", name: "Bancada home office", kind: "bench", width: 1.6, height: 0.75, depth: 0.6, material: "madeira_clara", icon: "💻", basePrice: 2000 },

  // Recepção
  { id: "recepcao_curva", category: "Recepção", name: "Recepção curva", kind: "reception", width: 2.6, height: 1.1, depth: 0.8, material: "marmore_escuro", icon: "🏢", basePrice: 5200 },
  { id: "recepcao_logo", category: "Recepção", name: "Painel logo recepção", kind: "tvpanel", width: 2.4, height: 2.2, depth: 0.1, material: "nogueira", icon: "🔠", basePrice: 3000 },

  // Escritório
  { id: "esc_estacao", category: "Escritório", name: "Estação de trabalho", kind: "table", width: 1.4, height: 0.74, depth: 0.7, material: "cinza_fosco", icon: "🖥️", basePrice: 1800 },
  { id: "esc_armario", category: "Escritório", name: "Armário de arquivo", kind: "cabinet", width: 0.9, height: 1.3, depth: 0.45, material: "cinza_fosco", icon: "🗄️", basePrice: 1600 },

  // Shopping / Lojas grandes
  { id: "shop_quiosque", category: "Shopping / Lojas grandes", name: "Quiosque", kind: "reception", width: 3.0, height: 1.2, depth: 2.0, material: "madeira_escura", icon: "🏬", basePrice: 8800 },
  { id: "shop_ilha_expo", category: "Shopping / Lojas grandes", name: "Ilha expositora", kind: "display", width: 2.0, height: 1.0, depth: 1.2, material: "vidro", icon: "🛍️", basePrice: 5600 },
];

export const FURNITURE_BY_ID = Object.fromEntries(FURNITURE.map((f) => [f.id, f]));

export function getFurnitureDef(id: string): FurnitureDef | undefined {
  return FURNITURE_BY_ID[id];
}
