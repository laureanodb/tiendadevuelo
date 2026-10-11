// Panel: preguntas de clientes para responder (se publican al responder) u ocultar.
import { body, panel, q, send } from "../_lib.js";

export default panel(async (req, res) => {
  if (req.method === "GET") {
    const { rows } = await q("select g.*, p.name from tdv_preguntas g left join tdv_productos p on p.id = g.producto order by (g.estado = 'pendiente') desc, g.creado desc limit 300");
    return send(res, 200, { preguntas: rows.map((r) => ({ id: r.id, producto: r.producto, productoNombre: r.name || r.producto, nombre: r.nombre, contacto: r.contacto, pregunta: r.pregunta, respuesta: r.respuesta, estado: r.estado, creado: r.creado })) });
  }
  const b = body(req);
  const respuesta = String(b.respuesta || "").trim().slice(0, 1500);
  const estado = b.estado === "oculta" ? "oculta" : respuesta ? "respondida" : "pendiente";
  await q("update tdv_preguntas set respuesta = $2, estado = $3, respondido = case when $3 = 'respondida' then coalesce(respondido, now()) else respondido end where id = $1", [Number(b.id), respuesta, estado]);
  send(res, 200, { ok: true });
});
