// Suscripción a novedades por mail (se descarga desde el panel → Ventas).
import { DB_URL, body, ensureSchema, permitido, q, send } from "../_lib.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return send(res, 405, { error: "metodo" });
  if (!DB_URL) return send(res, 503, { mensaje: "Probá más tarde." });
  try {
    const b = body(req);
    if (b.web) return send(res, 200, { ok: true }); // campo trampa para robots
    const email = String(b.email || "").trim().toLowerCase().slice(0, 120);
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(email)) return send(res, 400, { mensaje: "Revisá el mail." });
    await ensureSchema();
    if (!(await permitido(req, "suscribir", 5))) return send(res, 429, { mensaje: "Probá de nuevo en un rato." });
    await q("insert into tdv_suscriptores (email, origen) values ($1, $2) on conflict (email) do nothing", [email, String(b.origen || "").slice(0, 40)]);
    send(res, 200, { ok: true });
  } catch (e) { console.error(e); send(res, 500, { mensaje: "No se pudo guardar. Probá de nuevo." }); }
}
