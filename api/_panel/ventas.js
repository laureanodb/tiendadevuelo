// Panel: ventas de los últimos 25 meses para los gráficos (se calculan en el navegador con el dólar del día).
import { VENDIDOS, panel, q, send } from "../_lib.js";

export default panel(async (req, res) => {
  const { rows } = await q(`select num, pagado_en, cobrado_ars, cobrado_usd, total_ars, items from tdv_pedidos
    where estado = any($1) and pagado_en > now() - interval '25 months' order by pagado_en`, [VENDIDOS]);
  const n = (v) => (v === null ? null : Number(v));
  send(res, 200, { ventas: rows.map((r) => ({ num: r.num, fecha: r.pagado_en, ars: n(r.cobrado_ars), usd: n(r.cobrado_usd), total: n(r.total_ars), items: r.items })) });
});
