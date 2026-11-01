// Panel: tablero de hoy (todo lo pendiente en una pantalla) y agenda de entregas, retiros y turnos de los próximos 14 días.
import { ajuste, panel, pedidoAdmin, q, send } from "../_lib.js";

const TZ = "America/Argentina/Buenos_Aires";
export default panel(async (req, res) => {
  const hoy = (await q(`select (now() at time zone '${TZ}')::date::text as d`)).rows[0].d;
  const [ped, turnos, consultas, resenas, preguntas, posts, google] = await Promise.all([
    q("select * from tdv_pedidos where estado <> 'cancelado' and creado > now() - interval '120 days' order by creado desc"),
    q("select * from tdv_turnos where estado = 'reservado' and fecha between current_date - 1 and current_date + 14 order by fecha, hora"),
    q("select count(*)::int as n from tdv_consultas where estado = 'nueva'"),
    q("select count(*)::int as n from tdv_resenas where estado = 'pendiente'"),
    q("select count(*)::int as n from tdv_preguntas where estado = 'pendiente'"),
    q(`select id, producto, estado from tdv_posts where programado = (now() at time zone '${TZ}')::date and estado in ('borrador', 'aprobado')`),
    ajuste("google", {}),
  ]);
  const pedidos = ped.rows.map(pedidoAdmin);
  const dias = (f) => Math.floor((Date.now() - new Date(f).getTime()) / 864e5);
  const entregadoEn = (p) => [...(p.historial || [])].reverse().find((h) => h.estado === "entregado")?.at;
  const entregados = pedidos.filter((p) => p.estado === "entregado" && entregadoEn(p));
  const fechaDe = (p) => p.cliente.fechaEntrega || null;
  send(res, 200, {
    hoy,
    nuevos: pedidos.filter((p) => p.estado === "nuevo").slice(0, 20),
    comprobantes: pedidos.filter((p) => (p.comprobantes || []).some((c) => !c.visto)).slice(0, 20),
    despachar: pedidos.filter((p) => p.estado === "pagado").slice(0, 20),
    agenda: [
      ...pedidos.filter((p) => !["entregado", "cancelado"].includes(p.estado) && fechaDe(p)).map((p) => ({ tipo: "entrega", fecha: fechaDe(p), num: p.num, nombre: p.cliente.nombre, detalle: p.cliente.entrega })),
      ...pedidos.filter((p) => !["entregado", "cancelado"].includes(p.estado) && !p.cliente.fechaEntrega && /retiro|en el día/i.test(p.cliente.entrega || "") && p.cliente.franja).map((p) => ({ tipo: /retiro/i.test(p.cliente.entrega) ? "retiro" : "moto", fecha: null, franja: p.cliente.franja, num: p.num, nombre: p.cliente.nombre, detalle: p.cliente.entrega })),
      ...turnos.rows.map((t) => ({ tipo: "turno", fecha: new Date(t.fecha).toISOString().slice(0, 10), hora: t.hora, nombre: t.nombre, tel: t.tel, detalle: `${t.modo} · ${t.tema}` })),
    ],
    pendientes: { consultas: consultas.rows[0].n, resenas: resenas.rows[0].n, preguntas: preguntas.rows[0].n, posts: posts.rows.length },
    // Seguimiento postventa: agradecer (0-7 días), pedir reseña en Google (8-20 días), "¿cómo te fue?" (25-45 días)
    gracias: entregados.filter((p) => !p.seguimiento.gracias && dias(entregadoEn(p)) <= 7).slice(0, 15),
    googleResena: google.link ? entregados.filter((p) => !p.seguimiento.google && dias(entregadoEn(p)) >= 8 && dias(entregadoEn(p)) <= 20).slice(0, 15) : [],
    comoTeFue: entregados.filter((p) => !p.seguimiento.como && dias(entregadoEn(p)) >= 25 && dias(entregadoEn(p)) <= 45).slice(0, 15),
    googleLink: google.link || "",
  });
});
