// Revisión automática antes de publicar. Vercel la corre en cada cambio (vercel.json → ignoreCommand):
// si algo está roto, la publicación se cancela y la web sigue con la versión anterior.
// Uso local: node tests/revisar.mjs
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const enVercel = process.argv.includes("--vercel");
const errores = [];
const mal = (m) => errores.push(m);
const leer = (f) => fs.readFileSync(path.join(raiz, f), "utf8");
const existe = (f) => fs.existsSync(path.join(raiz, f));

function archivos(dir, filtro) {
  const out = [];
  for (const e of fs.readdirSync(path.join(raiz, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    if (e.isDirectory()) out.push(...archivos(rel, filtro)); else if (filtro(rel)) out.push(rel);
  }
  return out;
}

// 1. Que todo el JavaScript se pueda leer
const js = archivos(".", (f) => f.endsWith(".js") || f.endsWith(".mjs"));
for (const f of js) {
  const r = spawnSync(process.execPath, ["--check", path.join(raiz, f)], { encoding: "utf8" });
  if (r.status !== 0) mal(`${f}: error de sintaxis\n${(r.stderr || "").split("\n").slice(0, 5).join("\n")}`);
}

// 2. Configuración válida
for (const f of ["vercel.json", "package.json"]) { try { JSON.parse(leer(f)); } catch (e) { mal(`${f}: JSON inválido (${e.message})`); } }

// 3. Límite de funciones del plan gratis de Vercel (12)
const funciones = archivos("api", (f) => f.endsWith(".js") && !f.split(path.sep).some((p) => p.startsWith("_")));
if (funciones.length > 12) mal(`Hay ${funciones.length} funciones en /api y Vercel gratis permite 12: ${funciones.join(", ")}`);

// 4. Catálogo de respaldo coherente
try {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(leer("products.js") + "\n;this.__d = { CONFIG, PRODUCTS, KITS, CATEGORIES, ICONS };", ctx);
  const { CONFIG, PRODUCTS, KITS, CATEGORIES, ICONS } = ctx.__d;
  const ids = new Set();
  for (const p of PRODUCTS) {
    if (!p.id || !p.name) mal(`products.js: producto sin id o nombre (${JSON.stringify(p).slice(0, 60)})`);
    if (ids.has(p.id)) mal(`products.js: id repetido ${p.id}`);
    ids.add(p.id);
    if (!CATEGORIES.includes(p.cat)) mal(`products.js: ${p.id} tiene una categoría que no existe (${p.cat})`);
    if (p.icon && !ICONS[p.icon]) mal(`products.js: ${p.id} usa un ícono que no existe (${p.icon})`);
  }
  for (const k of KITS) for (const id of k.items) if (!ids.has(id)) mal(`products.js: el kit ${k.id} usa ${id}, que no existe`);
  if (!/^549\d{10}$/.test(CONFIG.whatsapp)) mal("products.js: el número de WhatsApp no tiene el formato 549XXXXXXXXXX");
} catch (e) { mal(`products.js: no se pudo leer (${e.message})`); }

// 5. Páginas: título y archivos locales que existan
const paginas = archivos(".", (f) => f.endsWith(".html"));
for (const f of paginas) {
  const h = leer(f);
  if (!/<title>[^<]+<\/title>/.test(h)) mal(`${f}: falta el título`);
  for (const m of h.matchAll(/(?:src|href)="(\/[^"#?]*)"/g)) {
    const u = m[1];
    if (u === "/" || u.startsWith("/_vercel/") || u.startsWith("/api/")) continue;
    const limpio = u.replace(/^\//, "").replace(/\/$/, "");
    if (!limpio) continue;
    const ok = existe(limpio) || existe(limpio + ".html") || /^(producto|categoria|marca)\//.test(limpio) || ["ofertas", "usados", "novedades", "carrito", "catalogo.csv", "liquidacion", "google-shopping.tsv"].includes(limpio) || redirige(limpio);
    if (!ok) mal(`${f}: enlace a ${u}, que no existe`);
  }
}
function redirige(u) { try { return JSON.parse(leer("vercel.json")).redirects.some((r) => r.source === "/" + u); } catch { return false; } }

// 6. Mapa del sitio con páginas reales
for (const m of leer("sitemap.xml").matchAll(/<loc>https:\/\/www\.tiendadevuelo\.com\.ar\/([^<]*)<\/loc>/g)) {
  const u = m[1].replace(/\/$/, "");
  if (u && !(existe(u + ".html") || /^(producto|categoria|marca)\//.test(u) || ["ofertas", "usados", "novedades"].includes(u))) mal(`sitemap.xml: ${u} no existe`);
}

if (errores.length) {
  console.error(`✗ La revisión encontró ${errores.length} problema(s):\n- ` + errores.join("\n- "));
  if (enVercel) { console.error("Se cancela esta publicación: la web sigue con la versión anterior."); process.exit(0); }
  process.exit(1);
}
console.log(`✓ Revisión OK: ${js.length} archivos JS, ${paginas.length} páginas, ${funciones.length} funciones.`);
// En Vercel, salir con 1 significa "seguir con la publicación".
process.exit(enVercel ? 1 : 0);
