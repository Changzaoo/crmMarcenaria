import { Eye, User, Box, Grid3x3 } from "lucide-react";
import { useStudio } from "../store";
import type { CameraMode } from "../types";

const MODES: { id: CameraMode; label: string; icon: typeof Eye }[] = [
  { id: "primeira", label: "1ª pessoa", icon: Eye },
  { id: "terceira", label: "3ª pessoa", icon: User },
  { id: "isometrica", label: "Isométrica", icon: Box },
  { id: "topo", label: "Vista superior", icon: Grid3x3 },
];

export default function CameraModeSelector() {
  const { cameraMode, setCameraMode } = useStudio();
  return (
    <div className="flex items-center gap-1 rounded-xl bg-black/40 border border-white/10 p-1 backdrop-blur">
      {MODES.map((m) => {
        const Icon = m.icon;
        const active = cameraMode === m.id;
        return (
          <button
            key={m.id}
            onClick={() => setCameraMode(m.id)}
            title={m.label}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
              active ? "bg-champagne text-background" : "text-muted hover:text-text hover:bg-white/5"
            }`}
          >
            <Icon size={15} />
            <span className="hidden sm:inline">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
