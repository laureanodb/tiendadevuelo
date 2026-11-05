// Genera las imágenes del catálogo de WhatsApp Business con el estilo de la web.
// Uso: node tools/whatsapp.mjs   (necesita Playwright; en este entorno está en /opt/node22)
// Salida: img/wa/<id>.jpg (cuadrada 1080x1080, la que WhatsApp muestra en el catálogo) e img/wa/portada.jpg.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT || "/opt/node22/lib/node_modules/playwright");
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(raiz, "products.js"), "utf8") + ";this.__d={PRODUCTS}", ctx);
const { PRODUCTS } = ctx.__d;
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const foto = (f) => "data:image/jpeg;base64," + fs.readFileSync(path.join(raiz, f)).toString("base64");
const LOGO = fs.readFileSync(path.join(raiz, "logo.svg"), "utf8").replace("<svg ", '<svg class="logo" ');

const CSS = `@import url("https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700&family=Outfit:wght@700&display=block");
* { box-sizing: border-box; margin: 0; }
body { width: 1080px; height: 1080px; overflow: hidden; font-family: Inter, sans-serif; color: #0c2340; -webkit-font-smoothing: antialiased; }
.lienzo { width: 100%; height: 100%; padding: 44px; display: flex; flex-direction: column; gap: 26px;
  background: radial-gradient(800px 500px at 90% 0%, rgba(56,189,248,.20), transparent 60%), linear-gradient(180deg, #eef6fe, #ffffff 75%); }
.top { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.marca { display: flex; align-items: center; gap: 12px; } .logo { width: 58px; height: 58px; }
.marca b { display: block; font: 700 30px/1 Outfit, sans-serif; } .marca small { display: block; font: 600 14px/1 Inter; letter-spacing: .3em; color: #0a74c2; margin-top: 6px; }
.pill { padding: 10px 20px; border-radius: 999px; background: #fff; border: 2px solid #e3edf6; font: 600 21px Inter; white-space: nowrap; }
.pill.ok { background: #e3f6ee; border-color: #b7e6d1; color: #0b6b49; }
.tarjeta { position: relative; flex: 1; background: #fff; border-radius: 40px; box-shadow: 0 30px 60px -36px rgba(12,35,64,.4), 0 0 0 2px #e3edf6; overflow: hidden; }
.tarjeta img { position: absolute; inset: 40px; width: calc(100% - 80px); height: calc(100% - 80px); object-fit: contain; }
.pie { display: flex; justify-content: space-between; font: 600 22px Inter; color: #5a6b82; } .pie b { color: #0a74c2; }`;
const pagina = (cuerpo) => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body><div class="lienzo">${cuerpo}</div></body></html>`;
const pill = (p) => p.oficial ? '<span class="pill ok">✔ Distribuidor oficial</span>' : p.brand ? `<span class="pill">${esc(p.brand)}</span>` : "";
const plantilla = (p) => pagina(`<div class="top"><div class="marca">${LOGO}<div><b>Tienda de Vuelo</b><small>PILOT SHOP</small></div></div>${pill(p)}</div>
  <div class="tarjeta"><img src="${foto(p.fotos[0])}"></div>
  <div class="pie"><b>tiendadevuelo.com.ar</b><span>Envíos a todo el país</span></div>`);

const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {});
const pag = await b.newPage({ viewport: { width: 1080, height: 1080 } });
fs.mkdirSync(path.join(raiz, "img/wa"), { recursive: true });
let n = 0;
for (const p of PRODUCTS.filter((x) => x.fotos?.length && (!process.argv[2] || x.id === process.argv[2]))) {
  await pag.setContent(plantilla(p), { waitUntil: "networkidle" });
  await pag.evaluate(() => document.fonts.ready);
  await pag.screenshot({ path: path.join(raiz, "img/wa", `${p.id}.jpg`), type: "jpeg", quality: 86 });
  n++;
}
await b.close();
console.log(`✓ ${n} imágenes para el catálogo de WhatsApp.`);
