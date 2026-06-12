// Tipos compartilhados das entidades.

export interface Empresa {
  id: number;
  razao_social: string;
  nome_fantasia?: string;
  cnpj?: string;
  segmento?: string;
  is_arquiteto: number;
  endereco?: string;
  cidade?: string;
  observacoes?: string;
  total_contatos?: number;
  criado_em?: string;
}

export interface Contato {
  id: number;
  empresa_id: number;
  nome: string;
  cargo?: string;
  telefone?: string;
  email?: string;
  principal: number;
}

export interface EmpresaDetalhe extends Empresa {
  contatos: Contato[];
  arquitetos: { id: number; nome_fantasia?: string; razao_social: string }[];
  indicados: { id: number; nome_fantasia?: string; razao_social: string }[];
  negocios: Negocio[];
  orcamentos: Orcamento[];
  projetos: Projeto[];
  totalContratado: number;
}

export interface Negocio {
  id: number;
  titulo: string;
  empresa_id?: number;
  contato_id?: number;
  empresa_nome?: string;
  empresa_razao?: string;
  contato_nome?: string;
  contato_telefone?: string;
  segmento?: string;
  origem?: string;
  etapa: string;
  valor_estimado: number;
  probabilidade: number;
  data_prevista?: string;
  responsavel?: string;
  motivo_perda?: string;
  ordem: number;
  proximo_follow_up?: string;
  criado_em?: string;
  fechado_em?: string;
}

export interface Interacao {
  id: number;
  negocio_id: number;
  tipo: string;
  descricao?: string;
  data: string;
  proximo_follow_up?: string;
  follow_up_concluido: number;
}

export interface NegocioDetalhe extends Negocio {
  interacoes: Interacao[];
  orcamentos: Orcamento[];
}

export interface Material {
  id: number;
  nome: string;
  categoria: string;
  unidade: string;
  preco_custo: number;
  fornecedor?: string;
  ativo: number;
}

export interface ItemMaterial {
  id: number;
  item_id: number;
  material_id?: number;
  nome: string;
  unidade?: string;
  preco_custo: number;
  quantidade: number;
  aplica_perda: number;
  custo?: number;
}

export interface OrcamentoItem {
  id: number;
  ambiente_id: number;
  descricao: string;
  quantidade: number;
  mao_de_obra: number;
  ordem: number;
  materiais: ItemMaterial[];
  custo?: number;
  preco?: number;
  lucro?: number;
  custo_materiais?: number;
}

export interface OrcamentoAmbiente {
  id: number;
  orcamento_id: number;
  nome: string;
  ordem: number;
  itens: OrcamentoItem[];
  custo?: number;
  preco?: number;
  lucro?: number;
}

export interface ResumoOrcamento {
  custo_direto: number;
  frete: number;
  custo_total: number;
  valor_margem: number;
  valor_impostos: number;
  preco_final: number;
  lucro: number;
  margem_pct: number;
  impostos_pct: number;
  perda_pct: number;
}

export interface Orcamento {
  id: number;
  negocio_id?: number;
  empresa_id?: number;
  empresa_nome?: string;
  negocio_titulo?: string;
  titulo: string;
  versao: number;
  status: string;
  margem: number;
  impostos: number;
  perda: number;
  frete: number;
  condicoes_pagamento?: string;
  validade_dias: number;
  observacoes?: string;
  criado_em?: string;
  empresa?: Empresa;
  ambientes?: OrcamentoAmbiente[];
  resumo?: ResumoOrcamento;
}

export interface ChecklistItem {
  id: number;
  etapa_id: number;
  texto: string;
  concluido: number;
  ordem: number;
}

export interface ProjetoEtapa {
  id: number;
  projeto_id: number;
  numero: number;
  nome: string;
  concluida: number;
  observacoes?: string;
  anexos?: string;
  checklist: ChecklistItem[];
}

export interface EtapaAnexo {
  url: string;
  path: string;
  nome: string;
  tipo?: string;
  tamanho?: number;
  criado_em?: string;
}

export interface Parcela {
  id: number;
  projeto_id: number;
  descricao: string;
  valor: number;
  vencimento?: string;
  status: string;
  recebido_em?: string;
  projeto_nome?: string;
  empresa_nome?: string;
}

export interface Projeto {
  id: number;
  negocio_id?: number;
  empresa_id?: number;
  orcamento_id?: number;
  empresa_nome?: string;
  empresa_razao?: string;
  nome: string;
  endereco_obra?: string;
  valor: number;
  data_contrato?: string;
  previsao_entrega?: string;
  data_instalacao?: string;
  status: string;
  responsavel?: string;
  garantia_meses?: number;
  garantia_inicio?: string;
  revisao_sugerida?: string;
  potencial_novas_unidades?: string;
  progresso?: number;
  etapas?: ProjetoEtapa[];
  parcelas?: Parcela[];
  contatos?: Contato[];
}

export interface EventoAgenda {
  id: number;
  titulo: string;
  tipo: string;
  data: string;
  hora?: string;
  negocio_id?: number;
  projeto_id?: number;
  responsavel?: string;
  observacoes?: string;
  concluido: number;
  negocio_titulo?: string;
  projeto_nome?: string;
  conflito?: boolean;
}

export interface TemplateWhatsapp {
  id: number;
  nome: string;
  mensagem: string;
}

export interface Configuracoes {
  id: number;
  margem_padrao: number;
  impostos_padrao: number;
  perda_padrao: number;
  garantia_meses_padrao: number;
  empresa_nome?: string;
  empresa_cnpj?: string;
  empresa_telefone?: string;
  empresa_email?: string;
  empresa_endereco?: string;
  empresa_slogan?: string;
}

export interface Dashboard {
  valorFunil: number;
  conversao: number;
  ganhosMes: number;
  emProducao: number;
  instalacoes: number;
  aReceber: number;
  atrasado: number;
  funil: { etapa: string; qtd: number; valor: number }[];
  followups: {
    id: number;
    descricao?: string;
    proximo_follow_up: string;
    tipo: string;
    negocio_id: number;
    negocio_titulo: string;
    empresa_nome?: string;
    vencido: boolean;
  }[];
}

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

export const SEGMENTOS = [
  "loja", "franquia", "restaurante", "clínica", "hotel", "escritório",
  "construtora", "arquiteto", "incorporadora", "showroom", "quiosque", "outro",
];

export const ORIGENS = [
  "site", "WhatsApp", "indicação", "Instagram", "arquiteto parceiro", "retorno de cliente",
];

export const MOTIVOS_PERDA = ["preço", "prazo", "concorrência", "adiado", "outro"];
