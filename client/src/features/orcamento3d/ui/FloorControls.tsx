import { Layers, Plus, Minus, PanelTop, Square, SquareDashed, Eye, Layers2, ChevronUp, ChevronDown } from "lucide-react";
import { useStudio } from "../store";
import type { FloorVisibility, WallMode } from "../types";

const WALL_META: Record<WallMode, { label: string; icon: typeof Square }> = {
  up: { label: "Paredes altas", icon: Square },
  cut: { label: "Paredes rebaixadas", icon: PanelTop },
  down: { label: "Sem paredes", icon: SquareDashed },
};

const VIS_META: Record<FloorVisibility, { label: string; icon: typeof Eye }> = {
  current: { label: "Só este andar", icon: Square },
  currentAndBelow: { label: "Este e abaixo", icon: Layers2 },
  all: { label: "Todos os andares", icon: Eye },
};

const VIS_CYCLE: FloorVisibility[] = ["currentAndBelow", "current", "all"];

// Controles estilo The Sims: andar ativo, adicionar/remover andar,
// modo das paredes (altas/rebaixadas/invisíveis) e visibilidade de andares.
export default function FloorControls({ readOnly }: { readOnly?: boolean }) {
  const {
    floorCount,
    activeFloor,
    setActiveFloor,
    setFloorCount,
    wallMode,
    cycleWallMode,
    floorVisibility,
    setFloorVisibility,
  } = useStudio();

  const Wall = WALL_META[wallMode].icon;
  const Vis = VIS_META[floorVisibility].icon;

  const nextVis = () => {
    const i = VIS_CYCLE.indexOf(floorVisibility);
    setFloorVisibility(VIS_CYCLE[(i + 1) % VIS_CYCLE.length]);
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-black/55 border border-white/10 p-2 backdrop-blur w-[3.1rem]">
      {/* Pilha de andares (topo → térreo) */}
      <div className="flex flex-col items-center gap-1">
        {!readOnly && (
          <button
            onClick={() => setFloorCount(floorCount + 1)}
            disabled={floorCount >= 6}
            title="Adicionar andar"
            className="w-9 h-7 grid place-items-center rounded-md text-muted hover:text-champagne hover:bg-white/5 disabled:opacity-30"
          >
            <Plus size={15} />
          </button>
        )}
        {Array.from({ length: floorCount })
          .map((_, i) => floorCount - 1 - i) // de cima para baixo
          .map((f) => (
            <button
              key={f}
              onClick={() => setActiveFloor(f)}
              title={f === 0 ? "Térreo" : `${f + 1}º andar`}
              className={`w-9 h-8 grid place-items-center rounded-md text-sm font-semibold transition ${
                f === activeFloor ? "bg-champagne text-background" : "text-muted hover:text-text hover:bg-white/5"
              }`}
            >
              {f + 1}
            </button>
          ))}
        {!readOnly && floorCount > 1 && (
          <button
            onClick={() => setFloorCount(floorCount - 1)}
            title="Remover andar do topo"
            className="w-9 h-7 grid place-items-center rounded-md text-muted hover:text-red-300 hover:bg-white/5"
          >
            <Minus size={15} />
          </button>
        )}
      </div>

      <div className="border-t border-white/10" />

      {/* Navegação rápida */}
      <div className="flex flex-col items-center gap-1">
        <button onClick={() => setActiveFloor(activeFloor + 1)} disabled={activeFloor >= floorCount - 1} title="Subir andar" className="w-9 h-7 grid place-items-center rounded-md text-muted hover:text-text hover:bg-white/5 disabled:opacity-25">
          <ChevronUp size={16} />
        </button>
        <button onClick={() => setActiveFloor(activeFloor - 1)} disabled={activeFloor <= 0} title="Descer andar" className="w-9 h-7 grid place-items-center rounded-md text-muted hover:text-text hover:bg-white/5 disabled:opacity-25">
          <ChevronDown size={16} />
        </button>
      </div>

      <div className="border-t border-white/10" />

      {/* Paredes */}
      <button
        onClick={cycleWallMode}
        title={WALL_META[wallMode].label}
        className="w-9 h-9 grid place-items-center rounded-md text-champagne hover:bg-white/5"
      >
        <Wall size={17} />
      </button>

      {/* Visibilidade de andares */}
      <button
        onClick={nextVis}
        title={VIS_META[floorVisibility].label}
        className="w-9 h-9 grid place-items-center rounded-md text-champagne hover:bg-white/5"
      >
        <Vis size={17} />
      </button>

      <div className="flex items-center justify-center text-[9px] text-muted">
        <Layers size={10} />
      </div>
    </div>
  );
}
