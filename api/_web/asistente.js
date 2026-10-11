// Asistente de la tienda con Claude: responde con el catálogo y las condiciones reales. Solo se activa si hay ANTHROPIC_API_KEY.
import crypto from "node:crypto";
import fs from "node:fs";
import vm from "node:vm";
import Anthropic from "@anthropic-ai/sdk";
import { DB_URL, body, ensureSchema, fromRow, q, send } from "../_lib.js";

const KEY = process.env.ANTHROPIC_API_KEY || "";
const LIMITE_IP_DIA = 40, LIMITE_DIA = 600, MAX_MENSAJES = 16;

// Datos de la web (products.js): configuración y, si el panel está vacío, los productos de muestra
function datosWeb() {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(new URL("../../products.js", import.meta.url), "utf8") + ";this.__d={CONFIG,PRODUCTS,CATEGORIES,ETAPAS}", ctx);
  return ctx.__d;
}

let cache = { at: 0, sistema: "" };
async function sistema() {
  if (Date.now() - cache.at < 5 * 60e3 && cache.sistema) return cache.sistema;
  const web = datosWeb();
  let productos = web.PRODUCTS;
  if (DB_URL) {
    const { rows } = await q("select * from tdv_productos where visible order by orden, creado");
    if (rows.length) productos = rows.map((r) => fromRow(r)).filter((p) => !p.agotado);
  }
  const precio = (p) => (p.usd ? `US$ ${p.usd}` : p.ars ? `$${Number(p.ars).toLocaleString("es-AR")}` : "precio a consultar");
  const lista = productos.map((p) => `- [${p.id}] ${p.name}${p.brand ? ` · ${p.brand}${p.model ? " " + p.model : ""}` : ""} · ${p.cat} · ${precio(p)}${p.encargo ? " · por encargo (15 a 30 días)" : ""}${p.reacond ? " · reacondicionado" : ""}${p.llega ? ` · preventa, llega ${p.llega}` : ""}
  ${p.desc || ""}${p.specs?.length ? " Características: " + p.specs.join("; ") + "." : ""}${p.variantes?.length ? " Opciones: " + p.variantes.map((v) => String(v).split("|")[0].trim()).join(", ") + "." : ""}${p.etapas?.length ? " Ideal para: " + p.etapas.map((e) => web.ETAPAS[e] || e).join(", ") + "." : ""}`).join("\n");
  const c = web.CONFIG;
  cache = { at: Date.now(), sistema: `Sos el asistente de Tienda de Vuelo, un pilot shop de ${c.ciudad}, Argentina, atendido por pilotos. Ayudás a pilotos, alumnos y tripulantes a elegir productos del catálogo.

Cómo responder:
- Español rioplatense, tratando de "vos". Tono profesional y cercano. Respuestas cortas: 2 a 6 oraciones o una lista breve.
- Recomendá solo productos del catálogo de abajo. Cuando nombres uno, escribí su link así: [Nombre del producto](/producto/ID), con el ID exacto entre corchetes del catálogo.
- No inventes productos, precios, stock, plazos ni condiciones. Si algo no está en el catálogo, decí que se puede pedir por encargo y sugerí escribir por WhatsApp.
- Los precios en dólares se muestran en la web también en pesos al dólar oficial del día; no calcules montos en pesos.
- Para comprar: se agrega al carrito y el pedido se manda por WhatsApp, o se escribe al ${c.whatsappVisible}. Ofrecé eso cuando la persona quiera comprar.
- Podés dar consejos generales de aviación para elegir equipo, pero no reemplazás al instructor ni a la normativa de ANAC; si preguntan por regulaciones o seguridad de vuelo, recomendá consultar con su instructor o la ANAC.
- Si te piden algo que no tiene que ver con la tienda o la aviación, respondé amablemente que solo podés ayudar con eso.

Condiciones de la tienda:
- Envíos a todo el país, incluida Tierra del Fuego. Despacho en 48 h hábiles (también sábados). En CABA, envío en el día. El costo de envío se paga aparte y se cotiza por WhatsApp según destino.
- Retiro en CABA, coordinado por WhatsApp.
- Pagos: transferencia, efectivo al retirar, dólares o cripto. Se puede reservar con una seña. No hay cuotas.
- Productos originales con la garantía oficial del fabricante. No se hacen cambios por gusto; si algo falla, se resuelve. Arrepentimiento: 10 días corridos desde que se recibe el producto.
- Productos por encargo: 15 a 30 días.

Catálogo:
${lista}` };
  return cache.sistema;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET") return send(res, 200, { activo: !!KEY });
  if (req.method !== "POST" || !KEY) return send(res, 404, { error: "inactivo" });
  try {
    const b = body(req);
    const mensajes = (Array.isArray(b.mensajes) ? b.mensajes : []).slice(-MAX_MENSAJES)
      .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content || "").slice(0, 700) }))
      .filter((m) => m.content.trim());
    if (!mensajes.length || mensajes[mensajes.length - 1].role !== "user") return send(res, 400, { error: "datos" });
    while (mensajes.length && mensajes[0].role !== "user") mensajes.shift();

    // Límites de uso para cuidar el costo
    if (DB_URL) {
      await ensureSchema();
      const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
      const h = crypto.createHash("sha256").update("tdv:" + ip).digest("hex").slice(0, 16);
      const { rows } = await q(`select count(*) filter (where dato = $1)::int as mio, count(*)::int as todos from tdv_eventos where tipo = 'asistente' and creado > now() - interval '1 day'`, [h]);
      if (rows[0].mio >= LIMITE_IP_DIA || rows[0].todos >= LIMITE_DIA) return send(res, 429, { texto: `Por hoy llegamos al límite de consultas al asistente. Escribinos por WhatsApp y te respondemos nosotros.` });
      await q("insert into tdv_eventos (tipo, dato) values ('asistente', $1)", [h]);
    }

    const client = new Anthropic({ apiKey: KEY });
    const r = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 1500,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: [{ type: "text", text: await sistema(), cache_control: { type: "ephemeral" } }],
      messages: mensajes,
    });
    if (r.stop_reason === "refusal") return send(res, 200, { texto: "Esa consulta no la puedo responder. Si es sobre un producto, escribinos por WhatsApp y te ayudamos." });
    const texto = r.content.filter((x) => x.type === "text").map((x) => x.text).join("\n").trim();
    send(res, 200, { texto: texto || "No te entendí bien. ¿Me lo contás de otra forma?" });
  } catch (e) {
    console.error(e);
    const status = e instanceof Anthropic.RateLimitError ? 429 : 502;
    send(res, status, { texto: "No pude responder ahora. Probá en un momento o escribinos por WhatsApp." });
  }
}
