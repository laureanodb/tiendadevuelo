// Agenda de Instagram: arma publicaciones con los productos de la tienda, las programa y las publica solas.
// Publicar necesita en Vercel IG_TOKEN (token de Meta con permiso instagram_content_publish).
// La cuenta de Instagram se detecta sola desde la página de Facebook conectada (o IG_USER_ID si se carga).
import fs from "node:fs";
import vm from "node:vm";
import Anthropic from "@anthropic-ai/sdk";
import { DB_URL, ajuste, fromRow, guardarAjuste, q } from "./_lib.js";

const SITIO = "https://www.tiendadevuelo.com.ar";
const VERSION = process.env.IG_API_VERSION || "v23.0";
const GRAPH = process.env.IG_GRAPH_BASE || "https://graph.facebook.com"; // se puede cambiar solo para pruebas
const TOKEN = process.env.IG_TOKEN || "";
const KEY = process.env.ANTHROPIC_API_KEY || "";
const TZ = "America/Argentina/Buenos_Aires";

export const igListo = () => !!TOKEN;
export const CONFIG_INICIAL = { dias: [2, 5], auto: false, ia: true }; // martes y viernes, con revisión

export async function configRedes() {
  const c = await ajuste("instagram", {});
  return { ...CONFIG_INICIAL, ...c, dias: Array.isArray(c.dias) && c.dias.length ? c.dias.map(Number).filter((d) => d >= 0 && d <= 6) : CONFIG_INICIAL.dias };
}

// ---------- Productos ----------
let web = null;
function datosWeb() {
  if (web) return web;
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(new URL("../products.js", import.meta.url), "utf8") + ";this.__d={PRODUCTS,CONFIG}", ctx);
  return (web = ctx.__d);
}
async function productos() {
  if (DB_URL) {
    const { rows } = await q("select * from tdv_productos where visible order by orden, creado");
    if (rows.length) return rows.map((r) => fromRow(r)).filter((p) => !p.agotado);
  }
  return datosWeb().PRODUCTS;
}
const abs = (u) => (String(u).startsWith("/") ? SITIO + u : String(u));
// Instagram solo acepta JPEG con dirección pública
const fotosDe = (p) => (p.fotos || []).map(abs).filter((u) => /^https:\/\/.+\.jpe?g(\?.*)?$/i.test(u)).slice(0, 4);

// ---------- Textos ----------
const CONSEJOS = {
  "Comunicaciones": "Antes de elegir auricular, mirá la ficha de tu avión: los de escuela usan Dual plug, los que alimentan el auricular desde el panel usan LEMO y los Airbus, XLR de 5 pines.",
  "Repuestos y adaptadores": "Las almohadillas se endurecen con el uso y el calor: aíslan menos y aprietan más. Cambiarlas a tiempo devuelve el silencio y la comodidad del primer día.",
  "Seguridad y emergencia": "Los satélites de búsqueda y salvamento solo procesan señales de 406 MHz. Un ELT de 406 registrado con la matrícula le dice al rescate a quién busca y, conectado al GPS, dónde.",
  "Aviónica": "Un instrumento electrónico como el G5 no depende de la bomba de vacío: es un punto de falla menos en el panel y tiene batería de respaldo.",
  "Navegación": "La computadora de vuelo y el plotter siguen siendo la base de la planificación: rumbos, tiempos y consumos antes de encender el motor.",
  "Libros y regalos": "Un detalle para quien vuela o sueña con volar: ideal para el primer solo, el recibido o un cumpleaños.",
};
const tag = (s) => "#" + String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
function textoBase(p, cfg) {
  const precio = p.usd ? `US$ ${Number(p.usd).toLocaleString("es-AR")}` : p.ars ? `$${Number(p.ars).toLocaleString("es-AR")}` : "";
  const specs = (p.specs || []).slice(0, 3).map((s) => "· " + s).join("\n");
  const tags = ["#aviacion", "#pilotos", "#pilotshop", p.brand && tag(p.brand), p.cat === "Libros y regalos" ? "#regalosparapilotos" : tag(p.cat)].filter(Boolean);
  return [
    `${p.name}${p.nota ? ` · ${p.nota}` : ""}`,
    p.desc || "",
    specs,
    CONSEJOS[p.cat] || "",
    precio ? `Precio: ${precio}. Consultas por WhatsApp al ${cfg.whatsappVisible}.` : `Consultá el precio por WhatsApp al ${cfg.whatsappVisible}.`,
    `Más en tiendadevuelo.com.ar (link en la bio). Envíos a todo el país.`,
    [...new Set(tags)].join(" "),
  ].filter(Boolean).join("\n\n");
}
async function mejorarConIA(texto) {
  if (!KEY) return texto;
  try {
    const client = new Anthropic({ apiKey: KEY });
    const r = await client.beta.messages.create({
      model: "claude-opus-5-5", max_tokens: 1200, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: { type: "object", additionalProperties: false, required: ["texto"], properties: { texto: { type: "string" } } } } },
      messages: [{ role: "user", content: `Reescribí esta publicación de Instagram de Tienda de Vuelo (@tiendadevueloar), un pilot shop argentino. Español rioplatense, tono técnico y profesional, sin signos de exclamación, como mucho 2 emojis. Mantené tal cual el precio, el WhatsApp, la mención a tiendadevuelo.com.ar y los hashtags. No inventes datos técnicos. Máximo 1200 caracteres.\n\nTexto:\n${texto.slice(0, 2000)}` }],
    });
    if (r.stop_reason === "refusal") return texto;
    const t = JSON.parse(r.content.filter((x) => x.type === "text").map((x) => x.text).join("")).texto;
    return t && t.length > 80 ? t.slice(0, 2100) : texto;
  } catch (e) { console.error(e); return texto; }
}

