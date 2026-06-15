import { actions, useOrc3d } from "./useOrcamento3DStore";
import type { FloorVisibility, WallMode } from "./types";

const WALL_LABEL: Record<WallMode, string> = {
  up: "Paredes altas",
  cut: "Paredes baixas",
  down: "Sem paredes",
};

const VIS_LABEL: Record<FloorVisibility, string> = {
  currentAndBelow: "Este e abaixo",
  current: "Só este",
  all: "Todos",
};

const VIS_CYCLE: FloorVisibility[] = ["currentAndBelow", "current", "all"];

export default function FloorControls() {
  const env = useOrc3d((s) => s.doc.environment);
  const activeFloor = useOrc3d((s) => s.activeFloor);
  const wallMode = useOrc3d((s) => s.wallMode);
  const floorVisibility = useOrc3d((s) => s.floorVisibility);
  const floors = Math.max(1, Math.round(env.floors || 1));

  const cycleVisibility = () => {
    const idx = VIS_CYCLE.indexOf(floorVisibility);
    actions.setFloorVisibility(VIS_CYCLE[(idx + 1) % VIS_CYCLE.length]);
  };

  return (
    <div className="flex w-36 flex-col gap-2 rounded-xl border border-champagne/15 bg-[rgba(12,10,8,0.78)] p-2 text-xs text-text shadow-card backdrop-blur-md sm:w-40">
      <div className="flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={() => actions.setFloorCount(floors + 1)}
          disabled={floors >= 6}
          title="Adicionar andar"
          className="grid h-8 w-8 place-items-center rounded-lg border border-champagne/15 text-champagne transition hover:bg-champagne/10 disabled:opacity-30"
        >
          +
        </button>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wide text-muted">Andar</p>
          <p className="font-semibold text-champagne">{activeFloor === 0 ? "Térreo" : `${activeFloor + 1}º`}</p>
        </div>
        <button
          type="button"
          onClick={() => actions.setFloorCount(floors - 1)}
          disabled={floors <= 1}
          title="Remover andar superior"
          className="grid h-8 w-8 place-items-center rounded-lg border border-champagne/15 text-champagne transition hover:bg-champagne/10 disabled:opacity-30"
        >
          -
        </button>
      </div>

      <div className="flex flex-col-reverse gap-1">
        {Array.from({ length: floors }).map((_, floor) => (
          <button
            key={floor}
            type="button"
            onClick={() => actions.setActiveFloor(floor)}
            className={`rounded-lg border px-2 py-1.5 text-left transition ${
              floor === activeFloor
                ? "border-champagne/60 bg-champagne/15 text-text"
                : "border-champagne/10 text-muted hover:border-champagne/30 hover:text-text"
            }`}
          >
            {floor === 0 ? "Térreo" : `${floor + 1}º andar`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-1">
        <button
          type="button"
          onClick={() => actions.setActiveFloor(activeFloor + 1)}
          disabled={activeFloor >= floors - 1}
          className="rounded-lg border border-champagne/15 px-2 py-1.5 text-muted transition hover:text-text disabled:opacity-30"
        >
          Subir
        </button>
        <button
          type="button"
          onClick={() => actions.setActiveFloor(activeFloor - 1)}
          disabled={activeFloor <= 0}
          className="rounded-lg border border-champagne/15 px-2 py-1.5 text-muted transition hover:text-text disabled:opacity-30"
        >
          Descer
        </button>
      </div>

      <button
        type="button"
        onClick={() => actions.cycleWallMode()}
        className="rounded-lg border border-champagne/15 px-2 py-1.5 text-left text-champagne transition hover:bg-champagne/10"
      >
        {WALL_LABEL[wallMode]}
      </button>
      <button
        type="button"
        onClick={cycleVisibility}
        className="rounded-lg border border-champagne/15 px-2 py-1.5 text-left text-champagne transition hover:bg-champagne/10"
      >
        {VIS_LABEL[floorVisibility]}
      </button>
    </div>
  );
}
