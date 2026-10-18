// Resumen del día a tu WhatsApp (lo dispara Vercel todos los días a las 20 h; ver "crons" en vercel.json).
import { DB_URL, armarRespaldo, avisar, avisosListos, borrarPrivado, ensureSchema, fotosListas, listarPrivado, q, send, subirPrivado } from "../_lib.js";

const TZ = "America/Argentina/Buenos_Aires";
const pesos = (n) => "$" + Math.round(Number(n) || 0).toLocaleString("es-AR");

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  // Solo Vercel (o quien tenga la clave) puede dispararlo
  const secreto = process.env.CRON_SECRET;
  if (!secreto || req.headers.authorization !== `Bearer ${secreto}`) return send(res, 401, { error: "sin_permiso" });
  if (!DB_URL) return send(res, 200, { enviado: false });
  await ensureSchema();
  const dia = Number(new Intl.DateTimeFormat("es-AR", { timeZone: TZ, day: "numeric" }).format(new Date()));
  const domingo = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(new Date()) === "Sun";
  // 1) Control de la web en vivo: si algo falla, aviso aparte
  const fallas = await controlarWeb();
  if (fallas.length) await avisar(`⚠ Revisá la web: algo no anda\n${fallas.map((f) => "· " + f).join("\n")}`);
  // 2) Copia de seguridad semanal (domingos): se guardan las últimas 8
  let respaldo = false;
  if (domingo && fotosListas()) {
    try {
      await subirPrivado(`respaldos/${new Date().toISOString().slice(0, 10)}.json`, Buffer.from(JSON.stringify(await armarRespaldo())), "application/json");
      respaldo = true;
      const viejas = (await listarPrivado("respaldos/")).slice(8);
      if (viejas.length) await borrarPrivado(viejas.map((x) => `respaldos/${x.nombre}`));
    } catch (e) { console.error(e); await avisar("⚠ No se pudo guardar la copia de seguridad semanal."); }
  }
  if (!avisosListos()) return send(res, 200, { enviado: false, fallas, respaldo });
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
  ];
  if (respaldo) lineas.push("💾 Copia de seguridad semanal guardada");
  // El día 1 de cada mes, además, el control de calidad del catálogo.
  if (dia === 1) {
    const { rows: [k2] } = await q(`select count(*)::int as total,
      count(*) filter (where usd is null and ars is null)::int as sin_precio,
      count(*) filter (where cardinality(fotos) = 0)::int as sin_foto,
      count(*) filter (where length(descr) < 80)::int as sin_desc
      from tdv_productos where visible`);
    lineas.push(`📋 Control de calidad del mes (${k2.total} productos visibles)`,
      k2.sin_precio ? `Sin precio: ${k2.sin_precio}` : "", k2.sin_foto ? `Sin foto: ${k2.sin_foto}` : "", k2.sin_desc ? `Descripción corta: ${k2.sin_desc}` : "",
      !k2.sin_precio && !k2.sin_foto && !k2.sin_desc ? "Todo completo 👌" : "Detalle en Panel → Actividad");
  }
  lineas.push("https://www.tiendadevuelo.com.ar/panel");
  const texto = lineas.filter(Boolean).join("\n");
  send(res, 200, { enviado: await avisar(texto), fallas, respaldo });
}

// Prueba las partes clave de la web publicada, como lo haría un cliente
async function controlarWeb() {
  const SITIO = "https://www.tiendadevuelo.com.ar", fallas = [];
  const probar = async (nombre, url, ok) => {
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 15000);
      const r = await fetch(url, { signal: ctl.signal, headers: { "user-agent": "TiendaDeVuelo-Control/1.0" } }); clearTimeout(t);
      if (!r.ok) return fallas.push(`${nombre}: respondió ${r.status}`);
      const txt = ok ? await r.text() : "";
      if (ok && !ok(txt)) fallas.push(`${nombre}: no tiene el contenido esperado`);
      return txt;
    } catch { fallas.push(`${nombre}: no responde`); }
  };
  await probar("Portada", SITIO + "/", (t) => t.includes("Tienda de Vuelo"));
  const cat = await probar("Catálogo", SITIO + "/api/productos", (t) => { try { return JSON.parse(t).productos.length > 0; } catch { return false; } });
  let foto = "";
  try { foto = (JSON.parse(cat || "{}").productos || []).flatMap((p) => p.fotos || [])[0] || ""; } catch {}
  if (foto) await probar("Fotos de productos", foto.startsWith("http") ? foto : SITIO + foto);
  await probar("Página de producto", SITIO + "/producto/bose-a30", (t) => t.includes("og:image"));
  await probar("Feed de Google Shopping", SITIO + "/google-shopping.tsv", (t) => t.startsWith("id\t"));
  await probar("Panel", SITIO + "/panel");
  return fallas;
}
