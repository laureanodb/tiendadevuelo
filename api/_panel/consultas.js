// Panel: pedidos de precio ("Pedime el precio") sin responder (GET) y marcarlos como respondidos (POST { id }).
import { body, panel, q, send } from "../_lib.js";

export default panel(async (req, res) => {
  if (req.method === "GET") {
    const { rows } = await q("select * from tdv_consultas where estado = 'nueva' and creado > now() - interval '60 days' order by creado desc limit 100");
    return send(res, 200, { consultas: rows.map((r) => ({ id: r.id, producto: r.producto, nombre: r.producto_nombre, opcion: r.opcion, cliente: r.cliente, tel: r.tel, fecha: r.creado })) });
  }
  await q("update tdv_consultas set estado = 'respondida' where id = $1", [parseInt(body(req).id) || 0]);
  send(res, 200, { ok: true });
});
