import { actions, useOrc3d } from "./useOrcamento3DStore";
import type { ViewMode } from "./types";

const MODES: { value: ViewMode; label: string; key: string }[] = [
  { value: "primeira", label: "1ª Pessoa", key: "1" },
  { value: "terceira", label: "3ª Pessoa", key: "2" },
  { value: "isometrico", label: "Isométrico", key: "3" },
  { value: "topo", label: "Vista superior", key: "4" },
];

export default function ViewModeSwitcher() {
  const mode = useOrc3d((s) => s.viewMode);
  const snap = useOrc3d((s) => s.snap);
  const gridVisible = useOrc3d((s) => s.gridVisible);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-lg border border-champagne/20 bg-[rgba(18,16,14,0.85)] p-0.5 backdrop-blur-md">
        {MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => actions.setViewMode(m.value)}
            title={`Atalho: tecla ${m.key}`}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              mode === m.value ? "bg-champagne/20 text-text" : "text-muted hover:text-text"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <button
        onClick={() => actions.setSnap({ enabled: !snap.enabled })}
        className={`rounded-lg border px-3 py-1.5 text-xs backdrop-blur-md transition ${
          snap.enabled ? "border-champagne/50 bg-champagne/15 text-text" : "border-champagne/20 text-muted"
        }`}
      >
        Snap {snap.enabled ? "on" : "off"}
      </button>
      <button
        onClick={() => actions.toggleGrid()}
        className={`rounded-lg border px-3 py-1.5 text-xs backdrop-blur-md transition ${
          gridVisible ? "border-champagne/50 bg-champagne/15 text-text" : "border-champagne/20 text-muted"
        }`}
      >
        Grade
      </button>
    </div>
  );
}
