// Panel (solo el dueño): ayudantes que entran con su propia clave y no ven costos, ganancias ni ajustes.
import crypto from "node:crypto";
import { ajuste, body, claveCorrecta, claveDeUsuario, guardarAjuste, hashClave, panel, send } from "../_lib.js";

export default panel(async (req, res) => {
  const lista = (await ajuste("usuarios", [])) || [];
  if (req.method === "GET") return send(res, 200, { usuarios: lista.map((u) => ({ id: u.id, nombre: u.nombre, creado: u.creado })) });
  if (req.method === "DELETE") {
    await guardarAjuste("usuarios", lista.filter((u) => u.id !== String(req.query.id || "")));
    return send(res, 200, { ok: true });
  }
  const b = body(req);
  const nombre = String(b.nombre || "").trim().slice(0, 40), clave = String(b.clave || "");
  if (!nombre) return send(res, 400, { mensaje: "Poné el nombre." });
  if (clave.length < 8) return send(res, 400, { mensaje: "La clave tiene que tener al menos 8 caracteres." });
  if (claveCorrecta(clave) || claveDeUsuario(clave, lista)) return send(res, 400, { mensaje: "Esa clave ya la usa otra persona. Elegí otra." });
  if (lista.length >= 10) return send(res, 400, { mensaje: "Ya hay 10 ayudantes." });
  lista.push({ id: crypto.randomBytes(6).toString("hex"), nombre, hash: hashClave(clave), creado: new Date().toISOString() });
  await guardarAjuste("usuarios", lista);
  send(res, 200, { ok: true });
}, { soloDueno: true });
