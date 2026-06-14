import empresas from "./empresas.js";
import negocios from "./negocios.js";
import materiais from "./materiais.js";
import categorias from "./categorias.js";
import orcamentos from "./orcamentos.js";
import projetos from "./projetos.js";
import agenda from "./agenda.js";
import financeiro from "./financeiro.js";
import config from "./config.js";
import dashboard from "./dashboard.js";
import uploads from "./uploads.js";
import leads3d from "./leads3d.js";
import { requireFirebaseAuth } from "../auth/firebaseAuth.js";
import { hydrateFirebaseData, persistFirebaseData } from "../data/firebaseStore.js";

export function mountRoutes(api) {
  api.use(requireFirebaseAuth);
  api.use(hydrateFirebaseData);
  api.use(persistFirebaseData);
  api.use("/empresas", empresas);
  api.use("/negocios", negocios);
  api.use("/materiais", materiais);
  api.use("/categorias", categorias);
  api.use("/orcamentos", orcamentos);
  api.use("/projetos", projetos);
  api.use("/agenda", agenda);
  api.use("/financeiro", financeiro);
  api.use("/config", config);
  api.use("/dashboard", dashboard);
  api.use("/uploads", uploads);
  api.use("/leads-3d", leads3d);
}
