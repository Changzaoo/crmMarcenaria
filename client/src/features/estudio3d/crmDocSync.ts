/* ============================================================
   crmDocSync — tradução do documento 3D no schema CANÔNICO
   compartilhado com o CRM (D:\crmMarcenaria → Project3DDoc).

   `toCrmProjectDoc` (em crmPublicApi.ts) converte o doc do site →
   schema do CRM. Aqui fica o caminho inverso: `fromCrmProjectDoc`
   aplica um doc vindo do CRM (arquiteto) de volta no Doc do site,
   preservando os campos que o CRM não conhece (preço base,
   complexidade, config detalhada, eixo Y, observações).

   Convenções de unidade:
   - Ambiente CRM em METROS  → site em CENTÍMETROS (×100).
   - Móvel CRM width/height/depth em METROS → site em CENTÍMETROS.
   - Posição x/z em METROS nos dois lados (sem conversão).
   ============================================================ */
import type { Doc } from "./useOrcamento3DStore";
import type { EnvironmentConfig, FurnitureConfig, FurnitureCategory, PlacedFurniture } from "./types";
import { CATALOG_MAP, defaultConfigFor } from "./furnitureCatalog";
import type { CrmProjectDoc } from "./crmPublicApi";

const toCm = (meters: number, fallback: number): number =>
  Number.isFinite(meters) && meters > 0 ? Math.round(meters * 100) : fallback;

function fallbackConfig(material: string): FurnitureConfig {
  return {
    material: material || "mdf_amadeirado",
    finish: "fosco",
    handle: "perfil",
    doors: 0,
    drawers: 0,
    thickness: 1.8,
    led: false,
    suspended: false,
    surface: "madeira",
  };
}

/** Aplica um doc no schema do CRM sobre o Doc atual do site (merge por uid). */
export function fromCrmProjectDoc(crm: CrmProjectDoc, current: Doc): Doc {
  const env: EnvironmentConfig = {
    ...current.environment,
    width: toCm(crm.environment?.largura, current.environment.width),
    depth: toCm(crm.environment?.comprimento, current.environment.depth),
    height: toCm(crm.environment?.peDireito, current.environment.height),
    floors: Math.max(1, Math.round(crm.environment?.andares || current.environment.floors || 1)),
  };

  const prevByUid = new Map(current.furniture.map((f) => [f.uid, f]));

  const furniture: PlacedFurniture[] = (crm.furniture || []).map((cf) => {
    const prev = prevByUid.get(cf.uid);
    const cat = CATALOG_MAP[cf.catalogId];

    const baseConfig: FurnitureConfig = prev
      ? { ...prev.config, material: cf.material || prev.config.material }
      : cat
        ? { ...defaultConfigFor(cat), material: cf.material || defaultConfigFor(cat).material }
        : fallbackConfig(cf.material);

    // preserva/recebe modelo 3D importado que tenha vindo pela ponte
    const anyCf = cf as { modelUrl?: string; modelFormat?: string };
    const config: FurnitureConfig = anyCf.modelUrl
      ? { ...baseConfig, modelUrl: anyCf.modelUrl, modelFormat: anyCf.modelFormat }
      : baseConfig;

    // Y (altura da base): preserva o do site; para móvel novo do arquiteto usa
    // a montagem do catálogo (aéreo/suspenso) ou o chão.
    const y = prev
      ? prev.position[1]
      : cat && !cat.grounded
        ? (cat.mountHeight ?? 150) / 100
        : 0;

    return {
      uid: cf.uid,
      itemId: cf.catalogId,
      name: cf.name || prev?.name || cat?.name || "Móvel",
      category: ((cf.category as FurnitureCategory) || prev?.category || cat?.category || "armario"),
      floor: cf.floor ?? prev?.floor ?? 0,
      width: toCm(cf.width, prev?.width ?? cat?.defaultWidth ?? 100),
      height: toCm(cf.height, prev?.height ?? cat?.defaultHeight ?? 90),
      depth: toCm(cf.depth, prev?.depth ?? cat?.defaultDepth ?? 50),
      position: [Number(cf.x) || 0, y, Number(cf.z) || 0],
      rotationY: Number(cf.rotation) || 0,
      locked: !!cf.locked,
      config,
      note: prev?.note,
      basePrice: prev?.basePrice ?? cat?.basePrice ?? 0,
      complexity: prev?.complexity ?? cat?.complexity ?? "medio",
    };
  });

  return {
    ...current,
    name: crm.projectName || current.name,
    environment: env,
    furniture,
  };
}
