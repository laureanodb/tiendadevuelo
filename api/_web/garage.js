// Venta de garage aeronáutica (/garage): lo que se cargó en el panel → Garage, más el WhatsApp de la tienda.
// Lo vendido se sigue mostrando 7 días con el sello VENDIDO y después deja de aparecer solo.
import fs from "node:fs";
import vm from "node:vm";
import { DB_URL, ensureSchema, q, send } from "../_lib.js";

let contacto = null;
function whatsapp() {
  if (contacto) return contacto;
  try {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(new URL("../../products.js", import.meta.url), "utf8") + ";this.__c=CONFIG", ctx);
    contacto = { whatsapp: ctx.__c.whatsapp, whatsappVisible: ctx.__c.whatsappVisible };
  } catch { contacto = { whatsapp: "", whatsappVisible: "" }; }
  return contacto;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "public, s-maxage=15, stale-while-revalidate=120");
  if (!DB_URL) return send(res, 200, { ...whatsapp(), articulos: [] });
  try {
    await ensureSchema();
    const { rows } = await q(`select id, nombre, precio, moneda, detalle, fotos, vendido from tdv_garage
      where visible and (vendido is null or vendido > now() - interval '7 days')
      order by (vendido is not null), orden, creado desc`);
    send(res, 200, {
      ...whatsapp(),
      articulos: rows.map((r) => ({ id: Number(r.id), nombre: r.nombre, precio: r.precio === null ? null : Number(r.precio), moneda: r.moneda, detalle: r.detalle, fotos: r.fotos || [], vendido: !!r.vendido })),
    });
  } catch (e) {
    console.error(e);
    send(res, 200, { ...whatsapp(), articulos: [] });
  }
}
