// Resumen del día a tu WhatsApp (lo dispara Vercel todos los días a las 20 h; ver "crons" en vercel.json).
import { DB_URL, avisar, avisosListos, ensureSchema, q, send } from "../_lib.js";

const TZ = "America/Argentina/Buenos_Aires";
const pesos = (n) => "$" + Math.round(Number(n) || 0).toLocaleString("es-AR");

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  // Solo Vercel (o quien tenga la clave) puede dispararlo
  const secreto = process.env.CRON_SECRET;
  if (!secreto || req.headers.authorization !== `Bearer ${secreto}`) return send(res, 401, { error: "sin_permiso" });
  if (!DB_URL || !avisosListos()) return send(res, 200, { enviado: false });
  await ensureSchema();
  const hoy = `(creado at time zone '${TZ}')::date = (now() at time zone '${TZ}')::date`;
  const [{ rows: [p] }, { rows: [v] }, { rows: [c] }, { rows: [k] }, { rows: [o] }] = await Promise.all([
    q(`select count(*)::int as n from tdv_pedidos where ${hoy}`),
    q(`select count(*)::int as n, coalesce(sum(cobrado_ars), 0) as ars, coalesce(sum(cobrado_usd), 0) as usd from tdv_pedidos
       where estado in ('pagado', 'enviado', 'entregado') and (pagado_en at time zone '${TZ}')::date = (now() at time zone '${TZ}')::date`),
    q(`select count(*)::int as n from tdv_pedidos where exists (select 1 from jsonb_array_elements(comprobantes) x where (x->>'visto')::boolean is not true)`),
    q(`select count(*)::int as n from tdv_carritos where estado = 'abierto' and ${hoy.replace("creado", "actualizado")}`),
    q(`select (select count(*) from tdv_resenas where estado = 'pendiente') + (select count(*) from tdv_preguntas where estado = 'pendiente') as n`),
  ]);
  const { rows: [nuevos] } = await q(`select count(*)::int as n from tdv_pedidos where estado = 'nuevo'`);
  const lineas = [
    `✈ Resumen de hoy en Tienda de Vuelo`,
    `Pedidos nuevos: ${p.n}`,
    `Ventas cobradas: ${v.n}${v.n ? ` (${pesos(v.ars)}${Number(v.usd) ? " + US$ " + Number(v.usd) : ""})` : ""}`,
    nuevos.n ? `Sin atender: ${nuevos.n}` : "",
    c.n ? `Comprobantes por revisar: ${c.n}` : "",
    k.n ? `Carritos sin terminar hoy: ${k.n}` : "",
    Number(o.n) ? `Opiniones y preguntas por responder: ${o.n}` : "",
    "https://www.tiendadevuelo.com.ar/panel",
  ].filter(Boolean);
  send(res, 200, { enviado: await avisar(lineas.join("\n")) });
}
