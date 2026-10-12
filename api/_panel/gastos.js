// Panel: gastos del negocio (GET últimos 13 meses, POST agregar, DELETE ?id=) y suscriptores por mail (GET ?suscriptores=1).
import { body, panel, q, send } from "../_lib.js";

export const CATEGORIAS = ["Envíos", "Publicidad", "Embalaje", "Impuestos", "Servicios", "Comisiones", "Otros"];
export default panel(async (req, res) => {
  if (req.method === "GET" && req.query.suscriptores) {
    const { rows } = await q("select email, origen, creado from tdv_suscriptores order by creado desc");
    return send(res, 200, { suscriptores: rows });
  }
  if (req.method === "GET") {
    const { rows } = await q("select * from tdv_gastos where fecha > current_date - interval '13 months' order by fecha desc, id desc");
    return send(res, 200, { categorias: CATEGORIAS, gastos: rows.map((r) => ({ id: r.id, fecha: new Date(r.fecha).toISOString().slice(0, 10), concepto: r.concepto, categoria: r.categoria, monto: Number(r.monto), moneda: r.moneda })) });
  }
  if (req.method === "DELETE") { await q("delete from tdv_gastos where id = $1", [parseInt(req.query.id) || 0]); return send(res, 200, { ok: true }); }
  const b = body(req);
  const monto = Number(b.monto), concepto = String(b.concepto || "").trim().slice(0, 120);
  if (!concepto || !(monto > 0)) return send(res, 400, { mensaje: "Poné el concepto y el monto." });
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(b.fecha || "")) ? b.fecha : new Date().toISOString().slice(0, 10);
  await q("insert into tdv_gastos (fecha, concepto, categoria, monto, moneda) values ($1, $2, $3, $4, $5)",
    [fecha, concepto, CATEGORIAS.includes(b.categoria) ? b.categoria : "Otros", monto, b.moneda === "USD" ? "USD" : "ARS"]);
  send(res, 200, { ok: true });
});
