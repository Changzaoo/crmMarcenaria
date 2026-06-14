import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

interface Props {
  /** Vetor normalizado: x ∈ [-1,1] (direita+), y ∈ [-1,1] (cima+). */
  onChange: (x: number, y: number) => void;
  size?: number; // diâmetro da base (px)
  label?: string;
}

const clamp = (v: number) => Math.max(-1, Math.min(1, v));

// Joystick virtual analógico (toque/mouse). Usado nos modos a pé do Estúdio 3D.
export default function VirtualJoystick({ onChange, size = 112, label }: Props) {
  const baseRef = useRef<HTMLDivElement>(null);
  const active = useRef(false);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const handle = (clientX: number, clientY: number) => {
    const el = baseRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const max = r.width / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > max) {
      dx = (dx / dist) * max;
      dy = (dy / dist) * max;
    }
    setKnob({ x: dx, y: dy });
    onChange(clamp(dx / max), clamp(-dy / max)); // y invertido: para cima = +1
  };

  const start = (e: ReactPointerEvent) => {
    active.current = true;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    handle(e.clientX, e.clientY);
  };
  const move = (e: ReactPointerEvent) => {
    if (active.current) handle(e.clientX, e.clientY);
  };
  const end = () => {
    if (!active.current) return;
    active.current = false;
    setKnob({ x: 0, y: 0 });
    onChange(0, 0);
  };

  const knobSize = Math.round(size * 0.42);

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <div
        ref={baseRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
        className="relative rounded-full bg-black/45 border border-white/15 backdrop-blur grid place-items-center"
        style={{ width: size, height: size, touchAction: "none" }}
      >
        <div
          className="rounded-full bg-champagne/85 border border-white/40 shadow-glow pointer-events-none"
          style={{ width: knobSize, height: knobSize, transform: `translate(${knob.x}px, ${knob.y}px)` }}
        />
      </div>
      {label && <span className="text-[10px] uppercase tracking-wider text-muted">{label}</span>}
    </div>
  );
}
