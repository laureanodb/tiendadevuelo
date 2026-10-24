// Genera las páginas fijas por avión (/avion/...) y las comparativas (/comparar/...).
// Uso: node tools/paginas.mjs  (después revisar con node tests/revisar.mjs)
import fs from "node:fs";
import path from "node:path";

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SITIO = "https://www.tiendadevuelo.com.ar";
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const FICHA = {
  dual: { nombre: "Dual plug (GA)", texto: "dos fichas separadas: una para el micrófono y otra para los auriculares. Es la conexión estándar de la aviación general." },
  lemo: { nombre: "LEMO de 6 pines", texto: "una ficha redonda de 6 pines que además alimenta el auricular desde el avión, sin pilas." },
  xlr: { nombre: "XLR de 5 pines", texto: "una ficha redonda de 5 pines, típica de los aviones de línea de Airbus." },
  u174: { nombre: "U-174/U", texto: "una sola ficha que junta micrófono y auriculares, la conexión estándar de los helicópteros." },
};

const AVIONES = [
  { slug: "cessna-152", nombre: "Cessna 150 y 152", tipo: "escuela", ficha: "dual", nota: "Es el avión de escuela más común en los aeroclubes. Usan las dos fichas separadas de la aviación general." },
  { slug: "cessna-172", nombre: "Cessna 172", tipo: "escuela", ficha: "dual", extra: "lemo", nota: "La mayoría tiene las fichas Dual plug. Algunos más nuevos o con aviónica modernizada también traen la ficha LEMO." },
  { slug: "cessna-182", nombre: "Cessna 182", tipo: "general", ficha: "dual", extra: "lemo", nota: "Usa las fichas Dual plug. Los equipados con aviónica más nueva pueden tener además la ficha LEMO." },
  { slug: "piper-pa-28", nombre: "Piper PA-28 (Cherokee, Warrior, Archer)", tipo: "escuela", ficha: "dual", nota: "Usa las fichas Dual plug de la aviación general." },
  { slug: "piper-seneca", nombre: "Piper Seneca", tipo: "general", ficha: "dual", nota: "Bimotor de instrucción y vuelos ejecutivos, con las fichas Dual plug." },
  { slug: "aero-boero", nombre: "Aero Boero", tipo: "escuela", ficha: "dual", nota: "Los Aero Boero con radio instalada usan las fichas Dual plug. Si el tuyo no tiene intercomunicador, una radio portátil te resuelve la comunicación." },
  { slug: "tecnam-p2008", nombre: "Tecnam P2002 y P2008", tipo: "escuela", ficha: "dual", nota: "Muy usados en escuelas por su bajo consumo. Usan las fichas Dual plug." },
  { slug: "diamond-da40", nombre: "Diamond DA20, DA40 y DA42", tipo: "escuela", ficha: "dual", extra: "lemo", nota: "La mayoría usa las fichas Dual plug. Algunos vienen con la ficha LEMO: fijate en el panel antes de elegir." },
  { slug: "cirrus-sr22", nombre: "Cirrus SR20 y SR22", tipo: "general", ficha: "dual", extra: "lemo", nota: "Muchos traen la ficha LEMO además de las Dual plug. Con LEMO el auricular toma energía del avión." },
  { slug: "beechcraft-baron", nombre: "Beechcraft Bonanza y Baron", tipo: "general", ficha: "dual", nota: "Usan las fichas Dual plug de la aviación general." },
  { slug: "boeing-737", nombre: "Boeing 737", tipo: "linea", ficha: "dual", nota: "En la cabina del 737 se usan las fichas Dual plug, las mismas de la aviación general." },
  { slug: "airbus-a320", nombre: "Airbus A320", tipo: "linea", ficha: "xlr", nota: "Los Airbus usan la ficha XLR de 5 pines." },
  { slug: "robinson-r44", nombre: "Robinson R22 y R44", tipo: "helicoptero", ficha: "u174", nota: "Como la mayoría de los helicópteros, usan la ficha U-174/U." },
];

