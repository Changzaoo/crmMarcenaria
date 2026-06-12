const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function moeda(v?: number | null): string {
  return brl.format(Number(v) || 0);
}

export function moedaCurta(v?: number | null): string {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1000) return "R$ " + (n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "k";
  return moeda(n);
}

// 'YYYY-MM-DD' ou ISO -> 'dd/mm/aaaa'
export function data(d?: string | null): string {
  if (!d) return "—";
  const s = d.slice(0, 10);
  const [a, m, dia] = s.split("-");
  if (!a || !m || !dia) return d;
  return `${dia}/${m}/${a}`;
}

export function dataHora(d?: string | null): string {
  if (!d) return "—";
  const s = d.replace("T", " ");
  const [datePart, timePart] = s.split(" ");
  return `${data(datePart)}${timePart ? " " + timePart.slice(0, 5) : ""}`;
}

export function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

export function diasAte(d?: string | null): number | null {
  if (!d) return null;
  const alvo = new Date(d.slice(0, 10) + "T00:00:00");
  const agora = new Date(hoje() + "T00:00:00");
  return Math.round((alvo.getTime() - agora.getTime()) / 86400000);
}

export function vencido(d?: string | null): boolean {
  if (!d) return false;
  return d.slice(0, 10) < hoje();
}

// Link wa.me
export function whatsappLink(telefone?: string, mensagem?: string): string {
  const num = (telefone || "").replace(/\D/g, "");
  const txt = mensagem ? `?text=${encodeURIComponent(mensagem)}` : "";
  return `https://wa.me/${num}${txt}`;
}

export function aplicarTemplate(msg: string, vars: Record<string, string>): string {
  return msg.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}
