# NEXUS — Sistema de Gestão

CRM + operação para a **NEXUS — Marcenaria Corporativa**. Roda local ou na Vercel, com autenticação Firebase por email/senha, dados persistidos no Firebase Realtime Database e imagens no Supabase Storage.

Funil comercial (Kanban), clientes B2B, orçamentador por ambiente/peça com proposta em PDF, projetos com as 10 etapas oficiais, agenda, financeiro e pós-venda — tudo com a identidade visual escura premium da marca.

## Stack

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS + Framer Motion · Firebase Auth · PDF com `@react-pdf/renderer` · Kanban com `@hello-pangea/dnd`.
- **Backend:** Node.js + Express, API REST protegida por ID token Firebase em `/api`.
- **Dados:** snapshot operacional em Firebase Realtime Database, com SQLite local como cache/runtime do Express.
- **Imagens:** Supabase Storage, via backend, sem expor chave secreta no client.
- **Monorepo:** `client/` + `server/`, um único `npm run dev` na raiz (via `concurrently`). Vite faz proxy de `/api` para o Express.

## Instalação e execução

Pré-requisitos: **Node.js 18+** (testado no Node 24).

```bash
npm install      # instala raiz + client + server (postinstall cuida dos sub-pacotes)
npm run dev      # sobe API (porta 3001) e front (porta 5173) juntos
```

Abra **http://localhost:5173**. Na primeira subida, o banco `data/linear.db` é criado e populado automaticamente com o **seed de demonstração** (8 empresas, 12 negócios no funil, 3 projetos, 2 orçamentos, agenda e parcelas), para o sistema já nascer navegável.

> Se a porta 5173 estiver ocupada, o Vite escolhe a próxima (ex.: 5174) — o proxy continua funcionando.

## Autenticação Firebase

O app usa o projeto Firebase `device-streaming-20a455a9` e aceita somente email/senha.

1. No Firebase Console, habilite **Authentication > Sign-in method > Email/Password**.
2. Crie os usuários em **Authentication > Users**.
3. Habilite **Realtime Database** e use regras compatíveis com usuários autenticados:

```json
{
  "rules": {
    "linear-crm": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

4. Acesse o sistema e entre com o email e senha criados.

O backend valida o ID token usando as chaves públicas do Firebase. Não é necessário colocar chave privada de service account no código para este fluxo.

Para trocar de projeto sem editar código, defina no client:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

E no server:

```bash
FIREBASE_PROJECT_ID=...
FIREBASE_DATABASE_URL=...
FIREBASE_DATABASE_PATH=linear-crm/database
FIREBASE_DATA_ENABLED=1
```

## Imagens no Supabase

O backend envia imagens para o bucket `linear-images` no Supabase Storage. A chave secreta do Supabase deve existir apenas no ambiente do servidor/Vercel:

```bash
SUPABASE_URL=https://fepyzmawcsetlyinztjc.supabase.co
SUPABASE_SERVICE_KEY=...
SUPABASE_BUCKET=linear-images
```

A tela de detalhe do projeto permite anexar imagens nas etapas de produção. Os arquivos ficam no Supabase; no banco ficam apenas os metadados e URLs.

## Deploy

O deploy esperado é pela raiz do repositório. O arquivo `vercel.json` compila o client e publica a API Express como função serverless em `/api`.

Variáveis mínimas na Vercel:

```bash
ALLOWED_ORIGINS=https://seu-projeto.vercel.app
FIREBASE_PROJECT_ID=device-streaming-20a455a9
FIREBASE_DATABASE_URL=https://device-streaming-20a455a9-default-rtdb.firebaseio.com
FIREBASE_DATABASE_PATH=linear-crm/database
FIREBASE_DATA_ENABLED=1
SUPABASE_URL=https://fepyzmawcsetlyinztjc.supabase.co
SUPABASE_SERVICE_KEY=...
SUPABASE_BUCKET=linear-images
```

### Outros comandos

```bash
npm run build    # build de produção do client
npm start        # roda apenas o servidor (modo produção)
```

Para **zerar os dados** e regerar o seed, apague `data/linear.db*` e suba de novo.

## Portas

| Serviço | Porta | URL |
|---|---|---|
| Frontend (Vite) | 5173 | http://localhost:5173 |
| API (Express) | 3001 | http://localhost:3001/api |

## Estrutura

```
linear-gestao/
├── package.json            # scripts (dev/build/start) + concurrently
├── data/linear.db          # SQLite (criado na 1ª execução)
├── server/
│   └── src/
│       ├── index.js        # app Express + seed na 1ª subida
│       ├── db/             # conexão, schema (DDL) e etapas oficiais
│       ├── seed/           # seed de demonstração
│       ├── lib/            # cálculo do orçamento, fábrica de projetos
│       └── routes/         # empresas, negocios, materiais, orcamentos,
│                           # projetos, agenda, financeiro, config, dashboard
└── client/
    └── src/
        ├── pages/          # Dashboard, CRM, Clientes, Orçamentos, Projetos…
        ├── components/     # Layout (sidebar), UI kit, PropostaPDF
        ├── lib/            # api, formatação (R$/dd-mm-aaaa), OS imprimível
        └── types/          # tipos compartilhados das entidades
```

## Módulos

1. **Dashboard** — valor no funil, conversão do mês, projetos em produção, instalações nos próximos 14 dias, contas a receber, funil visual e próximos follow-ups.
2. **Funil comercial (CRM)** — Kanban drag-and-drop (Lead → … → Fechado/Perdido), timeline de interações, follow-ups vencidos em vermelho, templates de WhatsApp (`wa.me`). Marcar **Ganho** cria o projeto automaticamente.
3. **Clientes e contatos** — cadastro B2B, múltiplos contatos, vínculo N:N com arquitetos/especificadores, histórico e total contratado.
4. **Projetos e produção** — 10 etapas oficiais com checklist por etapa, % de progresso, Ordem de Serviço imprimível.
5. **Orçamentador** — ambientes → itens → materiais do catálogo, perda/margem/impostos/frete configuráveis, custo × preço × lucro por ambiente, versões e **proposta em PDF** com a identidade NEXUS.
6. **Catálogo de materiais** — CRUD de insumos (chapas, fitas, ferragens, LED, pedras, mão de obra) com seed realista.
7. **Agenda** — visão mensal + lista, conflitos do mesmo dia destacados.
8. **Financeiro** — parcelas por projeto (a receber / recebido / atrasado), totais do mês.
9. **Pós-venda** — garantia (padrão 24 meses), revisão sugerida (+6 meses) e geração de novo lead a partir do potencial de novas unidades.

**Configurações:** padrões (margem/impostos/perda/garantia), dados da empresa para o PDF, templates de WhatsApp e **backup** (exporta/importa todo o banco em JSON).

## Fluxo de demonstração (ponta a ponta)

Criar lead → registrar interação → criar orçamento com 2 ambientes e itens do catálogo → gerar PDF → marcar **Ganho** → projeto criado com as 10 etapas → avançar etapas com checklist → agendar instalação → registrar parcela recebida → concluir e registrar garantia.

---

Tudo em PT-BR, datas `dd/mm/aaaa`, moeda `R$` (`Intl.NumberFormat`).
