// Genera las imágenes para Instagram con el estilo de la web (colores, tipografías y logo).
// Uso: node tools/instagram.mjs   (necesita Playwright; en este entorno está en /opt/node22)
// Salida: img/ig/producto-<id>.jpg (post 4:5), img/ig/historia-<id>.jpg (historia 9:16),
//         img/ig/lanzamiento-NN.jpg (serie para el perfil) y api/_igfotos.js (qué productos tienen imagen).
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT || "/opt/node22/lib/node_modules/playwright");
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(raiz, "products.js"), "utf8") + ";this.__d={PRODUCTS,CONFIG,KITS}", ctx);
const { PRODUCTS, CONFIG } = ctx.__d;
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
// Las fotos van incrustadas (el navegador no deja leer archivos locales desde la plantilla)
const foto = (p, i = 0) => "data:image/jpeg;base64," + fs.readFileSync(path.join(raiz, p.fotos[Math.min(i, p.fotos.length - 1)])).toString("base64");
const LOGO = `<svg viewBox="0 0 48 48" class="logo"><g fill="none" transform="rotate(-8 24 24)"><circle cx="24" cy="24" r="20" stroke="#74acdf" stroke-width="5" stroke-dasharray="100 25.7" stroke-linecap="round"/><circle cx="24" cy="24" r="20" stroke="#fff" stroke-width="1.4" stroke-dasharray="100 25.7"/></g><circle cx="24" cy="44" r="3.4" fill="#f6b40e"/><circle cx="24" cy="44" r="5.2" fill="none" stroke="#f6b40e" stroke-width="1.2" stroke-dasharray="1.6 1.4"/><g transform="rotate(45 24 24) translate(24 23) scale(.78) translate(-24 -24)" fill="currentColor"><path d="M24 6c1.6 0 2.4 1.6 2.4 4v8l14 8v3l-14-4v9l4 3v2.5l-6.4-1.8-6.4 1.8V37l4-3v-9l-14 4v-3l14-8v-8c0-2.4.8-4 2.4-4z"/><rect x="30.6" y="21.2" width="2.6" height="5.4" rx="1.3"/><rect x="14.8" y="21.2" width="2.6" height="5.4" rx="1.3"/></g></svg>`;

