// Carrega variáveis de ambiente de server/.env (e, como fallback, da raiz do CRM)
// ANTES de qualquer outro módulo ler process.env. Importe este arquivo primeiro.
// dotenv não sobrescreve variáveis já definidas no ambiente (ex.: Vercel).
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { config } from "dotenv";

const here = dirname(fileURLToPath(import.meta.url)); // .../server/src
config({ path: join(here, "..", ".env") }); // server/.env (preferencial)
config({ path: join(here, "..", "..", ".env") }); // raiz do CRM (fallback)