const COMPARATIVAS = [
  { slug: "bose-a30-vs-david-clark-one-x", a: "bose-a30", b: "david-clark-dc-one-x", titulo: "Bose A30 o David Clark ONE-X",
    resumen: "Los dos son auriculares envolventes con cancelación de ruido y Bluetooth, pensados para pilotos que vuelan seguido.",
    puntos: [["Elegí el Bose A30 si…", "volás muchas horas seguidas y priorizás la comodidad y el silencio: es más liviano (404 g), tiene cancelación activa de ruido de tres niveles y lo tenemos con ficha Dual plug, LEMO o XLR."],
      ["Elegí el David Clark ONE-X si…", "querés la robustez clásica de David Clark, con cancelación de ruido híbrida y la tranquilidad de que las comunicaciones siguen funcionando aunque se agoten las pilas."]] },
  { slug: "bose-a30-vs-david-clark-pro-x2", a: "bose-a30", b: "david-clark-dc-pro-x2", titulo: "Bose A30 o David Clark PRO-X2",
    resumen: "Dos formatos distintos: el A30 es envolvente y el PRO-X2 apoya sobre la oreja.",
    puntos: [["Elegí el Bose A30 si…", "querés el máximo silencio en cabina: al cubrir toda la oreja aísla mejor del ruido del motor."],
      ["Elegí el David Clark PRO-X2 si…", "buscás lo más liviano posible (213 g) y volás en cabinas más silenciosas o con calor, donde un auricular sobre la oreja resulta más fresco."]] },
  { slug: "icom-a16-vs-yaesu-fta-250l", a: "icom-ic-a16", b: "yaesu-fta-250l", titulo: "Icom IC-A16 o Yaesu FTA-250L",
    resumen: "Dos radios portátiles de banda aeronáutica, solo comunicaciones, con separación de 8,33 y 25 kHz.",
    puntos: [["Elegí la Icom IC-A16 si…", "querés más potencia (6 W), audio más fuerte para ambientes ruidosos, más autonomía y protección IP67 contra agua y polvo."],
      ["Elegí la Yaesu FTA-250L si…", "priorizás el tamaño y el peso: es muy compacta y entra en cualquier bolsillo del flight bag."]] },
  { slug: "jeppesen-pj-1-vs-pn-1", a: "jeppesen-pj-1", b: "jeppesen-pn-1", titulo: "Plotter Jeppesen PJ-1 o PN-1",
    resumen: "Los dos tienen escalas 1:500.000 y 1:1.000.000 en millas náuticas y terrestres. Cambia el transportador.",
    puntos: [["Elegí el PJ-1 si…", "querés medir rumbos rápido: su transportador giratorio se alinea con un meridiano y leés el rumbo directo."],
      ["Elegí el PN-1 si…", "medís tramos largos: su regla es más larga y el transportador fijo es simple y robusto."]] },
  { slug: "garmin-g5-certificado-vs-experimental", a: "garmin-g5-certificado", b: "garmin-g5-experimental", titulo: "Garmin G5 certificado o experimental",
    resumen: "Es el mismo instrumento de 3,5 pulgadas. Cambia la aprobación: de eso depende en qué avión lo podés instalar.",
    puntos: [["Elegí el G5 certificado si…", "tu avión está certificado (la mayoría de los aviones de escuela y de aviación general). Tiene aprobación STC, batería de respaldo incluida y lo instala un taller habilitado."],
      ["Elegí el G5 experimental si…", "volás un avión experimental o deportivo liviano (LSA). No se puede instalar en aviones certificados, y la batería de respaldo es opcional."]] },
  { slug: "elt-ack-e04-vs-artex-345", a: "elt-ack-e04", b: "elt-artex-345", titulo: "ELT ACK E-04 o Artex ELT 345",
    resumen: "Los dos transmiten en 406 MHz al sistema satelital Cospas-Sarsat y en 121,5 MHz para la búsqueda final, y se registran con la matrícula del avión.",
    puntos: [["Elegí el ACK E-04 si…", "buscás el equipo más liviano y compacto (0,73 kg con batería) y querés conectarlo al GPS del avión: acepta Garmin, Bendix/King y NMEA 0183."],
      ["Elegí el Artex ELT 345 si…", "preferís espaciar el recambio de batería (cada 6 años) y una marca con muchísimos equipos instalados en aviación general."]] },
  { slug: "almohadillas-bose-originales-vs-alternativas", a: "almohadillas-bose-a20-a30", b: "almohadillas-alternativas", titulo: "Almohadillas Bose originales o alternativas",
    resumen: "Las dos renuevan el aislamiento y la comodidad del auricular. Cambian el ajuste exacto, el material y el precio.",
    puntos: [["Elegí las originales Bose si…", "querés el ajuste y el aislamiento de fábrica de tu A20 o A30, con la garantía de un repuesto original."],
      ["Elegí las alternativas si…", "buscás una opción más económica o preferís el gel, que sella mejor con anteojos y es más fresco en verano."]] },
  { slug: "almohadillas-david-clark-originales-vs-alternativas", a: "almohadillas-david-clark-gel", b: "almohadillas-alternativas", titulo: "Almohadillas David Clark originales o alternativas",
    resumen: "Para la serie H10 de David Clark: las originales de gel y las alternativas de gel o espuma.",
    puntos: [["Elegí las originales David Clark si…", "querés el repuesto de fábrica para tu H10, con el gel y la forma exacta del original."],
      ["Elegí las alternativas si…", "buscás gastar menos o necesitás almohadillas para otro modelo de auricular."]] },
];

