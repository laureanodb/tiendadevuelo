// Base de datos, fotos y acceso al panel. Lo usan las funciones de /api.
import crypto from "node:crypto";
import pg from "pg";

const env = process.env;
export const DB_URL = env.POSTGRES_URL || env.DATABASE_URL || "";
const SUPA_URL = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPA_KEY = env.SUPABASE_SERVICE_ROLE_KEY || "";
const CLAVE = env.PANEL_CLAVE || "";

// ---------- Base de datos ----------
let pool = null;
function getPool() {
  if (pool) return pool;
  const u = new URL(DB_URL);
  const local = ["localhost", "127.0.0.1"].includes(u.hostname);
  u.searchParams.delete("sslmode"); u.searchParams.delete("supa"); u.searchParams.delete("pgbouncer");
  pool = new pg.Pool({ connectionString: u.toString(), ssl: local ? false : { rejectUnauthorized: false }, max: 3 });
  return pool;
}
export const q = (text, params) => getPool().query(text, params);

let ready = null;
export function ensureSchema() {
  ready ??= (async () => {
    await q(`create table if not exists tdv_productos (
      id text primary key,
      name text not null,
      brand text not null default '',
      model text not null default '',
      cat text not null default 'Accesorios',
      icon text not null default 'tag',
      usd numeric, ars numeric,
      costo numeric, costo_moneda text not null default 'USD',
      stock integer, stock_min integer,
      encargo boolean not null default false, nuevo boolean not null default false, top boolean not null default false,
      reacond boolean not null default false, regalo boolean not null default false, tcp boolean not null default false,
      destacado integer,
      etapas text[] not null default '{}', variantes text[] not null default '{}', specs text[] not null default '{}',
      descr text not null default '', fotos text[] not null default '{}',
      visible boolean not null default true,
      proveedor text not null default '', notas text not null default '',
      orden integer not null default 0,
      creado timestamptz not null default now(), actualizado timestamptz not null default now()
    )`);
    // La tabla no se lee desde el navegador: solo desde estas funciones.
    await q(`alter table tdv_productos add column if not exists antes numeric`);
    await q(`alter table tdv_productos add column if not exists oferta_hasta date`);
    await q(`alter table tdv_productos add column if not exists video text not null default ''`);
    await q(`alter table tdv_productos add column if not exists llega date`);
    await q(`alter table tdv_productos add column if not exists oficial boolean not null default false`);
    await q(`alter table tdv_productos add column if not exists docs jsonb not null default '[]'`);
    await q(`alter table tdv_productos add column if not exists alquiler numeric`);
    await q(`alter table tdv_productos add column if not exists alquiler_moneda text not null default 'ARS'`);
    await q(`create table if not exists tdv_resenas (
      id bigserial primary key, num text not null, producto text not null, nombre text not null default '',
      estrellas integer not null, texto text not null default '', estado text not null default 'pendiente',
      creado timestamptz not null default now(), unique (num, producto)
    )`);
    await q(`create table if not exists tdv_preguntas (
      id bigserial primary key, producto text not null, nombre text not null default '', contacto text not null default '',
      pregunta text not null, respuesta text not null default '', estado text not null default 'pendiente',
      creado timestamptz not null default now(), respondido timestamptz
    )`);
    await q(`create table if not exists tdv_ajustes (clave text primary key, valor jsonb not null default '{}')`);
    for (const t of ["tdv_resenas", "tdv_preguntas", "tdv_ajustes"]) await q(`alter table ${t} enable row level security`).catch(() => {});
    await q(`alter table tdv_productos enable row level security`).catch(() => {});
    await q(`create table if not exists tdv_pedidos (
      num text primary key,
      token text not null,
      creado timestamptz not null default now(),
      estado text not null default 'nuevo',
      cliente_tel text not null default '',
      cliente jsonb not null default '{}',
      items jsonb not null default '[]',
      total_ars numeric, usd_sub numeric,
      cobrado_ars numeric, cobrado_usd numeric, pagado_en timestamptz,
      envio_empresa text not null default '', envio_codigo text not null default '', enviado_en timestamptz,
      notas text not null default '', stock_descontado boolean not null default false,
      historial jsonb not null default '[]'
    )`);
    await q(`create index if not exists tdv_pedidos_creado on tdv_pedidos (creado desc)`);
    await q(`create table if not exists tdv_clientes (
      tel text primary key, nombre text not null default '', dni text not null default '',
      cumple date, escuela text not null default '', notas text not null default '',
      creado timestamptz not null default now()
    )`);
    await q(`create table if not exists tdv_eventos (
      id bigserial primary key, tipo text not null, dato text not null default '', producto text not null default '',
      creado timestamptz not null default now()
    )`);
    await q(`create index if not exists tdv_eventos_creado on tdv_eventos (creado desc)`);
    await q(`alter table tdv_pedidos add column if not exists comprobantes jsonb not null default '[]'`);
    await q(`alter table tdv_pedidos add column if not exists nps integer`);
    await q(`alter table tdv_pedidos add column if not exists nps_coment text not null default ''`);
    await q(`alter table tdv_pedidos add column if not exists carrito text not null default ''`);
    await q(`create table if not exists tdv_carritos (
      id text primary key, creado timestamptz not null default now(), actualizado timestamptz not null default now(),
      nombre text not null default '', tel text not null default '', items jsonb not null default '[]', total numeric,
      estado text not null default 'abierto'
    )`);
    await q(`create table if not exists tdv_cambios (
      id bigserial primary key, creado timestamptz not null default now(), tipo text not null, ref text not null default '',
      nombre text not null default '', resumen text not null default '', antes jsonb, deshecho boolean not null default false
    )`);
    await q(`create table if not exists tdv_limites (id bigserial primary key, clave text not null, creado timestamptz not null default now())`);
    await q(`create index if not exists tdv_limites_clave on tdv_limites (clave, creado)`);
    for (const t of ["tdv_pedidos", "tdv_clientes", "tdv_eventos", "tdv_carritos", "tdv_limites", "tdv_cambios"]) await q(`alter table ${t} enable row level security`).catch(() => {});
    if (SUPA_URL && SUPA_KEY) {
      for (const [id, pub] of [["productos", true], ["comprobantes", false]]) {
        await fetch(`${SUPA_URL}/storage/v1/bucket`, {
          method: "POST", headers: supaHeaders({ "content-type": "application/json" }),
          body: JSON.stringify({ id, name: id, public: pub }),
        }).catch(() => {});
      }
    }
  })().catch((e) => { ready = null; throw e; });
  return ready;
}

