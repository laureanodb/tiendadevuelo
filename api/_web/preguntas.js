// Preguntas por producto: cualquiera pregunta; se publica cuando respondés desde el panel.
import { DB_URL, body, ensureSchema, q, send } from "../_lib.js";

export default async function handler(req, res) {
  if (!DB_URL) return send(res, 200, { preguntas: [] });
  try {
    await ensureSchema();
    if (req.method === "GET") {
      res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
      const { rows } = await q("select pregunta, respuesta, nombre, respondido from tdv_preguntas where producto = $1 and estado = 'respondida' order by respondido desc limit 30", [String(req.query.producto || "")]);
      return send(res, 200, { preguntas: rows.map((r) => ({ pregunta: r.pregunta, respuesta: r.respuesta, nombre: String(r.nombre || "").split(" ")[0], fecha: r.respondido })) });
    }
    if (req.method !== "POST") return send(res, 405, { error: "metodo" });
    res.setHeader("Cache-Control", "no-store");
    const b = body(req);
    if (b.web) return send(res, 200, { ok: true }); // campo trampa para robots
    const pregunta = String(b.pregunta || "").trim().slice(0, 500);
    if (pregunta.length < 5 || !b.producto) return send(res, 400, { mensaje: "Escribí tu pregunta." });
    const { rows } = await q("select count(*)::int as n from tdv_preguntas where creado > now() - interval '1 hour'");
    if (rows[0].n > 60) return send(res, 429, { mensaje: "Recibimos muchas preguntas. Probá en un rato o escribinos por WhatsApp." });
    await q("insert into tdv_preguntas (producto, nombre, contacto, pregunta) values ($1, $2, $3, $4)",
      [String(b.producto).slice(0, 80), String(b.nombre || "").trim().slice(0, 60), String(b.contacto || "").trim().slice(0, 80), pregunta]);
    send(res, 200, { ok: true });
  } catch (e) { console.error(e); send(res, 500, { mensaje: "No se pudo enviar. Probá de nuevo." }); }
}
