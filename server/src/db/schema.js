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

CREATE TABLE IF NOT EXISTS categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL UNIQUE,
  modelo TEXT NOT NULL DEFAULT 'outro',
  descricao TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
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

CREATE TABLE IF NOT EXISTS funcionarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  funcao TEXT,
  email TEXT,
  telefone TEXT,
  cor TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  observacoes TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
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
  anexos TEXT,
  funcionario_id INTEGER
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
  empresa_slogan TEXT,
  whatsapp_token TEXT,
  whatsapp_phone_id TEXT,
  whatsapp_business_id TEXT,
  whatsapp_numero TEXT,
  whatsapp_ativo INTEGER NOT NULL DEFAULT 0
);

-- ===== Orçamento 3D (leads + projetos do estúdio 3D) =====
-- Mantidos FORA da lista TABELAS de propósito: o snapshot do Firebase NÃO deve
-- sobrescrever leads criados por visitantes públicos. Persistem no SQLite local.
CREATE TABLE IF NOT EXISTS leads_3d (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT,
  whatsapp TEXT,
  cidade_estado TEXT,
  tipo_projeto TEXT,
  prazo TEXT,
  faixa_orcamento TEXT,
  descricao TEXT,
  aceite INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Novo Lead 3D',
  origem TEXT NOT NULL DEFAULT 'Orçamento 3D',
  anotacoes TEXT,
  projeto_id TEXT,
  arquiteto_solicitado INTEGER NOT NULL DEFAULT 0,
  arquiteto_solicitado_em TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS projetos_3d (
  id TEXT PRIMARY KEY,
  lead_id TEXT REFERENCES leads_3d(id) ON DELETE SET NULL,
  nome TEXT,
  doc TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'rascunho',
  criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
`;

// Índices de performance — idempotentes (IF NOT EXISTS), executados a cada subida.
// Cobrem os caminhos de leitura quentes: junções por FK, agrupamento do funil por
// etapa, follow-ups por data, parcelas por status/vencimento e leads do Estúdio 3D.
export const INDICES = `
CREATE INDEX IF NOT EXISTS idx_contatos_empresa        ON contatos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_negocios_etapa          ON negocios(etapa);
CREATE INDEX IF NOT EXISTS idx_negocios_empresa        ON negocios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_negocios_contato        ON negocios(contato_id);
CREATE INDEX IF NOT EXISTS idx_interacoes_negocio      ON interacoes(negocio_id);
CREATE INDEX IF NOT EXISTS idx_interacoes_followup     ON interacoes(proximo_follow_up);
CREATE INDEX IF NOT EXISTS idx_orcamentos_negocio      ON orcamentos(negocio_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_empresa      ON orcamentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_orc_ambientes_orcamento ON orcamento_ambientes(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_orc_itens_ambiente      ON orcamento_itens(ambiente_id);
CREATE INDEX IF NOT EXISTS idx_orc_item_mat_item       ON orcamento_item_materiais(item_id);
CREATE INDEX IF NOT EXISTS idx_projetos_negocio        ON projetos(negocio_id);
CREATE INDEX IF NOT EXISTS idx_projetos_empresa        ON projetos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_projetos_status         ON projetos(status);
CREATE INDEX IF NOT EXISTS idx_proj_etapas_projeto     ON projeto_etapas(projeto_id);
CREATE INDEX IF NOT EXISTS idx_checklist_etapa         ON etapa_checklist(etapa_id);
CREATE INDEX IF NOT EXISTS idx_agenda_data             ON eventos_agenda(data);
CREATE INDEX IF NOT EXISTS idx_agenda_projeto          ON eventos_agenda(projeto_id);
CREATE INDEX IF NOT EXISTS idx_agenda_negocio          ON eventos_agenda(negocio_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_projeto        ON parcelas(projeto_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_status         ON parcelas(status);
CREATE INDEX IF NOT EXISTS idx_parcelas_vencimento     ON parcelas(vencimento);
CREATE INDEX IF NOT EXISTS idx_leads3d_status          ON leads_3d(status);
CREATE INDEX IF NOT EXISTS idx_leads3d_criado          ON leads_3d(criado_em);
CREATE INDEX IF NOT EXISTS idx_projetos3d_lead         ON projetos_3d(lead_id);
`;

// Etapas oficiais da NEXUS
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

// Funções/cargos sugeridos para os funcionários da marcenaria.
export const FUNCOES_FUNCIONARIO = [
  "Vendas",
  "Atendimento",
  "Projetista",
  "Orçamentista",
  "Marceneiro",
  "Produção",
  "Logística",
  "Instalador",
  "Montador",
  "Pós-venda",
  "Gestor",
  "Outro",
];

// Equipe inicial (criada na primeira subida quando ainda não há funcionários).
export const FUNCIONARIOS_PADRAO = [
  { nome: "Ana Souza", funcao: "Vendas", cor: "#D8B978" },
  { nome: "Carlos Lima", funcao: "Projetista", cor: "#7FB2E5" },
  { nome: "Rafael Nunes", funcao: "Orçamentista", cor: "#9B8CFF" },
  { nome: "João Pereira", funcao: "Marceneiro", cor: "#E59E5B" },
  { nome: "Marcos Dias", funcao: "Logística", cor: "#6FCF97" },
  { nome: "Pedro Alves", funcao: "Instalador", cor: "#F2A6A6" },
];

// Modelos 3D disponíveis para ilustrar uma categoria do catálogo.
export const MODELOS_CATEGORIA = [
  "chapa",
  "fita",
  "ferragem",
  "iluminacao",
  "pedra",
  "cuba",
  "insumo",
  "maodeobra",
  "outro",
];

// Categorias padrão criadas na primeira subida (cada uma com seu modelo 3D).
export const CATEGORIAS_PADRAO = [
  { nome: "Chapa", modelo: "chapa" },
  { nome: "Fita", modelo: "fita" },
  { nome: "Ferragem", modelo: "ferragem" },
  { nome: "Iluminação", modelo: "iluminacao" },
  { nome: "Pedra", modelo: "pedra" },
  { nome: "Cuba", modelo: "cuba" },
  { nome: "Insumo", modelo: "insumo" },
  { nome: "Mão de obra", modelo: "maodeobra" },
  { nome: "Outro", modelo: "outro" },
];

// Deduz o modelo 3D mais adequado a partir do nome da categoria.
export function inferirModelo(nome = "") {
  const n = String(nome).toLowerCase();
  if (/chapa|mdf|mdp|compensad|madeira|lâmina|lamina/.test(n)) return "chapa";
  if (/fita|borda/.test(n)) return "fita";
  if (/ferrag|dobradi|corredi|puxador|parafus|suporte|trilho/.test(n)) return "ferragem";
  if (/ilumin|led|luz|lâmpada|lampada|spot|fita led/.test(n)) return "iluminacao";
  if (/pedra|quartzo|granito|mármore|marmore|porcelanato|silestone/.test(n)) return "pedra";
  if (/cuba|pia|tanque|lavató|lavato/.test(n)) return "cuba";
  if (/insumo|cola|adesivo|fixaç|fixac|abrasivo|verniz|tinta/.test(n)) return "insumo";
  if (/mão|mao|obra|serviç|servic|instal|montagem/.test(n)) return "maodeobra";
  return "outro";
}
