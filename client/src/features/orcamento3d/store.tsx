import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import type { CameraMode, EnvironmentConfig, FloorVisibility, FurnitureInstance, Project3DDoc, Role, WallMode } from "./types";
import { emptyDoc } from "./types";
import { duplicar, instanciar } from "./services/furnitureService";

interface StudioContextValue {
  doc: Project3DDoc;
  role: Role;
  readOnly: boolean;
  cameraMode: CameraMode;
  selectedUid: string | null;
  selected: FurnitureInstance | null;
  // andares / paredes (estilo The Sims)
  floorCount: number;
  activeFloor: number;
  wallMode: WallMode;
  floorVisibility: FloorVisibility;
  setActiveFloor: (f: number) => void;
  setFloorCount: (n: number) => void;
  setWallMode: (m: WallMode) => void;
  cycleWallMode: () => void;
  setFloorVisibility: (v: FloorVisibility) => void;
  isFloorVisible: (floor: number) => boolean;
  setCameraMode: (m: CameraMode) => void;
  select: (uid: string | null) => void;
  setEnvironment: (env: EnvironmentConfig) => void;
  setProjectName: (nome: string) => void;
  setNotes: (notes: string) => void;
  addFurniture: (catalogId: string) => void;
  addImportedModel: (model: { name: string; url: string; format: string; size: { x: number; y: number; z: number } }) => void;
  updateFurniture: (uid: string, patch: Partial<FurnitureInstance>) => void;
  removeFurniture: (uid: string) => void;
  duplicateFurniture: (uid: string) => void;
  replaceDoc: (doc: Project3DDoc) => void;
  // notificado a cada mudança no doc (para autosave / colaboração)
  onDocChange: (fn: (doc: Project3DDoc) => void) => () => void;
}

const WALL_CYCLE: WallMode[] = ["up", "cut", "down"];

const StudioContext = createContext<StudioContextValue | null>(null);

export function useStudio(): StudioContextValue {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error("useStudio fora do StudioProvider");
  return ctx;
}

