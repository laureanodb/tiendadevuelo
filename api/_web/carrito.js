// Carritos sin terminar: cuando alguien deja nombre y teléfono pero no manda el pedido, lo ves en el panel.
import { DB_URL, body, ensureSchema, permitido, q, send, telWa } from "../_lib.js";

const s = (v, n = 200) => String(v ?? "").trim().slice(0, n);

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return send(res, 405, { error: "metodo" });
  if (!DB_URL) return send(res, 200, { ok: false });
  try {
    const b = body(req);
    const id = s(b.id, 24), nombre = s(b.nombre, 80), tel = telWa(s(b.tel, 30));
    if (!/^[a-z0-9]{8,24}$/.test(id) || !nombre || tel.length < 10) return send(res, 400, { error: "datos" });
    const items = (Array.isArray(b.items) ? b.items : []).slice(0, 40).map((i) => ({ id: s(i.id, 80), name: s(i.name, 120), sub: s(i.sub, 200), qty: Math.min(99, Math.max(1, parseInt(i.qty) || 1)) }));
    if (!items.length) return send(res, 400, { error: "datos" });
    await ensureSchema();
    if (!(await permitido(req, "carrito", 40))) return send(res, 429, { ok: false });
    const total = Number(b.total) > 0 ? Math.round(Number(b.total)) : null;
    await q(`insert into tdv_carritos (id, nombre, tel, items, total) values ($1, $2, $3, $4, $5)
             on conflict (id) do update set nombre = excluded.nombre, tel = excluded.tel, items = excluded.items, total = excluded.total, actualizado = now()
             where tdv_carritos.estado = 'abierto'`, [id, nombre, tel, JSON.stringify(items), total]);
    send(res, 200, { ok: true });
  } catch (e) { console.error(e); send(res, 200, { ok: false }); }
}
