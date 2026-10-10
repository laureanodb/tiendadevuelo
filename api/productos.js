// Catálogo público: lo lee la web. Sin costos, stock ni notas internas.
import { DB_URL, ensureSchema, fromRow, q, send } from "./_lib.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "public, s-maxage=15, stale-while-revalidate=120");
  if (!DB_URL) return send(res, 200, { configurado: false, productos: [] });
  try {
    await ensureSchema();
    const { rows } = await q("select * from tdv_productos where visible order by orden, creado");
    const { rows: v } = await q(`select count(*)::int as n from tdv_pedidos where estado in ('pagado', 'enviado', 'entregado')`);
    send(res, 200, { configurado: true, ventas: 2500 + v[0].n, productos: rows.map((r) => fromRow(r)).filter((p) => !p.agotado) });
  } catch (e) {
    console.error(e);
    send(res, 200, { configurado: false, productos: [] });
  }
}