export function StudioProvider({
  initialDoc,
  role = "cliente",
  readOnly = false,
  children,
}: {
  initialDoc?: Project3DDoc;
  role?: Role;
  readOnly?: boolean;
  children: ReactNode;
}) {
  const [doc, setDoc] = useState<Project3DDoc>(initialDoc ?? emptyDoc());
  const [cameraMode, setCameraMode] = useState<CameraMode>("isometrica");
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [activeFloor, setActiveFloorState] = useState(0);
  const [wallMode, setWallMode] = useState<WallMode>("cut");
  const [floorVisibility, setFloorVisibility] = useState<FloorVisibility>("currentAndBelow");
  const listeners = useRef(new Set<(doc: Project3DDoc) => void>());

  const floorCount = Math.max(1, Math.round(doc.environment.andares || 1));

  // Mantém o andar ativo dentro do intervalo válido quando o nº de andares muda.
  useEffect(() => {
    if (activeFloor > floorCount - 1) setActiveFloorState(floorCount - 1);
  }, [floorCount, activeFloor]);

  const setActiveFloor = useCallback(
    (f: number) => setActiveFloorState(Math.max(0, Math.min(floorCount - 1, f))),
    [floorCount]
  );
  const cycleWallMode = useCallback(
    () => setWallMode((m) => WALL_CYCLE[(WALL_CYCLE.indexOf(m) + 1) % WALL_CYCLE.length]),
    []
  );
  const isFloorVisible = useCallback(
    (floor: number) => {
      if (floorVisibility === "all") return true;
      if (floorVisibility === "current") return floor === activeFloor;
      return floor <= activeFloor; // currentAndBelow
    },
    [floorVisibility, activeFloor]
  );

  // Aplica uma alteração ao doc e notifica os ouvintes (autosave/colaboração).
  const mutate = useCallback(
    (updater: (prev: Project3DDoc) => Project3DDoc) => {
      setDoc((prev) => {
        const next = updater(prev);
        listeners.current.forEach((fn) => fn(next));
        return next;
      });
    },
    []
  );

  const replaceDoc = useCallback((next: Project3DDoc) => {
    setDoc(next); // não notifica: usado para sincronização remota
  }, []);

  const onDocChange = useCallback((fn: (doc: Project3DDoc) => void) => {
    listeners.current.add(fn);
    return () => {
      listeners.current.delete(fn);
    };
  }, []);

  const setEnvironment = useCallback(
    (env: EnvironmentConfig) => mutate((p) => ({ ...p, environment: env })),
    [mutate]
  );
  // Adiciona/remove andares; remove móveis que ficariam acima do topo.
  const setFloorCount = useCallback(
    (n: number) => {
      const count = Math.max(1, Math.min(6, Math.round(n)));
      mutate((p) => ({
        ...p,
        environment: { ...p.environment, andares: count },
        furniture: p.furniture.filter((f) => (f.floor ?? 0) < count),
      }));
      setActiveFloorState((af) => Math.min(af, count - 1));
    },
    [mutate]
  );
  const setProjectName = useCallback(
    (nome: string) => mutate((p) => ({ ...p, projectName: nome })),
    [mutate]
  );
  const setNotes = useCallback((notes: string) => mutate((p) => ({ ...p, notes })), [mutate]);

  const addFurniture = useCallback(
    (catalogId: string) =>
      mutate((p) => {
        const inst = instanciar(catalogId, { x: 0, z: 0 }, activeFloor);
        if (!inst) return p;
        setSelectedUid(inst.uid);
        return { ...p, furniture: [...p.furniture, inst] };
      }),
    [mutate, activeFloor]
  );

  const addImportedModel = useCallback(
    (model: { name: string; url: string; format: string; size: { x: number; y: number; z: number } }) =>
      mutate((p) => {
        const clamp = (m: number) => Math.max(0.05, Math.round(m * 1000) / 1000);
        const uid = `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
        const name = model.name.replace(/\.[^.]+$/, "").slice(0, 40) || "Modelo importado";
        const inst: FurnitureInstance = {
          uid,
          catalogId: "modelo-importado",
          category: "Importado",
          name,
          floor: activeFloor,
          x: 0,
          z: 0,
          rotation: 0,
          width: clamp(model.size.x),
          height: clamp(model.size.y),
          depth: clamp(model.size.z),
          material: "mdf_amadeirado",
          color: "",
          locked: false,
          modelUrl: model.url,
          modelFormat: model.format,
        };
        setSelectedUid(uid);
        return { ...p, furniture: [...p.furniture, inst] };
      }),
    [mutate, activeFloor]
  );

  const updateFurniture = useCallback(
    (uid: string, patch: Partial<FurnitureInstance>) =>
      mutate((p) => ({
        ...p,
        furniture: p.furniture.map((f) => (f.uid === uid ? { ...f, ...patch } : f)),
      })),
    [mutate]
  );

  const removeFurniture = useCallback(
    (uid: string) =>
      mutate((p) => ({ ...p, furniture: p.furniture.filter((f) => f.uid !== uid) })),
    [mutate]
  );

  const duplicateFurniture = useCallback(
    (uid: string) =>
      mutate((p) => {
        const orig = p.furniture.find((f) => f.uid === uid);
        if (!orig) return p;
        const copia = duplicar(orig);
        setSelectedUid(copia.uid);
        return { ...p, furniture: [...p.furniture, copia] };
      }),
    [mutate]
  );

  const selected = useMemo(
    () => doc.furniture.find((f) => f.uid === selectedUid) ?? null,
    [doc.furniture, selectedUid]
  );

  const value: StudioContextValue = {
    doc,
    role,
    readOnly,
    cameraMode,
    selectedUid,
    selected,
    floorCount,
    activeFloor,
    wallMode,
    floorVisibility,
    setActiveFloor,
    setFloorCount,
    setWallMode,
    cycleWallMode,
    setFloorVisibility,
    isFloorVisible,
    setCameraMode,
    select: setSelectedUid,
    setEnvironment,
    setProjectName,
    setNotes,
    addFurniture,
    addImportedModel,
    updateFurniture,
    removeFurniture,
    duplicateFurniture,
    replaceDoc,
    onDocChange,
  };

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}