const cabeza = (titulo, desc, url, ld) => `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(titulo)} · Tienda de Vuelo</title>
  <meta name="description" content="${esc(desc)}">
  <meta name="theme-color" content="#ffffff">
  <link rel="canonical" href="${SITIO}${url}">
  <meta property="og:title" content="${esc(titulo)} · Tienda de Vuelo">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:image" content="${SITIO}/og.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
  <script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>
</head>`;
const pie = (script) => `
  <div id="siteFooter"></div>
  <script src="/products.js"></script>
  <script src="/catalogo.js" data-load="/site.js"></script>
  <script>
${script}
  </script>
  <script defer src="/_vercel/insights/script.js"></script>
</body>
</html>
`;
const migas = (items) => ({ "@type": "BreadcrumbList", itemListElement: items.map(([n, u], i) => ({ "@type": "ListItem", position: i + 1, name: n, item: SITIO + u })) });
const faqLd = (faqs) => ({ "@type": "FAQPage", mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) });
const faqHTML = (faqs) => `<div class="faq">${faqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</div>`;
const escribir = (rel, html) => { const f = path.join(raiz, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); };

// ---------- Aviones ----------
for (const av of AVIONES) {
  const f = FICHA[av.ficha], x = av.extra && FICHA[av.extra];
  const titulo = av.tipo === "helicoptero" ? `Auriculares para ${av.nombre}` : `Auriculares y equipos para ${av.nombre}`;
  const desc = `Qué ficha usa el ${av.nombre} (${f.nombre}${x ? " o " + x.nombre : ""}) y qué auriculares y radios le sirven. Equipos originales con envío a todo el país.`;
  const faqs = [
    [`¿Qué ficha de auricular usa el ${av.nombre}?`, `${av.nota} La ficha ${f.nombre} son ${f.texto}${x ? ` La ficha ${x.nombre} es ${x.texto}` : ""}`],
    ["¿Cómo confirmo la ficha de mi avión?", "Mirá las tomas del panel o del intercomunicador junto a tu asiento. Si tenés dudas, mandanos una foto por WhatsApp y te decimos cuál pedir."],
    ["¿Puedo usar un auricular con otra ficha?", "Existen adaptadores, pero agregan peso y un punto más de falla. Lo mejor es pedir el auricular con la ficha correcta."],
  ];
  const ld = { "@context": "https://schema.org", "@graph": [migas([["Inicio", "/"], ["Aviones", "/aviones"], [av.nombre, `/avion/${av.slug}`]]), faqLd(faqs)] };
  const html = cabeza(titulo, desc, `/avion/${av.slug}`, ld) + `
<body data-page="avion" data-wa="¡Hola! Vuelo en ${esc(av.nombre)} y quería consultar por un auricular.">
  <div id="siteHeader"></div>
  <main>
    <section class="page-hero"><div class="wrap">
      <nav class="small" aria-label="Ubicación"><a href="/aviones">Aviones</a> › ${esc(av.nombre)}</nav>
      <span class="kicker">Ficha ${esc(f.nombre)}${x ? ` · ${esc(x.nombre)}` : ""}</span>
      <h1>${esc(titulo)}</h1>
      <p>${esc(av.nota)}</p>
    </div></section>
    <section class="wrap prose">
      <div class="ficha-av">
        <div><b>Ficha principal</b><span>${esc(f.nombre)}</span><p class="small">Son ${esc(f.texto)}</p></div>
        ${x ? `<div><b>También puede tener</b><span>${esc(x.nombre)}</span><p class="small">Es ${esc(x.texto)}</p></div>` : ""}
      </div>
      <h2>Auriculares que le sirven</h2>
      <div class="grid grid-4" id="avAuris"></div>
      ${av.ficha === "dual" ? `<h2>Adaptadores de ficha</h2>
      <p>Para usar en este avión un auricular que tiene otra ficha.</p>
      <div class="grid grid-4" id="avAdapt"></div>` : ""}
      <h2>Radios portátiles</h2>
      <p>Para escuchar la frecuencia en tierra o como respaldo ante una falla eléctrica.</p>
      <div class="grid grid-4" id="avRadios"></div>
      ${["escuela", "general"].includes(av.tipo) ? `<h2>Para planificar tus vuelos</h2><div class="grid grid-4" id="avNav"></div>` : ""}
      <h2>Preguntas frecuentes</h2>
      ${faqHTML(faqs)}
      <p><a href="/aviones">Ver otros aviones y helicópteros</a></p>
    </section>
  </main>` + pie(`    window.addEventListener("tdv:listo", () => {
      const { card, $ } = window.TDV;
      const fichas = ${JSON.stringify([av.ficha, av.extra].filter(Boolean))};
      const vis = PRODUCTS.filter((p) => !p.agotado);
      const sirve = (p) => fichas.some((k) => (p.variantes || []).concat(p.specs || [], p.nota || "").join(" ").toLowerCase().replace("u-174", "u174").includes(k === "dual" ? "dual" : k));
      const auris = vis.filter((p) => p.icon === "headset");
      const llenar = (id, lista, vacio) => { const el = $(id); if (el) el.innerHTML = lista.length ? lista.map(card).join("") : '<p class="muted" style="grid-column:1/-1">' + vacio + '</p>'; };
      const sinDato = (p) => !/dual|lemo|xlr|u-?174/i.test((p.variantes || []).concat(p.specs || [], p.nota || "").join(" "));
      llenar("#avAuris", [...auris.filter(sirve), ...(fichas[0] === "dual" ? auris.filter((p) => !sirve(p) && sinDato(p)) : [])].slice(0, 8), "Consultanos por WhatsApp: te conseguimos el auricular con la ficha que necesitás.");
      llenar("#avAdapt", vis.filter((p) => p.icon === "plug" && /a dual/i.test(p.name)), "Consultanos: te conseguimos el adaptador que necesitás.");
      llenar("#avRadios", vis.filter((p) => p.icon === "radio" && !/panel/i.test(p.name)), "Consultanos por radios portátiles.");
      llenar("#avNav", vis.filter((p) => p.cat === "Navegación"), "");
    });`);
  escribir(`avion/${av.slug}.html`, html);
}
// Índice de aviones
{
  const grupos = [["escuela", "Aviones de escuela"], ["general", "Aviación general"], ["linea", "Aviones de línea"], ["helicoptero", "Helicópteros"]];
  const ld = { "@context": "https://schema.org", "@graph": [migas([["Inicio", "/"], ["Aviones", "/aviones"]])] };
  const html = cabeza("¿Qué ficha usa tu avión?", "Elegí tu avión o helicóptero y te decimos qué ficha de auricular usa y qué equipos le sirven.", "/aviones", ld) + `
<body data-page="aviones" data-wa="¡Hola! Quería saber qué ficha de auricular usa mi avión.">
  <div id="siteHeader"></div>
  <main>
    <section class="page-hero"><div class="wrap">
      <span class="kicker">Auriculares por avión</span>
      <h1>¿Qué ficha usa tu avión?</h1>
      <p>Elegí el avión o helicóptero en el que volás y te mostramos la ficha que usa y los equipos que le sirven. Si no está en la lista, mandanos una foto del panel por WhatsApp.</p>
    </div></section>
    <section class="wrap prose">
      ${grupos.map(([t, n]) => `<h2>${n}</h2><div class="av-lista">${AVIONES.filter((a) => a.tipo === t).map((a) => `<a href="/avion/${a.slug}"><b>${esc(a.nombre)}</b><span>${esc(FICHA[a.ficha].nombre)}${a.extra ? " · " + esc(FICHA[a.extra].nombre) : ""}</span></a>`).join("")}</div>`).join("\n      ")}
    </section>
  </main>` + pie("");
  escribir("aviones.html", html);
}

