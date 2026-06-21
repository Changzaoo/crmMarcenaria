import { db } from "../db/index.js";
import { ETAPAS_PROJETO, CHECKLIST_PADRAO } from "../db/schema.js";

// Helper de datas relativas (retorna 'YYYY-MM-DD')
function dia(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}
function dt(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 19).replace("T", " ");
}

export function seed() {
  const count = db.prepare("SELECT COUNT(*) c FROM empresas").get().c;
  if (count > 0) return; // já populado

  const tx = db.transaction(() => {
    // ---------- MATERIAIS (catálogo realista) ----------
    const materiais = [
      ["MDF Cru 6mm", "Chapa", "chapa", 95, "Duratex"],
      ["MDF Cru 15mm", "Chapa", "chapa", 165, "Duratex"],
      ["MDF Cru 18mm", "Chapa", "chapa", 198, "Duratex"],
      ["MDF Branco TX 15mm", "Chapa", "chapa", 215, "Arauco"],
      ["MDF Branco TX 18mm", "Chapa", "chapa", 248, "Arauco"],
      ["MDF Freijó 18mm", "Chapa", "chapa", 410, "Guararapes"],
      ["MDF Nogueira 18mm", "Chapa", "chapa", 435, "Guararapes"],
      ["MDF Carvalho Hanover 18mm", "Chapa", "chapa", 398, "Eucatex"],
      ["MDP Branco 15mm", "Chapa", "chapa", 142, "Berneck"],
      ["Compensado Naval 15mm", "Chapa", "chapa", 285, "Sudati"],
      ["Fita de Borda Branca 22mm", "Fita", "m", 1.2, "Rehau"],
      ["Fita de Borda Freijó 22mm", "Fita", "m", 2.1, "Rehau"],
      ["Fita de Borda Nogueira 35mm", "Fita", "m", 2.8, "Proadec"],
      ["Corrediça Telescópica 45cm", "Ferragem", "un", 18, "FGV"],
      ["Corrediça Oculta Soft 50cm", "Ferragem", "un", 62, "Blum"],
      ["Corrediça Oculta Push 50cm", "Ferragem", "un", 78, "Blum"],
      ["Dobradiça com Amortecedor", "Ferragem", "un", 9.5, "Häfele"],
      ["Dobradiça Reta 35mm", "Ferragem", "un", 6, "FGV"],
      ["Puxador Perfil Latão 1m", "Ferragem", "m", 89, "Häfele"],
      ["Puxador Cava Alumínio 1m", "Ferragem", "m", 34, "Aluf"],
      ["Pé Regulável Nivelador", "Ferragem", "un", 3.2, "Genérico"],
      ["Suporte Prateleira Invisível", "Ferragem", "un", 7.5, "Häfele"],
      ["Fita LED 12V 5m Branco Quente", "Iluminação", "un", 68, "Brilia"],
      ["Fonte 12V 60W", "Iluminação", "un", 95, "Brilia"],
      ["Perfil Alumínio LED Embutir 2m", "Iluminação", "un", 42, "Aluf"],
      ["Sensor de Presença p/ LED", "Iluminação", "un", 38, "Brilia"],
      ["Quartzo Branco Prime (m²)", "Pedra", "m2", 690, "Marmoraria SP"],
      ["Quartzo Cinza Concreto (m²)", "Pedra", "m2", 720, "Marmoraria SP"],
      ["Cuba Inox Embutir 40x34", "Cuba", "un", 215, "Tramontina"],
      ["Cuba Resina Branca", "Cuba", "un", 180, "Genérico"],
      ["Cola Branca PVA 1kg", "Insumo", "un", 22, "Cascola"],
      ["Parafuso Chipboard 4x40 (cento)", "Insumo", "cento", 14, "Ciser"],
      ["Cavilha 8mm (cento)", "Insumo", "cento", 9, "Genérico"],
      ["Mão de obra — Marceneiro", "Mão de obra", "h", 65, "Interno"],
      ["Mão de obra — Instalador", "Mão de obra", "h", 75, "Interno"],
    ];
    const insMat = db.prepare(
      "INSERT INTO materiais (nome, categoria, unidade, preco_custo, fornecedor) VALUES (?,?,?,?,?)"
    );
    const matIds = {};
    for (const m of materiais) {
      const r = insMat.run(...m);
      matIds[m[0]] = r.lastInsertRowid;
    }

    // ---------- EMPRESAS (8, incl. 2 arquitetos) ----------
    const insEmp = db.prepare(
      `INSERT INTO empresas (razao_social, nome_fantasia, cnpj, segmento, is_arquiteto, endereco, cidade, observacoes)
       VALUES (?,?,?,?,?,?,?,?)`
    );
    const empresas = [
      ["Café Aroma Franquias Ltda", "Café Aroma", "12.345.678/0001-10", "franquia", 0, "Av. Paulista, 1200", "São Paulo — SP", "Rede em expansão, 14 unidades."],
      ["Clínica Vida Plena S/A", "Vida Plena", "23.456.789/0001-22", "clínica", 0, "R. Oscar Freire, 850", "São Paulo — SP", "Clínica de estética premium."],
      ["Restaurante Fogo & Sal Ltda", "Fogo & Sal", "34.567.890/0001-33", "restaurante", 0, "R. dos Pinheiros, 300", "São Paulo — SP", "Casa de carnes, alto fluxo."],
      ["Hotel Montblanc Ltda", "Hotel Montblanc", "45.678.901/0001-44", "hotel", 0, "Al. Santos, 2000", "São Paulo — SP", "Reforma de 40 apartamentos."],
      ["Construtora Horizonte Ltda", "Horizonte", "56.789.012/0001-55", "construtora", 0, "Av. Faria Lima, 3500", "São Paulo — SP", "Stand de vendas e decorados."],
      ["Óticas Visão Clara Ltda", "Visão Clara", "67.890.123/0001-66", "loja", 0, "Shopping Morumbi", "São Paulo — SP", "Rede de óticas, 8 lojas."],
      ["Studio Marina Costa Arquitetura", "Marina Costa Arq.", "78.901.234/0001-77", "arquiteto", 1, "R. Harmonia, 120", "São Paulo — SP", "Arquiteta parceira — alto padrão residencial e corporativo."],
      ["Ateliê Bruno Tavares Arquitetura", "Bruno Tavares Arq.", "89.012.345/0001-88", "arquiteto", 1, "R. Girassol, 45", "São Paulo — SP", "Especificador de projetos comerciais."],
    ];
    const empIds = empresas.map((e) => insEmp.run(...e).lastInsertRowid);

    // ---------- CONTATOS ----------
    const insCt = db.prepare(
      "INSERT INTO contatos (empresa_id, nome, cargo, telefone, email, principal) VALUES (?,?,?,?,?,?)"
    );
    const ctIds = {};
    const contatos = [
      [empIds[0], "Ricardo Mendes", "Gerente de Expansão", "5511990001111", "ricardo@cafearoma.com.br", 1],
      [empIds[1], "Dra. Helena Prado", "Diretora", "5511990002222", "helena@vidaplena.com.br", 1],
      [empIds[2], "Marcos Lima", "Sócio-proprietário", "5511990003333", "marcos@fogoesal.com.br", 1],
      [empIds[3], "Patrícia Souza", "Gerente de Operações", "5511990004444", "patricia@montblanc.com.br", 1],
      [empIds[4], "Eng. Carlos Dias", "Coordenador de Obras", "5511990005555", "carlos@horizonte.com.br", 1],
      [empIds[5], "Fernanda Rocha", "Gerente de Lojas", "5511990006666", "fernanda@visaoclara.com.br", 1],
      [empIds[6], "Marina Costa", "Arquiteta Titular", "5511990007777", "marina@marinacosta.arq.br", 1],
      [empIds[7], "Bruno Tavares", "Arquiteto Titular", "5511990008888", "bruno@brunotavares.arq.br", 1],
    ];
    contatos.forEach((c, i) => (ctIds[i] = insCt.run(...c).lastInsertRowid));

    // arquitetos -> indicações (N:N)
    const insArq = db.prepare(
      "INSERT INTO empresa_arquiteto (empresa_id, arquiteto_id) VALUES (?,?)"
    );
    insArq.run(empIds[1], empIds[6]); // Marina indicou Clínica Vida Plena
    insArq.run(empIds[2], empIds[6]); // Marina indicou Fogo & Sal
    insArq.run(empIds[3], empIds[7]); // Bruno indicou Hotel Montblanc
    insArq.run(empIds[5], empIds[7]); // Bruno indicou Óticas

    // ---------- NEGÓCIOS (12 no funil) ----------
    const insNeg = db.prepare(
      `INSERT INTO negocios (titulo, empresa_id, contato_id, segmento, origem, etapa, valor_estimado, probabilidade, data_prevista, responsavel, ordem, motivo_perda, fechado_em)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
    );
    const negocios = [
      ["Mobiliário 3 novas unidades", empIds[0], ctIds[0], "franquia", "indicação", "Lead", 145000, 30, dia(45), "João", 0, null, null],
      ["Recepção e salas de atendimento", empIds[1], ctIds[1], "clínica", "arquiteto parceiro", "Qualificação", 98000, 45, dia(30), "Ana", 0, null, null],
      ["Balcões e ambientação do salão", empIds[2], ctIds[2], "restaurante", "arquiteto parceiro", "Briefing técnico", 76000, 55, dia(25), "João", 0, null, null],
      ["Marcenaria de 40 apartamentos", empIds[3], ctIds[3], "hotel", "site", "Visita/Medição", 320000, 50, dia(60), "Ana", 0, null, null],
      ["Stand de vendas + apartamento decorado", empIds[4], ctIds[4], "construtora", "indicação", "Proposta enviada", 188000, 60, dia(20), "João", 0, null, null],
      ["Padronização visual 8 lojas", empIds[5], ctIds[5], "loja", "Instagram", "Negociação", 134000, 70, dia(15), "Ana", 0, null, null],
      ["Móveis corporativos sob medida", empIds[6], ctIds[6], "arquiteto", "retorno de cliente", "Qualificação", 52000, 40, dia(35), "João", 1, null, null],
      ["Quiosque modular shopping", empIds[0], ctIds[0], "quiosque", "WhatsApp", "Lead", 38000, 25, dia(50), "Ana", 1, null, null],
      ["Reforma da recepção (matriz)", empIds[1], ctIds[1], "clínica", "retorno de cliente", "Briefing técnico", 44000, 50, dia(28), "João", 1, null, null],
      ["Cozinha industrial e bar", empIds[2], ctIds[2], "restaurante", "site", "Proposta enviada", 96000, 55, dia(22), "Ana", 1, null, null],
      ["Mobiliário lobby e bar", empIds[3], ctIds[3], "hotel", "arquiteto parceiro", "Fechado (ganho)", 210000, 100, dia(-10), "Ana", 0, null, dt(-10)],
      ["Móveis loja conceito", empIds[5], ctIds[5], "loja", "Instagram", "Perdido", 60000, 0, dia(-5), "João", 0, "preço", null],
    ];
    const negIds = negocios.map((n) => insNeg.run(...n).lastInsertRowid);

    // ---------- INTERAÇÕES + FOLLOW-UPS ----------
    const insInt = db.prepare(
      `INSERT INTO interacoes (negocio_id, tipo, descricao, data, proximo_follow_up, follow_up_concluido)
       VALUES (?,?,?,?,?,?)`
    );
    insInt.run(negIds[0], "WhatsApp", "Primeiro contato, cliente pediu portfólio.", dt(-3), dia(-1), 0); // vencido
    insInt.run(negIds[1], "reunião", "Briefing inicial com a arquiteta.", dt(-5), dia(2), 0);
    insInt.run(negIds[2], "visita", "Visita técnica ao salão realizada.", dt(-2), dia(3), 0);
    insInt.run(negIds[4], "email", "Proposta v1 enviada por e-mail.", dt(-4), dia(1), 0);
    insInt.run(negIds[5], "ligação", "Negociação de prazo de pagamento.", dt(-1), dia(0), 0); // hoje
    insInt.run(negIds[3], "nota", "Aguardando liberação de cronograma da obra.", dt(-6), dia(-2), 0); // vencido
    insInt.run(negIds[10], "reunião", "Contrato assinado. Gerar projeto.", dt(-10), null, 1);

    // ---------- ORÇAMENTOS (2 com itens reais) ----------
    const insOrc = db.prepare(
      `INSERT INTO orcamentos (negocio_id, empresa_id, titulo, versao, status, margem, impostos, perda, frete, condicoes_pagamento, validade_dias, observacoes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
    );
    const insAmb = db.prepare(
      "INSERT INTO orcamento_ambientes (orcamento_id, nome, ordem) VALUES (?,?,?)"
    );
    const insItem = db.prepare(
      "INSERT INTO orcamento_itens (ambiente_id, descricao, quantidade, mao_de_obra, ordem) VALUES (?,?,?,?,?)"
    );
    const insIM = db.prepare(
      `INSERT INTO orcamento_item_materiais (item_id, material_id, nome, unidade, preco_custo, quantidade, aplica_perda)
       VALUES (?,?,?,?,?,?,?)`
    );
    function addMat(itemId, nome, qtd, aplicaPerda = 1) {
      const m = db.prepare("SELECT * FROM materiais WHERE nome = ?").get(nome);
      insIM.run(itemId, m.id, m.nome, m.unidade, m.preco_custo, qtd, aplicaPerda);
    }

    // Orçamento 1 — Óticas Visão Clara
    const o1 = insOrc.run(
      negIds[5], empIds[5], "Padronização visual — Loja Morumbi", 2, "enviado", 38, 8, 30, 2500,
      "Entrada de 40% + 2x no boleto", 15, "Projeto-piloto para replicar nas 8 lojas."
    ).lastInsertRowid;
    const a1 = insAmb.run(o1, "Vitrine e fachada", 0).lastInsertRowid;
    const i1 = insItem.run(a1, "Balcão expositor 2,4m com LED", 1, 1200, 0).lastInsertRowid;
    addMat(i1, "MDF Branco TX 18mm", 3);
    addMat(i1, "Fita de Borda Branca 22mm", 24);
    addMat(i1, "Fita LED 12V 5m Branco Quente", 1, 0);
    addMat(i1, "Fonte 12V 60W", 1, 0);
    addMat(i1, "Corrediça Telescópica 45cm", 4, 0);
    const i2 = insItem.run(a1, "Painel de fundo ripado 3m", 1, 800, 1).lastInsertRowid;
    addMat(i2, "MDF Freijó 18mm", 4);
    addMat(i2, "Fita de Borda Freijó 22mm", 40);
    const a2 = insAmb.run(o1, "Área de atendimento", 1).lastInsertRowid;
    const i3 = insItem.run(a2, "Bancada de exames com cuba", 1, 1500, 0).lastInsertRowid;
    addMat(i3, "MDF Branco TX 18mm", 2);
    addMat(i3, "Quartzo Branco Prime (m²)", 1.8, 0);
    addMat(i3, "Cuba Inox Embutir 40x34", 1, 0);
    addMat(i3, "Dobradiça com Amortecedor", 6, 0);

    // Orçamento 2 — Hotel Montblanc (vinculado ao negócio ganho)
    const o2 = insOrc.run(
      negIds[10], empIds[3], "Mobiliário lobby e bar", 1, "aprovado", 35, 8, 30, 6000,
      "Entrada de 50% + 3x", 20, "Aprovado — gerou contrato."
    ).lastInsertRowid;
    const a3 = insAmb.run(o2, "Lobby", 0).lastInsertRowid;
    const i4 = insItem.run(a3, "Balcão de recepção 4m curvo", 1, 3500, 0).lastInsertRowid;
    addMat(i4, "MDF Nogueira 18mm", 8);
    addMat(i4, "Compensado Naval 15mm", 4);
    addMat(i4, "Fita de Borda Nogueira 35mm", 60);
    addMat(i4, "Puxador Perfil Latão 1m", 4, 0);
    addMat(i4, "Fita LED 12V 5m Branco Quente", 2, 0);
    const a4 = insAmb.run(o2, "Bar", 1).lastInsertRowid;
    const i5 = insItem.run(a4, "Bar completo com adega 5m", 1, 4200, 0).lastInsertRowid;
    addMat(i5, "MDF Nogueira 18mm", 10);
    addMat(i5, "Quartzo Cinza Concreto (m²)", 5, 0);
    addMat(i5, "Corrediça Oculta Soft 50cm", 12, 0);
    addMat(i5, "Dobradiça com Amortecedor", 14, 0);

    // ---------- PROJETOS (3 em etapas diferentes) ----------
    const insProj = db.prepare(
      `INSERT INTO projetos (negocio_id, empresa_id, orcamento_id, nome, endereco_obra, valor, data_contrato, previsao_entrega, data_instalacao, status, responsavel, garantia_meses, garantia_inicio, revisao_sugerida, potencial_novas_unidades)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    );
    const insEt = db.prepare(
      "INSERT INTO projeto_etapas (projeto_id, numero, nome, concluida, observacoes) VALUES (?,?,?,?,?)"
    );
    const insChk = db.prepare(
      "INSERT INTO etapa_checklist (etapa_id, texto, concluido, ordem) VALUES (?,?,?,?)"
    );
    function criarProjeto(args, etapasConcluidas, garantia) {
      const pid = insProj.run(...args).lastInsertRowid;
      ETAPAS_PROJETO.forEach((nome, idx) => {
        const numero = idx + 1;
        const concluida = numero <= etapasConcluidas ? 1 : 0;
        const eid = insEt.run(pid, numero, nome, concluida, null).lastInsertRowid;
        (CHECKLIST_PADRAO[nome] || []).forEach((txt, ci) =>
          insChk.run(eid, txt, concluida, ci)
        );
      });
      return pid;
    }

    // Projeto 1 — Hotel Montblanc (do negócio ganho), em Produção (etapa 5)
    const p1 = criarProjeto(
      [negIds[10], empIds[3], o2, "Mobiliário lobby e bar — Hotel Montblanc", "Al. Santos, 2000 — São Paulo", 210000, dia(-10), dia(40), dia(45), "Em andamento", "Ana", null, null, null, "Rede com 3 hotéis — potencial de replicar."],
      4, null
    );
    // Projeto 2 — Restaurante, em Instalação (etapa 8)
    const p2 = criarProjeto(
      [negIds[2], empIds[2], null, "Balcões e ambientação — Fogo & Sal", "R. dos Pinheiros, 300 — São Paulo", 76000, dia(-30), dia(5), dia(7), "Em andamento", "João", null, null, null, null],
      7, null
    );
    // Projeto 3 — Clínica, concluído (etapa 10) com garantia
    const p3 = criarProjeto(
      [negIds[1], empIds[1], null, "Recepção e salas — Vida Plena", "R. Oscar Freire, 850 — São Paulo", 98000, dia(-90), dia(-20), dia(-18), "Concluído", "Ana", 24, dia(-18), dia(165), "Franquia abrindo 2 unidades — gerar lead."],
      10, 24
    );

    // ---------- AGENDA ----------
    const insEv = db.prepare(
      `INSERT INTO eventos_agenda (titulo, tipo, data, hora, negocio_id, projeto_id, responsavel, observacoes, concluido)
       VALUES (?,?,?,?,?,?,?,?,?)`
    );
    insEv.run("Medição — Hotel Montblanc (40 aptos)", "medicao", dia(3), "09:00", negIds[3], null, "Ana", "Levar trena a laser.", 0);
    insEv.run("Reunião proposta — Construtora Horizonte", "reuniao", dia(1), "14:00", negIds[4], null, "João", null, 0);
    insEv.run("Instalação — Fogo & Sal", "instalacao", dia(7), "08:00", null, p2, "João", "Equipe de 3 instaladores.", 0);
    insEv.run("Entrega lobby — Hotel Montblanc", "entrega", dia(45), "10:00", null, p1, "Ana", null, 0);
    insEv.run("Reunião alinhamento — Óticas Visão Clara", "reuniao", dia(1), "16:00", negIds[5], null, "Ana", "Mesmo dia da Construtora — conflito.", 0);

    // ---------- PARCELAS ----------
    const insPar = db.prepare(
      "INSERT INTO parcelas (projeto_id, descricao, valor, vencimento, status, recebido_em) VALUES (?,?,?,?,?,?)"
    );
    insPar.run(p1, "Entrada (50%)", 105000, dia(-8), "recebido", dia(-8));
    insPar.run(p1, "Parcela 2/3", 35000, dia(10), "a_receber", null);
    insPar.run(p1, "Parcela 3/3", 70000, dia(40), "a_receber", null);
    insPar.run(p2, "Entrada (40%)", 30400, dia(-25), "recebido", dia(-25));
    insPar.run(p2, "Parcela 2/2", 45600, dia(-3), "atrasado", null);
    insPar.run(p3, "Entrada (40%)", 39200, dia(-85), "recebido", dia(-85));
    insPar.run(p3, "Saldo final", 58800, dia(-15), "recebido", dia(-15));

    // ---------- TEMPLATES WHATSAPP ----------
    const insTpl = db.prepare("INSERT INTO templates_whatsapp (nome, mensagem) VALUES (?,?)");
    insTpl.run("Primeiro contato", "Olá {contato}, aqui é da NEXUS — Marcenaria Corporativa. Recebemos seu interesse em mobiliário sob medida para a {empresa}. Podemos agendar uma conversa?");
    insTpl.run("Envio de proposta", "Olá {contato}, segue a proposta da NEXUS para o projeto da {empresa}. Fico à disposição para detalhar cada ambiente. Qualquer dúvida, estou por aqui!");
    insTpl.run("Cobrança de retorno", "Olá {contato}, tudo bem? Passando para saber se conseguiu avaliar nossa proposta para a {empresa}. Posso ajudar com algum ajuste?");
    insTpl.run("Agendamento de medição", "Olá {contato}, podemos agendar a visita técnica para medição na {empresa}? Temos disponibilidade nesta semana.");
  });

  tx();
  console.log("✔ Seed de demonstração inserido.");
}
