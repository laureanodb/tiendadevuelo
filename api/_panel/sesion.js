// Entrar (POST con la clave), salir (DELETE) o ver si hay sesión (GET). El dueño entra con PANEL_CLAVE; los ayudantes, con la suya.
import { DB_URL, abrirSesion, ajuste, body, cerrarSesion, claveCorrecta, claveDeUsuario, claveLista, ensureSchema, fotosListas, permitido, quien, send } from "../_lib.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const estado = { base: !!DB_URL, clave: claveLista(), fotos: fotosListas(), ia: !!process.env.ANTHROPIC_API_KEY };
  if (req.method === "GET") {
    let usuario = null;
    try { if (DB_URL) { await ensureSchema(); usuario = await quien(req); } } catch {}
    return send(res, 200, { ...estado, sesion: !!usuario, usuario });
  }
  if (req.method === "DELETE") { cerrarSesion(res); return send(res, 200, { ok: true }); }
  if (req.method !== "POST") return send(res, 405, { error: "metodo" });
  if (!estado.clave) return send(res, 503, { error: "falta_clave", mensaje: "Falta crear la clave del panel (PANEL_CLAVE) en Vercel." });
  const clave = body(req).clave;
  let usuario = null;
  if (claveCorrecta(clave)) usuario = { id: "dueno", nombre: "Dueño", dueno: true };
  else if (DB_URL) {
    await ensureSchema();
    if (!(await permitido(req, "login", 20))) return send(res, 429, { mensaje: "Demasiados intentos. Probá en un rato." });
    const u = claveDeUsuario(clave, await ajuste("usuarios", []));
    if (u) usuario = { id: u.id, nombre: u.nombre, dueno: false };
  }
  if (!usuario) {
    await new Promise((r) => setTimeout(r, 800));
    return send(res, 401, { error: "clave", mensaje: "Clave incorrecta." });
  }
  abrirSesion(res, usuario.id);
  send(res, 200, { ok: true, ...estado, sesion: true, usuario });
}
