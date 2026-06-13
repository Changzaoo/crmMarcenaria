import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { useStudio } from "../store";
import { porCategoria } from "../services/furnitureService";

export default function FurnitureLibrary({ onClose }: { onClose?: () => void }) {
  const { addFurniture } = useStudio();
  const [busca, setBusca] = useState("");
  const grupos = useMemo(() => porCategoria(), []);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return grupos;
    return grupos
      .map((g) => ({ ...g, itens: g.itens.filter((i) => i.name.toLowerCase().includes(q) || g.categoria.toLowerCase().includes(q)) }))
      .filter((g) => g.itens.length > 0);
  }, [busca, grupos]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="font-display text-lg text-text">Biblioteca de móveis</h3>
        {onClose && (
          <button onClick={onClose} className="text-muted hover:text-text lg:hidden"><X size={18} /></button>
        )}
      </div>
      <div className="relative mb-3">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input className="input pl-9" placeholder="Buscar móvel ou categoria..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-4">
        {filtrados.map((g) => (
          <div key={g.categoria}>
            <div className="text-[11px] uppercase tracking-wider text-champagne/80 mb-1.5">{g.categoria}</div>
            <div className="grid grid-cols-2 gap-2">
              {g.itens.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addFurniture(item.id)}
                  title={`Adicionar ${item.name}`}
                  className="group flex items-center gap-2 rounded-lg bg-surfaceSoft border border-white/10 px-2.5 py-2 text-left hover:border-champagne/50 transition"
                >
                  <span className="text-lg shrink-0">{item.icon}</span>
                  <span className="min-w-0">
                    <span className="block text-xs font-medium text-text truncate">{item.name}</span>
                    <span className="block text-[10px] text-muted">{(item.width * 100).toFixed(0)}×{(item.depth * 100).toFixed(0)} cm</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
        {filtrados.length === 0 && <p className="text-sm text-muted text-center py-8">Nenhum móvel encontrado.</p>}
      </div>
    </div>
  );
}
