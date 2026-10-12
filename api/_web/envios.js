// Mapa de envíos: cuántos pedidos salieron a cada provincia (solo totales, sin datos de nadie).
import { DB_URL, ensureSchema, q, send } from "../_lib.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  if (!DB_URL) return send(res, 200, { provincias: {} });
  try {
    await ensureSchema();
    const { rows } = await q(`select case when cliente->>'provincia' <> '' then cliente->>'provincia'
        when cliente->>'entrega' in ('Retiro en CABA', 'Envío en el día (CABA)') then 'CABA' else null end as prov, count(*)::int as n
      from tdv_pedidos where estado in ('pagado', 'enviado', 'entregado') group by 1`);
    send(res, 200, { provincias: Object.fromEntries(rows.filter((r) => r.prov).map((r) => [r.prov, r.n])) });
  } catch (e) { console.error(e); send(res, 200, { provincias: {} }); }
}
