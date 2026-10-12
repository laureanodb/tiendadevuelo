// Panel: muestra un comprobante subido por el cliente (están guardados en privado) y lo marca como visto.
import { bajarPrivado, panel, q, send } from "../_lib.js";

export default panel(async (req, res) => {
  const { rows } = await q("select comprobantes from tdv_pedidos where num = $1", [String(req.query.num || "")]);
  const i = parseInt(req.query.i);
  const c = rows[0]?.comprobantes?.[i];
  if (!c) return send(res, 404, { mensaje: "No encontré ese comprobante." });
  const f = await bajarPrivado(c.path);
  if (!f) return send(res, 404, { mensaje: "No se pudo abrir el comprobante." });
  if (!c.visto) await q(`update tdv_pedidos set comprobantes = jsonb_set(comprobantes, $2, 'true') where num = $1`, [String(req.query.num), `{${i},visto}`]);
  res.setHeader("Content-Type", c.tipo || f.type);
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.setHeader("Content-Disposition", "inline");
  res.status(200).send(f.buffer);
});