// ---------- Comparativas ----------
for (const c of COMPARATIVAS) {
  const desc = `${c.titulo}: comparación técnica lado a lado y cuál conviene según cómo volás. ${c.resumen}`.slice(0, 200);
  const faqs = c.puntos.map(([q, a]) => [q.replace("…", "?").replace("Elegí", "¿Cuándo conviene"), a.charAt(0).toUpperCase() + a.slice(1)]);
  const ld = { "@context": "https://schema.org", "@graph": [migas([["Inicio", "/"], ["Comparativas", "/comparativas"], [c.titulo, `/comparar/${c.slug}`]])] };
  const html = cabeza(c.titulo, desc, `/comparar/${c.slug}`, ld) + `
<body data-page="comparar" data-wa="¡Hola! Estoy dudando entre ${esc(c.titulo.replace(" o ", " y "))}.">
  <div id="siteHeader"></div>
  <main>
    <section class="page-hero"><div class="wrap">
      <nav class="small" aria-label="Ubicación"><a href="/comparativas">Comparativas</a> › ${esc(c.titulo)}</nav>
      <span class="kicker">Comparativa</span>
      <h1>${esc(c.titulo)}</h1>
      <p>${esc(c.resumen)}</p>
    </div></section>
    <section class="wrap prose">
      <div class="cmp-tabla-wrap"><table class="cmp-tabla" id="cmpTabla"><caption class="small muted">Datos del fabricante</caption></table></div>
      <h2>¿Cuál te conviene?</h2>
      <div class="cmp-veredicto">${c.puntos.map(([t, x]) => `<div><h3>${esc(t)}</h3><p>${esc(x)}</p></div>`).join("")}</div>
      <p>¿Seguís con dudas? Escribinos por WhatsApp y te asesoramos según el avión y las horas que volás.</p>
      <p><a href="/comparativas">Ver otras comparativas</a></p>
    </section>
  </main>` + pie(`    window.addEventListener("tdv:listo", () => {
      const { esc, byId, priceHTML, $ } = window.TDV;
      const ps = [byId[${JSON.stringify(c.a)}], byId[${JSON.stringify(c.b)}]].filter(Boolean);
      if (ps.length < 2) return;
      const datos = ps.map((p) => Object.fromEntries((p.specs || []).map((s) => { const i = s.indexOf(":"); return i > 0 ? [s.slice(0, i).trim(), s.slice(i + 1).trim()] : [s, "Sí"]; })));
      const claves = [...new Set(datos.flatMap(Object.keys))];
      $("#cmpTabla").insertAdjacentHTML("beforeend", \`<thead><tr><th scope="col"><span class="sr-only">Dato</span></th>\${ps.map((p) => \`<th scope="col"><a href="/producto/\${p.id}">\${p.fotos ? \`<img src="\${esc(p.fotos[0].replace(/\\.jpg$/, "-t.webp"))}" alt="" width="120" height="120" loading="lazy">\` : ""}<span>\${esc(p.name)}</span></a></th>\`).join("")}</tr></thead>
        <tbody>\${claves.map((k) => \`<tr><th scope="row">\${esc(k)}</th>\${datos.map((d) => \`<td>\${esc(d[k] || "—")}</td>\`).join("")}</tr>\`).join("")}
        <tr><th scope="row">Precio</th>\${ps.map((p) => \`<td>\${priceHTML(p)}</td>\`).join("")}</tr></tbody>\`);
    });`);
  escribir(`comparar/${c.slug}.html`, html);
}
{
  const ld = { "@context": "https://schema.org", "@graph": [migas([["Inicio", "/"], ["Comparativas", "/comparativas"]])] };
  const html = cabeza("Comparativas de equipos para pilotos", "Auriculares, radios y plotters comparados lado a lado, con la recomendación según cómo volás.", "/comparativas", ld) + `
<body data-page="comparar" data-wa="¡Hola! Quería que me ayuden a elegir un equipo.">
  <div id="siteHeader"></div>
  <main>
    <section class="page-hero"><div class="wrap">
      <span class="kicker">Comparativas</span>
      <h1>¿Cuál me conviene?</h1>
      <p>Los equipos que más nos consultan, comparados lado a lado con datos del fabricante.</p>
    </div></section>
    <section class="wrap prose"><div class="av-lista">${COMPARATIVAS.map((c) => `<a href="/comparar/${c.slug}"><b>${esc(c.titulo)}</b><span>${esc(c.resumen)}</span></a>`).join("")}</div></section>
  </main>` + pie("");
  escribir("comparativas.html", html);
}

// Mapa del sitio: agrega las páginas que falten
const sm = path.join(raiz, "sitemap.xml");
let xml = fs.readFileSync(sm, "utf8");
const urls = ["/aviones", ...AVIONES.map((a) => `/avion/${a.slug}`), "/comparativas", ...COMPARATIVAS.map((c) => `/comparar/${c.slug}`)];
const nuevas = urls.filter((u) => !xml.includes(`<loc>${SITIO}${u}</loc>`));
if (nuevas.length) { xml = xml.replace("</urlset>", nuevas.map((u) => `  <url><loc>${SITIO}${u}</loc></url>\n`).join("") + "</urlset>"); fs.writeFileSync(sm, xml); }
console.log(`✓ ${AVIONES.length} aviones, ${COMPARATIVAS.length} comparativas, ${nuevas.length} URLs nuevas en el sitemap.`);
