// Registro liviano de actividad: búsquedas sin resultado y consultas por producto.
import { DB_URL, body, ensureSchema, q, send } from "./_lib.js";

const TIPOS = ["busqueda_vacia", "consulta", "lo_quiero"];
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST" || !DB_URL) return send(res, 204, {});
  try {
    const b = body(req);
    if (!TIPOS.includes(b.tipo)) return send(res, 400, { error: "tipo" });
    await ensureSchema();
    await q("insert into tdv_eventos (tipo, dato, producto) values ($1, $2, $3)", [b.tipo, String(b.dato || "").trim().toLowerCase().slice(0, 80), String(b.producto || "").slice(0, 80)]);
    send(res, 200, { ok: true });
  } catch (e) { console.error(e); send(res, 200, { ok: false }); }
}
