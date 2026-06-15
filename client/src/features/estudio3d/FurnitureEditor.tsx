import { Btn, Field, NumberInput, Segmented, Slider, Toggle } from "./studioUi";
import { actions, useOrc3d, useSelectedFurniture } from "./useOrcamento3DStore";
import { CATALOG_MAP } from "./furnitureCatalog";
import { MATERIALS } from "./materials";
import { priceOf, brl } from "./pricingEngine";

export default function FurnitureEditor() {
  const f = useSelectedFurniture();
  const floorCount = useOrc3d((s) => Math.max(1, Math.round(s.doc.environment.floors || 1)));

  if (!f) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted">
        Selecione um móvel na cena para editar dimensões, material e posição.
      </div>
    );
  }

  const item = CATALOG_MAP[f.itemId];
  const allowed = item?.materials ?? MATERIALS.map((m) => m.id);
  const u = (patch: Partial<typeof f>) => actions.updateFurniture(f.uid, patch);
  const cfg = (patch: Partial<typeof f.config>) => actions.updateConfig(f.uid, patch);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex items-center justify-between border-b border-champagne/10 px-4 py-2.5">
        <input
          value={f.name}
          onChange={(e) => u({ name: e.target.value.slice(0, 40) })}
          className="w-full bg-transparent text-sm font-semibold text-text outline-none"
        />
        <span className="ml-2 whitespace-nowrap text-xs text-champagne">{brl(priceOf(f))}</span>
      </div>

      <div className="space-y-4 p-4">
        {/* dimensões */}
        <div className="grid grid-cols-3 gap-2">
          <Field label="Larg (cm)">
            <NumberInput value={f.width} min={item?.minWidth} max={item?.maxWidth} onChange={(v) => u({ width: v })} />
          </Field>
          <Field label="Alt (cm)">
            <NumberInput value={f.height} min={item?.minHeight} max={item?.maxHeight} onChange={(v) => u({ height: v })} />
          </Field>
          <Field label="Prof (cm)">
            <NumberInput value={f.depth} min={item?.minDepth} max={item?.maxDepth} onChange={(v) => u({ depth: v })} />
          </Field>
        </div>

        {/* posição + rotação */}
        <div className="grid grid-cols-3 gap-2">
          <Field label="Pos X (m)">
            <NumberInput value={+f.position[0].toFixed(2)} step={0.1} onChange={(v) => u({ position: [v, f.position[1], f.position[2]] })} />
          </Field>
          <Field label="Altura (m)">
            <NumberInput value={+f.position[1].toFixed(2)} step={0.05} min={0} onChange={(v) => u({ position: [f.position[0], v, f.position[2]] })} />
          </Field>
          <Field label="Pos Z (m)">
            <NumberInput value={+f.position[2].toFixed(2)} step={0.1} onChange={(v) => u({ position: [f.position[0], f.position[1], v] })} />
          </Field>
        </div>

        <Field label={`Rotação (${Math.round((f.rotationY * 180) / Math.PI)}°)`}>
          <Slider value={f.rotationY} min={-Math.PI} max={Math.PI} step={Math.PI / 24} onChange={(v) => u({ rotationY: v })} />
        </Field>

        <Field label="Andar">
          <select
            value={f.floor ?? 0}
            onChange={(e) => u({ floor: Number(e.target.value) })}
            className="w-full rounded-lg border border-champagne/20 bg-surface/60 px-3 py-2 text-sm text-text outline-none focus:border-champagne/50"
          >
            {Array.from({ length: floorCount }).map((_, floor) => (
              <option key={floor} value={floor}>
                {floor === 0 ? "Térreo" : `${floor + 1}º andar`}
              </option>
            ))}
          </select>
        </Field>

        {/* material */}
        <Field label="Material">
          <div className="grid grid-cols-5 gap-1.5">
            {MATERIALS.filter((m) => allowed.includes(m.id)).map((m) => (
              <button
                key={m.id}
                title={m.label}
                onClick={() => cfg({ material: m.id })}
                className={`h-8 rounded-md border transition ${f.config.material === m.id ? "border-champagne ring-1 ring-champagne" : "border-white/10"}`}
                style={{ background: m.color }}
              />
            ))}
          </div>
          <p className="mt-1 text-[11px] text-muted">{MATERIALS.find((m) => m.id === f.config.material)?.label}</p>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Acabamento">
            <Segmented
              options={[
                { value: "fosco", label: "Fosco" },
                { value: "acetinado", label: "Aceti." },
                { value: "brilho", label: "Brilho" },
                { value: "natural", label: "Nat." },
              ]}
              value={f.config.finish}
              onChange={(v) => cfg({ finish: v })}
            />
          </Field>
          <Field label="Superfície">
            <Segmented
              options={[
                { value: "madeira", label: "Madeira" },
                { value: "vidro", label: "Vidro" },
                { value: "metal", label: "Metal" },
              ]}
              value={f.config.surface}
              onChange={(v) => cfg({ surface: v })}
            />
          </Field>
        </div>

        <Field label="Puxador">
          <Segmented
            options={[
              { value: "perfil", label: "Perfil" },
              { value: "puxador-metal", label: "Metal" },
              { value: "cava", label: "Cava" },
              { value: "sem", label: "Sem" },
            ]}
            value={f.config.handle}
            onChange={(v) => cfg({ handle: v })}
          />
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Portas">
            <NumberInput value={f.config.doors} min={0} max={6} onChange={(v) => cfg({ doors: Math.round(v) })} />
          </Field>
          <Field label="Gavetas">
            <NumberInput value={f.config.drawers} min={0} max={8} onChange={(v) => cfg({ drawers: Math.round(v) })} />
          </Field>
        </div>

        <Field label={`Espessura da madeira (${f.config.thickness.toFixed(1)} cm)`}>
          <Slider value={f.config.thickness} min={1.2} max={4} step={0.2} onChange={(v) => cfg({ thickness: v })} />
        </Field>

        <div className="grid grid-cols-1 gap-2">
          <Toggle label="Iluminação LED" checked={f.config.led} onChange={(v) => cfg({ led: v })} />
          <Toggle
            label="Suspenso (não apoiado no chão)"
            checked={f.config.suspended}
            onChange={(v) => {
              const baseY = v ? (item?.mountHeight ?? 150) / 100 : 0;
              actions.updateFurniture(f.uid, { position: [f.position[0], baseY, f.position[2]] });
              cfg({ suspended: v });
            }}
          />
        </div>

        {/* observação por móvel */}
        <Field label="Observação deste móvel">
          <textarea
            value={f.note ?? ""}
            onChange={(e) => actions.setNote(f.uid, e.target.value)}
            placeholder="Ex.: quero este balcão com LED quente."
            className="h-16 w-full resize-none rounded-lg border border-champagne/20 bg-surface/60 px-3 py-2 text-sm text-text outline-none focus:border-champagne/50"
          />
        </Field>

        {/* ações do móvel */}
        <div className="grid grid-cols-2 gap-2">
          <Btn size="sm" onClick={() => actions.duplicate(f.uid)}>Duplicar</Btn>
          <Btn size="sm" onClick={() => actions.toggleLock(f.uid)} active={f.locked}>
            {f.locked ? "Destravar" : "Travar"}
          </Btn>
          <Btn size="sm" onClick={() => actions.alignToWall(f.uid)}>Alinhar à parede</Btn>
          <Btn size="sm" onClick={() => actions.snapToCorner(f.uid)}>Encaixar no canto</Btn>
          <Btn size="sm" onClick={() => actions.center(f.uid)}>Centralizar</Btn>
          <Btn size="sm" variant="danger" onClick={() => actions.remove(f.uid)}>Excluir</Btn>
        </div>
      </div>
    </div>
  );
}
