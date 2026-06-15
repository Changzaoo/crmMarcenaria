/* ============================================================
   Orçamento 3D — tipos compartilhados
   Toda a feature (editor, store, pricing, CRM bridge) fala
   nestes tipos. Medidas SEMPRE em centímetros.
   ============================================================ */

export type Complexity = "simples" | "medio" | "alto";

export type FurnitureCategory =
  | "balcao"
  | "prateleira"
  | "estante"
  | "gondola"
  | "mesa"
  | "armario"
  | "painel"
  | "nicho"
  | "ilha"
  | "bancada"
  | "checkout"
  | "vitrine"
  | "closet"
  | "gaveteiro"
  | "aereo";

/** Modelo de catálogo (template de fábrica). */
export interface FurnitureItem {
  id: string;
  name: string;
  category: FurnitureCategory;
  /** dimensões padrão em cm */
  defaultWidth: number;
  defaultHeight: number;
  defaultDepth: number;
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  minDepth: number;
  maxDepth: number;
  basePrice: number;
  complexity: Complexity;
  materials: string[];
  /** apoiado no chão (false = aéreo/suspenso por padrão) */
  grounded: boolean;
  /** altura de fixação na parede (cm) quando suspenso */
  mountHeight?: number;
  /** sugestões de features ativas por padrão */
  defaults?: Partial<FurnitureConfig>;
}

/** Configuração editável de um móvel instanciado. */
export interface FurnitureConfig {
  material: string;
  finish: "fosco" | "acetinado" | "brilho" | "natural";
  handle: "perfil" | "puxador-metal" | "cava" | "sem";
  doors: number;
  drawers: number;
  thickness: number; // espessura visual da madeira (cm)
  led: boolean;
  suspended: boolean;
  surface: "madeira" | "vidro" | "metal";
  /** modelo 3D importado (data URL) — quando presente, renderiza o arquivo
      do cliente no lugar da geometria gerada. */
  modelUrl?: string;
  modelFormat?: string; // glb | gltf | obj | stl | fbx
  modelName?: string;
}

/** Um móvel posicionado no ambiente. */
export interface PlacedFurniture {
  uid: string; // instância única
  itemId: string; // referência ao catálogo
  name: string;
  category: FurnitureCategory;
  /** andar do móvel: térreo = 0 */
  floor: number;
  width: number;
  height: number;
  depth: number;
  position: [number, number, number]; // metros, centro da base
  rotationY: number; // radianos
  locked: boolean;
  config: FurnitureConfig;
  note?: string;
  basePrice: number;
  complexity: Complexity;
}

export type EnvironmentStyle =
  | "moderno"
  | "luxo"
  | "minimalista"
  | "industrial"
  | "madeira-natural"
  | "corporativo"
  | "retail-premium";

export interface EnvironmentConfig {
  type: string; // id do template ou "personalizado"
  typeLabel: string;
  width: number; // cm
  depth: number; // cm
  height: number; // pé-direito cm
  floors: number;
  hasMezzanine: boolean;
  hasStairs: boolean;
  hasStorefront: boolean;
  hasCounter: boolean;
  hasStockroom: boolean;
  hasDoors: boolean;
  hasWindows: boolean;
  floorType: "porcelanato" | "madeira" | "cimento" | "claro" | "escuro";
  wallColor: string;
  style: EnvironmentStyle;
  /** posição (metros) do centro da escada quando há andares — permite movê-la.
      Indefinido = posição padrão (encostada na parede direita, ao fundo). */
  stairsX?: number;
  stairsZ?: number;
}

export interface ClientInfo {
  name: string;
  phone: string;
  email: string;
  city: string;
  notes: string;
  projectType?: string;
  desiredDeadline?: string;
  budgetRange?: string;
  contactConsent?: boolean;
  source?: string;
  capturedAt?: string;
}

export interface LeadForm {
  nome: string;
  email: string;
  whatsapp: string;
  cidade_estado: string;
  tipo_projeto: string;
  prazo: string;
  faixa_orcamento: string;
  descricao: string;
  aceite: boolean;
}

export interface Estimate {
  min: number;
  max: number;
  complexity: Complexity;
  deadlineDays: [number, number];
}

export type ProjectStatus =
  | "novo-lead-3d"
  | "rascunho"
  | "aguardando-arquiteto"
  | "em-atendimento"
  | "projeto-em-edicao"
  | "orcamento-solicitado"
  | "projeto-3d-enviado-analise"
  | "orcamento-enviado"
  | "em-negociacao"
  | "fechado"
  | "perdido"
  | "arquivado";

export type LeadScore = "frio" | "morno" | "quente" | "projeto-grande";

export interface Project3D {
  id: string;
  name: string;
  client: ClientInfo;
  environment: EnvironmentConfig;
  furniture: PlacedFurniture[];
  estimate: Estimate;
  leadScore: LeadScore;
  status: ProjectStatus;
  thumbnail?: string; // dataURL
  assistedByArchitect: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ArchitectStatus = "disponivel" | "ocupado" | "ausente";

export interface Architect {
  id: string;
  name: string;
  status: ArchitectStatus;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  author: "cliente" | "arquiteto";
  authorName: string;
  text: string;
  at: string;
}

export type WallMode = "up" | "cut" | "down";
export type FloorVisibility = "current" | "currentAndBelow" | "all";

/** Atendimento 3D = lead persistido no CRM. */
export interface Attendance {
  id: string;
  project: Project3D;
  status: ProjectStatus;
  architectId?: string;
  architectName?: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistResult {
  label: string;
  ok: boolean;
}

export type ViewMode = "primeira" | "terceira" | "isometrico" | "topo";
