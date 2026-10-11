// Panel: subir una foto (ya achicada en el celular, con su versión chica) o un PDF, y devolver su link público.
import crypto from "node:crypto";
import { body, fotosListas, panel, send, slug, subirFoto } from "../_lib.js";

export default panel(async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "metodo" });
  if (!fotosListas()) return send(res, 503, { error: "falta_fotos", mensaje: "Falta conectar Supabase para guardar fotos." });
  const { data, mini, tipo, producto } = body(req);
  const type = ["image/jpeg", "image/webp", "image/png", "application/pdf"].includes(tipo) ? tipo : "image/jpeg";
  const buf = Buffer.from(String(data || ""), "base64");
  if (!buf.length || buf.length > 3_200_000) return send(res, 400, { error: "foto", mensaje: type === "application/pdf" ? "El PDF no se pudo leer o pesa más de 3 MB." : "La foto no se pudo leer o es muy pesada." });
  const ext = type.split("/")[1].replace("jpeg", "jpg");
  const base = `${slug(producto || "producto")}/${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  const url = await subirFoto(`${base}.${ext}`, buf, type);
  // Versión chica para las tarjetas (más rápida de cargar): mismo nombre terminado en -t
  if (mini && type === "image/jpeg") { const m = Buffer.from(String(mini), "base64"); if (m.length && m.length < 600_000) await subirFoto(`${base}-t.jpg`, m, "image/jpeg"); }
  send(res, 200, { url });
});
