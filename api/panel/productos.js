// Panel: listar (GET), crear o editar (POST) y borrar (DELETE ?id=) productos.
import { body, fromRow, panel, q, send, slug, toRow } from "../_lib.js";

export default panel(async (req, res) => {
  if (req.method === "GET") {
    const { rows } = await q("select * from tdv_productos order by orden, creado");
    return send(res, 200, { productos: rows.map((r) => fromRow(r, true)) });
  }
  if (req.method === "DELETE") {
    const id = String(req.query.id || "");
    await q("delete from tdv_productos where id = $1", [id]);
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
  const cols = Object.keys(row);
  const { rows } = await q(
    `insert into tdv_productos (id, ${cols.join(", ")}) values ($1, ${cols.map((_, i) => "$" + (i + 2)).join(", ")})
     on conflict (id) do update set ${cols.map((c) => `${c} = excluded.${c}`).join(", ")}, actualizado = now()
     returning *`,
    [id, ...cols.map((c) => row[c])]
  );
  send(res, 200, { producto: fromRow(rows[0], true) });
});
