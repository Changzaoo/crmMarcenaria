-- ============================================================================
-- Estúdio 3D — leads e projetos no Postgres do Supabase
--
-- Por que: no Vercel o SQLite mora em /tmp (efêmero, por-instância) e estas
-- tabelas ficam fora do snapshot do Firebase. O lead gravado pelo visitante numa
-- instância sumia quando o arquiteto lia em outra. Movemos para o Supabase, que
-- é compartilhado entre todas as instâncias serverless.
--
-- Rode UMA VEZ no Supabase: Dashboard > SQL Editor > New query > Run.
-- O servidor acessa via PostgREST usando a SUPABASE_SERVICE_KEY (service_role),
-- que ignora RLS — não é preciso criar policies para o backend funcionar.
-- ============================================================================

create table if not exists public.leads_3d (
  id                       uuid primary key,
  nome                     text not null,
  email                    text,
  whatsapp                 text,
  cidade_estado            text,
  tipo_projeto             text,
  prazo                    text,
  faixa_orcamento          text,
  descricao                text,
  aceite                   boolean      not null default false,
  status                   text         not null default 'Novo Lead 3D',
  origem                   text         not null default 'Orçamento 3D',
  anotacoes                text,
  projeto_id               uuid,
  arquiteto_solicitado     boolean      not null default false,
  arquiteto_solicitado_em  timestamptz,
  criado_em                timestamptz  not null default now(),
  atualizado_em            timestamptz  not null default now()
);

create table if not exists public.projetos_3d (
  id             uuid primary key,
  lead_id        uuid references public.leads_3d(id) on delete set null,
  nome           text,
  doc            jsonb        not null default '{}'::jsonb,
  status         text         not null default 'rascunho',
  criado_em      timestamptz  not null default now(),
  atualizado_em  timestamptz  not null default now()
);

create index if not exists leads_3d_projeto_id_idx on public.leads_3d (projeto_id);
create index if not exists leads_3d_criado_em_idx  on public.leads_3d (criado_em desc);

-- Mantém RLS ligado por segurança. O backend usa a service_role key (bypassa RLS);
-- nenhuma policy de acesso anônimo é criada de propósito.
alter table public.leads_3d    enable row level security;
alter table public.projetos_3d enable row level security;
