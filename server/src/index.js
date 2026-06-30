import "./env.js"; // carrega .env antes de tudo (NVIDIA_API_KEY etc.)
import { DB_FIRST_RUN } from "./db/index.js";
import { app } from "./app.js";

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n  NEXUS — servidor em http://localhost:${PORT}`);
  console.log(`  Banco: data/linear.db ${DB_FIRST_RUN ? "(criado agora)" : "(existente)"}\n`);
});