const CSS = `
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700;800&display=block");
:root { --text: #0c2340; --muted: #5a6b82; --accent: #0a74c2; --accent2: #085c9c; --line: #e3edf6; --sky: #eaf4fd; --flag: #74acdf; --sun: #f6b40e; --navy: #0c2340; }
* { box-sizing: border-box; margin: 0; }
body { width: var(--w); height: var(--h); font-family: Inter, sans-serif; color: var(--text); -webkit-font-smoothing: antialiased; overflow: hidden; }
.lienzo { position: relative; width: 100%; height: 100%; padding: 64px 72px; display: flex; flex-direction: column; gap: 36px;
  background: radial-gradient(900px 600px at 85% 0%, rgba(56, 189, 248, .22), transparent 60%), linear-gradient(180deg, #eef6fe 0%, #ffffff 70%); }
.oscuro { color: #fff; background: radial-gradient(900px 700px at 90% 0%, rgba(56, 189, 248, .30), transparent 60%), linear-gradient(160deg, #0c2340 0%, #0a3a66 100%); }
.top { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.marca { display: flex; align-items: center; gap: 16px; }
.logo { width: 76px; height: 76px; color: var(--navy); }
.oscuro .logo { color: #fff; }
.marca b { display: block; font: 700 38px/1 Outfit, sans-serif; letter-spacing: -.02em; }
.marca small { display: block; font: 600 17px/1 Inter, sans-serif; letter-spacing: .32em; text-transform: uppercase; color: var(--accent); margin-top: 8px; }
.oscuro .marca small { color: var(--flag); }
.pill { padding: 12px 24px; border-radius: 999px; background: #fff; border: 2px solid var(--line); font: 600 24px Inter, sans-serif; white-space: nowrap; }
.pill.ok { background: #e3f6ee; border-color: #b7e6d1; color: #0b6b49; }
.oscuro .pill { background: rgba(255,255,255,.1); border-color: rgba(255,255,255,.25); color: #fff; }
.tarjeta { flex: 1; min-height: 0; background: #fff; border-radius: 48px; box-shadow: 0 40px 80px -40px rgba(12, 35, 64, .45), 0 0 0 2px var(--line); display: grid; place-items: center; padding: 48px; }
.tarjeta { position: relative; overflow: hidden; }
.tarjeta img { position: absolute; inset: 48px; width: calc(100% - 96px); height: calc(100% - 96px); object-fit: contain; }
.kicker { font: 700 24px Inter, sans-serif; letter-spacing: .24em; text-transform: uppercase; color: var(--accent); }
.oscuro .kicker { color: var(--flag); }
h1 { font: 800 70px/1.04 Outfit, sans-serif; letter-spacing: -.03em; text-wrap: balance; }
h1 .g { background: linear-gradient(90deg, #0a74c2, #38bdf8); -webkit-background-clip: text; background-clip: text; color: transparent; }
.oscuro h1 .g { background: linear-gradient(90deg, #74acdf, #bfe6ff); -webkit-background-clip: text; background-clip: text; }
.nota { font: 600 32px/1.3 Inter, sans-serif; color: var(--accent2); margin-top: 12px; }
.oscuro .nota { color: #bfe6ff; }
.texto { font: 500 34px/1.45 Inter, sans-serif; color: var(--muted); }
.oscuro .texto { color: #d6e6f5; }
.pie { display: flex; justify-content: space-between; align-items: center; font: 600 26px Inter, sans-serif; color: var(--muted); border-top: 2px solid var(--line); padding-top: 26px; }
.oscuro .pie { color: #bcd3ea; border-color: rgba(255,255,255,.15); }
.pie b { color: var(--accent); }
.oscuro .pie b { color: #fff; }
.filas { display: grid; gap: 22px; }
.fila { display: grid; grid-template-columns: 96px 1fr; gap: 26px; align-items: center; background: #fff; border-radius: 32px; padding: 26px 30px; box-shadow: 0 0 0 2px var(--line); }
.oscuro .fila { background: rgba(255,255,255,.08); box-shadow: 0 0 0 2px rgba(255,255,255,.14); }
.fila .n { width: 96px; height: 96px; border-radius: 28px; display: grid; place-items: center; background: var(--sky); font: 800 44px Outfit, sans-serif; color: var(--accent); }
.oscuro .fila .n { background: rgba(116,172,223,.18); color: #bfe6ff; }
.fila b { display: block; font: 700 36px/1.15 Outfit, sans-serif; }
.fila span { display: block; font: 500 26px/1.35 Inter, sans-serif; color: var(--muted); margin-top: 6px; }
.oscuro .fila span { color: #c8daec; }
.mosaico { flex: 1; min-height: 0; display: grid; gap: 22px; }
.mosaico div { background: #fff; border-radius: 36px; display: grid; place-items: center; padding: 24px; box-shadow: 0 0 0 2px var(--line); min-height: 0; }
.mosaico div { position: relative; overflow: hidden; }
.mosaico img { position: absolute; inset: 22px; width: calc(100% - 44px); height: calc(100% - 44px); object-fit: contain; }
.cifras { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.cifras div { background: #fff; border-radius: 32px; padding: 34px 28px; box-shadow: 0 0 0 2px var(--line); }
.cifras b { display: block; font: 800 60px/1 Outfit, sans-serif; color: var(--accent); }
.cifras span { display: block; font: 500 26px/1.3 Inter, sans-serif; color: var(--muted); margin-top: 10px; }
.vs { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
.vs > div { background: #fff; border-radius: 36px; padding: 28px; display: grid; grid-template-rows: minmax(0, 1fr) auto; gap: 16px; box-shadow: 0 0 0 2px var(--line); min-height: 0; }
.vs img { width: 100%; height: 100%; min-height: 0; object-fit: contain; }
.vs b { font: 700 32px/1.15 Outfit, sans-serif; text-align: center; }
.vs small { display: block; font: 500 24px/1.3 Inter, sans-serif; color: var(--muted); margin-top: 6px; }
`;
const cabeza = (marca = true, pill = "") => `<div class="top"><div class="marca">${LOGO}<div><b>Tienda de Vuelo</b><small>Pilot shop</small></div></div>${pill}</div>`;
const pie = (izq = "tiendadevuelo.com.ar", der = "Envíos a todo el país") => `<div class="pie"><b>${izq}</b><span>${der}</span></div>`;
const pagina = (w, h, cuerpo, oscuro = false) => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body style="--w:${w}px;--h:${h}px"><div class="lienzo${oscuro ? " oscuro" : ""}">${cuerpo}</div></body></html>`;

// ---------- Plantillas ----------
const pillDe = (p) => p.oficial ? '<span class="pill ok">✔ Distribuidor oficial</span>' : `<span class="pill">${esc(p.brand || p.cat)}</span>`;
const producto = (p, h) => pagina(1080, h, `${cabeza(true, pillDe(p))}
  <div class="tarjeta"><img src="${foto(p)}"></div>
  <div><div class="kicker">${esc(p.brand || p.cat)}</div><h1>${esc(p.name)}</h1>${p.nota ? `<div class="nota">${esc(p.nota)}</div>` : ""}</div>
  ${pie("tiendadevuelo.com.ar", p.usd || p.ars ? "Envíos a todo el país" : "Consultá el precio por WhatsApp")}`);

const p = (id) => PRODUCTS.find((x) => x.id === id);
const LANZAMIENTO = [
  () => pagina(1080, 1350, `${cabeza(true, '<span class="pill ok">✔ Distribuidor oficial Bose</span>')}
    <div><div class="kicker">Pilot shop · Argentina</div><h1 style="font-size:104px">Volar <span class="g">bien equipado</span>.</h1></div>
    <div class="tarjeta"><img src="${foto(p("bose-a30"))}"></div>
    <div class="texto">Auriculares, radios y aviónica originales, elegidos por pilotos.</div>${pie()}`),
  () => pagina(1080, 1350, `${cabeza(true, "")}
    <div><div class="kicker">Distribuidor oficial</div><h1 style="font-size:92px">Bose en <span class="g">Argentina</span>.</h1><div class="nota">Bose A30 con ficha Dual plug, LEMO o XLR</div></div>
    <div class="tarjeta"><img src="${foto(p("bose-a30"), 1)}"></div>${pie("Garantía oficial Bose", "tiendadevuelo.com.ar")}`),
  () => pagina(1080, 1350, `${cabeza(true, "")}
    <div><div class="kicker">Guía rápida</div><h1>¿Qué ficha usa <span class="g">tu avión</span>?</h1></div>
    <div class="filas">
      <div class="fila"><div class="n">GA</div><div><b>Dual plug</b><span>Aviones de escuela y aviación general: Cessna, Piper, Tecnam, Diamond.</span></div></div>
      <div class="fila"><div class="n">6</div><div><b>LEMO de 6 pines</b><span>Ficha redonda en el panel. Alimenta el auricular desde el avión.</span></div></div>
      <div class="fila"><div class="n">5</div><div><b>XLR de 5 pines</b><span>Aviones de línea Airbus.</span></div></div>
      <div class="fila"><div class="n">U</div><div><b>U-174/U</b><span>Helicópteros.</span></div></div>
    </div>${pie("tiendadevuelo.com.ar/aviones", "Guardá este post")}`, true),
  () => pagina(1080, 1350, `${cabeza(true, "")}
    <div><div class="kicker">Centro de aviónica</div><h1>Garmin y ELT, <span class="g">con instalación</span>.</h1></div>
    <div class="mosaico" style="grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr">
      <div><img src="${foto(p("garmin-g5-certificado"))}"></div><div><img src="${foto(p("garmin-aera-660"))}"></div>
      <div><img src="${foto(p("elt-artex-345"))}"></div><div><img src="${foto(p("elt-ack-e04"))}"></div></div>
    <div class="texto">Te pasamos el presupuesto del equipo y coordinamos la instalación en un taller habilitado.</div>${pie("tiendadevuelo.com.ar/avionica", "")}`),
  () => pagina(1080, 1350, `${cabeza(true, "")}
    <div><div class="kicker">Atendido por pilotos</div><h1>Compraste bien, <span class="g">volás tranquilo</span>.</h1></div>
    <div class="cifras"><div><b>+2.500</b><span>ventas a pilotos, alumnos y tripulantes</span></div><div><b>48 h</b><span>despacho a todo el país</span></div><div><b>En el día</b><span>en CABA</span></div></div>
    <div class="filas">
      <div class="fila"><div class="n">✓</div><div><b>Productos originales</b><span>Con la garantía de cada fabricante.</span></div></div>
      <div class="fila"><div class="n">$</div><div><b>Pagá como prefieras</b><span>Transferencia en pesos o dólares, efectivo, USDT o seña para reservar.</span></div></div>
    </div>${pie()}`),
  () => pagina(1080, 1350, `${cabeza(true, "")}
    <div><div class="kicker">Para regalar</div><h1>Regalos para <span class="g">pilotos</span>.</h1></div>
    <div class="mosaico" style="grid-template-columns:1fr 1fr 1fr;grid-template-rows:1fr 1fr">
      ${["llavero-remove-before-flight", "llavero-pilot-amarillo", "llavero-crew-rojo", "pin-boeing-737-dorado", "llavero-airbus-azul", "lanyard-boeing-azul"].map((id) => `<div><img src="${foto(p(id))}"></div>`).join("")}</div>
    <div class="texto">Llevá 3 o más llaveros o regalos y tenés 10% de descuento.</div>${pie()}`),
  () => pagina(1080, 1350, `${cabeza(true, "")}
    <div><div class="kicker">Comparativa</div><h1>Garmin G5: <span class="g">¿certificado o experimental?</span></h1></div>
    <div class="vs"><div><img src="${foto(p("garmin-g5-certificado"))}"><b>G5 certificado<small>Aprobación STC y batería de respaldo incluida</small></b></div>
      <div><img src="${foto(p("garmin-g5-experimental"), 1)}"><b>G5 experimental<small>Para experimentales y LSA</small></b></div></div>${pie("tiendadevuelo.com.ar/comparativas", "")}`),
  () => pagina(1080, 1350, `${cabeza(true, "")}
    <div><div class="kicker">Navegación</div><h1>Para tus <span class="g">primeras travesías</span>.</h1></div>
    <div class="mosaico" style="grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr">
      <div><img src="${foto(p("jeppesen-cr-3"))}"></div><div><img src="${foto(p("jeppesen-pj-1"))}"></div>
      <div><img src="${foto(p("jeppesen-pn-1"))}"></div><div><img src="${foto(p("asa-flight-timer-3"))}"></div></div>
    <div class="texto">Computadora Jeppesen CR-3, plotters PJ-1 y PN-1 y cronómetro ASA. En kit, con descuento.</div>${pie()}`),
  () => pagina(1080, 1350, `${cabeza(true, "")}
    <div><div class="kicker">Cómo comprar</div><h1>Pedís en la web, <span class="g">te asesoramos</span> por WhatsApp.</h1></div>
    <div class="filas">
      <div class="fila"><div class="n">1</div><div><b>Elegí en la web</b><span>tiendadevuelo.com.ar</span></div></div>
      <div class="fila"><div class="n">2</div><div><b>Te confirmamos por WhatsApp</b><span>Stock, ficha correcta y precio al dólar del día.</span></div></div>
      <div class="fila"><div class="n">3</div><div><b>Pagás como prefieras</b><span>Podés reservar con seña.</span></div></div>
      <div class="fila"><div class="n">4</div><div><b>Te llega a todo el país</b><span>En el día en CABA o entrega en aeródromo.</span></div></div>
    </div>${pie(`WhatsApp ${CONFIG.whatsappVisible}`, "@tiendadevueloar")}`, true),
];

// ---------- Render ----------
const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {});
const pag = await b.newPage();
async function render(html, w, h, salida) {
  await pag.setViewportSize({ width: w, height: h });
  await pag.setContent(html, { waitUntil: "networkidle" });
  await pag.evaluate(() => document.fonts.ready);
  await pag.screenshot({ path: salida, type: "jpeg", quality: 88 });
}
const out = (n) => path.join(raiz, "img/ig", n);
const solo = process.argv[2];
const ids = [];
for (const x of PRODUCTS.filter((x) => x.fotos?.length && (!solo || x.id === solo))) {
  await render(producto(x, 1350), 1080, 1350, out(`producto-${x.id}.jpg`));
  await render(producto(x, 1920), 1080, 1920, out(`historia-${x.id}.jpg`));
  ids.push(x.id);
}
if (!solo) for (let i = 0; i < LANZAMIENTO.length; i++) await render(LANZAMIENTO[i](), 1080, 1350, out(`lanzamiento-${String(i + 1).padStart(2, "0")}.jpg`));
await b.close();
if (!solo) fs.writeFileSync(path.join(raiz, "api/_igfotos.js"), `// Generado por tools/instagram.mjs: productos que tienen imagen propia para Instagram (img/ig/producto-<id>.jpg).\nexport const IG_FOTOS = new Set(${JSON.stringify(ids)});\n`);
console.log(`✓ ${ids.length} productos (post e historia)${solo ? "" : ` y ${LANZAMIENTO.length} de lanzamiento`}.`);
