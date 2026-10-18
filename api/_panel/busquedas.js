// Panel: cómo encuentran la tienda en Google (Search Console, últimos 28 días).
// Necesita en Vercel: GSC_EMAIL y GSC_KEY (cuenta de servicio de Google con acceso de lectura a la propiedad).
import crypto from "node:crypto";
import { panel, send } from "../_lib.js";

const SITIO = process.env.GSC_SITE || "sc-domain:tiendadevuelo.com.ar";
const b64u = (x) => Buffer.from(x).toString("base64url");

async function token() {
  const ahora = Math.floor(Date.now() / 1000);
  const cab = b64u(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const cuerpo = b64u(JSON.stringify({ iss: process.env.GSC_EMAIL, scope: "https://www.googleapis.com/auth/webmasters.readonly", aud: "https://oauth2.googleapis.com/token", iat: ahora, exp: ahora + 3600 }));
  const firma = crypto.sign("RSA-SHA256", Buffer.from(`${cab}.${cuerpo}`), String(process.env.GSC_KEY).replace(/\\n/g, "\n")).toString("base64url");
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${cab}.${cuerpo}.${firma}` }),
  });
  if (!r.ok) throw new Error("Google no aceptó la cuenta de servicio. Revisá GSC_EMAIL y GSC_KEY en Vercel.");
  return (await r.json()).access_token;
}

export default panel(async (req, res) => {
  if (!process.env.GSC_EMAIL || !process.env.GSC_KEY) return send(res, 200, { configurado: false, sitio: SITIO });
  const dia = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
  try {
    const t = await token();
    const consultar = async (dimensions, rowLimit) => {
      const r = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITIO)}/searchAnalytics/query`, {
        method: "POST", headers: { authorization: `Bearer ${t}`, "content-type": "application/json" },
        body: JSON.stringify({ startDate: dia(30), endDate: dia(2), dimensions, rowLimit }),
      });
      if (r.status === 403) throw new Error("La cuenta de servicio no tiene permiso en Search Console. Agregala como usuario de la propiedad.");
      if (!r.ok) throw new Error("Search Console no respondió (" + r.status + ").");
      return ((await r.json()).rows || []).map((x) => ({ clave: x.keys ? x.keys[0] : "", clics: x.clicks, vistas: x.impressions, puesto: Math.round(x.position * 10) / 10 }));
    };
    const [total, busquedas, paginas] = await Promise.all([consultar([], 1), consultar(["query"], 40), consultar(["page"], 15)]);
    res.setHeader("Cache-Control", "private, max-age=600");
    send(res, 200, { configurado: true, desde: dia(30), hasta: dia(2), total: total[0] || { clics: 0, vistas: 0, puesto: 0 }, busquedas, paginas });
  } catch (e) {
    send(res, 200, { configurado: true, error: e.message });
  }
});
