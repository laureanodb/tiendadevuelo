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
    await q(`alter table tdv_productos enable row level security`).catch(() => {});
    if (SUPA_URL && SUPA_KEY) {
      await fetch(`${SUPA_URL}/storage/v1/bucket`, {
        method: "POST", headers: supaHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({ id: "productos", name: "productos", public: true }),
      }).catch(() => {});
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
    specs: r.specs, desc: r.descr, fotos: r.fotos,
  };
  if (!admin) {
    p.agotado = r.stock !== null && r.stock <= 0 && !r.encargo;
    return p;
  }
  return { ...p, variantes: r.variantes, costo: num(r.costo), costoMoneda: r.costo_moneda, stock: r.stock, stockMin: r.stock_min,
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
