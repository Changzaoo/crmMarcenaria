import { useState } from "react";
import { motion } from "framer-motion";
import { Btn, Field } from "./studioUi";
import type { LeadForm } from "./types";

const TIPOS = [
  "Loja",
  "Quiosque",
  "Escritório",
  "Cozinha planejada",
  "Dormitório",
  "Sala",
  "Banheiro",
  "Projeto comercial completo",
  "Outro",
];

const PRAZOS = ["Urgente", "Até 30 dias", "1 a 3 meses", "Apenas pesquisando"];

const FAIXAS = [
  "Até R$ 5.000",
  "R$ 5.000 a R$ 15.000",
  "R$ 15.000 a R$ 50.000",
  "Acima de R$ 50.000",
  "Ainda não sei",
];

const EMPTY: LeadForm = {
  nome: "",
  email: "",
  whatsapp: "",
  cidade_estado: "",
  tipo_projeto: "Cozinha planejada",
  prazo: "1 a 3 meses",
  faixa_orcamento: "Ainda não sei",
  descricao: "",
  aceite: false,
};

const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const validPhone = (v: string) => /\d{8,}/.test(v.replace(/\D/g, ""));

export default function LeadCaptureModal({
  onSubmit,
  onCancel,
}: {
  onSubmit: (form: LeadForm) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<LeadForm>(EMPTY);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof LeadForm, value: string | boolean) =>
    setForm((cur) => ({ ...cur, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!form.nome.trim()) return setError("Informe seu nome completo.");
    if (!validEmail(form.email)) return setError("Informe um e-mail válido.");
    if (!validPhone(form.whatsapp)) return setError("Informe um WhatsApp válido.");
    if (!form.cidade_estado.trim()) return setError("Informe sua cidade e estado.");
    if (!form.aceite) return setError("É necessário aceitar o contato da equipe.");
    setError("");
    setSubmitting(true);
    try {
      await onSubmit(form);
    } catch (e: any) {
      setError(e?.message || "Nao foi possivel registrar seu projeto agora.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-background/90 px-4 py-8 backdrop-blur-sm">
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-2xl rounded-2xl border border-champagne/20 bg-surface p-5 shadow-card sm:p-7"
      >
        <div className="mb-6 text-center">
          <p className="text-[11px] uppercase tracking-widest2 text-champagne/80">Estúdio de Orçamento 3D</p>
          <h2 className="mt-2 font-display text-2xl italic text-text sm:text-3xl">
            Antes de montar seu ambiente em 3D, conte um pouco sobre o seu projeto.
          </h2>
          <p className="mt-2 text-sm text-muted">
            Assim a equipe consegue acompanhar seu ambiente e preparar uma proposta personalizada.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome completo">
            <input
              value={form.nome}
              onChange={(e) => set("nome", e.target.value)}
              className="w-full rounded-lg border border-champagne/20 bg-surface/60 px-3 py-2 text-sm text-text outline-none focus:border-champagne/50"
            />
          </Field>
          <Field label="WhatsApp">
            <input
              value={form.whatsapp}
              inputMode="tel"
              onChange={(e) => set("whatsapp", e.target.value)}
              className="w-full rounded-lg border border-champagne/20 bg-surface/60 px-3 py-2 text-sm text-text outline-none focus:border-champagne/50"
            />
          </Field>
          <Field label="E-mail">
            <input
              value={form.email}
              inputMode="email"
              type="email"
              onChange={(e) => set("email", e.target.value)}
              className="w-full rounded-lg border border-champagne/20 bg-surface/60 px-3 py-2 text-sm text-text outline-none focus:border-champagne/50"
            />
          </Field>
          <Field label="Cidade / Estado">
            <input
              value={form.cidade_estado}
              onChange={(e) => set("cidade_estado", e.target.value)}
              className="w-full rounded-lg border border-champagne/20 bg-surface/60 px-3 py-2 text-sm text-text outline-none focus:border-champagne/50"
            />
          </Field>
          <Field label="Tipo de projeto">
            <select
              value={form.tipo_projeto}
              onChange={(e) => set("tipo_projeto", e.target.value)}
              className="w-full rounded-lg border border-champagne/20 bg-surface/60 px-3 py-2 text-sm text-text outline-none focus:border-champagne/50"
            >
              {TIPOS.map((tipo) => (
                <option key={tipo}>{tipo}</option>
              ))}
            </select>
          </Field>
          <Field label="Prazo desejado">
            <select
              value={form.prazo}
              onChange={(e) => set("prazo", e.target.value)}
              className="w-full rounded-lg border border-champagne/20 bg-surface/60 px-3 py-2 text-sm text-text outline-none focus:border-champagne/50"
            >
              {PRAZOS.map((prazo) => (
                <option key={prazo}>{prazo}</option>
              ))}
            </select>
          </Field>
          <Field label="Faixa de orçamento estimada">
            <select
              value={form.faixa_orcamento}
              onChange={(e) => set("faixa_orcamento", e.target.value)}
              className="w-full rounded-lg border border-champagne/20 bg-surface/60 px-3 py-2 text-sm text-text outline-none focus:border-champagne/50"
            >
              {FAIXAS.map((faixa) => (
                <option key={faixa}>{faixa}</option>
              ))}
            </select>
          </Field>
          <Field label="Descreva rapidamente o que você deseja criar">
            <textarea
              value={form.descricao}
              onChange={(e) => set("descricao", e.target.value)}
              className="h-24 w-full resize-none rounded-lg border border-champagne/20 bg-surface/60 px-3 py-2 text-sm text-text outline-none focus:border-champagne/50"
            />
          </Field>
        </div>

        <label className="mt-4 flex cursor-pointer items-start gap-2 rounded-lg border border-champagne/10 bg-surfaceSoft/40 p-3 text-sm text-muted">
          <input
            type="checkbox"
            checked={form.aceite}
            onChange={(e) => set("aceite", e.target.checked)}
            className="mt-1 accent-champagne"
          />
          <span>Aceito ser contatado pela equipe para receber uma proposta personalizada.</span>
        </label>

        {error && <p className="mt-3 text-sm text-amber-300">{error}</p>}

        <div className="mt-6 flex items-center justify-between gap-3">
          <Btn variant="ghost" onClick={onCancel} disabled={submitting}>Voltar ao site</Btn>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-lg bg-champagne/90 px-3.5 py-2 text-sm font-medium text-background transition hover:bg-champagne disabled:cursor-wait disabled:opacity-60"
          >
            {submitting ? "Registrando..." : "Montar meu ambiente em 3D"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
