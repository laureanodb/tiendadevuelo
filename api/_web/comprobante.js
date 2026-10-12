// El cliente sube la foto o el PDF de su transferencia desde la página de su pedido. Se guarda en privado.
import { DB_URL, avisar, body, ensureSchema, fotosListas, permitido, q, send, subirPrivado } from "../_lib.js";

const TIPOS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return send(res, 405, { error: "metodo" });
  if (!DB_URL || !fotosListas()) return send(res, 503, { mensaje: "Por ahora mandanos el comprobante por WhatsApp." });
  try {
    const b = body(req);
    const ext = TIPOS[b.tipo];
    if (!ext || typeof b.archivo !== "string") return send(res, 400, { mensaje: "Subí una foto o un PDF del comprobante." });
    const buf = Buffer.from(b.archivo, "base64");
    if (buf.length < 500 || buf.length > 3.2e6) return send(res, 400, { mensaje: "El archivo es muy grande. Probá con una captura de pantalla." });
    await ensureSchema();
    const { rows } = await q("select num, comprobantes, estado from tdv_pedidos where num = $1 and token = $2", [String(b.num || ""), String(b.token || "")]);
    if (!rows.length) return send(res, 404, { mensaje: "No encontramos ese pedido." });
    const p = rows[0];
    if (p.estado === "cancelado") return send(res, 409, { mensaje: "Este pedido está cancelado. Escribinos por WhatsApp." });
    if ((p.comprobantes || []).length >= 6) return send(res, 409, { mensaje: "Ya recibimos varios comprobantes. Si falta alguno, mandalo por WhatsApp." });
    if (!(await permitido(req, "comprobante", 10))) return send(res, 429, { mensaje: "Probá de nuevo en un rato." });
    const path = `${p.num}/${Date.now()}.${ext}`;
    await subirPrivado(path, buf, b.tipo);
    const nuevo = { path, tipo: b.tipo, at: new Date().toISOString(), visto: false };
    await q("update tdv_pedidos set comprobantes = comprobantes || $2::jsonb where num = $1", [p.num, JSON.stringify([nuevo])]);
    await avisar(`💳 Comprobante de pago del pedido ${p.num}. Revisalo en el panel: https://www.tiendadevuelo.com.ar/panel#pedidos`);
    send(res, 200, { ok: true, total: (p.comprobantes || []).length + 1 });
  } catch (e) { console.error(e); send(res, 500, { mensaje: "No se pudo subir. Probá de nuevo o mandalo por WhatsApp." }); }
}
