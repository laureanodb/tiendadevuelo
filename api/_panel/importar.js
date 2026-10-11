// Panel: cargar de una vez varios productos (por ejemplo, los de muestra de la web) si la lista está vacía.
import { body, panel, q, send, slug, toRow } from "../_lib.js";

export default panel(async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "metodo" });
  const { rows: ya } = await q("select count(*)::int as n from tdv_productos");
  if (ya[0].n > 0) return send(res, 409, { error: "no_vacio", mensaje: "Ya hay productos cargados." });
  const lista = Array.isArray(body(req).productos) ? body(req).productos.slice(0, 300) : [];
  let n = 0;
  for (const [i, p] of lista.entries()) {
    const row = { ...toRow(p), orden: i };
    if (!row.name) continue;
    const cols = Object.keys(row);
    await q(`insert into tdv_productos (id, ${cols.join(", ")}) values ($1, ${cols.map((_, k) => "$" + (k + 2)).join(", ")}) on conflict (id) do nothing`,
      [slug(p.id || row.name), ...cols.map((c) => row[c])]);
    n++;
  }
  send(res, 200, { ok: true, importados: n });
});
