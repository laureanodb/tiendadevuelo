// Panel: pedidos con resumen de ventas (GET), cambios de estado, cobro y envío (POST).
import { ESTADOS, VENDIDOS, anotar, body, panel, pedidoAdmin, q, send } from "../_lib.js";

const TZ = "America/Argentina/Buenos_Aires";
const n = (v) => (v === null || v === undefined || v === "" || !isFinite(Number(v)) ? null : Math.max(0, Number(v)));

export default panel(async (req, res) => {
  if (req.method === "GET") {
    const { rows } = await q("select * from tdv_pedidos order by creado desc limit 300");
    const { rows: r } = await q(`
      select
        coalesce(sum(cobrado_ars) filter (where (pagado_en at time zone $1)::date = (now() at time zone $1)::date), 0) as hoy_ars,
        coalesce(sum(cobrado_usd) filter (where (pagado_en at time zone $1)::date = (now() at time zone $1)::date), 0) as hoy_usd,
        count(*) filter (where (pagado_en at time zone $1)::date = (now() at time zone $1)::date) as hoy_n,
        coalesce(sum(cobrado_ars) filter (where date_trunc('month', pagado_en at time zone $1) = date_trunc('month', now() at time zone $1)), 0) as mes_ars,
        coalesce(sum(cobrado_usd) filter (where date_trunc('month', pagado_en at time zone $1) = date_trunc('month', now() at time zone $1)), 0) as mes_usd,
        count(*) filter (where date_trunc('month', pagado_en at time zone $1) = date_trunc('month', now() at time zone $1)) as mes_n,
        coalesce(sum(cobrado_ars) filter (where date_trunc('month', pagado_en at time zone $1) = date_trunc('month', (now() at time zone $1) - interval '1 month')), 0) as ant_ars,
        coalesce(sum(cobrado_usd) filter (where date_trunc('month', pagado_en at time zone $1) = date_trunc('month', (now() at time zone $1) - interval '1 month')), 0) as ant_usd
      from tdv_pedidos where estado = any($2) and pagado_en is not null`, [TZ, VENDIDOS]);
    const x = r[0];
    return send(res, 200, {
      pedidos: rows.map(pedidoAdmin),
      resumen: { hoy: { ars: +x.hoy_ars, usd: +x.hoy_usd, n: +x.hoy_n }, mes: { ars: +x.mes_ars, usd: +x.mes_usd, n: +x.mes_n }, anterior: { ars: +x.ant_ars, usd: +x.ant_usd } },
    });
  }
  if (req.method !== "POST") return send(res, 405, { error: "metodo" });

  const b = body(req);
  const { rows } = await q("select * from tdv_pedidos where num = $1", [String(b.num || "")]);
  if (!rows.length) return send(res, 404, { error: "no_encontrado", mensaje: "No encontré ese pedido." });
  const p = rows[0];

  // Descontar del stock los productos del pedido (una sola vez)
  if (b.accion === "descontar") {
    if (p.stock_descontado) return send(res, 409, { mensaje: "Este pedido ya se descontó del stock." });
    for (const it of p.items) {
      const ids = it.kit ? String(it.sub || "").split(",").map((x) => x.trim()) : [it.id];
      if (it.kit) {
        // en los kits se guardan los nombres: se descuenta por nombre
        for (const nombre of ids) await q("update tdv_productos set stock = greatest(stock - $2, 0), actualizado = now() where name = $1 and stock is not null", [nombre, it.qty]);
      } else await q("update tdv_productos set stock = greatest(stock - $2, 0), actualizado = now() where id = $1 and stock is not null", [it.id, it.qty]);
    }
    await q("update tdv_pedidos set stock_descontado = true where num = $1", [p.num]);
    const { rows: u } = await q("select * from tdv_pedidos where num = $1", [p.num]);
    return send(res, 200, { pedido: pedidoAdmin(u[0]) });
  }

  const estado = ESTADOS.includes(b.estado) ? b.estado : p.estado;
  const historial = [...p.historial];
  if (estado !== p.estado) historial.push({ estado, at: new Date().toISOString() });
  const vendido = VENDIDOS.includes(estado);
  const { rows: u } = await q(`update tdv_pedidos set estado = $2, cobrado_ars = $3, cobrado_usd = $4,
      pagado_en = case when $5 then coalesce(pagado_en, now()) else null end,
      envio_empresa = $6, envio_codigo = $7, enviado_en = case when $2 in ('enviado', 'entregado') then coalesce(enviado_en, now()) else enviado_en end,
      notas = $8, historial = $9 where num = $1 returning *`,
    [p.num, estado, n(b.cobradoArs), n(b.cobradoUsd), vendido, String(b.envioEmpresa ?? p.envio_empresa).slice(0, 60), String(b.envioCodigo ?? p.envio_codigo).slice(0, 80),
      String(b.notas ?? p.notas).slice(0, 1000), JSON.stringify(historial)]);
  if (estado !== p.estado) await anotar("pedido", p.num, p.cliente.nombre || p.num, `Estado: ${p.estado} → ${estado}`);
  send(res, 200, { pedido: pedidoAdmin(u[0]) });
});
