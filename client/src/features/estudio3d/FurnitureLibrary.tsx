import { useMemo, useRef, useState } from "react";
import { FURNITURE_CATALOG, CATEGORY_LABELS } from "./furnitureCatalog";
import { actions } from "./useOrcamento3DStore";
import { brl } from "./pricingEngine";
import FurniturePreview from "./FurniturePreview";
import ThumbnailFactory from "./ThumbnailFactory";
import { ACCEPTED_3D, importModelFile } from "./modelImport";
import { toast } from "./toast";
import type { FurnitureCategory } from "./types";

const COMPLEXITY_DOT: Record<string, string> = {
  simples: "bg-emerald-400/70",
  medio: "bg-amber-400/70",
  alto: "bg-rose-400/70",
};

/* Ícone curto por categoria — dá leitura rápida nos chips. */
const CATEGORY_ICON: Record<FurnitureCategory | "todos", string> = {
  todos: "▦",
  balcao: "▬",
  prateleira: "▭",
  estante: "▤",
  gondola: "≣",
  mesa: "◎",
  armario: "▥",
  painel: "▦",
  nicho: "⊞",
  ilha: "▢",
  bancada: "▭",
  checkout: "▤",
  vitrine: "◇",
  closet: "▥",
  gaveteiro: "☰",
  aereo: "▬",
};

export default function FurnitureLibrary() {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<FurnitureCategory | "todos">("todos");
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite reimportar o mesmo arquivo
    if (!file) return;
    setImporting(true);
    try {
      const m = await importModelFile(file);
      actions.addImportedModel({ name: m.name, url: m.dataUrl, format: m.format, size: m.size });
      toast(
        m.tooBig
          ? "Modelo importado. Atenção: arquivo grande pode não sincronizar com o arquiteto."
          : "Modelo 3D importado e adicionado à cena.",
        m.tooBig ? "warn" : "success"
      );
    } catch (err: any) {
      toast(err?.message || "Não foi possível importar este modelo.", "warn");
    } finally {
      setImporting(false);
    }
  };

  const cats = useMemo(() => {
    const set = new Set(FURNITURE_CATALOG.map((f) => f.category));
    return Array.from(set);
  }, []);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FURNITURE_CATALOG.filter(
      (f) => (cat === "todos" || f.category === cat) && (!q || f.name.toLowerCase().includes(q))
    );
  }, [query, cat]);

  const chip = (key: FurnitureCategory | "todos", label: string) => {
    const active = cat === key;
    return (
      <button
        key={key}
        onClick={() => setCat(key)}
        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
          active
            ? "border-champagne/60 bg-champagne/20 text-text shadow-[0_0_0_1px_rgba(216,185,120,0.25)]"
            : "border-champagne/15 bg-surface/40 text-muted hover:border-champagne/35 hover:text-text"
        }`}
      >
        <span className={`text-[12px] leading-none ${active ? "text-champagne" : "text-champagne/60"}`}>
          {CATEGORY_ICON[key]}
        </span>
        {label}
      </button>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar móvel…"
          className="w-full rounded-lg border border-champagne/20 bg-surface/60 px-3 py-2 text-sm text-text outline-none placeholder:text-muted/60 focus:border-champagne/50"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {chip("todos", "Todos")}
          {cats.map((c) => chip(c, CATEGORY_LABELS[c]))}
        </div>

        <input ref={fileRef} type="file" accept={ACCEPTED_3D} className="hidden" onChange={onImport} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={importing}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-champagne/40 bg-champagne/5 px-3 py-2 text-xs font-medium text-champagne transition hover:bg-champagne/10 disabled:opacity-60"
          title="Importar modelo .glb, .gltf, .obj, .stl ou .fbx"
        >
          {importing ? "Importando…" : "⬆ Importar modelo 3D"}
        </button>
        <p className="mt-1 text-center text-[10px] text-muted">glb · gltf · obj · stl · fbx</p>
      </div>

      {/* cards do catálogo — cada thumbnail é uma "foto" PNG do modelo 3D real,
          gerada uma única vez pelo ThumbnailFactory (abaixo). */}
      <div className="grid flex-1 grid-cols-2 content-start gap-2 overflow-y-auto px-3 pb-3">
        {items.map((it) => (
          <button
            key={it.id}
            onClick={() => actions.addFurniture(it)}
            className="group rounded-lg border border-champagne/15 bg-surface/40 p-2.5 text-left transition hover:border-champagne/45 hover:bg-champagne/5"
          >
            <div className="mb-2 h-20 overflow-hidden rounded-md bg-gradient-to-b from-[#241d15] to-[#0f0d0b] ring-1 ring-inset ring-champagne/10">
              <FurniturePreview category={it.category} id={it.id} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${COMPLEXITY_DOT[it.complexity]}`} />
              <p className="truncate text-xs font-medium text-text">{it.name}</p>
            </div>
            <p className="mt-0.5 text-[10px] text-muted">
              {it.defaultWidth}×{it.defaultHeight}×{it.defaultDepth} · a partir de {brl(it.basePrice)}
            </p>
          </button>
        ))}
      </div>

      <ThumbnailFactory />
    </div>
  );
}
