// Panel: ajustes guardados (por ahora, las respuestas rápidas).
import { ajuste, body, guardarAjuste, panel, send } from "../_lib.js";

const CLAVES = ["plantillas", "pago", "precios"];
export default panel(async (req, res) => {
  const clave = String(req.query.clave || body(req).clave || "");
  if (!CLAVES.includes(clave)) return send(res, 400, { error: "clave" });
  if (req.method === "GET") return send(res, 200, { valor: await ajuste(clave, null) });
  const valor = body(req).valor;
  if (JSON.stringify(valor).length > 20000) return send(res, 400, { mensaje: "Es demasiado largo." });
  await guardarAjuste(clave, valor);
  send(res, 200, { ok: true });
});
