// Turnos de asesoramiento: GET devuelve días y horarios libres; POST reserva uno (llega al panel y por WhatsApp).
import { DB_URL, avisar, body, configTurnos, ensureSchema, permitido, q, send, telWa } from "../_lib.js";

const TZ = "America/Argentina/Buenos_Aires";
const s = (v, n = 120) => String(v ?? "").trim().slice(0, n);
const MODOS = ["Llamada por WhatsApp", "Videollamada por WhatsApp"];
const TEMAS = ["Elegir auricular", "Aviónica e instalación", "Equipo para el curso", "Radios y navegación", "Otro"];
const hoyAR = () => new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
const fecha = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

async function disponibles() {
  const cfg = await configTurnos();
  const { rows } = await q("select fecha, hora from tdv_turnos where estado = 'reservado' and fecha >= current_date - 1");
  const ocupados = new Set(rows.map((r) => `${fecha(new Date(r.fecha))} ${r.hora}`));
  const ahora = hoyAR(), dias = [];
  for (let i = 0; i < 21 && dias.length < 10; i++) {
    const d = new Date(ahora); d.setDate(ahora.getDate() + i);
    if (!cfg.dias.includes(d.getDay())) continue;
    const f = fecha(d);
    // Hoy solo los horarios que faltan (con 2 horas de margen)
    const horas = cfg.horas.filter((h) => !ocupados.has(`${f} ${h}`) && (i > 0 || Number(h.slice(0, 2)) >= ahora.getHours() + 2));
    if (horas.length) dias.push({ fecha: f, horas });
  }
  return { activo: cfg.activo, dias, modos: MODOS, temas: TEMAS };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!DB_URL) return send(res, 503, { error: "sin_base" });
  await ensureSchema();
  if (req.method === "GET") return send(res, 200, await disponibles());
  if (req.method !== "POST") return send(res, 405, { error: "metodo" });
  const b = body(req);
  if (b.web) return send(res, 200, { ok: true });
  const nombre = s(b.nombre, 80), tel = telWa(s(b.tel, 30)), f = s(b.fecha, 10), h = s(b.hora, 5);
  const modo = MODOS.includes(b.modo) ? b.modo : MODOS[0], tema = TEMAS.includes(b.tema) ? b.tema : "Otro", detalle = s(b.detalle, 200);
  if (!nombre || tel.length < 10) return send(res, 400, { mensaje: "Completá tu nombre y WhatsApp." });
  if (!(await permitido(req, "turno", 5))) return send(res, 429, { mensaje: "Probá de nuevo en un rato." });
  const libre = (await disponibles()).dias.find((d) => d.fecha === f)?.horas.includes(h);
  if (!libre) return send(res, 409, { mensaje: "Ese horario ya no está disponible. Elegí otro." });
  await q("insert into tdv_turnos (fecha, hora, modo, tema, nombre, tel) values ($1, $2, $3, $4, $5, $6)", [f, h, modo, tema, nombre, tel]);
  const fd = new Date(f + "T12:00:00");
  const cuando = `${fd.toLocaleDateString("es-AR", { weekday: "long" })} ${fd.getDate()}/${fd.getMonth() + 1} a las ${h} h`;
  // También aparece en el panel junto a las consultas de precio
  await q("insert into tdv_consultas (producto, producto_nombre, opcion, cliente, tel) values ('asesoramiento', $1, $2, $3, $4)",
    [`Turno de asesoramiento: ${tema}`, `${cuando} · ${modo}${detalle ? " · " + detalle : ""}`, nombre, tel]);
  await avisar(`📅 Turno de asesoramiento: ${cuando}\n${modo} · ${tema}${detalle ? "\n" + detalle : ""}\n${nombre} · wa.me/${tel}`);
  send(res, 200, { ok: true, cuando });
}
