import { useMemo, useRef, useState } from "react";
import { Search, X, Upload } from "lucide-react";
import { useStudio } from "../store";
import { porCategoria } from "../services/furnitureService";
import { ACCEPTED_3D, importModelFile } from "../modelImport";
import { useUI } from "../../../components/ui";

export default function FurnitureLibrary({ onClose }: { onClose?: () => void }) {
  const { addFurniture, addImportedModel } = useStudio();
  const { toast } = useUI();
  const [busca, setBusca] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [importando, setImportando] = useState(false);
  const grupos = useMemo(() => porCategoria(), []);

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportando(true);
    try {
      const m = await importModelFile(file);
      addImportedModel({ name: m.name, url: m.dataUrl, format: m.format, size: m.size });
      toast(
        m.tooBig
          ? "Modelo importado. Atenção: arquivo grande pode não sincronizar."
          : "Modelo 3D importado e adicionado à cena."
      );
    } catch (err: any) {
      toast(err?.message || "Não foi possível importar este modelo.", "err");
    } finally {
      setImportando(false);
    }
  };

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

      <input ref={fileRef} type="file" accept={ACCEPTED_3D} className="hidden" onChange={onImport} />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={importando}
        className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-champagne/40 bg-champagne/5 px-3 py-2 text-xs font-medium text-champagne transition hover:bg-champagne/10 disabled:opacity-60"
        title="Importar modelo .glb, .gltf, .obj, .stl ou .fbx"
      >
        <Upload size={14} /> {importando ? "Importando…" : "Importar modelo 3D"}
      </button>

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
