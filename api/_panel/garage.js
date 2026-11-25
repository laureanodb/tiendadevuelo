// Panel: venta de garage aeronáutica. GET lista, POST crea o edita, DELETE ?id= borra.
import { anotar, body, panel, q, send } from "../_lib.js";

const deFila = (r) => ({
  id: Number(r.id), nombre: r.nombre, precio: r.precio === null ? null : Number(r.precio), moneda: r.moneda,
  detalle: r.detalle, fotos: r.fotos || [], visible: r.visible, vendido: r.vendido ? new Date(r.vendido).toISOString() : null,
});

export default panel(async (req, res) => {
  if (req.method === "GET") {
    const { rows } = await q("select * from tdv_garage order by (vendido is not null), orden, creado desc");
    return send(res, 200, { articulos: rows.map(deFila) });
  }
  if (req.method === "DELETE") {
    const { rows: [r] } = await q("delete from tdv_garage where id = $1 returning nombre", [parseInt(req.query.id) || 0]);
    if (r) await anotar("garage", req.query.id, r.nombre, "Borrado de la venta de garage", null, req.usuario);
    return send(res, 200, { ok: true });
  }
  if (req.method !== "POST") return send(res, 405, { error: "metodo" });

  const b = body(req);
  const id = parseInt(b.id) || 0;
  // Atajo para los botones de la lista: marcar vendido / volver a ponerlo a la venta
  if (id && typeof b.vendido === "boolean" && b.nombre === undefined) {
    const { rows: [r] } = await q("update tdv_garage set vendido = $2, actualizado = now() where id = $1 returning *", [id, b.vendido ? new Date() : null]);
    if (!r) return send(res, 404, { mensaje: "Ese artículo ya no existe." });
    await anotar("garage", id, r.nombre, b.vendido ? "Marcado como vendido" : "Vuelve a estar a la venta", null, req.usuario);
    return send(res, 200, { articulo: deFila(r) });
  }

  const nombre = String(b.nombre || "").trim().slice(0, 120);
  if (!nombre) return send(res, 400, { mensaje: "Poné qué es (el nombre)." });
  const n = Number(b.precio);
  const precio = b.precio === "" || b.precio === null || b.precio === undefined || !isFinite(n) || n <= 0 ? null : n;
  const moneda = b.moneda === "USD" ? "USD" : "ARS";
  const detalle = String(b.detalle || "").trim().slice(0, 400);
  const fotos = (Array.isArray(b.fotos) ? b.fotos : []).map(String).filter((u) => /^https?:\/\//.test(u)).slice(0, 10);
  const visible = b.visible !== false;
  const vals = [nombre, precio, moneda, detalle, fotos, visible];

  if (id) {
    const { rows: [r] } = await q(`update tdv_garage set nombre = $2, precio = $3, moneda = $4, detalle = $5, fotos = $6, visible = $7, actualizado = now()
      where id = $1 returning *`, [id, ...vals]);
    if (!r) return send(res, 404, { mensaje: "Ese artículo ya no existe." });
    await anotar("garage", id, nombre, "Editado en la venta de garage", null, req.usuario);
    return send(res, 200, { articulo: deFila(r) });
  }
  const { rows: [r] } = await q(`insert into tdv_garage (nombre, precio, moneda, detalle, fotos, visible) values ($1, $2, $3, $4, $5, $6) returning *`, vals);
  await anotar("garage", r.id, nombre, "Publicado en la venta de garage", null, req.usuario);
  send(res, 200, { articulo: deFila(r) });
});
