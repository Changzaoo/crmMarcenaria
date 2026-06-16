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

      {/* Área da planta — largura × profundidade (m), ajustável ao vivo.
          Também dá pra arrastar as alças douradas das paredes na cena. */}
      <div className="rounded-lg border border-champagne/15 px-2 py-1.5">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wide text-muted">Área</span>
          <span className="font-semibold text-champagne">
            {(env.width / 100).toFixed(1)}×{(env.depth / 100).toFixed(1)}m
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1">
          <label className="flex flex-col text-[9px] uppercase tracking-wide text-muted">
            Larg.
            <input
              type="number"
              min={1.5}
              max={30}
              step={0.5}
              value={+(env.width / 100).toFixed(1)}
              onChange={(e) => actions.resizeRoom(Number(e.target.value) * 100, env.depth, true)}
              className="mt-0.5 w-full rounded bg-black/30 px-1 py-1 text-xs text-text outline-none focus:ring-1 focus:ring-champagne/50"
            />
          </label>
          <label className="flex flex-col text-[9px] uppercase tracking-wide text-muted">
            Prof.
            <input
              type="number"
              min={1.5}
              max={30}
              step={0.5}
              value={+(env.depth / 100).toFixed(1)}
              onChange={(e) => actions.resizeRoom(env.width, Number(e.target.value) * 100, true)}
              className="mt-0.5 w-full rounded bg-black/30 px-1 py-1 text-xs text-text outline-none focus:ring-1 focus:ring-champagne/50"
            />
          </label>
        </div>
      </div>

      {/* Altura das paredes (pé-direito) — ajustável ao vivo */}
      <div className="rounded-lg border border-champagne/15 px-2 py-1.5">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wide text-muted">Altura</span>
          <span className="font-semibold text-champagne">{(env.height / 100).toFixed(2)}m</span>
        </div>
        <input
          type="range"
          min={220}
          max={800}
          step={10}
          value={env.height}
          onChange={(e) => actions.setWallHeight(Number(e.target.value))}
          className="w-full accent-champagne"
        />
      </div>
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
