import { useEffect, useRef } from "react";
import { fpInput } from "./fpInput";
import { useOrc3d } from "./useOrcamento3DStore";
import type { Orientation } from "../../lib/useDeviceInfo";

/* Controles touch para 1ª/3ª pessoa no mobile — adaptados a retrato e
   paisagem: joystick de movimento (esq.), área de olhar (1ª pessoa, dir.)
   Tamanhos e posições mudam conforme a orientação. */
export default function MobileControls({ orientation }: { orientation: Orientation }) {
  const mode = useOrc3d((s) => s.viewMode);
  const knobRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLDivElement>(null);
  const joyId = useRef<number | null>(null);
  const lookId = useRef<number | null>(null);
  const lookLast = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (mode !== "primeira" && mode !== "terceira") {
      fpInput.forward = 0;
      fpInput.strafe = 0;
    }
  }, [mode]);

  if (mode !== "primeira" && mode !== "terceira") return null;

  const land = orientation === "landscape";
  const joy = land ? 92 : 116; // diâmetro do joystick
  const knob = joy * 0.42;
  const travel = joy * 0.32;

  const onJoyMove = (clientX: number, clientY: number) => {
    const base = baseRef.current;
    if (!base) return;
    const r = base.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = (clientX - cx) / (r.width / 2);
    let dy = (clientY - cy) / (r.height / 2);
    const mag = Math.hypot(dx, dy) || 1;
    if (mag > 1) {
      dx /= mag;
      dy /= mag;
    }
    fpInput.strafe = dx;
    fpInput.forward = -dy;
    if (knobRef.current) knobRef.current.style.transform = `translate(${dx * travel}px, ${dy * travel}px)`;
  };

  const resetJoy = () => {
    fpInput.forward = 0;
    fpInput.strafe = 0;
    if (knobRef.current) knobRef.current.style.transform = "translate(0,0)";
  };

  // posições por orientação (acima da fileira de FABs no canto inferior)
  const joyPos = land ? "bottom-16 left-4" : "bottom-28 left-5";

  return (
    <div className="pointer-events-none fixed inset-0 z-30 select-none">
      {/* joystick de movimento */}
      <div
        ref={baseRef}
        style={{ width: joy, height: joy }}
        className={`pointer-events-auto absolute ${joyPos} touch-none rounded-full border border-champagne/30 bg-[rgba(18,16,14,0.55)] backdrop-blur-sm`}
        onPointerDown={(e) => {
          joyId.current = e.pointerId;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          onJoyMove(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => joyId.current === e.pointerId && onJoyMove(e.clientX, e.clientY)}
        onPointerUp={() => { joyId.current = null; resetJoy(); }}
        onPointerCancel={() => { joyId.current = null; resetJoy(); }}
      >
        <div
          ref={knobRef}
          style={{ width: knob, height: knob }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-champagne/40"
        />
      </div>

      {/* área de olhar (somente 1ª pessoa), recuada para não cobrir os FABs */}
      {mode === "primeira" && (
        <div
          className="pointer-events-auto absolute right-0 top-16 bottom-16 w-1/2 touch-none"
          onPointerDown={(e) => { lookId.current = e.pointerId; lookLast.current = { x: e.clientX, y: e.clientY }; }}
          onPointerMove={(e) => {
            if (lookId.current !== e.pointerId || !lookLast.current) return;
            fpInput.lookDX += e.clientX - lookLast.current.x;
            fpInput.lookDY += e.clientY - lookLast.current.y;
            lookLast.current = { x: e.clientX, y: e.clientY };
          }}
          onPointerUp={() => { lookId.current = null; lookLast.current = null; }}
          onPointerCancel={() => { lookId.current = null; lookLast.current = null; }}
        />
      )}

      {/* dica para iso/topo não aparece aqui (só modos a pé) */}
    </div>
  );
}