// ---------- Agenda ----------
const hoyAR = () => new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
const fecha = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
// Próximos días de publicación (dentro de los próximos 14 días) que todavía no tienen post
async function diasLibres(cfg, cuantos) {
  const { rows } = await q("select programado from tdv_posts where estado in ('borrador', 'aprobado', 'publicado') and programado >= current_date - 1");
  const ocupados = new Set(rows.map((r) => fecha(new Date(r.programado))));
  const out = [], d = hoyAR();
  for (let i = 1; i <= 14 && out.length < cuantos; i++) {
    const x = new Date(d); x.setDate(d.getDate() + i);
    if (cfg.dias.includes(x.getDay()) && !ocupados.has(fecha(x))) out.push(fecha(x));
  }
  return out;
}

// Arma borradores para los próximos días de publicación, rotando productos (primero los que no salieron hace más tiempo)
export async function generarBorradores({ cuantos } = {}) {
  const cfg = await configRedes();
  const dias = await diasLibres(cfg, cuantos || cfg.dias.length);
  if (!dias.length) return [];
  const lista = (await productos()).filter((p) => fotosDe(p).length);
  const { rows } = await q("select producto, max(coalesce(programado, creado::date)) as ultima from tdv_posts where estado <> 'descartado' group by producto");
  const ultima = Object.fromEntries(rows.map((r) => [r.producto, new Date(r.ultima).getTime()]));
  // Orden: los que nunca salieron primero, después los más viejos; los destacados adelante en caso de empate
  const orden = [...lista].sort((a, b) => (ultima[a.id] || 0) - (ultima[b.id] || 0) || (a.destacado || 99) - (b.destacado || 99));
  // Que no salgan dos seguidos de la misma categoría
  const elegidos = [];
  for (const p of orden) {
    if (elegidos.length >= dias.length) break;
    if (elegidos.length && elegidos[elegidos.length - 1].cat === p.cat && orden.some((x) => !elegidos.includes(x) && x.cat !== p.cat)) continue;
    elegidos.push(p);
  }
  for (const p of orden) if (elegidos.length < dias.length && !elegidos.includes(p)) elegidos.push(p);
  const web = datosWeb().CONFIG;
  const creados = [];
  for (let i = 0; i < elegidos.length; i++) {
    const p = elegidos[i];
    let texto = textoBase(p, web);
    if (cfg.ia) texto = await mejorarConIA(texto);
    const { rows: [r] } = await q("insert into tdv_posts (programado, producto, texto, fotos, estado) values ($1, $2, $3, $4, 'borrador') returning id", [dias[i], p.id, texto, fotosDe(p)]);
    creados.push(r.id);
  }
  return creados;
}

// ---------- Publicación en Instagram ----------
async function graph(path, params = {}, method = "GET") {
  const u = new URL(`${GRAPH}/${VERSION}/${path}`);
  const datos = new URLSearchParams({ ...params, access_token: TOKEN });
  const r = method === "GET" ? await fetch(`${u}?${datos}`) : await fetch(u, { method, body: datos });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error?.error_user_msg || j.error?.message || `Meta respondió ${r.status}`);
  return j;
}
// La cuenta de Instagram profesional conectada a la página de Facebook
export async function cuentaInstagram() {
  if (process.env.IG_USER_ID) return { id: process.env.IG_USER_ID, usuario: "" };
  const guardada = await ajuste("instagram_cuenta", {});
  if (guardada.id) return guardada;
  const { data = [] } = await graph("me/accounts", { fields: "name,instagram_business_account{id,username}" });
  const pag = data.find((x) => x.instagram_business_account);
  if (!pag) throw new Error("No encontré una cuenta de Instagram profesional conectada a la página de Facebook.");
  const c = { id: pag.instagram_business_account.id, usuario: pag.instagram_business_account.username || "", pagina: pag.name };
  await guardarAjuste("instagram_cuenta", c);
  return c;
}
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
async function listo(contenedor) {
  for (let i = 0; i < 15; i++) {
    const { status_code } = await graph(contenedor, { fields: "status_code" });
    if (status_code === "FINISHED") return;
    if (status_code === "ERROR" || status_code === "EXPIRED") throw new Error("Instagram no pudo procesar la foto.");
    await esperar(2000);
  }
  throw new Error("Instagram tardó demasiado en procesar la foto.");
}
export async function publicar(post) {
  if (!TOKEN) throw new Error("Falta conectar Instagram (IG_TOKEN en Vercel).");
  const fotos = (post.fotos || []).slice(0, 4);
  if (!fotos.length) throw new Error("La publicación no tiene fotos.");
  const { id: ig } = await cuentaInstagram();
  let contenedor;
  if (fotos.length === 1) {
    contenedor = (await graph(`${ig}/media`, { image_url: fotos[0], caption: post.texto }, "POST")).id;
  } else {
    const hijos = [];
    for (const f of fotos) hijos.push((await graph(`${ig}/media`, { image_url: f, is_carousel_item: "true" }, "POST")).id);
    for (const h of hijos) await listo(h);
    contenedor = (await graph(`${ig}/media`, { media_type: "CAROUSEL", children: hijos.join(","), caption: post.texto }, "POST")).id;
  }
  await listo(contenedor);
  const { id } = await graph(`${ig}/media_publish`, { creation_id: contenedor }, "POST");
  let permalink = "";
  try { permalink = (await graph(id, { fields: "permalink" })).permalink || ""; } catch {}
  await q("update tdv_posts set estado = 'publicado', ig_id = $2, permalink = $3, error = '', publicado = now() where id = $1", [post.id, id, permalink]);
  return { id, permalink };
}
