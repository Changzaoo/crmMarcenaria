// Tipos compartilhados do Estúdio de Orçamento 3D.

import type { FurnitureKind } from "./furnitureCatalog";

export type CameraMode = "primeira" | "terceira" | "isometrica" | "topo";

export type Role = "cliente" | "arquiteto";

// Estilo The Sims: paredes altas, rebaixadas (cutaway) ou totalmente ocultas.
export type WallMode = "up" | "cut" | "down";

// Visibilidade de andares: só o ativo, o ativo + abaixo (padrão), ou todos.
export type FloorVisibility = "current" | "currentAndBelow" | "all";

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

export interface EnvironmentConfig {
  largura: number; // metros (eixo X)
  comprimento: number; // metros (eixo Z)
  peDireito: number; // altura (m)
  tipo: string;
  formato: "retangular" | "quadrado" | "L";
  andares: number;
  portas: number;
  janelas: number;
}

export interface FurnitureInstance {
  uid: string; // instância única no projeto
  catalogId: string; // referência ao catálogo
  kind?: FurnitureKind; // forma 3D persistida na instância (autodescritiva)
  category: string;
  name: string;
  floor: number; // andar (0 = térreo)
  x: number; // posição no piso (m), centro do ambiente = 0
  z: number;
  rotation: number; // radianos (Y)
  width: number; // m
  height: number; // m
  depth: number; // m
  material: string; // id do material
  color: string; // hex do acabamento
  locked: boolean;
  /** modelo 3D importado (data URL) — quando presente, renderiza o arquivo
      do cliente no lugar da geometria gerada. */
  modelUrl?: string;
  modelFormat?: string; // glb | gltf | obj | stl | fbx
}

export interface Project3DDoc {
  environment: EnvironmentConfig;
  furniture: FurnitureInstance[];
  notes: string;
  projectName: string;
}

export interface Peer {
  peerId: string;
  role: Role;
  nome: string;
  x: number;
  z: number;
  ry: number;
  floor?: number;
  moving?: boolean;
  color?: string | null;
  online: boolean;
}

export interface SessionState {
  rev: number;
  docRev: number;
  doc: Project3DDoc | null;
  peers: Peer[];
  arquitetoOnline: boolean;
  clienteOnline: boolean;
}

export const DEFAULT_ENVIRONMENT: EnvironmentConfig = {
  largura: 6,
  comprimento: 5,
  peDireito: 2.7,
  tipo: "Cozinha planejada",
  formato: "retangular",
  andares: 1,
  portas: 1,
  janelas: 1,
};

export function emptyDoc(): Project3DDoc {
  return {
    environment: { ...DEFAULT_ENVIRONMENT },
    furniture: [],
    notes: "",
    projectName: "Meu Projeto 3D",
  };
}
