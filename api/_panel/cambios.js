// Panel: historial de cambios (GET) y deshacer uno (POST { id }).
import { anotar, body, panel, q, restaurarProducto, send } from "../_lib.js";

export default panel(async (req, res) => {
  if (req.method === "GET") {
    const { rows } = await q("select id, creado, tipo, ref, nombre, resumen, deshecho, antes is not null as tiene_antes from tdv_cambios order by creado desc limit 120");
    return send(res, 200, { cambios: rows.map((r) => ({ id: r.id, creado: r.creado, tipo: r.tipo, ref: r.ref, nombre: r.nombre, resumen: r.resumen, deshecho: r.deshecho,
      deshacer: !r.deshecho && (r.tipo === "borrado" || r.tipo === "precios" || (r.tipo === "producto" && (r.tiene_antes || r.resumen === "Producto nuevo"))) })) });
  }
  const { rows } = await q("select * from tdv_cambios where id = $1", [parseInt(body(req).id) || 0]);
  const c = rows[0];
  if (!c || c.deshecho) return send(res, 404, { mensaje: "Ese cambio ya no se puede deshacer." });
  if (c.tipo === "producto" && !c.antes) {
    const { rows: v } = await q("select * from tdv_productos where id = $1", [c.ref]);
    if (v.length) { await q("delete from tdv_productos where id = $1", [c.ref]); await anotar("borrado", c.ref, c.nombre, "Deshecho: se quitó el producto nuevo", v[0]); }
  } else if (c.tipo === "producto" || c.tipo === "borrado") {
    await restaurarProducto(c.antes);
    await anotar("producto", c.ref, c.nombre, c.tipo === "borrado" ? "Deshecho: producto recuperado" : "Deshecho: volvió a como estaba");
  } else if (c.tipo === "precios") {
    for (const p of c.antes || []) await q("update tdv_productos set usd = $2, ars = $3, actualizado = now() where id = $1", [p.id, p.usd, p.ars]);
    await anotar("precios", c.ref, c.nombre, "Deshecho: precios como estaban antes");
  } else return send(res, 400, { mensaje: "Ese cambio no se puede deshacer." });
  await q("update tdv_cambios set deshecho = true where id = $1", [c.id]);
  send(res, 200, { ok: true });
});
