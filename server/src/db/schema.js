// DDL — executado automaticamente na primeira subida do servidor.
export const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS empresas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT,
  segmento TEXT,
  is_arquiteto INTEGER NOT NULL DEFAULT 0,
  endereco TEXT,
  cidade TEXT,
  observacoes TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS contatos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cargo TEXT,
  telefone TEXT,
  email TEXT,
  principal INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS empresa_arquiteto (
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  arquiteto_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  PRIMARY KEY (empresa_id, arquiteto_id)
);

CREATE TABLE IF NOT EXISTS negocios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  empresa_id INTEGER REFERENCES empresas(id) ON DELETE SET NULL,
  contato_id INTEGER REFERENCES contatos(id) ON DELETE SET NULL,
  segmento TEXT,
  origem TEXT,
  etapa TEXT NOT NULL DEFAULT 'Lead',
  valor_estimado REAL NOT NULL DEFAULT 0,
  probabilidade INTEGER NOT NULL DEFAULT 50,
  data_prevista TEXT,
  responsavel TEXT,
  motivo_perda TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  fechado_em TEXT
);

CREATE TABLE IF NOT EXISTS interacoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  negocio_id INTEGER NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  descricao TEXT,
  data TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  proximo_follow_up TEXT,
  follow_up_concluido INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS materiais (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  unidade TEXT NOT NULL,
  preco_custo REAL NOT NULL DEFAULT 0,
  fornecedor TEXT,
  ativo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS orcamentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  negocio_id INTEGER REFERENCES negocios(id) ON DELETE SET NULL,
  empresa_id INTEGER REFERENCES empresas(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  versao INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'rascunho',
  margem REAL NOT NULL DEFAULT 35,
  impostos REAL NOT NULL DEFAULT 8,
  perda REAL NOT NULL DEFAULT 30,
  frete REAL NOT NULL DEFAULT 0,
  condicoes_pagamento TEXT,
  validade_dias INTEGER NOT NULL DEFAULT 15,
  observacoes TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS orcamento_ambientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orcamento_id INTEGER NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orcamento_itens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ambiente_id INTEGER NOT NULL REFERENCES orcamento_ambientes(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  quantidade REAL NOT NULL DEFAULT 1,
  mao_de_obra REAL NOT NULL DEFAULT 0,
  ordem INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orcamento_item_materiais (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES orcamento_itens(id) ON DELETE CASCADE,
  material_id INTEGER REFERENCES materiais(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  unidade TEXT,
  preco_custo REAL NOT NULL DEFAULT 0,
  quantidade REAL NOT NULL DEFAULT 1,
  aplica_perda INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS projetos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  negocio_id INTEGER REFERENCES negocios(id) ON DELETE SET NULL,
  empresa_id INTEGER REFERENCES empresas(id) ON DELETE SET NULL,
  orcamento_id INTEGER REFERENCES orcamentos(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  endereco_obra TEXT,
  valor REAL NOT NULL DEFAULT 0,
  data_contrato TEXT,
  previsao_entrega TEXT,
  data_instalacao TEXT,
  status TEXT NOT NULL DEFAULT 'Em andamento',
  responsavel TEXT,
  garantia_meses INTEGER,
  garantia_inicio TEXT,
  revisao_sugerida TEXT,
  potencial_novas_unidades TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS projeto_etapas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  projeto_id INTEGER NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  nome TEXT NOT NULL,
  concluida INTEGER NOT NULL DEFAULT 0,
  observacoes TEXT,
  anexos TEXT
);

CREATE TABLE IF NOT EXISTS etapa_checklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  etapa_id INTEGER NOT NULL REFERENCES projeto_etapas(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  concluido INTEGER NOT NULL DEFAULT 0,
  ordem INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS eventos_agenda (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'reuniao',
  data TEXT NOT NULL,
  hora TEXT,
  negocio_id INTEGER REFERENCES negocios(id) ON DELETE SET NULL,
  projeto_id INTEGER REFERENCES projetos(id) ON DELETE SET NULL,
  responsavel TEXT,
  observacoes TEXT,
  concluido INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS parcelas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  projeto_id INTEGER NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor REAL NOT NULL DEFAULT 0,
  vencimento TEXT,
  status TEXT NOT NULL DEFAULT 'a_receber',
  recebido_em TEXT
);

CREATE TABLE IF NOT EXISTS templates_whatsapp (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  mensagem TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS configuracoes (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  margem_padrao REAL NOT NULL DEFAULT 35,
  impostos_padrao REAL NOT NULL DEFAULT 8,
  perda_padrao REAL NOT NULL DEFAULT 30,
  garantia_meses_padrao INTEGER NOT NULL DEFAULT 24,
  empresa_nome TEXT,
  empresa_cnpj TEXT,
  empresa_telefone TEXT,
  empresa_email TEXT,
  empresa_endereco TEXT,
  empresa_slogan TEXT
);
`;

// Etapas oficiais da LINEAR
export const ETAPAS_PROJETO = [
  "Briefing técnico",
  "Análise técnica",
  "Projeto executivo",
  "Orçamento detalhado",
  "Produção",
  "Pré-montagem",
  "Logística",
  "Instalação",
  "Revisão final",
  "Pós-entrega",
];

// Checklist padrão sugerido por etapa
export const CHECKLIST_PADRAO = {
  "Briefing técnico": ["Levantamento de necessidades", "Definição de ambientes", "Referências visuais"],
  "Análise técnica": ["Conferência de viabilidade", "Definição de materiais", "Restrições da obra"],
  "Projeto executivo": ["Desenho técnico", "Detalhamento de peças", "Aprovação do cliente"],
  "Orçamento detalhado": ["Levantamento de insumos", "Cálculo de mão de obra", "Fechamento de margem"],
  "Produção": ["Corte", "Fitamento", "Furação", "Montagem de caixaria"],
  "Pré-montagem": ["Montagem de teste", "Conferência de ferragens", "Ajustes finos"],
  "Logística": ["Embalagem", "Romaneio de peças", "Agendamento de transporte"],
  "Instalação": ["Conferência de medidas no local", "Montagem no local", "Registro fotográfico final"],
  "Revisão final": ["Checklist de acabamento", "Limpeza", "Conferência com o cliente"],
  "Pós-entrega": ["Registro de garantia", "Pesquisa de satisfação", "Agendamento de revisão"],
};

export const ETAPAS_CRM = [
  "Lead",
  "Qualificação",
  "Briefing técnico",
  "Visita/Medição",
  "Proposta enviada",
  "Negociação",
  "Fechado (ganho)",
  "Perdido",
];
