// Reseñas verificadas: solo puede opinar quien compró (con el link de su pedido). Se publican cuando las aprobás.
import { DB_URL, VENDIDOS, body, ensureSchema, permitido, q, send } from "../_lib.js";

const corto = (n) => { const [a, b] = String(n || "").trim().split(/\s+/); return a ? a + (b ? " " + b[0].toUpperCase() + "." : "") : "Cliente"; };

export default async function handler(req, res) {
  if (!DB_URL) return send(res, 200, { resenas: [] });
  try {
    await ensureSchema();
    if (req.method === "GET") {
      res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
      const prod = String(req.query.producto || "");
      const { rows } = prod
        ? await q("select r.*, p.name from tdv_resenas r left join tdv_productos p on p.id = r.producto where r.estado = 'aprobada' and r.producto = $1 order by r.creado desc limit 30", [prod])
        : await q("select r.*, p.name from tdv_resenas r left join tdv_productos p on p.id = r.producto where r.estado = 'aprobada' and r.texto <> '' order by r.creado desc limit 6");
      return send(res, 200, { resenas: rows.map((r) => ({ nombre: corto(r.nombre), estrellas: r.estrellas, texto: r.texto, fecha: r.creado, producto: r.producto, productoNombre: r.name || "" })) });
    }
    if (req.method !== "POST") return send(res, 405, { error: "metodo" });
    res.setHeader("Cache-Control", "no-store");
    const b = body(req);
    if (!(await permitido(req, "resena", 10))) return send(res, 429, { mensaje: "Probá de nuevo en un rato." });
    const { rows } = await q("select * from tdv_pedidos where num = $1 and token = $2", [String(b.num || ""), String(b.token || "")]);
    if (!rows.length) return send(res, 404, { mensaje: "No encontramos ese pedido." });
    const p = rows[0];
    if (!VENDIDOS.includes(p.estado)) return send(res, 409, { mensaje: "Vas a poder opinar cuando recibas tu pedido." });
    const ids = new Set(p.items.map((i) => i.id).filter(Boolean));
    let n = 0;
    for (const r of (Array.isArray(b.resenas) ? b.resenas : []).slice(0, 20)) {
      const e = parseInt(r.estrellas);
      if (!ids.has(r.producto) || !(e >= 1 && e <= 5)) continue;
      await q(`insert into tdv_resenas (num, producto, nombre, estrellas, texto) values ($1, $2, $3, $4, $5)
               on conflict (num, producto) do update set estrellas = excluded.estrellas, texto = excluded.texto, estado = 'pendiente', creado = now()`,
        [p.num, r.producto, String(b.nombre || p.cliente.nombre || "").slice(0, 60), e, String(r.texto || "").trim().slice(0, 800)]);
      n++;
    }
    send(res, 200, { ok: true, guardadas: n });
  } catch (e) { console.error(e); send(res, 500, { mensaje: "No se pudo guardar. Probá de nuevo." }); }
}
