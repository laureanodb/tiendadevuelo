// Panel: subir una foto (ya achicada en el celular) y devolver su link público.
import crypto from "node:crypto";
import { body, fotosListas, panel, send, slug, subirFoto } from "../_lib.js";

export default panel(async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "metodo" });
  if (!fotosListas()) return send(res, 503, { error: "falta_fotos", mensaje: "Falta conectar Supabase para guardar fotos." });
  const { data, tipo, producto } = body(req);
  const type = ["image/jpeg", "image/webp", "image/png"].includes(tipo) ? tipo : "image/jpeg";
  const buf = Buffer.from(String(data || ""), "base64");
  if (!buf.length || buf.length > 3_000_000) return send(res, 400, { error: "foto", mensaje: "La foto no se pudo leer o es muy pesada." });
  const ext = type.split("/")[1].replace("jpeg", "jpg");
  const path = `${slug(producto || "producto")}/${Date.now()}-${crypto.randomBytes(3).toString("hex")}.${ext}`;
  send(res, 200, { url: await subirFoto(path, buf, type) });
});
