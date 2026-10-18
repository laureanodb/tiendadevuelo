// Panel: clientes armados desde los pedidos (GET) y sus datos extra: cumpleaños, escuela, notas (POST).
import { VENDIDOS, body, nivel, panel, q, send } from "../_lib.js";

export default panel(async (req, res) => {
  if (req.method === "GET") {
    const { rows } = await q(`
      select c.*, count(p.num) filter (where p.estado = any($1)) as compras, count(p.num) as pedidos,
        coalesce(sum(p.cobrado_ars) filter (where p.estado = any($1)), 0) as total_ars,
        coalesce(sum(p.cobrado_usd) filter (where p.estado = any($1)), 0) as total_usd,
        max(p.creado) as ultimo
      from tdv_clientes c left join tdv_pedidos p on p.cliente_tel = c.tel
      group by c.tel order by max(p.creado) desc nulls last limit 1000`, [VENDIDOS]);
    // Quién trajo a quién (ventas cobradas con su código) y lo que compró cada uno, para sugerir la recompra
    const { rows: refs } = await q(`select ref, count(*)::int as n from tdv_pedidos where ref <> '' and estado = any($1) group by ref`, [VENDIDOS]);
    const porRef = Object.fromEntries(refs.map((r) => [r.ref, r.n]));
    const { rows: compras } = await q(`select cliente_tel as tel, coalesce(pagado_en, creado) as fecha, items from tdv_pedidos
      where estado = any($1) and creado > now() - interval '3 years' order by creado`, [VENDIDOS]);
    const comprasDe = {};
    for (const c of compras) (comprasDe[c.tel] ||= []).push({ fecha: c.fecha, items: (c.items || []).map((i) => ({ id: i.id, kit: i.kit, name: i.name })) });
    return send(res, 200, { clientes: rows.map((r) => ({
      tel: r.tel, nombre: r.nombre, dni: r.dni, cumple: r.cumple ? new Date(r.cumple).toISOString().slice(0, 10) : null, escuela: r.escuela, notas: r.notas,
      codigo: r.codigo || "", recomendados: porRef[r.codigo] || 0, recordado: r.recordado, historial: comprasDe[r.tel] || [],
      compras: +r.compras, pedidos: +r.pedidos, totalArs: +r.total_ars, totalUsd: +r.total_usd, ultimo: r.ultimo, nivel: nivel(+r.compras),
    })) });
  }
  if (req.method !== "POST") return send(res, 405, { error: "metodo" });
  const b = body(req);
  if (b.recordado) {
    const { rowCount } = await q("update tdv_clientes set recordado = now() where tel = $1", [String(b.tel || "")]);
    return rowCount ? send(res, 200, { ok: true }) : send(res, 404, { mensaje: "No encontré ese cliente." });
  }
  const cumple = /^\d{4}-\d{2}-\d{2}$/.test(String(b.cumple || "")) ? b.cumple : null;
  const { rowCount } = await q("update tdv_clientes set nombre = coalesce(nullif($2, ''), nombre), cumple = $3, escuela = $4, notas = $5 where tel = $1",
    [String(b.tel || ""), String(b.nombre || "").slice(0, 80), cumple, String(b.escuela || "").slice(0, 80), String(b.notas || "").slice(0, 1000)]);
  if (!rowCount) return send(res, 404, { mensaje: "No encontré ese cliente." });
  send(res, 200, { ok: true });
});
