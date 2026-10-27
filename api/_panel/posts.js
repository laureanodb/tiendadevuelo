// Panel: agenda de Instagram. GET lista y estado; POST acciones (generar, guardar, aprobar, descartar, publicar, config).
import { body, guardarAjuste, panel, q, send } from "../_lib.js";
import { configRedes, cuentaInstagram, generarBorradores, igListo, publicar } from "../_redes.js";

const fila = (r) => ({ id: r.id, programado: r.programado ? new Date(r.programado).toISOString().slice(0, 10) : null, producto: r.producto, texto: r.texto, fotos: r.fotos, estado: r.estado, permalink: r.permalink, error: r.error, publicado: r.publicado });

export default panel(async (req, res) => {
  if (req.method === "GET") {
    const { rows } = await q(`select * from tdv_posts where estado <> 'descartado' and (programado >= current_date - 30 or publicado > now() - interval '30 days')
      order by programado nulls last, id limit 60`);
    let cuenta = null, errorCuenta = "";
    if (igListo()) { try { cuenta = await cuentaInstagram(); } catch (e) { errorCuenta = e.message; } }
    return send(res, 200, { posts: rows.map(fila), config: await configRedes(), conectado: igListo(), cuenta, errorCuenta, ia: !!process.env.ANTHROPIC_API_KEY });
  }
  if (req.method !== "POST") return send(res, 405, { error: "metodo" });
  const b = body(req), id = Number(b.id) || 0;
  const dueno = !!req.usuario?.dueno;
  switch (b.accion) {
    case "generar": {
      const n = Math.min(4, Math.max(1, Number(b.cuantos) || 2));
      const nuevos = await generarBorradores({ cuantos: n });
      return send(res, 200, { nuevos: nuevos.length, mensaje: nuevos.length ? "" : "La agenda de las próximas dos semanas ya está completa." });
    }
    case "guardar": {
      const fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(b.programado || "")) ? b.programado : null;
      await q("update tdv_posts set texto = $2, programado = $3 where id = $1 and estado in ('borrador', 'aprobado', 'error')", [id, String(b.texto || "").slice(0, 2200), fecha]);
      return send(res, 200, { ok: true });
    }
    case "aprobar":
      await q("update tdv_posts set estado = 'aprobado', error = '' where id = $1 and estado in ('borrador', 'error')", [id]);
      return send(res, 200, { ok: true });
    case "borrador":
      await q("update tdv_posts set estado = 'borrador' where id = $1 and estado = 'aprobado'", [id]);
      return send(res, 200, { ok: true });
    case "descartar":
      await q("update tdv_posts set estado = 'descartado' where id = $1 and estado <> 'publicado'", [id]);
      return send(res, 200, { ok: true });
    case "publicar": {
      if (!dueno) return send(res, 403, { mensaje: "Solo el dueño puede publicar." });
      const { rows: [p] } = await q("select * from tdv_posts where id = $1 and estado <> 'publicado'", [id]);
      if (!p) return send(res, 404, { mensaje: "No encontré esa publicación." });
      try { return send(res, 200, await publicar(p)); }
      catch (e) { await q("update tdv_posts set estado = 'error', error = $2 where id = $1", [id, String(e.message).slice(0, 300)]); return send(res, 502, { mensaje: e.message }); }
    }
    case "config": {
      if (!dueno) return send(res, 403, { mensaje: "Solo el dueño cambia la configuración." });
      const c = b.config || {};
      const dias = (Array.isArray(c.dias) ? c.dias : []).map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
      await guardarAjuste("instagram", { dias: dias.length ? [...new Set(dias)].sort() : [2, 5], auto: !!c.auto, ia: c.ia !== false });
      return send(res, 200, { ok: true });
    }
    default: return send(res, 400, { mensaje: "Acción desconocida." });
  }
});
