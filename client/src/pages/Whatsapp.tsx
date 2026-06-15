import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { PageHeader, Card, Field, Input, useUI, Spinner } from "../components/ui";

interface WaConfig {
  phone_id: string;
  business_id: string;
  numero: string;
  ativo: boolean;
  token_set: boolean;
  token: string;
}
interface WaStatus {
  conectado: boolean;
  numero?: string;
  nome?: string;
  qualidade?: string;
  erro?: string;
}

export default function Whatsapp() {
  const { toast } = useUI();
  const [cfg, setCfg] = useState<WaConfig | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [status, setStatus] = useState<WaStatus | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [destinoTeste, setDestinoTeste] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => { api.get<WaConfig>("/whatsapp/config").then(setCfg); }, []);

  if (!cfg) return <Spinner />;

  const salvar = async () => {
    setSalvando(true);
    try {
      await api.put("/whatsapp/config", {
        token: cfg.token, phone_id: cfg.phone_id, business_id: cfg.business_id, numero: cfg.numero, ativo: cfg.ativo,
      });
      toast("Configuração do WhatsApp salva.");
      setStatus(null);
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Falha ao salvar.", "err");
    } finally { setSalvando(false); }
  };

  const verificar = async () => {
    setVerificando(true);
    try { setStatus(await api.get<WaStatus>("/whatsapp/status")); }
    catch (e: unknown) { setStatus({ conectado: false, erro: e instanceof Error ? e.message : "Falha." }); }
    finally { setVerificando(false); }
  };

  const enviarTeste = async () => {
    if (!destinoTeste.trim()) return toast("Informe o número de destino (com DDI).", "err");
    setEnviando(true);
    try {
      await api.post("/whatsapp/test", { to: destinoTeste });
      toast("Mensagem de teste enviada! Verifique o WhatsApp do destino.");
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Falha ao enviar.", "err");
    } finally { setEnviando(false); }
  };

  return (
    <div>
      <PageHeader title="WhatsApp Business" subtitle="Conecte a API oficial (Meta Cloud API) para enviar mensagens pelo CRM"
        actions={<button data-tour="page-action" className="btn-primary" onClick={salvar} disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</button>} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Credenciais da API</h3>
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" className="accent-champagne w-4 h-4" checked={cfg.ativo}
                  onChange={(e) => setCfg({ ...cfg, ativo: e.target.checked })} />
                Integração ativa
              </label>
            </div>

            <Field label="Token de acesso (permanente)">
              <Input type="password" placeholder={cfg.token_set ? "•••• (já salvo — preencha para alterar)" : "EAAG..."}
                value={cfg.token} onChange={(e) => setCfg({ ...cfg, token: e.target.value })} />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Phone Number ID"><Input value={cfg.phone_id} onChange={(e) => setCfg({ ...cfg, phone_id: e.target.value })} /></Field>
              <Field label="WhatsApp Business Account ID"><Input value={cfg.business_id} onChange={(e) => setCfg({ ...cfg, business_id: e.target.value })} /></Field>
            </div>
            <Field label="Número exibido (opcional)"><Input placeholder="+55 21 99999-9999" value={cfg.numero} onChange={(e) => setCfg({ ...cfg, numero: e.target.value })} /></Field>

            <div className="flex flex-wrap gap-2 pt-1">
              <button className="btn-ghost" onClick={salvar} disabled={salvando}>{salvando ? "Salvando…" : "Salvar configuração"}</button>
              <button className="btn-ghost" onClick={verificar} disabled={verificando}>{verificando ? "Verificando…" : "Verificar conexão"}</button>
            </div>

            {status && (
              <div className={`rounded-lg border px-4 py-3 text-sm ${status.conectado ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" : "border-red-500/40 bg-red-500/10 text-red-200"}`}>
                {status.conectado
                  ? <>✓ Conectado{status.nome ? ` como ${status.nome}` : ""}{status.numero ? ` · ${status.numero}` : ""}{status.qualidade ? ` · qualidade ${status.qualidade}` : ""}</>
                  : <>✕ Não conectado{status.erro ? ` — ${status.erro}` : ""}</>}
              </div>
            )}
          </Card>

          <Card className="space-y-3">
            <h3 className="font-semibold">Enviar mensagem de teste</h3>
            <p className="text-xs text-muted">Envia o modelo padrão <b>hello_world</b> (aprovado pela Meta), que funciona mesmo sem uma conversa aberta.</p>
            <div className="flex gap-2">
              <Input placeholder="Destino com DDI — ex.: 5521999999999" value={destinoTeste} onChange={(e) => setDestinoTeste(e.target.value)} />
              <button className="btn-primary shrink-0" onClick={enviarTeste} disabled={enviando}>{enviando ? "Enviando…" : "Enviar teste"}</button>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold mb-2">Como obter as credenciais</h3>
            <ol className="text-sm text-muted space-y-2 list-decimal pl-4">
              <li>Acesse <a className="text-champagne hover:underline" href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer">developers.facebook.com</a> e crie um app do tipo <b>Business</b>.</li>
              <li>Adicione o produto <b>WhatsApp</b> e abra <b>API Setup</b>.</li>
              <li>Copie o <b>Phone Number ID</b> e o <b>WhatsApp Business Account ID</b>.</li>
              <li>Gere um <b>token permanente</b> (System User → token com permissões <code>whatsapp_business_messaging</code>).</li>
              <li>Cole tudo aqui, salve e use <b>Verificar conexão</b>.</li>
            </ol>
          </Card>
          <Card>
            <h3 className="font-semibold mb-2">Observações</h3>
            <ul className="text-sm text-muted space-y-1.5 list-disc pl-4">
              <li>Texto livre só é entregue dentro da janela de <b>24h</b> aberta pelo cliente; fora dela, use <b>templates</b> aprovados.</li>
              <li>O token é sensível — trate o acesso ao CRM com cuidado.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
