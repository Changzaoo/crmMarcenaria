import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { Orcamento, Configuracoes } from "../types";

Font.register({
  family: "Manrope",
  fonts: [
    { src: "https://fonts.gstatic.com/s/manrope/v15/xn7gYHE41ni1AdIRggexSvfedN4.ttf", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/manrope/v15/xn7gYHE41ni1AdIRggexSvfedN4.ttf", fontWeight: 700 },
  ],
});

const C = { bg: "#080706", surface: "#12100E", champagne: "#D8B978", text: "#F4EFE7", muted: "#A79D91", wood: "#5A3825" };
const brl = (v: number) => "R$ " + (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtData = (d?: string) => { if (!d) return "—"; const s = d.slice(0, 10).split("-"); return `${s[2]}/${s[1]}/${s[0]}`; };

const s = StyleSheet.create({
  page: { backgroundColor: C.bg, color: C.text, fontFamily: "Manrope", fontSize: 10, padding: 0 },
  cover: { backgroundColor: C.bg, height: "100%", padding: 50, justifyContent: "space-between" },
  brand: { fontSize: 32, letterSpacing: 8, color: C.text },
  brandSub: { fontSize: 9, letterSpacing: 3, color: C.champagne, marginTop: 6 },
  coverTitle: { fontSize: 26, color: C.champagne, marginBottom: 8 },
  coverClient: { fontSize: 14, color: C.text },
  line: { height: 1, backgroundColor: C.wood, marginVertical: 16 },
  section: { padding: 40 },
  h2: { fontSize: 14, color: C.champagne, marginBottom: 10, borderBottom: `1px solid ${C.wood}`, paddingBottom: 4 },
  ambiente: { marginBottom: 14 },
  ambHead: { flexDirection: "row", justifyContent: "space-between", backgroundColor: C.surface, padding: 8, borderRadius: 4 },
  ambName: { fontSize: 12, color: C.text, fontWeight: 700 },
  ambPreco: { fontSize: 12, color: C.champagne, fontWeight: 700 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, paddingHorizontal: 8, borderBottom: `0.5px solid #221d18` },
  itemDesc: { color: C.muted, flex: 1 },
  itemQtd: { color: C.muted, width: 40, textAlign: "center" },
  itemPreco: { color: C.text, width: 80, textAlign: "right" },
  totalBox: { marginTop: 16, padding: 14, backgroundColor: C.surface, borderRadius: 6 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  totalLabel: { color: C.muted },
  totalFinal: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.wood}` },
  totalFinalLabel: { fontSize: 13, color: C.text, fontWeight: 700 },
  totalFinalValue: { fontSize: 16, color: C.champagne, fontWeight: 700 },
  cond: { marginTop: 16, fontSize: 10, color: C.muted, lineHeight: 1.5 },
  assinatura: { marginTop: 50, flexDirection: "row", justifyContent: "space-between" },
  assBox: { width: "45%", borderTop: `1px solid ${C.muted}`, paddingTop: 6, fontSize: 9, color: C.muted, textAlign: "center" },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: C.muted },
});

export function PropostaPDF({ orc, cfg }: { orc: Orcamento; cfg: Configuracoes }) {
  const r = orc.resumo!;
  const cliente = orc.empresa?.nome_fantasia || orc.empresa?.razao_social || "Cliente";
  return (
    <Document title={`Proposta — ${orc.titulo}`}>
      {/* Capa */}
      <Page size="A4" style={s.page}>
        <View style={s.cover}>
          <View>
            <Text style={s.brand}>LINEAR</Text>
            <Text style={s.brandSub}>MARCENARIA CORPORATIVA</Text>
          </View>
          <View>
            <Text style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>PROPOSTA COMERCIAL</Text>
            <Text style={s.coverTitle}>{orc.titulo}</Text>
            <View style={s.line} />
            <Text style={s.coverClient}>{cliente}</Text>
            <Text style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
              Versão {orc.versao} · Emitida em {fmtData(new Date().toISOString())} · Validade {orc.validade_dias} dias
            </Text>
          </View>
          <View>
            <Text style={{ fontSize: 9, color: C.muted }}>{cfg.empresa_slogan}</Text>
            <Text style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>
              {cfg.empresa_telefone} · {cfg.empresa_email}
            </Text>
          </View>
        </View>
      </Page>

      {/* Escopo */}
      <Page size="A4" style={s.page}>
        <View style={s.section}>
          <Text style={s.h2}>Escopo por ambiente</Text>
          {(orc.ambientes || []).map((amb) => (
            <View key={amb.id} style={s.ambiente} wrap={false}>
              <View style={s.ambHead}>
                <Text style={s.ambName}>{amb.nome}</Text>
                <Text style={s.ambPreco}>{brl(amb.preco || 0)}</Text>
              </View>
              {amb.itens.map((it) => (
                <View key={it.id} style={s.itemRow}>
                  <Text style={s.itemDesc}>{it.descricao}</Text>
                  <Text style={s.itemQtd}>{it.quantidade}x</Text>
                  <Text style={s.itemPreco}>{brl(it.preco || 0)}</Text>
                </View>
              ))}
            </View>
          ))}

          <View style={s.totalBox}>
            <View style={s.totalRow}><Text style={s.totalLabel}>Frete e instalação</Text><Text>{brl(r.frete)}</Text></View>
            <View style={s.totalRow}><Text style={s.totalLabel}>Impostos ({r.impostos_pct}%)</Text><Text>{brl(r.valor_impostos)}</Text></View>
            <View style={s.totalFinal}>
              <Text style={s.totalFinalLabel}>Investimento total</Text>
              <Text style={s.totalFinalValue}>{brl(r.preco_final)}</Text>
            </View>
          </View>

          <View style={s.cond}>
            <Text style={{ color: C.champagne, marginBottom: 4 }}>Condições</Text>
            <Text>Pagamento: {orc.condicoes_pagamento || "A combinar"}</Text>
            <Text>Validade da proposta: {orc.validade_dias} dias</Text>
            {orc.observacoes ? <Text>Observações: {orc.observacoes}</Text> : null}
          </View>

          <View style={s.assinatura}>
            <Text style={s.assBox}>{cfg.empresa_nome}</Text>
            <Text style={s.assBox}>{cliente}</Text>
          </View>
        </View>
        <View style={s.footer}>
          <Text>{cfg.empresa_nome} · {cfg.empresa_cnpj}</Text>
          <Text>{cfg.empresa_endereco}</Text>
        </View>
      </Page>
    </Document>
  );
}
