// "Pedime el precio": el cliente deja nombre y WhatsApp; aparece en el panel (Pedidos) y te llega un aviso.
import { DB_URL, avisar, body, ensureSchema, permitido, q, send, telWa } from "../_lib.js";

const s = (v, n = 120) => String(v ?? "").trim().slice(0, n);
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return send(res, 405, { error: "metodo" });
  if (!DB_URL) return send(res, 503, { error: "sin_base" });
  try {
    const b = body(req);
    if (b.web) return send(res, 200, { ok: true });
    const cliente = s(b.cliente, 80), tel = telWa(s(b.tel, 30)), producto = s(b.producto, 80);
    if (!cliente || tel.length < 10 || !producto) return send(res, 400, { mensaje: "Completá tu nombre y WhatsApp." });
    await ensureSchema();
    if (!(await permitido(req, "consulta", 10))) return send(res, 429, { mensaje: "Probá de nuevo en un rato." });
    // Presupuesto con instalación: lleva avión, matrícula y lugar en el detalle (más largo)
    const largo = b.instalacion ? 400 : 80, opcion = s(b.opcion, largo);
    await q("insert into tdv_consultas (producto, producto_nombre, opcion, cliente, tel) values ($1, $2, $3, $4, $5)", [producto, s(b.nombre), opcion, cliente, tel]);
    await avisar(`${b.instalacion ? "🛠️ Presupuesto con instalación" : "💬 Piden precio"}: ${s(b.nombre)}${opcion ? " (" + opcion + ")" : ""}\n${cliente} · wa.me/${tel}\nhttps://www.tiendadevuelo.com.ar/panel#pedidos`);
    send(res, 200, { ok: true });
  } catch (e) { console.error(e); send(res, 500, { mensaje: "No se pudo enviar." }); }
}
