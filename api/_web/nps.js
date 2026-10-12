// Encuesta de una pregunta después de la entrega: "¿Nos recomendarías?" del 0 al 10.
import { DB_URL, body, ensureSchema, permitido, q, send } from "../_lib.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST" || !DB_URL) return send(res, 405, { error: "metodo" });
  try {
    const b = body(req);
    const nota = parseInt(b.nota);
    if (!(nota >= 0 && nota <= 10)) return send(res, 400, { mensaje: "Elegí un número del 0 al 10." });
    await ensureSchema();
    if (!(await permitido(req, "nps", 10))) return send(res, 429, { mensaje: "Probá de nuevo en un rato." });
    const { rowCount } = await q(`update tdv_pedidos set nps = $3, nps_coment = $4 where num = $1 and token = $2 and estado in ('enviado', 'entregado')`,
      [String(b.num || ""), String(b.token || ""), nota, String(b.comentario || "").trim().slice(0, 600)]);
    if (!rowCount) return send(res, 404, { mensaje: "No encontramos ese pedido." });
    send(res, 200, { ok: true });
  } catch (e) { console.error(e); send(res, 500, { mensaje: "No se pudo guardar. Probá de nuevo." }); }
}
