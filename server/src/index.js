import { DB_FIRST_RUN } from "./db/index.js";
import { app } from "./app.js";

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n  LINEAR — servidor em http://localhost:${PORT}`);
  console.log(`  Banco: data/linear.db ${DB_FIRST_RUN ? "(criado agora)" : "(existente)"}\n`);
});
