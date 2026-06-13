import { useState } from "react";
import { motion } from "framer-motion";
import type { LeadForm } from "../types";

const TIPOS = [
  "Loja", "Quiosque", "Escritório", "Cozinha planejada", "Dormitório",
  "Sala", "Banheiro", "Projeto comercial completo", "Outro",
];
const PRAZOS = ["Urgente", "Até 30 dias", "1 a 3 meses", "Apenas pesquisando"];
const FAIXAS = [
  "Até R$ 5.000", "R$ 5.000 a R$ 15.000", "R$ 15.000 a R$ 50.000",
  "Acima de R$ 50.000", "Ainda não sei",
];

const vazio: LeadForm = {
  nome: "", email: "", whatsapp: "", cidade_estado: "",
  tipo_projeto: "Cozinha planejada", prazo: "1 a 3 meses",
  faixa_orcamento: "Ainda não sei", descricao: "", aceite: false,
};

export default function LeadCaptureModal({
  onSubmit,
  enviando,
}: {
  onSubmit: (form: LeadForm) => void;
  enviando: boolean;
}) {
  const [form, setForm] = useState<LeadForm>(vazio);
  const [erro, setErro] = useState("");

  const set = (k: keyof LeadForm, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.email.trim() || !form.whatsapp.trim()) {
      return setErro("Preencha nome, e-mail e WhatsApp.");
    }
    if (!form.aceite) return setErro("É necessário aceitar o contato da equipe.");
    setErro("");
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto">
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="card p-6 sm:p-8 w-full max-w-2xl my-6"
      >
        <div className="text-center mb-6">
          <div className="text-[10px] uppercase tracking-[0.3em] text-champagne mb-2">Estúdio de Orçamento 3D · LINEAR</div>
          <h2 className="font-display text-2xl sm:text-3xl text-text">
            Antes de montar seu ambiente em 3D, conte um pouco sobre o seu projeto.
          </h2>
          <p className="text-muted text-sm mt-2">Leva menos de 1 minuto. Nossa equipe usa isso para te atender melhor.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Nome completo *</label>
            <input className="input" value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Seu nome" />
          </div>
          <div>
            <label className="label">E-mail *</label>
            <input className="input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="voce@email.com" />
          </div>
          <div>
            <label className="label">WhatsApp *</label>
            <input className="input" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="(11) 90000-0000" />
          </div>
          <div>
            <label className="label">Cidade / Estado</label>
            <input className="input" value={form.cidade_estado} onChange={(e) => set("cidade_estado", e.target.value)} placeholder="São Paulo — SP" />
          </div>
          <div>
            <label className="label">Tipo de projeto</label>
            <select className="input" value={form.tipo_projeto} onChange={(e) => set("tipo_projeto", e.target.value)}>
              {TIPOS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Prazo desejado</label>
            <select className="input" value={form.prazo} onChange={(e) => set("prazo", e.target.value)}>
              {PRAZOS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Faixa de orçamento estimada</label>
            <select className="input" value={form.faixa_orcamento} onChange={(e) => set("faixa_orcamento", e.target.value)}>
              {FAIXAS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Descreva rapidamente o que você deseja criar</label>
            <textarea className="input" rows={3} value={form.descricao} onChange={(e) => set("descricao", e.target.value)} placeholder="Ex.: cozinha em L com ilha, bancada de pedra e torre de fornos..." />
          </div>
        </div>

        <label className="flex items-start gap-2 mt-4 text-sm text-muted cursor-pointer">
          <input type="checkbox" checked={form.aceite} onChange={(e) => set("aceite", e.target.checked)} className="mt-1 accent-champagne" />
          <span>Aceito ser contatado pela equipe para receber uma proposta personalizada.</span>
        </label>

        {erro && <p className="text-red-300 text-sm mt-3">{erro}</p>}

        <button type="submit" disabled={enviando} className="btn-primary w-full mt-6 py-3 text-base">
          {enviando ? "Abrindo estúdio..." : "Montar meu ambiente em 3D →"}
        </button>
      </motion.form>
    </div>
  );
}