// Fila de la base → producto como lo usa la web
const num = (v) => (v === null || v === undefined ? null : Number(v));
export function fromRow(r, admin = false) {
  const p = {
    id: r.id, name: r.name, brand: r.brand, model: r.model, cat: r.cat, icon: r.icon,
    usd: num(r.usd), ars: num(r.ars), encargo: r.encargo, nuevo: r.nuevo, top: r.top, reacond: r.reacond,
    regalo: r.regalo, tcp: r.tcp, destacado: r.destacado, etapas: r.etapas, variantes: r.variantes.length ? r.variantes : undefined,
    specs: r.specs, desc: r.descr, fotos: r.fotos, video: r.video || "", creado: r.creado,
    oficial: !!r.oficial, docs: r.docs || [], alquiler: num(r.alquiler), alquilerMoneda: r.alquiler_moneda || "ARS",
  };
  // Oferta vigente: precio anterior cargado y fecha de fin no vencida (hora de Argentina).
  const hoy = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  const hasta = r.oferta_hasta ? new Date(r.oferta_hasta).toISOString().slice(0, 10) : null;
  const precio = num(r.usd) ?? num(r.ars);
  const llega = r.llega ? new Date(r.llega).toISOString().slice(0, 10) : null;
  if (llega && llega >= hoy) p.llega = llega;
  if (num(r.antes) && precio && num(r.antes) > precio && (!hasta || hasta >= hoy)) { p.antes = num(r.antes); p.ofertaHasta = hasta; }
  if (!admin) {
    p.agotado = r.stock !== null && r.stock <= 0 && !r.encargo;
    p.ultimas = r.stock !== null && r.stock > 0 && r.stock < 3;
    return p;
  }
  return { ...p, llega: r.llega ? new Date(r.llega).toISOString().slice(0, 10) : null, antes: num(r.antes), ofertaHasta: r.oferta_hasta ? new Date(r.oferta_hasta).toISOString().slice(0, 10) : null, variantes: r.variantes, costo: num(r.costo), costoMoneda: r.costo_moneda, stock: r.stock, stockMin: r.stock_min,
    visible: r.visible, proveedor: r.proveedor, notas: r.notas, orden: r.orden, actualizado: r.actualizado };
}

