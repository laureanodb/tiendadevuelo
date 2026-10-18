// Partes compartidas por todas las páginas: encabezado, pie, carrito, precios y avisos.
(() => {
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const ars = (n) => "$" + Math.round(n).toLocaleString("es-AR");
  const usd = (n) => "US$ " + Math.round(n).toLocaleString("es-AR");
  const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };

  // ---------- Dólar del día (oficial, MEP, blue o fijo: se elige en el panel → Ajustes) ----------
  const tipoDolar = CONFIG.dolarTipo || "oficial";
  let dolar = tipoDolar === "manual" && CONFIG.dolarManual ? CONFIG.dolarManual : store.get("tdv-dolar-" + tipoDolar, null)?.venta || CONFIG.dolarRespaldo;
  if (tipoDolar !== "manual") fetch(`https://dolarapi.com/v1/dolares/${tipoDolar}`).then((r) => r.json()).then((d) => {
    if (d && d.venta) { dolar = d.venta; store.set("tdv-dolar-" + tipoDolar, { venta: d.venta }); document.dispatchEvent(new Event("tdv:precios")); renderCart(); }
  }).catch(() => {});
  // Siempre para arriba: a la centena, o al millar en precios grandes
  const redondear = (n) => (n >= 20000 ? Math.ceil(n / 1000) * 1000 : Math.ceil(n / 100) * 100);

  // Opciones con precio o foto propios: "Ficha LEMO | 1350 | foto 2"
  const numAR = (t) => { t = String(t).replace(/[^\d.,]/g, ""); if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, "").replace(",", "."); else t = t.replace(",", "."); return Number(t); };
  const opciones = (p) => (p.variantes || []).map((v) => {
    const partes = String(v).split("|").map((x) => x.trim());
    const o = { nombre: partes[0], precio: null, foto: null };
    for (const x of partes.slice(1)) { const f = x.match(/^foto\s*(\d+)$/i); if (f) o.foto = +f[1] - 1; else if (/\d/.test(x) && numAR(x) > 0) o.precio = numAR(x); }
    return o;
  });
  // Producto con el precio de la opción elegida (misma moneda que el producto)
  const conOpcion = (p, nombre) => {
    const o = opciones(p).find((x) => x.nombre === nombre);
    if (!o || o.precio === null) return p;
    return p.usd ? { ...p, usd: o.precio, antes: null } : { ...p, ars: o.precio, antes: null };
  };
  const desde = (p) => { const ps = opciones(p).map((o) => o.precio).filter((x) => x !== null); return ps.length && ps.some((x) => x !== (p.usd || p.ars)); };

  // Precio en pesos de un producto (null = a consultar)
  const pesos = (p) => p.usd ? redondear(p.usd * dolar) : (p.ars ?? null);
  const enOferta = (p) => !!(p.antes && (p.usd || p.ars) && p.antes > (p.usd || p.ars));
  const priceHTML = (p, big) => {
    const antes = enOferta(p) ? `<s>${p.usd ? usd(p.antes) : ars(p.antes)}</s>` : "";
    const d = !big && desde(p) ? '<span class="from">Desde</span>' : "";
    if (p.usd && d) { const min = Math.min(p.usd, ...opciones(p).map((o) => o.precio ?? Infinity)); return `<div class="price">${d}<b>${usd(min)}</b><span class="ars">≈ ${ars(redondear(min * dolar))}</span></div>`; }
    if (p.ars && d) { const min = Math.min(p.ars, ...opciones(p).map((o) => o.precio ?? Infinity)); return `<div class="price">${d}<b>${ars(min)}</b></div>`; }
    if (p.usd) return `<div class="price${big ? " price-big" : ""}">${antes}<b>${usd(p.usd)}</b><span class="ars">≈ ${ars(pesos(p))}</span></div>`;
    if (p.ars) return `<div class="price${big ? " price-big" : ""}">${antes}<b>${ars(p.ars)}</b></div>`;
    return `<div class="price${big ? " price-big" : ""}"><b class="consult">Consultar precio</b></div>`;
  };

  const art = (p, big) => {
    if (p.fotos && p.fotos.length) {
      // Miniatura: primero la WebP, si no existe la JPG chica y si tampoco, la foto grande
      const f = p.fotos[0], propia = /^\/img\/productos\/.+\.jpg$/.test(f), chica = !big && (propia || /\/storage\/v1\/object\/public\/productos\/.+\.jpg$/.test(f));
      const webp = chica && propia || chica && Number((f.match(/\/(\d{13})-[a-f0-9]+\.jpg$/) || [])[1]) > 1792296541731; // fotos subidas desde que existe la miniatura WebP
      const src = chica ? f.replace(/\.jpg$/, webp ? "-t.webp" : "-t.jpg") : f, resto = chica ? [webp && f.replace(/\.jpg$/, "-t.jpg"), f].filter(Boolean).join(" ") : "";
      return `<div class="art art-photo${big ? " art-big" : ""}"><img src="${esc(src)}" alt="${esc(p.name)}" loading="lazy" decoding="async"${resto ? ` data-alt="${esc(resto)}" onerror="var a=(this.dataset.alt||'').split(' ').filter(Boolean);if(a.length){this.dataset.alt=a.slice(1).join(' ');this.src=a[0]}else{this.onerror=null}"` : ""}></div>`;
    }
    const [a, b] = CAT_COLORS[p.cat] || ["#0e8be0", "#d6ebfc"];
    return `<div class="art${big ? " art-big" : ""}" style="--a:${a};--b:${b}">
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[p.icon]}</svg>
    </div>`;
  };

  const badges = (p) => [
    enOferta(p) && `<span class="badge badge-sale">-${Math.round((1 - (p.usd || p.ars) / p.antes) * 100)}%</span>`,
    p.ultimas && '<span class="badge badge-last">Últimas unidades</span>',
    p.llega && '<span class="badge badge-order">Preventa</span>',
    p.top && '<span class="badge">Más vendido</span>',
    p.nuevo && '<span class="badge badge-new">Nuevo ingreso</span>',
    p.encargo && '<span class="badge badge-order">Por encargo</span>',
    p.reacond && '<span class="badge badge-re">Reacondicionado</span>',
    p.liquidacion && '<span class="badge badge-sale">Liquidación</span>',
    p.digital && '<span class="badge badge-new">Digital</span>',
  ].filter(Boolean).slice(0, 2).join("");

  // ---------- Favoritos ----------
  let favs = store.get("tdv-favs", []);
  const isFav = (id) => favs.includes(id);
  const toggleFav = (id) => {
    favs = isFav(id) ? favs.filter((x) => x !== id) : [...favs, id];
    store.set("tdv-favs", favs);
    document.querySelectorAll(`[data-fav="${id}"]`).forEach((b) => {
      b.classList.toggle("on", isFav(id)); b.textContent = isFav(id) ? "♥" : "♡"; b.setAttribute("aria-pressed", isFav(id));
    });
    document.dispatchEvent(new Event("tdv:favs"));
    toast(isFav(id) ? "♥ Guardado en favoritos" : "Quitado de favoritos");
  };

  const estrellas = (n) => [1, 2, 3, 4, 5].map((i) => `<span class="${n >= i - 0.25 ? "on" : n >= i - 0.75 ? "half" : ""}">★</span>`).join("");
  const fechaCorta = (f) => f.split("-").reverse().slice(0, 2).join("/");

  // ---------- Comparador ----------
  let comparar = store.get("tdv-cmp", []).filter((id) => byId[id]);
  // Características "Clave: valor" → ficha técnica en tabla (también la usa el comparador)
  function fichaTecnica(p) {
    const tabla = [], sueltas = [];
    for (const s of p.specs || []) { const m = String(s).match(/^([^:]{2,32}):\s*(.+)$/); if (m) tabla.push([m[1].trim(), m[2].trim()]); else sueltas.push(s); }
    return { tabla, sueltas };
  }
  // Búsqueda que perdona errores: "dabid clark", "bose a 30", "auricular helicoptero"
  const sinTilde = (x) => String(x).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  function distancia(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 9;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[b.length];
  }
  const indice = new Map();
  function palabrasDe(p) {
    if (!indice.has(p.id)) {
      const texto = sinTilde([p.name, p.brand, p.model, p.cat, p.desc, (p.variantes || []).join(" "), (p.specs || []).join(" ")].join(" "));
      const pal = texto.split(/[^a-z0-9]+/).filter(Boolean);
      // también los pares pegados: "a 30" → "a30", "dc one" → "dcone"
      indice.set(p.id, { texto: texto.replace(/[^a-z0-9]/g, ""), pal: new Set([...pal, ...pal.slice(1).map((w, i) => pal[i] + w)]) });
    }
    return indice.get(p.id);
  }
  function coincide(p, q) {
    const ws = sinTilde(q).split(/[^a-z0-9]+/).filter(Boolean);
    if (!ws.length) return true;
    const { texto, pal } = palabrasDe(p);
    if (texto.includes(ws.join(""))) return true;
    return ws.every((w) => {
      if (texto.includes(w)) return true;
      if (w.length < 4) return false;
      const tol = w.length >= 7 ? 2 : 1;
      for (const x of pal) if (Math.abs(x.length - w.length) <= tol && distancia(w, x) <= tol) return true;
      for (const x of pal) if (x.length > w.length && distancia(w, x.slice(0, w.length)) <= tol) return true; // palabra a medio escribir
      return false;
    });
  }
  const enComparar = (id) => comparar.includes(id);
  function toggleComparar(id) {
    if (enComparar(id)) comparar = comparar.filter((x) => x !== id);
    else { if (comparar.length >= 3) { toast("Podés comparar hasta 3 productos."); return; } comparar = [...comparar, id]; }
    store.set("tdv-cmp", comparar);
    document.querySelectorAll(`[data-cmp="${id}"]`).forEach((b) => { b.classList.toggle("on", enComparar(id)); b.setAttribute("aria-pressed", enComparar(id)); });
    barraComparar();
  }
  function barraComparar() {
    let bar = $("#cmpBar");
    if (!comparar.length) { if (bar) bar.remove(); return; }
    if (!bar) { bar = document.createElement("div"); bar.id = "cmpBar"; bar.className = "cmp-bar"; document.body.appendChild(bar); }
    bar.innerHTML = `<span>${comparar.map((id) => `<b>${esc(byId[id].name)}</b>`).join(" · ")}</span>
      <button class="btn btn-primary btn-sm" id="cmpGo" ${comparar.length < 2 ? "disabled" : ""}>${comparar.length < 2 ? "Elegí otro para comparar" : "Comparar " + comparar.length}</button>
      <button class="icon-btn" id="cmpClear" aria-label="Limpiar comparación">✕</button>`;
    $("#cmpGo").onclick = verComparacion;
    $("#cmpClear").onclick = () => { const ids = [...comparar]; comparar = []; store.set("tdv-cmp", []); ids.forEach((id) => document.querySelectorAll(`[data-cmp="${id}"]`).forEach((b) => b.classList.remove("on"))); barraComparar(); };
  }
  function verComparacion() {
    const ps = comparar.map((id) => byId[id]);
    const fila = (t, f) => `<tr><th scope="row">${t}</th>${ps.map((p) => `<td>${f(p)}</td>`).join("")}</tr>`;
    const m = document.createElement("div");
    m.className = "cmp-modal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.setAttribute("aria-label", "Comparación de productos");
    m.innerHTML = `<div class="cmp-card"><div class="drawer-head"><h3>Comparación</h3><button class="icon-btn" id="cmpClose" aria-label="Cerrar">✕</button></div>
      <div class="table-wrap cmp-table"><table><thead><tr><th></th>${ps.map((p) => `<th scope="col"><a href="/producto/${p.id}">${art(p)}<span>${esc(p.name)}</span></a></th>`).join("")}</tr></thead><tbody>
      ${fila("Precio", (p) => priceHTML(p))}
      ${fila("Marca y modelo", (p) => esc([p.brand, p.model].filter(Boolean).join(" ") || "—"))}
      ${fila("Opiniones", (p) => p.rating ? `<span class="stars-sm">${estrellas(p.rating)}</span> ${p.rating} (${p.resenas})` : "—")}
      ${(() => { const fichas = ps.map(fichaTecnica), claves = [];
        for (const f of fichas) for (const [k] of f.tabla) if (!claves.some((c) => c.toLowerCase() === k.toLowerCase())) claves.push(k);
        return claves.map((k) => `<tr><th scope="row">${esc(k)}</th>${fichas.map((f) => `<td>${esc((f.tabla.find(([x]) => x.toLowerCase() === k.toLowerCase()) || [, "—"])[1])}</td>`).join("")}</tr>`).join("") +
          (fichas.some((f) => f.sueltas.length) ? fila("Características", (p) => `<ul>${fichaTecnica(p).sueltas.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`) : ""); })()}
      ${fila("Opciones", (p) => esc(opciones(p).map((o) => o.nombre).join(", ") || "—"))}
      ${fila("Ideal para", (p) => esc((p.etapas || []).map((e) => ETAPAS[e]).join(", ") || "—"))}
      ${fila("Entrega", (p) => p.llega ? `Preventa, llega el ${fechaCorta(p.llega)}` : p.encargo ? "Por encargo, 15 a 30 días" : "En stock")}
      ${fila("", (p) => p.usd || p.ars ? `<button class="btn btn-primary btn-sm" data-add="${p.id}">Agregar</button>` : `<a class="btn btn-ghost btn-sm" href="/producto/${p.id}">Consultar</a>`)}
      </tbody></table></div></div>`;
    document.body.appendChild(m);
    const cerrar = () => m.remove();
    m.querySelector("#cmpClose").onclick = cerrar;
    m.addEventListener("click", (e) => { if (e.target === m) cerrar(); });
    m.querySelector("#cmpClose").focus();
  }

  const card = (p, i = 0) => `
    <article class="card" style="--i:${i}">
      <div class="badges">${badges(p)}</div>
      <button class="cmp${enComparar(p.id) ? " on" : ""}" data-cmp="${p.id}" aria-label="Comparar ${esc(p.name)}" aria-pressed="${enComparar(p.id)}" title="Comparar">⇄</button>
      <button class="fav${isFav(p.id) ? " on" : ""}" data-fav="${p.id}" aria-label="${isFav(p.id) ? "Quitar de" : "Guardar en"} favoritos" aria-pressed="${isFav(p.id)}">${isFav(p.id) ? "♥" : "♡"}</button>
      <a class="card-art" href="/producto/${p.id}" data-view="${p.id}" aria-label="Ver ${esc(p.name)}">${art(p)}</a>
      <div class="card-body">
        <span class="card-cat">${esc(p.brand || p.cat)}</span>
        <h3><a href="/producto/${p.id}" data-view="${p.id}">${esc(p.name)}</a></h3>
        ${p.rating ? `<div class="stars-sm" aria-label="${p.rating} de 5 estrellas">${estrellas(p.rating)} <span>(${p.resenas})</span></div>` : ""}
        ${p.nota ? `<div class="card-nota">${esc(p.nota)}</div>` : ""}
        ${priceHTML(p)}
        ${p.llega ? `<div class="note">Preventa · llega el ${fechaCorta(p.llega)}</div>` : p.encargo ? '<div class="note">Llega en 15 a 30 días</div>' : ""}
      </div>
      ${p.usd || p.ars ? `<button class="add" data-add="${p.id}">Agregar <span aria-hidden="true">+</span></button>`
        : `<button class="add" data-pedir="${p.id}">Pedime el precio</button>`}
    </article>`;

  // ---------- WhatsApp ----------
  const waLink = (text) => `https://wa.me/${CONFIG.whatsapp}${text ? "?text=" + encodeURIComponent(text) : ""}`;

  // ---------- Links por categoría y marca ----------
  const slug = (s) => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const catEmoji = { "Comunicaciones": "🎧", "Navegación": "🧭", "Aviónica": "🛰️", "Uniforme": "🪽", "Accesorios": "🎒", "Libros y regalos": "📚", "Cursos y experiencias": "🎓" };

  // ---------- Feriados y fechas patrias (Argentina) ----------
  const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  function feriados(y) {
    // Pascua (algoritmo de Gauss) para Carnaval y Viernes Santo
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const hh = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - hh - k) % 7, m = Math.floor((a + 11 * hh + 22 * l) / 451);
    const mes = Math.floor((hh + l - 7 * m + 114) / 31), dia = ((hh + l - 7 * m + 114) % 31) + 1;
    const pascua = new Date(y, mes - 1, dia);
    const mas = (n) => { const x = new Date(pascua); x.setDate(x.getDate() + n); return ymd(x); };
    // Trasladables: martes o miércoles pasan al lunes anterior; jueves o viernes, al lunes siguiente.
    const tras = (mo, da) => { const x = new Date(y, mo - 1, da), w = x.getDay(); if (w === 2 || w === 3) x.setDate(da - (w - 1)); if (w === 4 || w === 5) x.setDate(da + (8 - w)); return ymd(x); };
    return new Set([`${y}-01-01`, mas(-48), mas(-47), `${y}-03-24`, `${y}-04-02`, mas(-2), `${y}-05-01`, `${y}-05-25`, tras(6, 17), `${y}-06-20`,
      `${y}-07-09`, tras(8, 17), tras(10, 12), tras(11, 20), `${y}-12-08`, `${y}-12-25`]);
  }
  const ahoraAR = () => new Date(Date.now() + (new Date().getTimezoneOffset() - 180) * 60000);
  const habil = (d) => d.getDay() !== 0 && d.getDay() !== 6 && !feriados(d.getFullYear()).has(ymd(d));
  function diasHabiles(n) {
    const out = [], x = ahoraAR(), dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
    if (x.getHours() >= 17) x.setDate(x.getDate() + 1);
    while (out.length < n) { if (habil(x) || x.getDay() === 6 && !feriados(x.getFullYear()).has(ymd(x))) out.push(`${dias[x.getDay()]} ${x.getDate()}/${x.getMonth() + 1}`); x.setDate(x.getDate() + 1); }
    return out;
  }
  function avisoDespacho() {
    const hoy = ahoraAR();
    if (habil(hoy)) return "";
    const x = new Date(hoy); do x.setDate(x.getDate() + 1); while (!habil(x));
    const dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
    return `${feriados(hoy.getFullYear()).has(ymd(hoy)) ? "Hoy es feriado" : "Fin de semana"}: despachamos el ${dias[x.getDay()]} ${x.getDate()}/${x.getMonth() + 1}`;
  }
  const patrias = { "05-25": "¡Feliz 25 de Mayo!", "06-20": "¡Feliz Día de la Bandera!", "07-09": "¡Feliz Día de la Independencia!" };
  const patria = patrias[ymd(ahoraAR()).slice(5)] || "";
  const evento_ = (CONFIG.eventos || []).find((e) => ymd(ahoraAR()) >= e.desde && ymd(ahoraAR()) <= e.hasta && PRODUCTS.some(enOferta));
  // Horario de respuesta
  const fueraDeHora = () => { const hr = ahoraAR().getHours(); return hr < CONFIG.horario.desde || hr >= CONFIG.horario.hasta; };
  const avisoHorario = () => fueraDeHora() ? `Te respondemos a partir de las ${CONFIG.horario.desde} h` : "";

  // ---------- Encabezado y pie ----------
  const logoSVG = (cls = "") => `<svg class="logo ${cls}" viewBox="0 0 48 48" aria-hidden="true">
      <g class="logo-ring" fill="none" transform="rotate(-8 24 24)">
        <circle cx="24" cy="24" r="20" stroke="#74acdf" stroke-width="5" stroke-dasharray="100 25.7" stroke-linecap="round"/>
        <circle cx="24" cy="24" r="20" stroke="#fff" stroke-width="1.4" stroke-dasharray="100 25.7"/>
      </g>
      <g class="logo-sun"><circle cx="24" cy="44" r="3.4" fill="#f6b40e"/><circle cx="24" cy="44" r="5.2" fill="none" stroke="#f6b40e" stroke-width="1.2" stroke-dasharray="1.6 1.4"/></g>
      <g class="logo-plane" transform="rotate(45 24 24) translate(24 23) scale(.78) translate(-24 -24)" fill="#0c2340">
        <path d="M24 6c1.6 0 2.4 1.6 2.4 4v8l14 8v3l-14-4v9l4 3v2.5l-6.4-1.8-6.4 1.8V37l4-3v-9l-14 4v-3l14-8v-8c0-2.4.8-4 2.4-4z"/>
        <rect x="30.6" y="21.2" width="2.6" height="5.4" rx="1.3"/><rect x="14.8" y="21.2" width="2.6" height="5.4" rx="1.3"/>
      </g>
    </svg>`;
  window.TDV_LOGO = logoSVG;

  const page = document.body.dataset.page;
  const home = page === "inicio";
  const h = (anchor) => (home ? anchor : "/" + anchor);

  const despacho = avisoDespacho();
  const metar = ["METAR SABE", "CAVOK", "ENVÍOS A TODO EL PAÍS", "DESPACHO EN 48 H", "ENVÍO EN EL DÍA EN CABA", `${CONFIG.ventas} VENTAS`, "PRODUCTOS ORIGINALES", "ROGER, TE ESPERAMOS"];
  $("#siteHeader").outerHTML = `
    <div role="region" aria-label="Avisos de la tienda">
    ${evento_ ? `<a class="notice notice-sale" href="/ofertas">🔥 ${esc(evento_.nombre)}: ofertas hasta el ${fechaCorta(evento_.hasta)} → Ver ofertas</a>` : ""}
    ${despacho || patria ? `<div class="notice${patria ? " notice-ar" : ""}">${esc(patria ? patria + (despacho ? " · " + despacho : "") : despacho)}</div>` : ""}
    <div class="metar" aria-hidden="true"><div class="metar-track">${[...metar, ...metar].map((t) => `<span>${t}</span>`).join("")}</div></div>
    </div>
    <header class="nav" id="nav">
      <div class="wrap nav-inner">
        <a href="/" class="brand" aria-label="Tienda de Vuelo, inicio">
          ${logoSVG("logo-anim")}
          <span class="brand-text"><b>Tienda de Vuelo</b><small>Pilot shop</small></span>
        </a>
        <form class="nav-search" id="navSearch" role="search">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
          <input id="navQ" type="search" role="combobox" aria-autocomplete="list" placeholder="¿Qué estás buscando?" aria-label="Buscar en la tienda" autocomplete="off" aria-controls="sugg" aria-expanded="false">
          <div class="sugg" id="sugg" role="listbox" hidden></div>
        </form>
        <button class="cart-btn" id="cartBtn" aria-label="Abrir carrito">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6h15l-1.5 9h-12z"/><path d="M6 6 5 3H2"/><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/></svg>
          <span class="cart-count" id="cartCount">0</span>
        </button>
      </div>
      <nav class="wrap links" aria-label="Secciones">
        <div class="menu-cat">
          <a href="${h("#catalogo")}" aria-haspopup="true">Catálogo ▾</a>
          <div class="mega" role="menu">${CATEGORIES.filter((c) => PRODUCTS.some((p) => p.cat === c && !p.agotado)).map((c) => `<a role="menuitem" href="/categoria/${slug(c)}"><span>${catEmoji[c] || "✈"}</span>${esc(c)}</a>`).join("")}
            <a role="menuitem" href="/usados"><span>♻️</span>Usados y reacondicionados</a><a role="menuitem" href="/novedades"><span>✨</span>Novedades del mes</a></div>
        </div>
        ${PRODUCTS.some(enOferta) ? '<a href="/ofertas" class="link-sale">Ofertas</a>' : ""}${PRODUCTS.some((p) => p.liquidacion && !p.agotado) ? '<a href="/liquidacion" class="link-sale">Liquidación</a>' : ""}
        ${KITS.length ? `<a href="${h("#kits")}">Kits</a>` : ""}
        ${PRODUCTS.some((p) => p.tcp && !p.agotado) ? `<a href="${h("#tripulantes")}">Tripulantes</a>` : ""}
        ${PRODUCTS.some((p) => p.regalo && !p.agotado) ? `<a href="${h("#regalos")}">Regalos</a>` : '<a href="/regalos-para-pilotos">Regalos</a>'}
        ${PRODUCTS.some((p) => p.alquiler) ? `<a href="/alquiler"${page === "alquiler" ? ' aria-current="page"' : ""}>Alquiler</a>` : ""}
        <a href="/envios"${page === "envios" ? ' aria-current="page"' : ""}>Envíos</a>
        <a href="/contacto"${page === "contacto" ? ' aria-current="page"' : ""}>Contacto</a>
        <a href="${h("#preguntas")}">Preguntas</a>
      </nav>
    </header>`;

  $("#siteFooter").outerHTML = `
    <footer class="footer">
      <div class="wrap foot-grid">
        <div>
          <a href="/" class="brand">${logoSVG()}<span class="brand-text"><b>Tienda de Vuelo</b><small>Pilot shop</small></span></a>
          <p class="muted">Equipamiento original para pilotos, alumnos y tripulantes.</p>
          <form class="news" id="newsForm"><label for="newsMail">Novedades y ofertas por mail</label><div><input id="newsMail" type="email" required placeholder="tu@mail.com" autocomplete="email"><input name="web" tabindex="-1" autocomplete="off" class="trampa" aria-hidden="true"><button class="btn btn-primary btn-sm">Sumarme</button></div><p class="small" id="newsMsg" role="status"></p></form>
          <p class="made"><svg viewBox="0 0 9 6" width="22" height="15" aria-hidden="true"><rect width="9" height="6" fill="#74acdf"/><rect y="2" width="9" height="2" fill="#fff"/><circle cx="4.5" cy="3" r=".6" fill="#f6b40e"/></svg> Hecho en Argentina</p>
        </div>
        <div>
          <h2 class="foot-h">Tienda</h2>
          <a href="${h("#catalogo")}">Catálogo</a>${KITS.length ? `<a href="${h("#kits")}">Kits</a>` : ""}<a href="/envios">Envíos</a><a href="/seguimiento">Seguí tu pedido</a><a href="/guia-auriculares">¿Qué auricular me conviene?</a><a href="/guia-primer-vuelo">Guía: tu primer vuelo</a><a href="/auriculares-de-aviacion">Auriculares de aviación</a><a href="/equipo-para-curso-de-piloto">Equipo para el curso</a><a href="/regalos-para-pilotos">Regalos para pilotos</a>${CONFIG.beneficio ? '<a href="/recibidos">¿Te recibiste? 🎓</a>' : ""}<a href="/alquiler">Alquiler de equipos</a><a href="/experiencias">Bautismo y simulador</a><a href="${h("#preguntas")}">Preguntas frecuentes</a>
        </div>
        <div>
          <h2 class="foot-h">Contacto</h2>
          <a href="${waLink("¡Hola Tienda de Vuelo! Quería hacerles una consulta.")}" target="_blank" rel="noopener">WhatsApp ${esc(CONFIG.whatsappVisible)}</a>
          <a href="mailto:${CONFIG.email}">${CONFIG.email}</a>
          ${CONFIG.instagram ? `<a href="https://www.instagram.com/${esc(CONFIG.instagram)}/" target="_blank" rel="noopener">Instagram @${esc(CONFIG.instagram)}</a>` : ""}
          <span class="muted">${esc(CONFIG.ciudad)}</span>
          ${CONFIG.googleResenas ? `<a href="${esc(CONFIG.googleResenas)}" target="_blank" rel="noopener">⭐ Dejanos tu reseña en Google</a>` : ""}
        </div>
        <div>
          <h2 class="foot-h">Legales</h2>
          <a href="/legales#terminos">Términos y condiciones</a>
          <a href="/legales#privacidad">Privacidad</a>
          <a href="/legales#arrepentimiento" class="strong">Botón de arrepentimiento</a>
          <a href="https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario" target="_blank" rel="noopener">Defensa del Consumidor</a>
        </div>
      </div>
      <div class="wrap pay-row" aria-label="Medios de pago"><span class="muted small">Pagás con:</span>
        <span class="pay">🏦 Transferencia</span><span class="pay">💵 Efectivo al retirar</span><span class="pay">💲 Dólares</span><span class="pay">₿ Cripto</span><span class="pay">🔒 Seña para reservar</span><span class="muted small dolar-hoy" id="dolarHoy"></span></div>
      ${CONFIG.dataFiscal ? `<div class="wrap"><a href="${esc(CONFIG.dataFiscal)}" target="_blank" rel="noopener" class="data-fiscal">Data Fiscal</a></div>` : ""}
      <div class="wrap foot-bottom">© ${new Date().getFullYear()} Tienda de Vuelo · ${esc(CONFIG.ciudad)}</div>
    </footer>
    ${avisoHorario() ? `<div class="wa-bubble" id="waBubble" role="status">${esc(avisoHorario())}. Dejanos tu mensaje 👋</div>` : ""}
    <aside aria-label="WhatsApp"><a class="wa-float" id="waFloat" href="${waLink(document.body.dataset.wa || "¡Hola Tienda de Vuelo! Quería hacerles una consulta.")}" target="_blank" rel="noopener" aria-label="Escribinos por WhatsApp">
      <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>
    </a></aside>
    <div class="overlay" id="overlay" hidden></div>
    <aside class="drawer" id="drawer" aria-label="Carrito" aria-hidden="true">
      <div class="drawer-head"><h3 id="drawerTitle">Tu carrito</h3><button class="icon-btn" id="closeCart" aria-label="Cerrar carrito">✕</button></div>
      <div class="drawer-body" id="drawerBody"></div>
      <div class="drawer-foot" id="drawerFoot"></div>
    </aside>
    <div class="toast" id="toast" role="status" aria-live="polite"></div>`;

  document.querySelectorAll("[data-cfg]").forEach((el) => (el.textContent = CONFIG[el.dataset.cfg]));
  window.addEventListener("scroll", () => $("#nav").classList.toggle("scrolled", scrollY > 30), { passive: true });

  // Actividad para el panel (qué buscan y qué consultan)
  const evento = (tipo, dato = "", producto = "") => { try { fetch("/api/evento", { method: "POST", keepalive: true, headers: { "content-type": "application/json" }, body: JSON.stringify({ tipo, dato, producto }) }).catch(() => {}); } catch {} };
  let ultimaVacia = "";
  const normQ = (x) => String(x).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const buscar = (q) => PRODUCTS.filter((p) => !p.agotado && coincide(p, q));
  const sugg = $("#sugg"), navQ = $("#navQ");
  const cerrarSugg = () => { sugg.hidden = true; navQ.setAttribute("aria-expanded", "false"); };
  navQ.addEventListener("input", () => {
    const q = navQ.value.trim();
    if (q.length < 2) return cerrarSugg();
    const r = buscar(q);
    sugg.innerHTML = r.length
      ? r.slice(0, 6).map((p) => `<a role="option" href="/producto/${p.id}" ${home ? `data-view="${p.id}"` : ""} class="sugg-item">${art(p)}<span><b>${esc(p.name)}</b><small>${esc(p.brand || p.cat)}</small></span>${priceHTML(p)}</a>`).join("") +
        (r.length > 6 ? `<button type="submit" class="sugg-all">Ver los ${r.length} resultados →</button>` : "")
      : `<p class="sugg-none">No lo tenemos cargado. <a href="/contacto#pedido">Pedilo por encargo</a>.</p>`;
    clearTimeout(navQ._t);
    if (!r.length) navQ._t = setTimeout(() => { if (q.length >= 3 && q !== ultimaVacia && !q.startsWith(ultimaVacia || "\u0000")) { ultimaVacia = q; evento("busqueda_vacia", q); } }, 1500);
    sugg.hidden = false; navQ.setAttribute("aria-expanded", "true");
  });
  navQ.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrarSugg(); if (e.key === "ArrowDown") { e.preventDefault(); sugg.querySelector("a")?.focus(); } });
  sugg.addEventListener("keydown", (e) => {
    const items = [...sugg.querySelectorAll("a")], i = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); items[Math.min(items.length - 1, i + 1)]?.focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); (i <= 0 ? navQ : items[i - 1]).focus(); }
    if (e.key === "Escape") { cerrarSugg(); navQ.focus(); }
  });
  sugg.addEventListener("click", (e) => { if (e.target.closest(".sugg-item")) { cerrarSugg(); navQ.value = ""; } });
  document.addEventListener("click", (e) => { if (!e.target.closest("#navSearch")) cerrarSugg(); });

  $("#navSearch").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = $("#navQ").value.trim();
    cerrarSugg();
    if (q && !buscar(q).length) evento("busqueda_vacia", q);
    if (home && window.TDV_SEARCH) window.TDV_SEARCH(q);
    else location.href = "/?q=" + encodeURIComponent(q) + "#catalogo";
  });

  // ---------- Avisos ----------
  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg; el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
  }

  // ---------- Datos de pago (se cargan en el panel → Ajustes) ----------
  const b64 = (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const deB64 = (t) => JSON.parse(decodeURIComponent(escape(atob(t.replace(/-/g, "+").replace(/_/g, "/")))));
  const azar = (n = 12) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (x) => "abcdefghijkmnpqrstuvwxyz23456789"[x % 32]).join("");
  const copiable = (t, v) => `<div class="pay-line"><span class="muted small">${esc(t)}</span><b>${esc(v)}</b><button type="button" class="link-btn" data-copiar="${esc(v)}">Copiar</button></div>`;
  function pagoHTML(monto) {
    const g = CONFIG.pago || {};
    const banco = g.alias || g.cbu;
    if (!banco && !g.usdtTrc20 && !g.usdtBep20 && !g.aliasUsd && !g.cbuUsd) return "";
    return `<div class="pay-box"><h4>Cómo pagar</h4>
      ${monto ? `<p class="small">Total aproximado: <b>${ars(monto)}</b> + envío. Esperá nuestra confirmación del monto final antes de transferir.</p>` : ""}
      ${banco ? `<p class="pay-k">Transferencia${g.banco ? " · " + esc(g.banco) : ""}</p>${g.alias ? copiable("Alias", g.alias) : ""}${g.cbu ? copiable("CBU / CVU", g.cbu) : ""}${g.titular ? `<p class="muted small">Titular: ${esc(g.titular)}${g.cuit ? " · CUIT " + esc(g.cuit) : ""}</p>` : ""}` : ""}
      ${g.aliasUsd || g.cbuUsd ? `<p class="pay-k">Transferencia en dólares</p>${g.aliasUsd ? copiable("Alias", g.aliasUsd) : ""}${g.cbuUsd ? copiable("CBU", g.cbuUsd) : ""}` : ""}
      ${g.usdtTrc20 || g.usdtBep20 ? `<p class="pay-k">Cripto (USDT)</p>${g.usdtTrc20 ? copiable("Red TRC20", g.usdtTrc20) : ""}${g.usdtBep20 ? copiable("Red BEP20", g.usdtBep20) : ""}<p class="muted small">Revisá bien la red antes de enviar.</p>` : ""}
      <p class="muted small">También aceptamos efectivo al retirar y dólares. Mandanos el comprobante por WhatsApp o subilo en la página de seguimiento.</p></div>`;
  }
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-copiar]");
    if (!b) return;
    try { await navigator.clipboard.writeText(b.dataset.copiar); b.textContent = "Copiado ✓"; setTimeout(() => (b.textContent = "Copiar"), 2000); }
    catch { const r = document.createRange(); r.selectNodeContents(b.previousElementSibling); getSelection().removeAllRanges(); getSelection().addRange(r); }
  });

  // ---------- Suscripción por mail (pie de página) ----------
  document.addEventListener("submit", async (e) => {
    if (e.target.id !== "newsForm") return;
    e.preventDefault();
    const f = e.target, msg = f.querySelector("#newsMsg");
    try {
      const r = await fetch("/api/suscribir", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: f.querySelector("#newsMail").value, web: f.querySelector('[name="web"]').value, origen: document.body.dataset.page || "" }) });
      const d = await r.json().catch(() => ({}));
      msg.textContent = r.ok ? "¡Listo! Te avisamos de novedades y ofertas." : d.mensaje || "No se pudo. Probá de nuevo.";
      if (r.ok) f.querySelector("#newsMail").value = "";
    } catch { msg.textContent = "No se pudo. Probá de nuevo."; }
  });

  // ---------- "Pedime el precio": deja su WhatsApp y le respondemos ----------
  function pedirPrecio(p, opcion = "") {
    const m = document.createElement("div");
    m.className = "cmp-modal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.setAttribute("aria-label", "Pedir el precio");
    m.innerHTML = `<form class="cmp-card pp-card" id="ppForm"><div class="drawer-head"><h3>Te pasamos el precio</h3><button type="button" class="icon-btn" id="ppClose" aria-label="Cerrar">✕</button></div>
      <p class="small"><b>${esc(p.name)}</b>${opcion ? ` · ${esc(opcion)}` : ""}</p>
      <label>Tu nombre<input id="ppNom" required maxlength="80" autocomplete="name" value="${esc(store.get("tdv-datos", {}).nombre || "")}"></label>
      <label>Tu WhatsApp<input id="ppTel" required type="tel" autocomplete="tel" value="${esc(store.get("tdv-datos", {}).tel || "")}"></label>
      <input name="web" class="trampa" tabindex="-1" autocomplete="off" aria-hidden="true">
      <button class="btn btn-primary btn-block">Pedir el precio</button>
      <p class="muted small" id="ppMsg" role="status">Te escribimos por WhatsApp${avisoHorario() ? " a partir de las " + CONFIG.horario.desde + " h" : " en un rato"}. ¿Apurado? <a href="${waLink(`¡Hola! Quiero consultar el precio de: ${p.name}${opcion ? " (" + opcion + ")" : ""}`)}" target="_blank" rel="noopener">Escribinos directo</a>.</p></form>`;
    document.body.appendChild(m);
    const cerrar = () => m.remove();
    m.querySelector("#ppClose").onclick = cerrar;
    m.addEventListener("click", (e) => { if (e.target === m) cerrar(); });
    m.querySelector("#ppNom").focus();
    m.querySelector("#ppForm").onsubmit = async (e) => {
      e.preventDefault();
      const nombre = m.querySelector("#ppNom").value.trim(), tel = m.querySelector("#ppTel").value.trim();
      store.set("tdv-datos", { ...store.get("tdv-datos", {}), nombre, tel });
      evento("consulta", "", p.id); medir("Lead", { content_ids: [p.id], content_type: "product" });
      try {
        const r = await fetch("/api/consulta", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ producto: p.id, nombre: p.name, opcion, cliente: nombre, tel, web: m.querySelector('[name="web"]').value }) });
        if (!r.ok) throw new Error();
        m.querySelector("#ppForm").innerHTML = `<div class="drawer-head"><h3>¡Listo, ${esc(nombre.split(" ")[0])}!</h3><button type="button" class="icon-btn" id="ppClose2" aria-label="Cerrar">✕</button></div><p>Te escribimos por WhatsApp con el precio de <b>${esc(p.name)}</b>.</p>`;
        m.querySelector("#ppClose2").onclick = cerrar;
      } catch { window.open(waLink(`¡Hola! Quiero consultar el precio de: ${p.name}${opcion ? " (" + opcion + ")" : ""}`), "_blank", "noopener"); cerrar(); }
    };
  }
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-pedir]"); if (b) { e.preventDefault(); pedirPrecio(byId[b.dataset.pedir]); } });

  // Precarga: al apoyar el dedo o el mouse sobre un producto, se empieza a bajar su foto grande
  const precargadas = new Set();
  const precargar = (e) => {
    const a = e.target.closest?.("[data-view]"); if (!a) return;
    const p = byId[a.dataset.view]; if (!p || !p.fotos?.length || precargadas.has(p.id)) return;
    precargadas.add(p.id); const img = new Image(); img.src = p.fotos[0];
  };
  document.addEventListener("pointerdown", precargar, { passive: true });
  document.addEventListener("mouseover", precargar, { passive: true });

  // ---------- Carrito ----------
  let cart = store.get("tdv-cart", []).filter((l) => (l.kit ? KITS.some((k) => k.id === l.kit) : byId[l.id]));
  // Carrito compartido: /carrito#datos arma el mismo carrito en otro teléfono
  if (location.pathname === "/carrito" && location.hash.length > 1) {
    try {
      const traidas = deB64(location.hash.slice(1)).map(([id, v, qty]) => id.startsWith("k:") ? { kit: id.slice(2), items: String(v).split(","), qty } : { id, variante: v || "", qty })
        .filter((l) => (l.kit ? KITS.some((k) => k.id === l.kit) && l.items.every((x) => byId[x]) : byId[l.id])).map((l) => ({ ...l, qty: Math.min(99, Math.max(1, parseInt(l.qty) || 1)) }));
      if (traidas.length) { cart = traidas; store.set("tdv-cart", cart); setTimeout(() => { openCart(); toast("✈ Te compartieron este carrito"); }, 300); }
    } catch {}
    history.replaceState(null, "", "/");
  }
  const linkCarrito = () => `${CONFIG.sitio}/carrito#${b64(cart.map((l) => (l.kit ? ["k:" + l.kit, l.items.join(","), l.qty] : [l.id, l.variante || "", l.qty])))}`;
  // Resumen para el presupuesto
  function resumenCarrito() {
    return { lineas: cart.map((l) => { const i = lineInfo(l); return { name: i.name, sub: i.sub, qty: l.qty, unit: i.unit, label: i.label, usd: usdDe(l) }; }), total: total(), hasUsd: hasUsd(), dolar };
  }
  let step = "items";
  const save = () => store.set("tdv-cart", cart);
  const keyOf = (l) => l.kit ? `${l.kit}:${l.items.join(",")}` : `${l.id}|${l.variante || ""}`;

  const lineInfo = (l) => {
    if (l.kit) {
      const k = KITS.find((x) => x.id === l.kit);
      const items = l.items.map((id) => byId[id]);
      const full = items.reduce((s, p) => s + (pesos(p) || 0), 0);
      return { name: k.name, sub: items.map((p) => p.name).join(", "), unit: full * (1 - k.off), emoji: k.emoji, label: ars(full * (1 - k.off)) };
    }
    const p = conOpcion(byId[l.id], l.variante);
    return { name: p.name, sub: l.variante || "", unit: pesos(p) || 0, p, label: p.usd ? `${usd(p.usd)} (≈ ${ars(pesos(p))})` : ars(p.ars) };
  };
  const total = () => cart.reduce((s, l) => s + lineInfo(l).unit * l.qty, 0);
  const hasUsd = () => cart.some((l) => !l.kit && byId[l.id].usd);
  const usdDe = (l) => (!l.kit && byId[l.id].usd ? conOpcion(byId[l.id], l.variante).usd : null);

  function add(line, label) {
    const found = cart.find((l) => keyOf(l) === keyOf(line));
    if (found) found.qty++; else cart.push({ ...line, qty: 1 });
    save(); step = "items"; renderCart();
    const btn = $("#cartBtn");
    btn.classList.remove("bump"); void btn.offsetWidth; btn.classList.add("bump");
    toast(`✈ ${label} agregado al carrito`);
  }
  function changeQty(k, d) {
    const l = cart.find((x) => keyOf(x) === k);
    if (!l) return;
    l.qty += d;
    if (l.qty <= 0) cart = cart.filter((x) => x !== l);
    save(); renderCart();
  }

  const datos = store.get("tdv-datos", {});
  const soloDigital = () => cart.length > 0 && cart.every((l) => !l.kit && byId[l.id]?.digital);
  const ENTREGAS = [["Envío a domicilio", "Envío por correo (a domicilio o sucursal)"], ["Envío en el día (CABA)", "Envío en el día (CABA)"], ["Retiro en CABA", "Retiro en CABA (coordinamos por WhatsApp)"], ["Entrega en aeródromo", "Entrega en aeródromo (San Fernando, Morón y otros, a coordinar)"]];
  const PROVINCIAS = ["Buenos Aires", "CABA", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán"];
  const regaloPara = () => { try { const n = sessionStorage.getItem("tdv-regalo-para"); return n ? `Regalo para ${n} (de su lista de deseos)` : ""; } catch { return ""; } };
  const carritoId = () => { let id = store.get("tdv-cid", ""); if (!id) { id = azar(); store.set("tdv-cid", id); } return id; };
  function renderCart() {
    const count = cart.reduce((s, l) => s + l.qty, 0);
    $("#cartCount").textContent = count;
    $("#cartCount").classList.toggle("show", count > 0);
    const body = $("#drawerBody"), foot = $("#drawerFoot");
    if (!body) return;

    if (step === "listo") return;
    if (!cart.length) {
      $("#drawerTitle").textContent = "Tu carrito";
      body.innerHTML = `<div class="cart-empty"><div>🛫</div><p>Tu carrito está vacío.<br>Preparate para despegar.</p></div>`;
      foot.innerHTML = "";
      return;
    }
    const t = total();
    const totalBlock = `<div class="total-row"><span>Total${hasUsd() ? " aprox." : ""}</span><b>${ars(t)}</b></div>
      <p class="muted small">${hasUsd() ? "Productos en dólares convertidos al dólar del día. " : ""}${soloDigital() ? "Producto digital: sin envío." : "El envío se cotiza aparte según destino."}</p>`;

    if (step === "items") {
      $("#drawerTitle").textContent = "Tu carrito";
      body.innerHTML = cart.map((l) => {
        const info = lineInfo(l);
        return `<div class="line">
          ${info.p ? art(info.p) : `<div class="art art-kit">${info.emoji}</div>`}
          <div class="line-info">
            <b>${esc(info.name)}</b>
            ${info.sub ? `<span class="muted small">${esc(info.sub)}</span>` : ""}
            <span class="muted small">${info.label}</span>
            <div class="qty">
              <button data-dec="${esc(keyOf(l))}" aria-label="Quitar uno">−</button>
              <span>${l.qty}</span>
              <button data-inc="${esc(keyOf(l))}" aria-label="Agregar uno">+</button>
            </div>
          </div>
          <b class="line-total">${ars(info.unit * l.qty)}</b>
        </div>`;
      }).join("");
      // Te puede servir también: accesorios que no están en el carrito, primero los de la misma etapa
      const enCarrito = new Set(cart.flatMap((l) => (l.kit ? l.items : [l.id])));
      const etapas = new Set(cart.flatMap((l) => (l.kit ? [] : byId[l.id].etapas || [])));
      const extra = PRODUCTS.filter((p) => !enCarrito.has(p.id) && !p.agotado && (p.ars || p.usd) && (pesos(p) || 0) <= 60000)
        .sort((a, b) => (b.etapas || []).filter((x) => etapas.has(x)).length - (a.etapas || []).filter((x) => etapas.has(x)).length || pesos(a) - pesos(b)).slice(0, 3);
      if (extra.length) body.innerHTML += `<div class="upsell"><h4>Te puede servir también</h4>${extra.map((p) => `
        <div class="upsell-item">${art(p)}<span><b>${esc(p.name)}</b>${priceHTML(p)}</span><button class="icon-btn" data-add="${p.id}" aria-label="Agregar ${esc(p.name)}">+</button></div>`).join("")}</div>`;
      foot.innerHTML = totalBlock + (despacho ? `<p class="small notice-inline">${esc(despacho)}</p>` : "") + `<button class="btn btn-primary btn-block" id="toDatos">Continuar</button>
        <div class="cart-extra"><button type="button" class="link-btn" id="shareCart">Compartir carrito</button><a class="link-btn" href="/presupuesto">Descargar presupuesto</a></div>`;
      $("#toDatos").onclick = () => { step = "datos"; renderCart(); };
      $("#shareCart").onclick = async () => {
        const url = linkCarrito(), texto = "Mirá lo que elegí en Tienda de Vuelo ✈";
        if (navigator.share) { try { await navigator.share({ title: "Mi carrito", text: texto, url }); return; } catch (x) { if (x.name === "AbortError") return; } }
        try { await navigator.clipboard.writeText(url); toast("Link copiado. Pegalo donde quieras."); } catch { window.open(`https://wa.me/?text=${encodeURIComponent(texto + " " + url)}`, "_blank", "noopener"); }
      };
      return;
    }

    // Paso 2: datos del pedido
    $("#drawerTitle").textContent = "Tus datos";
    body.innerHTML = `
      <form id="orderForm" class="order-form">
        <label>Nombre y apellido<input id="fNombre" required autocomplete="name" value="${esc(datos.nombre || "")}"></label>
        <label>Teléfono<input id="fTel" required type="tel" autocomplete="tel" value="${esc(datos.tel || "")}"></label>
        <fieldset><legend>Entrega</legend>
          ${(soloDigital() ? [["Digital", "Lo recibo por WhatsApp o mail (sin envío)"]] : ENTREGAS).map(([v, t], i, arr) => `<label class="opt"><input type="radio" name="entrega" value="${v}" ${(arr.some((x) => x[0] === datos.entrega) ? datos.entrega : arr[0][0]) === v ? "checked" : ""}> ${t}</label>`).join("")}
        </fieldset>
        <div id="fCorreoWrap" class="p-grid2-mini">
          <label>Empresa<select id="fEmpresa">${["Me da igual", "Andreani", "Correo Argentino", "OCA", "Vía Cargo"].map((x) => `<option${x === datos.empresa ? " selected" : ""}>${x}</option>`).join("")}</select></label>
          <label>Entrega<select id="fModo">${["A domicilio", "A sucursal del correo"].map((x) => `<option${x === datos.modo ? " selected" : ""}>${x}</option>`).join("")}</select></label>
        </div>
        <label id="fAeroWrap">Aeródromo<select id="fAero">${["San Fernando", "Morón", "Otro (lo aclaro en notas)"].map((x) => `<option>${x}</option>`).join("")}</select></label>
        <div id="fTurnoWrap" class="p-grid2-mini">
          <label>Día de retiro<select id="fDia">${diasHabiles(6).map((d) => `<option>${d}</option>`).join("")}</select></label>
          <label>Horario<select id="fHora"><option>10 a 13 h</option><option>14 a 17 h</option><option>17 a 20 h</option></select></label>
        </div>
        <label id="fFranjaWrap">Franja horaria<select id="fFranja"><option>Mañana (9 a 13 h)</option><option>Tarde (14 a 19 h)</option></select></label>
        <label id="fProvWrap">Provincia<select id="fProv"><option value="">Elegí la provincia</option>${PROVINCIAS.map((x) => `<option${x === datos.provincia ? " selected" : ""}>${x}</option>`).join("")}</select></label>
        <label id="fDirWrap">Dirección, ciudad y código postal<input id="fDir" autocomplete="street-address" value="${esc(datos.dir || "")}"></label>
        <label><span>DNI o CUIT <span class="muted">(opcional, si necesitás factura)</span></span><input id="fDni" inputmode="numeric" value="${esc(datos.dni || "")}"></label>
        <div class="p-grid2-mini">
          <label><span>Tu cumpleaños <span class="muted">(opcional)</span></span><input id="fCumple" type="date" value="${esc(datos.cumple || "")}"></label>
          <label><span>Escuela o aeroclub <span class="muted">(opcional)</span></span><input id="fEscuela" maxlength="80" value="${esc(datos.escuela || "")}"></label>
        </div>
        <label><span>Notas <span class="muted">(opcional)</span></span><textarea id="fNotas" rows="2">${esc(regaloPara())}</textarea></label>
        <p class="muted small">Usamos tus datos solo para tu pedido. Si no llegás a terminarlo, puede que te escribamos para ayudarte.</p>
      </form>`;
    foot.innerHTML = totalBlock + `<div class="foot-btns"><button class="btn btn-ghost" id="toItems">← Volver</button><button class="btn btn-primary" id="send" form="orderForm" type="submit">Enviar pedido por WhatsApp</button></div>`;
    const syncDir = () => {
      const v = document.querySelector('input[name="entrega"]:checked').value, correo = v === "Envío a domicilio", sinDir = v === "Retiro en CABA" || v === "Entrega en aeródromo" || v === "Digital";
      $("#fDirWrap").hidden = sinDir; $("#fDir").required = !sinDir; $("#fProvWrap").hidden = !correo; $("#fProv").required = correo; $("#fCorreoWrap").hidden = !correo;
      $("#fAeroWrap").hidden = v !== "Entrega en aeródromo"; $("#fFranjaWrap").hidden = v !== "Envío en el día (CABA)"; $("#fTurnoWrap").hidden = v !== "Retiro en CABA";
      $("#fDir").previousSibling.textContent = correo && $("#fModo").value === "A sucursal del correo" ? "Ciudad y código postal (buscamos la sucursal más cercana)" : "Dirección, ciudad y código postal";
    };
    $("#fModo").onchange = syncDir;
    document.querySelectorAll('input[name="entrega"]').forEach((r) => (r.onchange = syncDir)); syncDir();
    $("#toItems").onclick = () => { step = "items"; renderCart(); };
    $("#orderForm").onsubmit = (e) => { e.preventDefault(); sendOrder(); };
    const borrador = () => {
      const nombre = $("#fNombre").value.trim(), tel = $("#fTel").value.trim();
      if (!nombre || tel.replace(/\D/g, "").length < 8) return;
      try { fetch("/api/carrito", { method: "POST", keepalive: true, headers: { "content-type": "application/json" }, body: JSON.stringify({
        id: carritoId(), nombre, tel, total: Math.round(total()), items: cart.map((l) => { const i = lineInfo(l); return { id: l.kit ? "" : l.id, name: i.name, sub: i.sub, qty: l.qty }; }) }) }).catch(() => {}); } catch {}
    };
    $("#fTel").addEventListener("change", borrador); $("#fNombre").addEventListener("change", borrador);
  }

  function sendOrder() {
    const d = {
      nombre: $("#fNombre").value.trim(), tel: $("#fTel").value.trim(), dni: $("#fDni").value.trim(),
      entrega: document.querySelector('input[name="entrega"]:checked').value, dir: $("#fDir").value.trim(), notas: $("#fNotas").value.trim(),
    };
    const correo = d.entrega === "Envío a domicilio";
    d.provincia = correo ? $("#fProv").value : d.entrega === "Entrega en aeródromo" ? "Buenos Aires" : d.entrega === "Digital" ? "" : "CABA";
    if (correo) { d.empresa = $("#fEmpresa").value; d.modo = $("#fModo").value; }
    if (d.entrega === "Entrega en aeródromo") d.aerodromo = $("#fAero").value;
    d.cumple = $("#fCumple").value; d.escuela = $("#fEscuela").value.trim();
    d.franja = d.entrega === "Envío en el día (CABA)" ? $("#fFranja").value : d.entrega === "Retiro en CABA" ? `${$("#fDia").value}, ${$("#fHora").value}` : "";
    Object.assign(datos, { nombre: d.nombre, tel: d.tel, dni: d.dni, entrega: d.entrega, dir: d.dir, provincia: correo ? d.provincia : datos.provincia, empresa: d.empresa || datos.empresa, modo: d.modo || datos.modo, cumple: d.cumple, escuela: d.escuela });
    store.set("tdv-datos", datos);
    const now = new Date();
    const num = `TDV-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const token = Array.from(crypto.getRandomValues(new Uint8Array(10)), (x) => "abcdefghijkmnpqrstuvwxyz23456789"[x % 32]).join("");
    const seguir = `${CONFIG.sitio}/seguimiento#${num}.${token}`;
    const lines = cart.map((l) => {
      const i = lineInfo(l);
      const link = l.kit ? "" : `\n  ${CONFIG.sitio}/producto/${l.id}`;
      return `• ${l.qty} x ${i.name}${i.sub ? ` (${i.sub})` : ""} — ${l.kit ? ars(i.unit * l.qty) : i.label}${link}`;
    });
    const msg = `¡Hola Tienda de Vuelo! Quiero hacer este pedido (${num}):\n\n${lines.join("\n")}\n\nTotal${hasUsd() ? " aprox." : ""}: ${ars(total())}${soloDigital() ? "" : " + envío"}\n\n` +
      `Nombre: ${d.nombre}\nTeléfono: ${d.tel}\nEntrega: ${d.entrega}` + (d.franja ? ` · ${d.franja}` : "") + (d.aerodromo ? ` · ${d.aerodromo}` : "") +
      (correo ? `\nCorreo: ${d.empresa} · ${d.modo}` : "") + (!["Retiro en CABA", "Entrega en aeródromo", "Digital"].includes(d.entrega) ? `\nDirección: ${d.dir}${correo ? ", " + d.provincia : ""}` : "") +
      (d.dni ? `\nDNI/CUIT: ${d.dni}` : "") + (d.notas ? `\nNotas: ${d.notas}` : "") + `\n\nSeguimiento del pedido: ${seguir}`;
    // Se guarda en el panel (sin esperar: WhatsApp se abre igual aunque falle)
    try {
      fetch("/api/pedido", { method: "POST", keepalive: true, headers: { "content-type": "application/json" }, body: JSON.stringify({
        num, token, carrito: carritoId(), totalArs: Math.round(total()), usdSub: cart.reduce((s, l) => s + (usdDe(l) || 0) * l.qty, 0) || null,
        cliente: d, items: cart.map((l) => { const i = lineInfo(l); return { id: l.kit ? "" : l.id, kit: l.kit || "", name: i.name, sub: i.sub, qty: l.qty, label: i.label, unitArs: Math.round(i.unit), usd: usdDe(l) }; }),
      }) }).catch(() => {});
    } catch {}
    const pedidos = store.get("tdv-pedidos", []);
    pedidos.unshift({ num, token, fecha: now.toISOString(), total: total(), items: cart.map((l) => ({ ...l })) });
    store.set("tdv-pedidos", pedidos.slice(0, 20));
    window.open(waLink(msg), "_blank", "noopener");
    const montoPedido = Math.round(total());
    medir("InitiateCheckout", { value: montoPedido, currency: "ARS", num_items: cart.reduce((a, l) => a + l.qty, 0) });
    cart = []; save(); step = "listo"; store.set("tdv-cid", "");
    $("#cartCount").textContent = "0"; $("#cartCount").classList.remove("show");
    $("#drawerTitle").textContent = "¡Pedido enviado!";
    $("#drawerBody").innerHTML = `<div class="cart-empty done"><div>✈️</div><h4>Gracias, ${esc(d.nombre.split(" ")[0])}</h4>
      <p>Tu pedido <b>${num}</b> se abrió en WhatsApp. Enviá el mensaje y te confirmamos stock, envío y forma de pago.</p>
      ${pagoHTML(montoPedido)}
      <p><a class="btn btn-ghost" href="/seguimiento#${num}.${token}">Seguí tu pedido</a></p>
      ${avisoHorario() ? `<p class="small">${esc(avisoHorario())}.</p>` : ""}
      <p class="muted small">¿No se abrió WhatsApp? Escribinos al ${esc(CONFIG.whatsappVisible)} con el número de pedido.</p></div>`;
    $("#drawerFoot").innerHTML = `<button class="btn btn-primary btn-block" id="doneBtn">Seguir comprando</button>`;
    $("#doneBtn").onclick = () => { step = "items"; closeCart(); renderCart(); };
  }

  const drawer = () => $("#drawer"), overlay = () => $("#overlay");
  function openCart() { overlay().hidden = false; drawer().classList.add("open"); drawer().setAttribute("aria-hidden", "false"); }
  function closeCart() { drawer().classList.remove("open"); drawer().setAttribute("aria-hidden", "true"); overlay().hidden = true; if (step === "listo") { step = "items"; renderCart(); } }
  $("#cartBtn").onclick = openCart;
  $("#closeCart").onclick = closeCart;
  $("#overlay").onclick = closeCart;
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeCart(); });

  document.addEventListener("click", (e) => {
    const c = e.target.closest("[data-consulta],[data-quiero]");
    if (c) evento(c.dataset.quiero ? "lo_quiero" : "consulta", "", c.dataset.quiero || c.dataset.consulta);
  });
  document.addEventListener("click", (e) => {
    const cm = e.target.closest("[data-cmp]");
    if (cm) { e.preventDefault(); toggleComparar(cm.dataset.cmp); return; }
    const t = e.target.closest("[data-add],[data-inc],[data-dec],[data-fav]");
    if (!t) return;
    if (t.dataset.add) { const p = byId[t.dataset.add]; add({ id: p.id, variante: p.variantes ? opciones(p)[0].nombre : "" }, p.name); }
    else if (t.dataset.inc) changeQty(t.dataset.inc, 1);
    else if (t.dataset.dec) changeQty(t.dataset.dec, -1);
    else if (t.dataset.fav) { e.preventDefault(); toggleFav(t.dataset.fav); }
  });

  // ---------- Asistente con IA (solo si está activado en el servidor) ----------
  async function asistente() {
    try { const r = await fetch("/api/asistente"); if (!r.ok || !(await r.json()).activo) return; } catch { return; }
    let hist = store.get("tdv-chat", []).slice(-16), abierto = false;
    const btn = document.createElement("button");
    btn.className = "ai-float"; btn.setAttribute("aria-label", "Abrir el asistente"); btn.innerHTML = '<span aria-hidden="true">✈</span> ¿Te ayudo a elegir?';
    const box = document.createElement("section");
    box.className = "ai-box"; box.hidden = true; box.setAttribute("aria-label", "Asistente de Tienda de Vuelo");
    box.innerHTML = `<div class="drawer-head"><h3>Asistente</h3><button class="icon-btn" id="aiClose" aria-label="Cerrar">✕</button></div>
      <div class="ai-msgs" id="aiMsgs" aria-live="polite"></div>
      <form class="ai-form" id="aiForm"><input id="aiQ" autocomplete="off" maxlength="600" placeholder="Ej.: ¿qué auricular me conviene para el curso?" aria-label="Tu pregunta"><button class="btn btn-primary btn-sm" type="submit">Enviar</button></form>
      <p class="ai-note">Respuestas generadas con IA a partir del catálogo. Para comprar o confirmar stock, <a href="${waLink("¡Hola! Vengo del asistente de la web.")}" target="_blank" rel="noopener">escribinos por WhatsApp</a>.</p>`;
    document.body.append(btn, box);
    const fmt = (t) => esc(t).replace(/\[([^\]]+)\]\((\/producto\/[\w-]+)\)/g, '<a href="$2">$1</a>').replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");
    const pintar = (pensando) => {
      $("#aiMsgs").innerHTML = (hist.length ? "" : `<div class="ai-m ai-a">¡Hola! Soy el asistente de Tienda de Vuelo. Contame qué volás o qué necesitás y te recomiendo del catálogo.</div>`) +
        hist.map((m) => `<div class="ai-m ${m.role === "user" ? "ai-u" : "ai-a"}">${fmt(m.content)}</div>`).join("") + (pensando ? '<div class="ai-m ai-a ai-dots"><span></span><span></span><span></span></div>' : "");
      $("#aiMsgs").scrollTop = 1e9;
    };
    const toggle = (v) => { abierto = v; box.hidden = !v; btn.hidden = v; if (v) { pintar(); $("#aiQ").focus(); } };
    btn.onclick = () => toggle(true);
    box.querySelector("#aiClose").onclick = () => toggle(false);
    $("#aiForm").onsubmit = async (e) => {
      e.preventDefault();
      const q = $("#aiQ").value.trim(); if (!q) return;
      $("#aiQ").value = ""; hist.push({ role: "user", content: q }); pintar(true);
      try {
        const r = await fetch("/api/asistente", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mensajes: hist }) });
        const d = await r.json();
        hist.push({ role: "assistant", content: d.texto || "No pude responder ahora." });
      } catch { hist.push({ role: "assistant", content: "No pude responder ahora. Probá de nuevo o escribinos por WhatsApp." }); }
      hist = hist.slice(-16); store.set("tdv-chat", hist); pintar();
    };
    box.addEventListener("click", (e) => { if (e.target.closest("a[href^='/producto/']")) toggle(false); });
  }

  // Píxel de Meta: solo se carga si el dueño puso su identificador en el panel.
  const pixel = () => {
    const id = CONFIG.metaPixel;
    if (!id || window.fbq) return;
    const f = window.fbq = function () { f.callMethod ? f.callMethod.apply(f, arguments) : f.queue.push(arguments); };
    window._fbq = f; f.push = f; f.loaded = true; f.version = "2.0"; f.queue = [];
    const s = document.createElement("script"); s.async = true; s.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(s);
    f("init", id); f("track", "PageView");
  };
  const medir = (ev, datos) => { try { if (window.fbq) window.fbq("track", ev, datos || {}); } catch {} };
  pixel();
  document.addEventListener("click", (e) => { if (e.target.closest("a[href*='wa.me/']")) medir("Contact"); });
  const setWa = (text) => { const a = $("#waFloat"); if (a) a.href = waLink(text || document.body.dataset.wa || "¡Hola Tienda de Vuelo! Quería hacerles una consulta."); };
  window.TDV = { opciones, conOpcion, estrellas, fechaCorta, toggleComparar, barraComparar, evento, $, esc, ars, usd, byId, store, pesos, priceHTML, art, card, badges, waLink, add, openCart, toast, isFav, toggleFav, enOferta, slug, catEmoji, setWa, avisoHorario, pagoHTML, b64, deB64, fichaTecnica, coincide, pedirPrecio, resumenCarrito, medir, get dolar() { return dolar; }, get favs() { return favs; } };
  renderCart();
  barraComparar();
  const pintarDolar = () => { const d = $("#dolarHoy"); if (d) d.textContent = `Dólar del día: ${ars(dolar)}`; };
  pintarDolar(); document.addEventListener("tdv:precios", pintarDolar);
  asistente();
  window.dispatchEvent(new Event("tdv:listo"));
})();
