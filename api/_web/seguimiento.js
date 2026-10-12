// El cliente ve el estado de su pedido con el número y la clave del link. Sin dirección ni teléfono.
import { DB_URL, ensureSchema, pagoPublico, q, send } from "../_lib.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");
  const num = String(req.query.n || ""), token = String(req.query.c || "");
  if (!DB_URL || !/^TDV-\d{6}-\d{3,5}$/.test(num) || !token) return send(res, 404, { error: "no_encontrado" });
  try {
    await ensureSchema();
    const { rows } = await q("select * from tdv_pedidos where num = $1 and token = $2", [num, token]);
    if (!rows.length) return send(res, 404, { error: "no_encontrado" });
    const r = rows[0];
    send(res, 200, {
      num: r.num, creado: r.creado, estado: r.estado, nombre: String(r.cliente.nombre || "").split(" ")[0],
      entrega: r.cliente.entrega, franja: r.cliente.franja, items: r.items, totalArs: r.total_ars === null ? null : Number(r.total_ars),
      envioEmpresa: r.envio_empresa, envioCodigo: r.envio_codigo, historial: r.historial,
      comprobantes: (r.comprobantes || []).length, nps: r.nps !== null, pago: ["nuevo", "señado"].includes(r.estado) ? await pagoPublico() : null,
    });
  } catch (e) { console.error(e); send(res, 500, { error: "interno" }); }
}