const str = (v, max = 300) => String(v ?? "").trim().slice(0, max);
const list = (v, max = 30) => (Array.isArray(v) ? v : String(v ?? "").split("\n")).map((x) => str(x, 200)).filter(Boolean).slice(0, max);
const money = (v) => (v === "" || v === null || v === undefined || isNaN(Number(v)) ? null : Math.max(0, Number(v)));
const int = (v) => (v === "" || v === null || v === undefined || isNaN(parseInt(v)) ? null : parseInt(v));

// Producto que llega del panel → valores para guardar
export function toRow(p) {
  return {
    name: str(p.name, 120), brand: str(p.brand, 60), model: str(p.model, 60), cat: str(p.cat, 40) || "Accesorios", icon: str(p.icon, 30) || "tag",
    usd: money(p.usd), ars: money(p.ars), costo: money(p.costo), costo_moneda: p.costoMoneda === "ARS" ? "ARS" : "USD",
    stock: int(p.stock), stock_min: int(p.stockMin),
    encargo: !!p.encargo, nuevo: !!p.nuevo, top: !!p.top, reacond: !!p.reacond, regalo: !!p.regalo, tcp: !!p.tcp,
    destacado: int(p.destacado), etapas: list(p.etapas, 6), variantes: list(p.variantes), specs: list(p.specs),
    descr: str(p.desc, 600), fotos: list(p.fotos, 8).filter((u) => /^https:\/\//.test(u) || /^http:\/\/localhost[:/]/.test(u)),
    antes: money(p.antes), oferta_hasta: /^\d{4}-\d{2}-\d{2}$/.test(String(p.ofertaHasta || "")) ? p.ofertaHasta : null,
    video: /^https:\/\//.test(str(p.video, 300)) ? str(p.video, 300) : "",
    llega: /^\d{4}-\d{2}-\d{2}$/.test(String(p.llega || "")) ? p.llega : null,
    oficial: !!p.oficial, alquiler: money(p.alquiler), alquiler_moneda: p.alquilerMoneda === "USD" ? "USD" : "ARS",
    docs: JSON.stringify((Array.isArray(p.docs) ? p.docs : []).filter((d) => d && /^https:\/\//.test(String(d.url)) || /^http:\/\/localhost[:/]/.test(String(d && d.url))).slice(0, 6).map((d) => ({ nombre: str(d.nombre, 80) || "Documento", url: str(d.url, 400) }))),
    visible: p.visible !== false, proveedor: str(p.proveedor, 120), notas: str(p.notas, 1000), orden: int(p.orden) ?? 0,
  };
}

export const slug = (s) => str(s, 80).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "producto";

// ---------- Fotos (Supabase Storage) ----------
function supaHeaders(extra = {}) { return { Authorization: `Bearer ${SUPA_KEY}`, apikey: SUPA_KEY, ...extra }; }
export const fotosListas = () => !!(SUPA_URL && SUPA_KEY);
export async function subirFoto(path, buffer, type) {
  const r = await fetch(`${SUPA_URL}/storage/v1/object/productos/${path}`, {
    method: "POST", headers: supaHeaders({ "content-type": type, "x-upsert": "true", "cache-control": "31536000" }), body: buffer,
  });
  if (!r.ok) throw new Error("No se pudo guardar la foto (" + r.status + ")");
  return `${SUPA_URL}/storage/v1/object/public/productos/${path}`;
}

// Comprobantes de pago: bucket privado, solo se ven desde el panel.
export async function subirPrivado(path, buffer, type) {
  const r = await fetch(`${SUPA_URL}/storage/v1/object/comprobantes/${path}`, {
    method: "POST", headers: supaHeaders({ "content-type": type, "x-upsert": "true" }), body: buffer,
  });
  if (!r.ok) throw new Error("No se pudo guardar el comprobante (" + r.status + ")");
}
export async function bajarPrivado(path) {
  const r = await fetch(`${SUPA_URL}/storage/v1/object/comprobantes/${path}`, { headers: supaHeaders() });
  if (!r.ok) return null;
  return { type: r.headers.get("content-type") || "image/jpeg", buffer: Buffer.from(await r.arrayBuffer()) };
}

// ---------- Freno a bots: cuántas veces por hora puede hacer algo cada conexión ----------
const ipDe = (req) => String(req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "").split(",")[0].trim() || "sin-ip";
export async function permitido(req, tipo, max, minutos = 60) {
  const clave = tipo + ":" + crypto.createHash("sha256").update("tdv:" + ipDe(req)).digest("hex").slice(0, 20);
  const { rows } = await q(`select count(*)::int as n from tdv_limites where clave = $1 and creado > now() - make_interval(mins => $2)`, [clave, minutos]);
  if (rows[0].n >= max) return false;
  await q("insert into tdv_limites (clave) values ($1)", [clave]);
  if (Math.random() < 0.02) q("delete from tdv_limites where creado < now() - interval '2 days'").catch(() => {});
  return true;
}

// ---------- Acceso al panel ----------
const COOKIE = "tdv_panel";
const firma = (exp) => crypto.createHmac("sha256", "tdv-panel:" + CLAVE).update(String(exp)).digest("hex");
export const claveLista = () => CLAVE.length >= 6;
export function claveCorrecta(intento) {
  const a = crypto.createHash("sha256").update(String(intento ?? "")).digest();
  const b = crypto.createHash("sha256").update(CLAVE).digest();
  return claveLista() && crypto.timingSafeEqual(a, b);
}
export function abrirSesion(res) {
  const exp = Date.now() + 30 * 24 * 3600 * 1000;
  res.setHeader("Set-Cookie", `${COOKIE}=${exp}.${firma(exp)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${30 * 24 * 3600}`);
}
export function cerrarSesion(res) { res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`); }
export function conSesion(req) {
  if (!claveLista()) return false;
  const c = String(req.headers.cookie || "").split(/;\s*/).find((x) => x.startsWith(COOKIE + "="));
  if (!c) return false;
  const [exp, sig] = c.slice(COOKIE.length + 1).split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const ok = firma(exp);
  return sig.length === ok.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(ok));
}

// ---------- Utilidades de respuesta ----------
// ---------- Ajustes guardados (plantillas, configuración) ----------
export async function ajuste(clave, def = {}) {
  const { rows } = await q("select valor from tdv_ajustes where clave = $1", [clave]);
  return rows.length ? rows[0].valor : def;
}
export async function guardarAjuste(clave, valor) {
  await q("insert into tdv_ajustes (clave, valor) values ($1, $2) on conflict (clave) do update set valor = excluded.valor", [clave, JSON.stringify(valor)]);
}

// ---------- Historial de cambios (con opción de deshacer) ----------
export async function anotar(tipo, ref, nombre, resumen, antes = null) {
  await q("insert into tdv_cambios (tipo, ref, nombre, resumen, antes) values ($1, $2, $3, $4, $5)",
    [tipo, String(ref).slice(0, 120), String(nombre).slice(0, 160), String(resumen).slice(0, 400), antes === null ? null : JSON.stringify(antes)]);
  if (Math.random() < 0.05) q("delete from tdv_cambios where creado < now() - interval '180 days'").catch(() => {});
}
// Vuelve a guardar un producto tal como estaba (fila completa guardada en el historial)
export async function restaurarProducto(r) {
  const cols = Object.keys(r).filter((k) => k !== "id");
  const val = (c) => (c === "docs" ? JSON.stringify(r[c] ?? []) : r[c]);
  await q(`insert into tdv_productos (id, ${cols.join(", ")}) values ($1, ${cols.map((_, i) => "$" + (i + 2)).join(", ")})
    on conflict (id) do update set ${cols.map((c) => `${c} = excluded.${c}`).join(", ")}`, [r.id, ...cols.map(val)]);
}

// ---------- Pedidos y clientes ----------
export const ESTADOS = ["nuevo", "señado", "pagado", "enviado", "entregado", "cancelado"];
export const VENDIDOS = ["pagado", "enviado", "entregado"];
// Teléfono argentino a formato internacional para WhatsApp (5491112345678)
export function telWa(t) {
  let d = String(t || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("54")) return d.startsWith("549") ? d : "549" + d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length === 10) return "549" + d;
  if (d.length === 8) return "54911" + d;
  return d;
}
export function nivel(compras) { return compras >= 4 ? "Comandante" : compras >= 2 ? "Piloto" : compras >= 1 ? "Alumno" : "Interesado"; }
export function pedidoAdmin(r) {
  return { num: r.num, token: r.token, creado: r.creado, estado: r.estado, tel: r.cliente_tel, cliente: r.cliente, items: r.items,
    totalArs: num(r.total_ars), usdSub: num(r.usd_sub), cobradoArs: num(r.cobrado_ars), cobradoUsd: num(r.cobrado_usd), pagadoEn: r.pagado_en,
    envioEmpresa: r.envio_empresa, envioCodigo: r.envio_codigo, enviadoEn: r.enviado_en, notas: r.notas, stockDescontado: r.stock_descontado, historial: r.historial,
    comprobantes: r.comprobantes || [], nps: r.nps, npsComent: r.nps_coment || "" };
}

// Datos de pago que se muestran al cliente (los cargás en el panel → Ajustes).
export const CAMPOS_PAGO = ["titular", "banco", "alias", "cbu", "cuit", "usdtTrc20", "usdtBep20"];
export async function pagoPublico() {
  const v = await ajuste("pago", {});
  const o = {};
  for (const k of CAMPOS_PAGO) if (v[k] !== undefined && v[k] !== null && String(v[k]).trim() !== "") o[k] = String(v[k]).trim().slice(0, 120);
  return o;
}

export const body = (req) => (typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {});
export function send(res, code, data) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(code).send(JSON.stringify(data));
}
// Envuelve una función del panel: exige configuración, sesión y JSON.
export function panel(fn) {
  return async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Robots-Tag", "noindex");
    if (!DB_URL) return send(res, 503, { error: "falta_base", mensaje: "Falta conectar la base de datos en Vercel." });
    if (!claveLista()) return send(res, 503, { error: "falta_clave", mensaje: "Falta crear la clave del panel (PANEL_CLAVE) en Vercel." });
    if (!conSesion(req)) return send(res, 401, { error: "sin_sesion", mensaje: "Ingresá con tu clave." });
    if (req.method !== "GET" && !String(req.headers["content-type"] || "").includes("application/json")) return send(res, 415, { error: "formato" });
    try { await ensureSchema(); await fn(req, res); }
    catch (e) { console.error(e); send(res, 500, { error: "interno", mensaje: e.message || "Error inesperado" }); }
  };
}
