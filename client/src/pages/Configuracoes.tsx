import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { Configuracoes as Cfg, TemplateWhatsapp } from "../types";
import { PageHeader, Card, Field, Input, Textarea, useUI, Spinner } from "../components/ui";

export default function Configuracoes() {
  const { toast, confirm } = useUI();
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [templates, setTemplates] = useState<TemplateWhatsapp[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const carregarTpl = () => api.get<TemplateWhatsapp[]>("/config/templates").then(setTemplates);
  useEffect(() => { api.get<Cfg>("/config").then(setCfg); carregarTpl(); }, []);

  const salvar = async () => { await api.put("/config", cfg); toast("Configurações salvas."); };

  const salvarTpl = async (t: TemplateWhatsapp) => { await api.put(`/config/templates/${t.id}`, t); toast("Template salvo."); };
  const novoTpl = async () => { await api.post("/config/templates", { nome: "Novo template", mensagem: "Olá {contato}, …" }); carregarTpl(); };
  const delTpl = async (id: number) => { if (await confirm("Excluir template?")) { await api.del(`/config/templates/${id}`); carregarTpl(); } };

  const exportar = async () => {
    const dump = await api.get<any>("/config/backup");
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `linear-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url); toast("Backup exportado.");
  };
  const importar = async (file: File) => {
    if (!(await confirm("Importar substituirá TODOS os dados atuais. Continuar?"))) return;
    try {
      const dump = JSON.parse(await file.text());
      await api.post("/config/restore", dump);
      toast("Backup restaurado. Recarregando…");
      setTimeout(() => window.location.reload(), 1000);
    } catch (e: any) { toast("Falha: " + e.message, "err"); }
  };

  if (!cfg) return <Spinner />;
  const num = (k: keyof Cfg) => (e: any) => setCfg({ ...cfg, [k]: Number(e.target.value) });
  const txt = (k: keyof Cfg) => (e: any) => setCfg({ ...cfg, [k]: e.target.value });

  return (
    <div>
      <PageHeader title="Configurações" subtitle="Padrões, dados da empresa, templates e backup"
        actions={<button data-tour="page-action" className="btn-primary" onClick={salvar}>Salvar alterações</button>} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <h3 className="font-semibold mb-4">Padrões de orçamento</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Margem padrão (%)"><Input type="number" value={cfg.margem_padrao} onChange={num("margem_padrao")} /></Field>
            <Field label="Impostos padrão (%)"><Input type="number" value={cfg.impostos_padrao} onChange={num("impostos_padrao")} /></Field>
            <Field label="Perda padrão (%)"><Input type="number" value={cfg.perda_padrao} onChange={num("perda_padrao")} /></Field>
            <Field label="Garantia padrão (meses)"><Input type="number" value={cfg.garantia_meses_padrao} onChange={num("garantia_meses_padrao")} /></Field>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold mb-4">Dados da empresa (para o PDF)</h3>
          <div className="space-y-3">
            <Field label="Nome"><Input value={cfg.empresa_nome || ""} onChange={txt("empresa_nome")} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="CNPJ"><Input value={cfg.empresa_cnpj || ""} onChange={txt("empresa_cnpj")} /></Field>
              <Field label="Telefone"><Input value={cfg.empresa_telefone || ""} onChange={txt("empresa_telefone")} /></Field>
            </div>
            <Field label="E-mail"><Input value={cfg.empresa_email || ""} onChange={txt("empresa_email")} /></Field>
            <Field label="Endereço"><Input value={cfg.empresa_endereco || ""} onChange={txt("empresa_endereco")} /></Field>
            <Field label="Slogan"><Input value={cfg.empresa_slogan || ""} onChange={txt("empresa_slogan")} /></Field>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Templates de WhatsApp</h3>
            <button className="text-champagne text-sm" onClick={novoTpl}>+ Novo</button>
          </div>
          <p className="text-xs text-muted mb-3">Variáveis: {"{contato}"} e {"{empresa}"}</p>
          <div className="space-y-3">
            {templates.map((t, i) => (
              <div key={t.id} className="bg-surfaceSoft rounded-lg p-3 space-y-2">
                <div className="flex gap-2">
                  <Input value={t.nome} onChange={(e) => setTemplates(templates.map((x, j) => j === i ? { ...x, nome: e.target.value } : x))} />
                  <button className="text-muted hover:text-red-300 px-2" onClick={() => delTpl(t.id)}>✕</button>
                </div>
                <Textarea rows={2} value={t.mensagem} onChange={(e) => setTemplates(templates.map((x, j) => j === i ? { ...x, mensagem: e.target.value } : x))} />
                <button className="btn-ghost !py-1 text-xs" onClick={() => salvarTpl(templates[i])}>Salvar template</button>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold mb-4">Backup</h3>
          <p className="text-sm text-muted mb-4">Exporte todo o banco em JSON ou restaure a partir de um arquivo. A restauração substitui os dados atuais.</p>
          <div className="flex gap-3">
            <button className="btn-primary" onClick={exportar}>Exportar JSON</button>
            <button className="btn-ghost" onClick={() => fileRef.current?.click()}>Importar JSON</button>
            <input ref={fileRef} type="file" accept="application/json" className="hidden"
              onChange={(e) => e.target.files?.[0] && importar(e.target.files[0])} />
          </div>
        </Card>
      </div>
    </div>
  );
}
