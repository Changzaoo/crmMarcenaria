# LINEAR — Guia de publicação (falta só isto)

Status: **pronto pra vender, falta deploy.** Código de cobrança (Kiwify/Pix) e landing já implementados.

## 1. Firebase de produção (auth)
1. Criar projeto no [Firebase Console](https://console.firebase.google.com) (grátis).
2. Authentication → Sign-in method → ativar **E-mail/senha**.
3. Criar o usuário admin da marcenaria (e-mail + senha) em Authentication → Users.
4. Configurações do projeto → SDK Web → copiar as credenciais para `client/src/lib/firebase.ts` (substituir os `YOUR_*`).
5. No backend, definir env `FIREBASE_PROJECT_ID` com o ID do projeto.

## 2. Kiwify (cobrança por Pix)
1. Criar produto de **assinatura mensal R$ 197**.
2. Copiar o **link de checkout** → vira a env `KIWIFY_CHECKOUT_URL`.
3. Criar um token secreto qualquer → vira a env `KIWIFY_WEBHOOK_TOKEN`.
4. Em Apps/Webhooks da Kiwify, apontar o webhook para:
   `https://SEU-BACKEND/api/public/kiwify?token=SEU_TOKEN`
   (eventos: compra aprovada, assinatura renovada, reembolso, cancelamento).

## 3. Deploy
**Frontend (Vercel):** `client/` → build `npm run build`, output `dist`.
**Backend (Render — recomendado):** `server/` → start `npm start`. Render mantém o
`data/billing.json` entre requests. (Na Vercel serverless o arquivo zera — por isso Render.)

### Variáveis de ambiente do backend
| Variável | Valor |
|---|---|
| `FIREBASE_PROJECT_ID` | ID do projeto Firebase |
| `KIWIFY_CHECKOUT_URL` | link de checkout da Kiwify |
| `KIWIFY_WEBHOOK_TOKEN` | token secreto do webhook |
| `TRIAL_DAYS` | 14 (opcional) |
| `ALLOWED_ORIGINS` | URL do frontend na Vercel |

### Frontend
No `client/src/auth/BillingGate.tsx`, o link de checkout vem do backend
(`status.checkoutUrl`). O fallback `CHECKOUT_FALLBACK` pode ser trocado pelo link real.

## 4. Por cliente (modelo atual: 1 instância por marcenaria)
Cada marcenaria = 1 Firebase + 1 deploy + 1 produto Kiwify. Quando chegar no 3º/4º
cliente, migrar para multi-tenant (1 sistema, vários clientes isolados por login).

## Como funciona a cobrança (já implementado)
- Sistema sobe → 14 dias de trial automático (banner mostra dias restantes).
- Pagamento aprovado na Kiwify → webhook libera +31 dias de acesso.
- Trial vence sem pagar / reembolso / cancelamento → tela de bloqueio com botão de assinar.
- Arquivos: `server/src/billing/store.js`, `server/src/routes/kiwifyWebhook.js`,
  `server/src/routes/billing.js`, `client/src/auth/BillingGate.tsx`.
