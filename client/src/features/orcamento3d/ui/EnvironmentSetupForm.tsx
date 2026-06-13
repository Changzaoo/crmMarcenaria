import { useState } from "react";
import { motion } from "framer-motion";
import type { EnvironmentConfig } from "../types";
import { DEFAULT_ENVIRONMENT } from "../types";

const TIPOS = ["Cozinha planejada", "Loja", "Quiosque", "Escritório", "Dormitório", "Sala", "Banheiro", "Recepção", "Comercial completo", "Outro"];
const FORMATOS: { id: EnvironmentConfig["formato"]; label: string }[] = [
  { id: "retangular", label: "Retangular" },
  { id: "quadrado", label: "Quadrado" },
  { id: "L", label: "Formato em L" },
];

export default function EnvironmentSetupForm({
  initial,
  onConfirm,
}: {
  initial?: EnvironmentConfig;
  onConfirm: (env: EnvironmentConfig) => void;
}) {
  const [env, setEnv] = useState<EnvironmentConfig>(initial ?? DEFAULT_ENVIRONMENT);
  const num = (k: keyof EnvironmentConfig, v: string) =>
    setEnv((e) => ({ ...e, [k]: Math.max(0, Number(v) || 0) }));

  return (
    <div className="absolute inset-0 z-30 bg-background/92 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 sm:p-8 w-full max-w-xl my-6"
      >
        <div className="text-[10px] uppercase tracking-[0.3em] text-champagne mb-1">Passo 1 · Defina o ambiente</div>
        <h2 className="font-display text-2xl text-text mb-5">Vamos criar o seu espaço</h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Largura (m)</label>
            <input className="input" type="number" step="0.1" value={env.largura} onChange={(e) => num("largura", e.target.value)} />
          </div>
          <div>
            <label className="label">Comprimento (m)</label>
            <input className="input" type="number" step="0.1" value={env.comprimento} onChange={(e) => num("comprimento", e.target.value)} />
          </div>
          <div>
            <label className="label">Pé-direito (m)</label>
            <input className="input" type="number" step="0.1" value={env.peDireito} onChange={(e) => num("peDireito", e.target.value)} />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="label">Andares</label>
            <input className="input" type="number" min={1} value={env.andares} onChange={(e) => num("andares", e.target.value)} />
          </div>
          <div>
            <label className="label">Portas</label>
            <input className="input" type="number" min={0} value={env.portas} onChange={(e) => num("portas", e.target.value)} />
          </div>
          <div>
            <label className="label">Janelas</label>
            <input className="input" type="number" min={0} value={env.janelas} onChange={(e) => num("janelas", e.target.value)} />
          </div>
          <div className="col-span-2 sm:col-span-3">
            <label className="label">Tipo de ambiente</label>
            <select className="input" value={env.tipo} onChange={(e) => setEnv((s) => ({ ...s, tipo: e.target.value }))}>
              {TIPOS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="label">Formato</label>
          <div className="grid grid-cols-3 gap-2">
            {FORMATOS.map((f) => (
              <button
                key={f.id}
                onClick={() => setEnv((s) => ({ ...s, formato: f.id }))}
                className={`rounded-lg px-3 py-2 text-sm border transition ${
                  env.formato === f.id ? "bg-champagne text-background border-champagne" : "bg-surfaceSoft text-muted border-white/10 hover:border-champagne/40"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={() => onConfirm(env)} className="btn-primary w-full mt-6 py-3">
          Gerar ambiente 3D →
        </button>
        <p className="text-center text-[11px] text-muted mt-2">Você pode ajustar as medidas depois.</p>
      </motion.div>
    </div>
  );
}
