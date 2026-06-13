import { Copy, Lock, LockOpen, RotateCw, Trash2, Ruler, Layers } from "lucide-react";
import { useStudio } from "../store";
import { MATERIALS } from "../materials";

function DimSlider({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex justify-between text-[11px] text-muted mb-1">
        <span>{label}</span>
        <span className="text-champagne">{(value * 100).toFixed(0)} cm</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-champagne"
      />
    </div>
  );
}

export default function FurniturePropertiesPanel() {
  const { selected, updateFurniture, removeFurniture, duplicateFurniture, select, floorCount } = useStudio();

  if (!selected) {
    return (
      <div className="text-center text-sm text-muted py-8 px-3">
        <Ruler className="mx-auto mb-2 text-champagne/60" size={22} />
        Selecione um móvel no ambiente para editar tamanho, material e acabamento.
      </div>
    );
  }

  const s = selected;
  const up = (patch: Parameters<typeof updateFurniture>[1]) => updateFurniture(s.uid, patch);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-text">{s.name}</div>
          <div className="text-[11px] text-muted">{s.category}</div>
        </div>
        <button
          onClick={() => up({ locked: !s.locked })}
          className={`p-2 rounded-lg border ${s.locked ? "bg-red-500/15 border-red-500/40 text-red-300" : "bg-surfaceSoft border-white/10 text-muted hover:text-text"}`}
          title={s.locked ? "Destravar" : "Travar posição"}
        >
          {s.locked ? <Lock size={15} /> : <LockOpen size={15} />}
        </button>
      </div>

      <div className="space-y-3">
        <DimSlider label="Largura" value={s.width} min={0.2} max={4} onChange={(v) => up({ width: +v.toFixed(2) })} />
        <DimSlider label="Altura" value={s.height} min={0.04} max={2.8} onChange={(v) => up({ height: +v.toFixed(2) })} />
        <DimSlider label="Profundidade" value={s.depth} min={0.15} max={1.5} onChange={(v) => up({ depth: +v.toFixed(2) })} />
      </div>

      <div>
        <div className="text-[11px] text-muted mb-1.5">Material / acabamento</div>
        <div className="grid grid-cols-4 gap-1.5">
          {MATERIALS.map((m) => (
            <button
              key={m.id}
              onClick={() => up({ material: m.id, color: "" })}
              title={m.nome}
              className={`aspect-square rounded-md border-2 transition ${s.material === m.id ? "border-champagne scale-105" : "border-white/10 hover:border-white/30"}`}
              style={{ background: m.color }}
            />
          ))}
        </div>
        <div className="text-[11px] text-champagne mt-1.5">{MATERIALS.find((m) => m.id === s.material)?.nome}</div>
      </div>

      {floorCount > 1 && (
        <div>
          <div className="text-[11px] text-muted mb-1.5 flex items-center gap-1"><Layers size={12} /> Andar</div>
          <select
            className="input text-xs py-1.5"
            value={s.floor ?? 0}
            onChange={(e) => up({ floor: Number(e.target.value) })}
          >
            {Array.from({ length: floorCount }).map((_, i) => (
              <option key={i} value={i}>{i === 0 ? "Térreo" : `${i + 1}º andar`}</option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => up({ rotation: s.rotation + Math.PI / 8 })} className="btn-ghost py-2 text-xs"><RotateCw size={14} /> Girar</button>
        <button onClick={() => duplicateFurniture(s.uid)} className="btn-ghost py-2 text-xs"><Copy size={14} /> Duplicar</button>
        <button onClick={() => { removeFurniture(s.uid); select(null); }} className="btn-danger py-2 text-xs"><Trash2 size={14} /> Remover</button>
      </div>
    </div>
  );
}
