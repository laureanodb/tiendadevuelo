// Panel: reseñas para aprobar u ocultar.
import { body, panel, q, send } from "../_lib.js";

export default panel(async (req, res) => {
  if (req.method === "GET") {
    const { rows } = await q("select r.*, p.name from tdv_resenas r left join tdv_productos p on p.id = r.producto order by (r.estado = 'pendiente') desc, r.creado desc limit 300");
    return send(res, 200, { resenas: rows.map((r) => ({ id: r.id, num: r.num, producto: r.producto, productoNombre: r.name || r.producto, nombre: r.nombre, estrellas: r.estrellas, texto: r.texto, estado: r.estado, creado: r.creado })) });
  }
  const b = body(req);
  if (!["aprobada", "rechazada", "pendiente"].includes(b.estado)) return send(res, 400, { error: "estado" });
  await q("update tdv_resenas set estado = $2 where id = $1", [Number(b.id), b.estado]);
  send(res, 200, { ok: true });
});
