// Panel: subir o bajar precios en bloque (por porcentaje), por moneda y categoría.
import { anotar, body, panel, q, send } from "../_lib.js";

export default panel(async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "metodo" });
  const { porcentaje, moneda, cat } = body(req);
  const pct = Number(porcentaje);
  if (!isFinite(pct) || pct === 0 || pct < -90 || pct > 300) return send(res, 400, { error: "datos", mensaje: "Poné un porcentaje entre -90 y 300." });
  const f = 1 + pct / 100;
  const filtroCat = cat ? " and cat = $2" : "";
  const params = cat ? [f, cat] : [f];
  const { rows: antes } = await q(`select id, usd, ars from tdv_productos where (usd is not null or ars is not null)${filtroCat ? " and cat = $1" : ""}`, cat ? [cat] : []);
  let n = 0;
  if (moneda !== "ARS") n += (await q(`update tdv_productos set usd = round(usd * $1, 2), actualizado = now() where usd is not null${filtroCat}`, params)).rowCount;
  if (moneda !== "USD") n += (await q(`update tdv_productos set ars = round(ars * $1 / 100) * 100, actualizado = now() where ars is not null${filtroCat}`, params)).rowCount;
  await anotar("precios", cat || "", cat || "Todas las categorías", `Precios ${pct > 0 ? "+" : ""}${pct}% (${moneda === "USD" ? "solo dólares" : moneda === "ARS" ? "solo pesos" : "dólares y pesos"})`, antes);
  send(res, 200, { ok: true, cambiados: n });
});
