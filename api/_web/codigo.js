// Valida un código de recomendación desde el carrito: si existe, devuelve el % de descuento.
import { DB_URL, ajuste, ensureSchema, pctReferidos, permitido, q, send } from "../_lib.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!DB_URL) return send(res, 200, { valido: false });
  const c = String(req.query.c || "").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20);
  if (!c) return send(res, 400, { valido: false });
  await ensureSchema();
  if (!(await permitido(req, "codigo", 20, 10))) return send(res, 429, { valido: false, mensaje: "Probaste muchos códigos. Esperá unos minutos." });
  const pct = pctReferidos(await ajuste("referidos", {}));
  if (!pct) return send(res, 200, { valido: false });
  const { rows: [r] } = await q("select nombre from tdv_clientes where codigo = $1", [c]);
  send(res, 200, r ? { valido: true, pct, codigo: c, de: String(r.nombre || "").split(" ")[0] } : { valido: false });
}
