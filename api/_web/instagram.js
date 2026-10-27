// Tarea diaria (cerca de las 19 h): completa la agenda de Instagram y publica lo programado para hoy.
// La dispara Vercel (ver "crons" en vercel.json); protegida con CRON_SECRET.
import { DB_URL, avisar, ensureSchema, q, send } from "../_lib.js";
import { configRedes, generarBorradores, igListo, publicar } from "../_redes.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const secreto = process.env.CRON_SECRET;
  if (!secreto || req.headers.authorization !== `Bearer ${secreto}`) return send(res, 401, { error: "sin_permiso" });
  if (!DB_URL) return send(res, 200, { ok: false });
  await ensureSchema();
  const cfg = await configRedes();
  // 1) Que siempre haya borradores para los próximos días de publicación
  const nuevos = await generarBorradores().catch((e) => { console.error(e); return []; });
  if (nuevos.length) await avisar(`📅 Instagram: armé ${nuevos.length} ${nuevos.length === 1 ? "publicación nueva" : "publicaciones nuevas"} para revisar.\nhttps://www.tiendadevuelo.com.ar/panel#redes`);
  // 2) Publicar lo de hoy (o lo atrasado): aprobado, o borrador si está en modo automático
  const publicadas = [], errores = [];
  if (igListo()) {
    const estados = cfg.auto ? ["aprobado", "borrador"] : ["aprobado"];
    const { rows } = await q("select * from tdv_posts where estado = any($1) and programado <= (now() at time zone 'America/Argentina/Buenos_Aires')::date order by programado limit 2", [estados]);
    for (const p of rows) {
      try { publicadas.push(await publicar(p)); }
      catch (e) { errores.push(e.message); await q("update tdv_posts set estado = 'error', error = $2 where id = $1", [p.id, String(e.message).slice(0, 300)]); }
    }
    if (publicadas.length) await avisar(`📸 Publiqué en Instagram:\n${publicadas.map((x) => x.permalink || x.id).join("\n")}`);
    if (errores.length) await avisar(`⚠ No se pudo publicar en Instagram: ${errores[0]}\nRevisalo en https://www.tiendadevuelo.com.ar/panel#redes`);
  }
  send(res, 200, { nuevos: nuevos.length, publicadas: publicadas.length, errores });
}
