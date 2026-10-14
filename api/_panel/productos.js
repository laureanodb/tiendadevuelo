// Panel: listar (GET), crear o editar (POST) y borrar (DELETE ?id=) productos.
import { anotar, body, fromRow, panel, q, send, slug, toRow } from "../_lib.js";

const precio = (r) => (r.usd !== null ? "US$ " + Number(r.usd) : r.ars !== null ? "$" + Number(r.ars).toLocaleString("es-AR") : "sin precio");

export default panel(async (req, res) => {
  if (req.method === "GET") {
    const { rows } = await q("select * from tdv_productos order by orden, creado");
    const sinCostos = (p) => (req.usuario.dueno ? p : { ...p, costo: null, costoMoneda: null });
    return send(res, 200, { productos: rows.map((r) => sinCostos(fromRow(r, true))) });
  }
  if (req.method === "DELETE") {
    const id = String(req.query.id || "");
    const { rows: viejo } = await q("select * from tdv_productos where id = $1", [id]);
    await q("delete from tdv_productos where id = $1", [id]);
    if (viejo.length) await anotar("borrado", id, viejo[0].name, "Producto borrado", viejo[0], req.usuario);
    return send(res, 200, { ok: true });
  }
  if (req.method !== "POST") return send(res, 405, { error: "metodo" });

  const p = body(req);
  const row = toRow(p);
  if (!row.name) return send(res, 400, { error: "datos", mensaje: "Poné el nombre del producto." });
  let id = String(p.id || "");
  if (!id) {
    // Producto nuevo: el link sale del nombre, sin repetir.
    const base = slug(row.name);
    const { rows } = await q("select id from tdv_productos where id = $1 or id like $2", [base, base + "-%"]);
    const usados = new Set(rows.map((r) => r.id));
    id = base; for (let n = 2; usados.has(id); n++) id = `${base}-${n}`;
  }
  const { rows: previo } = await q("select * from tdv_productos where id = $1", [id]);
  // Un ayudante no ve ni cambia los costos: se conservan los que había
  if (!req.usuario.dueno) { row.costo = previo[0]?.costo ?? null; row.costo_moneda = previo[0]?.costo_moneda ?? "USD"; }
  const cols = Object.keys(row);
  const { rows } = await q(
    `insert into tdv_productos (id, ${cols.join(", ")}) values ($1, ${cols.map((_, i) => "$" + (i + 2)).join(", ")})
     on conflict (id) do update set ${cols.map((c) => `${c} = excluded.${c}`).join(", ")}, actualizado = now()
     returning *`,
    [id, ...cols.map((c) => row[c])]
  );
  const a = previo[0], n = rows[0];
  if (!a) await anotar("producto", id, n.name, "Producto nuevo", null, req.usuario);
  else {
    const c = [];
    if (precio(a) !== precio(n)) c.push(`precio ${precio(a)} → ${precio(n)}`);
    if (a.stock !== n.stock) c.push(`stock ${a.stock ?? "—"} → ${n.stock ?? "—"}`);
    if (a.visible !== n.visible) c.push(n.visible ? "ahora visible" : "oculto");
    if (a.name !== n.name) c.push(`nombre “${a.name}” → “${n.name}”`);
    if (String(a.antes) !== String(n.antes)) c.push(n.antes ? "oferta cambiada" : "oferta quitada");
    if (a.fotos.join() !== n.fotos.join()) c.push("fotos");
    if (a.descr !== n.descr || a.specs.join() !== n.specs.join()) c.push("descripción o características");
    await anotar("producto", id, n.name, c.length ? c.join(", ") : "Editado (otros datos)", a, req.usuario);
  }
  send(res, 200, { producto: fromRow(rows[0], true) });
});
