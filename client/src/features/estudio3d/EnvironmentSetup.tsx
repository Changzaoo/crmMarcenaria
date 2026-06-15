import { useState } from "react";
import { motion } from "framer-motion";
import { Btn, Field, NumberInput, Panel, Segmented, Toggle } from "./studioUi";
import {
  ENV_TEMPLATES,
  applyTemplate,
  defaultEnvironment,
  STYLE_LABELS,
  STYLE_PALETTE,
  ENV_LIMITS,
} from "./environmentTemplates";
import type { EnvironmentConfig, EnvironmentStyle } from "./types";

const clamp = (v: number, [lo, hi]: [number, number]) => Math.max(lo, Math.min(hi, Math.round(v)));

const FLOOR_OPTS: { value: EnvironmentConfig["floorType"]; label: string }[] = [
  { value: "porcelanato", label: "Porcelanato" },
  { value: "madeira", label: "Madeira" },
  { value: "claro", label: "Claro" },
  { value: "escuro", label: "Escuro" },
  { value: "cimento", label: "Cimento" },
];

interface Props {
  onCreate: (env: EnvironmentConfig, assisted: boolean) => void;
  onCancel: () => void;
}

export default function EnvironmentSetup({ onCreate, onCancel }: Props) {
  const [env, setEnv] = useState<EnvironmentConfig>(defaultEnvironment());
  const [assisted, setAssisted] = useState(false);
  const patch = (p: Partial<EnvironmentConfig>) => setEnv((e) => ({ ...e, ...p }));

  const styles = Object.keys(STYLE_LABELS) as EnvironmentStyle[];

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-background/80 px-4 py-8 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl"
      >
        <div className="mb-6 text-center">
          <p className="text-[11px] uppercase tracking-widest2 text-champagne/80">Estúdio 3D de Orçamento</p>
          <h1 className="mt-1 font-display text-3xl italic text-text">Crie seu ambiente</h1>
          <p className="mt-2 text-sm text-muted">
            Transforme sua ideia em um ambiente planejado antes mesmo do primeiro corte.
          </p>
        </div>

        {/* entrar sozinho x com arquiteto */}
        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setAssisted(false)}
            className={`rounded-xl border p-4 text-left transition ${
              !assisted ? "border-champagne/60 bg-champagne/10" : "border-champagne/15 hover:border-champagne/30"
            }`}
          >
            <p className="text-sm font-semibold text-text">Entrar sozinho</p>
            <p className="mt-1 text-xs text-muted">Monte o projeto no seu ritmo.</p>
          </button>
          <button
            type="button"
            onClick={() => setAssisted(true)}
            className={`rounded-xl border p-4 text-left transition ${
              assisted ? "border-champagne/60 bg-champagne/10" : "border-champagne/15 hover:border-champagne/30"
            }`}
          >
            <p className="text-sm font-semibold text-text">Entrar com arquiteto assistente</p>
            <p className="mt-1 text-xs text-muted">Um especialista acompanha seu projeto.</p>
          </button>
        </div>

        {/* modelos prontos */}
        <Panel title="Modelos prontos" className="mb-5">
          <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 lg:grid-cols-5">
            {ENV_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setEnv(t.id === "personalizado" ? { ...env, type: "personalizado", typeLabel: t.label } : applyTemplate(t))}
                className={`rounded-lg border p-3 text-left transition ${
                  env.type === t.id ? "border-champagne/60 bg-champagne/10" : "border-champagne/15 hover:border-champagne/35"
                }`}
              >
                <p className="text-xs font-semibold text-text">{t.label}</p>
                <p className="mt-1 text-[10px] leading-tight text-muted">{t.description}</p>
              </button>
            ))}
          </div>
        </Panel>

        {/* configuração manual */}
        <Panel title="Configuração manual" className="mb-5">
          <div className="grid gap-4 p-4 sm:grid-cols-3">
            <Field label="Largura (cm)">
              <NumberInput value={env.width} min={ENV_LIMITS.width[0]} max={ENV_LIMITS.width[1]} step={10}
                onChange={(v) => patch({ width: clamp(v, ENV_LIMITS.width) })} suffix="cm" />
            </Field>
            <Field label="Profundidade (cm)">
              <NumberInput value={env.depth} min={ENV_LIMITS.depth[0]} max={ENV_LIMITS.depth[1]} step={10}
                onChange={(v) => patch({ depth: clamp(v, ENV_LIMITS.depth) })} suffix="cm" />
            </Field>
            <Field label="Pé-direito (cm)">
              <NumberInput value={env.height} min={ENV_LIMITS.height[0]} max={ENV_LIMITS.height[1]} step={5}
                onChange={(v) => patch({ height: clamp(v, ENV_LIMITS.height) })} suffix="cm" />
            </Field>
            <Field label="Andares">
              <NumberInput value={env.floors} min={1} max={6} onChange={(v) => patch({ floors: clamp(v, ENV_LIMITS.floors) })} />
            </Field>
            <Field label="Piso">
              <Segmented options={FLOOR_OPTS} value={env.floorType} onChange={(v) => patch({ floorType: v })} />
            </Field>
            <Field label="Cor das paredes">
              <input type="color" value={env.wallColor} onChange={(e) => patch({ wallColor: e.target.value })}
                className="h-9 w-full cursor-pointer rounded-lg border border-champagne/20 bg-surface" />
            </Field>
          </div>

          <div className="grid gap-2 px-4 pb-2 sm:grid-cols-2 lg:grid-cols-3">
            <Toggle label="Mezanino" checked={env.hasMezzanine} onChange={(v) => patch({ hasMezzanine: v })} />
            <Toggle label="Escada" checked={env.hasStairs} onChange={(v) => patch({ hasStairs: v })} />
            <Toggle label="Vitrine / frente de loja" checked={env.hasStorefront} onChange={(v) => patch({ hasStorefront: v })} />
            <Toggle label="Balcão de atendimento" checked={env.hasCounter} onChange={(v) => patch({ hasCounter: v })} />
            <Toggle label="Área de estoque" checked={env.hasStockroom} onChange={(v) => patch({ hasStockroom: v })} />
            <Toggle label="Portas" checked={env.hasDoors} onChange={(v) => patch({ hasDoors: v })} />
            <Toggle label="Janelas" checked={env.hasWindows} onChange={(v) => patch({ hasWindows: v })} />
          </div>

          <div className="px-4 pb-4">
            <Field label="Estilo desejado">
              <div className="flex flex-wrap gap-2">
                {styles.map((s) => (
                  <button key={s} type="button"
                    onClick={() => patch({ style: s, wallColor: STYLE_PALETTE[s].wall, floorType: STYLE_PALETTE[s].floor })}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                      env.style === s ? "border-champagne/60 bg-champagne/15 text-text" : "border-champagne/20 text-muted hover:text-text"
                    }`}>
                    {STYLE_LABELS[s]}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </Panel>

        <div className="flex items-center justify-between">
          <Btn variant="ghost" onClick={onCancel}>Voltar ao site</Btn>
          <Btn variant="primary" size="md" onClick={() => onCreate(env, assisted)}>
            Criar ambiente 3D →
          </Btn>
        </div>
      </motion.div>
    </div>
  );
}
