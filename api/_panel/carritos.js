// Panel: carritos que quedaron sin terminar (dejaron nombre y teléfono pero no mandaron el pedido).
import { body, panel, q, send } from "../_lib.js";

export default panel(async (req, res) => {
  if (req.method === "GET") {
    // Pasados 30 días se borran (así lo dice la política de privacidad)
    await q("delete from tdv_carritos where actualizado < now() - interval '30 days'");
    // Si después hizo un pedido con el mismo teléfono, ya no cuenta como abandonado.
    const { rows } = await q(`select c.* from tdv_carritos c
      where c.estado = 'abierto' and c.actualizado < now() - interval '30 minutes' and c.actualizado > now() - interval '30 days'
        and not exists (select 1 from tdv_pedidos p where p.cliente_tel = c.tel and p.creado > c.creado - interval '1 hour')
      order by c.actualizado desc limit 60`);
    return send(res, 200, { carritos: rows.map((r) => ({ id: r.id, nombre: r.nombre, tel: r.tel, items: r.items, total: r.total === null ? null : Number(r.total), fecha: r.actualizado })) });
  }
  const b = body(req);
  const estado = ["contactado", "descartado"].includes(b.estado) ? b.estado : null;
  if (!estado) return send(res, 400, { error: "estado" });
  await q("update tdv_carritos set estado = $2 where id = $1", [String(b.id || ""), estado]);
  send(res, 200, { ok: true });
});
