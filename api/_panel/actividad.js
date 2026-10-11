// Panel: qué buscan y no encuentran, y qué productos consultan (últimos 30 días).
import { panel, q, send } from "../_lib.js";

export default panel(async (req, res) => {
  const { rows: busq } = await q(`select dato, count(*)::int as n, max(creado) as ultima from tdv_eventos
    where tipo = 'busqueda_vacia' and creado > now() - interval '30 days' and dato <> '' group by dato order by n desc, ultima desc limit 40`);
  const { rows: cons } = await q(`select e.producto, coalesce(p.name, e.producto) as name, count(*)::int as n,
      count(*) filter (where e.tipo = 'lo_quiero')::int as quiero
    from tdv_eventos e left join tdv_productos p on p.id = e.producto
    where e.tipo in ('consulta', 'lo_quiero') and e.creado > now() - interval '30 days' and e.producto <> ''
    group by e.producto, p.name order by n desc limit 40`);
  send(res, 200, { busquedas: busq, consultas: cons });
});
