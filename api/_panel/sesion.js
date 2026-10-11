// Entrar (POST con la clave), salir (DELETE) o ver si hay sesión (GET).
import { DB_URL, abrirSesion, body, cerrarSesion, claveCorrecta, claveLista, conSesion, fotosListas, send } from "../_lib.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const estado = { base: !!DB_URL, clave: claveLista(), fotos: fotosListas() };
  if (req.method === "GET") return send(res, 200, { ...estado, sesion: conSesion(req) });
  if (req.method === "DELETE") { cerrarSesion(res); return send(res, 200, { ok: true }); }
  if (req.method !== "POST") return send(res, 405, { error: "metodo" });
  if (!estado.clave) return send(res, 503, { error: "falta_clave", mensaje: "Falta crear la clave del panel (PANEL_CLAVE) en Vercel." });
  if (!claveCorrecta(body(req).clave)) {
    await new Promise((r) => setTimeout(r, 800));
    return send(res, 401, { error: "clave", mensaje: "Clave incorrecta." });
  }
  abrirSesion(res);
  send(res, 200, { ok: true, ...estado, sesion: true });
}
