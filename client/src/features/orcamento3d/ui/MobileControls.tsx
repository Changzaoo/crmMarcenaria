import { useEffect } from "react";
import { Sofa, SlidersHorizontal, Hand } from "lucide-react";
import type { CameraMode } from "../types";
import type { Orientation } from "../../../lib/useDeviceInfo";
import VirtualJoystick from "./VirtualJoystick";
import { virtualInput, resetVirtualInput } from "../scene/virtualInput";

interface Props {
  mode: CameraMode;
  orientation: Orientation;
  readOnly?: boolean;
  onToggleLib: () => void;
  onToggleProps: () => void;
}

// Controles de toque do Estúdio 3D, adaptados a retrato e paisagem.
// - 1ª/3ª pessoa: joystick de movimento (esq.) e, na 1ª pessoa, joystick de olhar (dir.).
// - Isométrica/Vista superior: a navegação é por toque direto (1 dedo gira, pinça dá zoom,
//   toque-e-arraste move o móvel), então mostramos só uma dica.
export default function MobileControls({ mode, orientation, readOnly, onToggleLib, onToggleProps }: Props) {
  const walk = mode === "primeira" || mode === "terceira";
  const land = orientation === "landscape";

  // Zera o estado dos joysticks ao trocar de modo (evita "andar sozinho").
  useEffect(() => {
    resetVirtualInput();
    return () => resetVirtualInput();
  }, [mode]);

  const joySize = land ? 96 : 116;
  const bottom = land ? "bottom-3" : "bottom-6";
  const inset = land ? "left-6 right-6" : "left-4 right-4";

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {/* Atalhos de painéis — borda direita, no meio (não conflita com joysticks) */}
      <div className="pointer-events-auto absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2">
        {!readOnly && (
          <button onClick={onToggleLib} title="Móveis" className="btn-primary rounded-full w-12 h-12 p-0 shadow-glow">
            <Sofa size={18} />
          </button>
        )}
        <button onClick={onToggleProps} title="Propriedades" className="rounded-full w-12 h-12 p-0 grid place-items-center bg-black/45 border border-white/15 backdrop-blur text-text">
          <SlidersHorizontal size={18} />
        </button>
      </div>

      {/* Joysticks (modos a pé) */}
      {walk && (
        <div className={`pointer-events-auto absolute ${inset} ${bottom} flex items-end justify-between`}>
          <VirtualJoystick
            size={joySize}
            label="Mover"
            onChange={(x, y) => {
              virtualInput.move.x = x;
              virtualInput.move.y = y;
            }}
          />
          {mode === "primeira" ? (
            <VirtualJoystick
              size={joySize}
              label="Olhar"
              onChange={(x, y) => {
                virtualInput.look.x = x;
                virtualInput.look.y = y;
              }}
            />
          ) : (
            <span />
          )}
        </div>
      )}

      {/* Dica para iso/topo */}
      {!walk && (
        <div className={`pointer-events-none absolute left-1/2 -translate-x-1/2 ${bottom} px-3 py-1.5 rounded-full bg-black/55 backdrop-blur text-[11px] text-muted flex items-center gap-1.5 whitespace-nowrap`}>
          <Hand size={13} /> Arraste p/ girar · pinça p/ zoom · toque num móvel p/ mover
        </div>
      )}
    </div>
  );
}
