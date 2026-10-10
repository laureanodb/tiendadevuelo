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

  // ---------- Dólar oficial del día ----------
  let dolar = store.get("tdv-dolar", null)?.venta || CONFIG.dolarRespaldo;
  fetch("https://dolarapi.com/v1/dolares/oficial").then((r) => r.json()).then((d) => {
    if (d && d.venta) { dolar = d.venta; store.set("tdv-dolar", { venta: d.venta }); document.dispatchEvent(new Event("tdv:precios")); renderCart(); }
  }).catch(() => {});

  // Precio en pesos de un producto (null = a consultar)
  const pesos = (p) => p.usd ? Math.round((p.usd * dolar) / 100) * 100 : (p.ars ?? null);
  const enOferta = (p) => !!(p.antes && (p.usd || p.ars) && p.antes > (p.usd || p.ars));
  const priceHTML = (p, big) => {
    const antes = enOferta(p) ? `<s>${p.usd ? usd(p.antes) : ars(p.antes)}</s>` : "";
    if (p.usd) return `<div class="price${big ? " price-big" : ""}">${antes}<b>${usd(p.usd)}</b><span class="ars">≈ ${ars(pesos(p))}</span></div>`;
    if (p.ars) return `<div class="price${big ? " price-big" : ""}">${antes}<b>${ars(p.ars)}</b></div>`;
    return `<div class="price${big ? " price-big" : ""}"><b class="consult">Consultar precio</b></div>`;
  };

  const art = (p, big) => {
    if (p.fotos && p.fotos.length) return `<div class="art art-photo${big ? " art-big" : ""}"><img src="${esc(p.fotos[0])}" alt="${esc(p.name)}" loading="lazy"></div>`;
    const [a, b] = CAT_COLORS[p.cat] || ["#0e8be0", "#d6ebfc"];
    return `<div class="art${big ? " art-big" : ""}" style="--a:${a};--b:${b}">
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[p.icon]}</svg>
    </div>`;
  };

  const badges = (p) => [
    enOferta(p) && `<span class="badge badge-sale">-${Math.round((1 - (p.usd || p.ars) / p.antes) * 100)}%</span>`,
    p.ultimas && '<span class="badge badge-last">Últimas unidades</span>',
    p.top && '<span class="badge">Más vendido</span>',
    p.nuevo && '<span class="badge badge-new">Nuevo ingreso</span>',
    p.encargo && '<span class="badge badge-order">Por encargo</span>',
    p.reacond && '<span class="badge badge-re">Reacondicionado</span>',
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

  const card = (p, i = 0) => `
    <article class="card" style="--i:${i}">
      <div class="badges">${badges(p)}</div>
      <button class="fav${isFav(p.id) ? " on" : ""}" data-fav="${p.id}" aria-label="${isFav(p.id) ? "Quitar de" : "Guardar en"} favoritos" aria-pressed="${isFav(p.id)}">${isFav(p.id) ? "♥" : "♡"}</button>
      <a class="card-art" href="/producto/${p.id}" data-view="${p.id}" aria-label="Ver ${esc(p.name)}">${art(p)}</a>
      <div class="card-body">
        <span class="card-cat">${esc(p.brand || p.cat)}</span>
        <h3><a href="/producto/${p.id}" data-view="${p.id}">${esc(p.name)}</a></h3>
        ${priceHTML(p)}
        ${p.encargo ? '<div class="note">Llega en 15 a 30 días</div>' : ""}
      </div>
      ${p.usd || p.ars ? `<button class="add" data-add="${p.id}">Agregar <span aria-hidden="true">+</span></button>`
        : `<a class="add" href="${waLink(`¡Hola! Quiero consultar el precio de: ${p.name}`)}" target="_blank" rel="noopener">Consultar</a>`}
    </article>`;

  // ---------- WhatsApp ----------
  const waLink = (text) => `https://wa.me/${CONFIG.whatsapp}${text ? "?text=" + encodeURIComponent(text) : ""}`;

  // ---------- Links por categoría y marca ----------
  const slug = (s) => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const catEmoji = { "Comunicaciones": "🎧", "Navegación": "🧭", "Aviónica": "🛰️", "Uniforme": "🪽", "Accesorios": "🎒", "Libros y regalos": "📚" };

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
  function avisoDespacho() {
    const hoy = ahoraAR();
    if (habil(hoy)) return "";
    const x = new Date(hoy); do x.setDate(x.getDate() + 1); while (!habil(x));
    const dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
    return `${feriados(hoy.getFullYear()).has(ymd(hoy)) ? "Hoy es feriado" : "Fin de semana"}: despachamos el ${dias[x.getDay()]} ${x.getDate()}/${x.getMonth() + 1}`;
  }
  const patrias = { "05-25": "¡Feliz 25 de Mayo!", "06-20": "¡Feliz Día de la Bandera!", "07-09": "¡Feliz Día de la Independencia!" };
  const patria = patrias[ymd(ahoraAR()).slice(5)] || "";
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
    ${despacho || patria ? `<div class="notice${patria ? " notice-ar" : ""}">${esc(patria ? patria + (despacho ? " · " + despacho : "") : despacho)}</div>` : ""}
    <div class="metar" aria-label="Novedades"><div class="metar-track">${[...metar, ...metar].map((t) => `<span>${t}</span>`).join("")}</div></div>
    <header class="nav" id="nav">
      <div class="wrap nav-inner">
        <a href="/" class="brand" aria-label="Tienda de Vuelo, inicio">
          ${logoSVG("logo-anim")}
          <span class="brand-text"><b>Tienda de Vuelo</b><small>Pilot shop</small></span>
        </a>
        <form class="nav-search" id="navSearch" role="search">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
          <input id="navQ" type="search" placeholder="¿Qué estás buscando?" aria-label="Buscar en la tienda" autocomplete="off" aria-controls="sugg" aria-expanded="false">
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
          <div class="mega" role="menu">${CATEGORIES.map((c) => `<a role="menuitem" href="/categoria/${slug(c)}"><span>${catEmoji[c] || "✈"}</span>${esc(c)}</a>`).join("")}
            <a role="menuitem" href="/usados"><span>♻️</span>Usados y reacondicionados</a><a role="menuitem" href="/novedades"><span>✨</span>Novedades del mes</a></div>
        </div>
        ${PRODUCTS.some(enOferta) ? '<a href="/ofertas" class="link-sale">Ofertas</a>' : ""}
        <a href="${h("#kits")}">Kits</a>
        <a href="${h("#tripulantes")}">Tripulantes</a>
        <a href="${h("#regalos")}">Regalos</a>
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
          <p class="made"><svg viewBox="0 0 9 6" width="22" height="15" aria-hidden="true"><rect width="9" height="6" fill="#74acdf"/><rect y="2" width="9" height="2" fill="#fff"/><circle cx="4.5" cy="3" r=".6" fill="#f6b40e"/></svg> Hecho en Argentina</p>
        </div>
        <div>
          <h4>Tienda</h4>
          <a href="${h("#catalogo")}">Catálogo</a><a href="${h("#kits")}">Kits</a><a href="/envios">Envíos</a><a href="/guia-primer-vuelo">Guía: tu primer vuelo</a><a href="${h("#preguntas")}">Preguntas frecuentes</a>
        </div>
        <div>
          <h4>Contacto</h4>
          <a href="${waLink("¡Hola Tienda de Vuelo! Quería hacerles una consulta.")}" target="_blank" rel="noopener">WhatsApp ${esc(CONFIG.whatsappVisible)}</a>
          <a href="mailto:${CONFIG.email}">${CONFIG.email}</a>
          <span class="muted">${esc(CONFIG.ciudad)}</span>
        </div>
        <div>
          <h4>Legales</h4>
          <a href="/legales#terminos">Términos y condiciones</a>
          <a href="/legales#privacidad">Privacidad</a>
          <a href="/legales#arrepentimiento" class="strong">Botón de arrepentimiento</a>
          <a href="https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario" target="_blank" rel="noopener">Defensa del Consumidor</a>
        </div>
      </div>
      <div class="wrap pay-row" aria-label="Medios de pago"><span class="muted small">Pagás con:</span>
        <span class="pay">🏦 Transferencia</span><span class="pay">💵 Efectivo al retirar</span><span class="pay">💲 Dólares</span><span class="pay">₿ Cripto</span><span class="pay">🔒 Seña para reservar</span></div>
      <div class="wrap foot-bottom">© ${new Date().getFullYear()} Tienda de Vuelo · ${esc(CONFIG.ciudad)}</div>
    </footer>
    ${avisoHorario() ? `<div class="wa-bubble" id="waBubble">${esc(avisoHorario())}. Dejanos tu mensaje 👋</div>` : ""}
    <a class="wa-float" id="waFloat" href="${waLink(document.body.dataset.wa || "¡Hola Tienda de Vuelo! Quería hacerles una consulta.")}" target="_blank" rel="noopener" aria-label="Escribinos por WhatsApp">
      <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>
    </a>
    <div class="overlay" id="overlay" hidden></div>
    <aside class="drawer" id="drawer" aria-label="Carrito" aria-hidden="true">
      <div class="drawer-head"><h3 id="drawerTitle">Tu carrito</h3><button class="icon-btn" id="closeCart" aria-label="Cerrar carrito">✕</button></div>
      <div class="drawer-body" id="drawerBody"></div>
      <div class="drawer-foot" id="drawerFoot"></div>
    </aside>
    <div class="toast" id="toast" role="status" aria-live="polite"></div>`;

  document.querySelectorAll("[data-cfg]").forEach((el) => (el.textContent = CONFIG[el.dataset.cfg]));
  window.addEventListener("scroll", () => $("#nav").classList.toggle("scrolled", scrollY > 30), { passive: true });

  const normQ = (x) => String(x).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const buscar = (q) => { const w = normQ(q).split(/\s+/).filter(Boolean); return PRODUCTS.filter((p) => !p.agotado && w.every((x) => normQ([p.name, p.brand, p.model, p.cat, p.desc].join(" ")).includes(x))); };
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
    if (q && !buscar(q).length) { try { const b = JSON.parse(localStorage.getItem("tdv-busquedas") || "[]"); b.unshift(q); localStorage.setItem("tdv-busquedas", JSON.stringify(b.slice(0, 50))); } catch {} }
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

  // ---------- Carrito ----------
  let cart = store.get("tdv-cart", []).filter((l) => (l.kit ? KITS.some((k) => k.id === l.kit) : byId[l.id]));
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
    const p = byId[l.id];
    return { name: p.name, sub: l.variante || "", unit: pesos(p) || 0, p, label: p.usd ? `${usd(p.usd)} (≈ ${ars(pesos(p))})` : ars(p.ars) };
  };
  const total = () => cart.reduce((s, l) => s + lineInfo(l).unit * l.qty, 0);
  const hasUsd = () => cart.some((l) => !l.kit && byId[l.id].usd);

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
      <p class="muted small">${hasUsd() ? "Productos en dólares convertidos al oficial del día. " : ""}El envío se cotiza aparte según destino.</p>`;

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
      foot.innerHTML = totalBlock + (despacho ? `<p class="small notice-inline">${esc(despacho)}</p>` : "") + `<button class="btn btn-primary btn-block" id="toDatos">Continuar</button>`;
      $("#toDatos").onclick = () => { step = "datos"; renderCart(); };
      return;
    }

    // Paso 2: datos del pedido
    $("#drawerTitle").textContent = "Tus datos";
    body.innerHTML = `
      <form id="orderForm" class="order-form">
        <label>Nombre y apellido<input id="fNombre" required autocomplete="name" value="${esc(datos.nombre || "")}"></label>
        <label>Teléfono<input id="fTel" required type="tel" autocomplete="tel" value="${esc(datos.tel || "")}"></label>
        <fieldset><legend>Entrega</legend>
          <label class="opt"><input type="radio" name="entrega" value="Envío a domicilio" ${datos.entrega !== "Retiro en CABA" && datos.entrega !== "Envío en el día (CABA)" ? "checked" : ""}> Envío a domicilio</label>
          <label class="opt"><input type="radio" name="entrega" value="Envío en el día (CABA)" ${datos.entrega === "Envío en el día (CABA)" ? "checked" : ""}> Envío en el día (CABA)</label>
          <label class="opt"><input type="radio" name="entrega" value="Retiro en CABA" ${datos.entrega === "Retiro en CABA" ? "checked" : ""}> Retiro en CABA (coordinamos por WhatsApp)</label>
        </fieldset>
        <label id="fFranjaWrap">Franja horaria<select id="fFranja"><option>Mañana (9 a 13 h)</option><option>Tarde (14 a 19 h)</option></select></label>
        <label id="fDirWrap">Dirección, ciudad y código postal<input id="fDir" autocomplete="street-address" value="${esc(datos.dir || "")}"></label>
        <label><span>DNI o CUIT <span class="muted">(opcional, si necesitás factura)</span></span><input id="fDni" inputmode="numeric" value="${esc(datos.dni || "")}"></label>
        <label><span>Notas <span class="muted">(opcional)</span></span><textarea id="fNotas" rows="2"></textarea></label>
      </form>`;
    foot.innerHTML = totalBlock + `<div class="foot-btns"><button class="btn btn-ghost" id="toItems">← Volver</button><button class="btn btn-primary" id="send" form="orderForm" type="submit">Enviar pedido por WhatsApp</button></div>`;
    const syncDir = () => { const v = document.querySelector('input[name="entrega"]:checked').value; $("#fDirWrap").hidden = v === "Retiro en CABA"; $("#fDir").required = v !== "Retiro en CABA"; $("#fFranjaWrap").hidden = v !== "Envío en el día (CABA)"; };
    document.querySelectorAll('input[name="entrega"]').forEach((r) => (r.onchange = syncDir)); syncDir();
    $("#toItems").onclick = () => { step = "items"; renderCart(); };
    $("#orderForm").onsubmit = (e) => { e.preventDefault(); sendOrder(); };
  }

  function sendOrder() {
    const d = {
      nombre: $("#fNombre").value.trim(), tel: $("#fTel").value.trim(), dni: $("#fDni").value.trim(),
      entrega: document.querySelector('input[name="entrega"]:checked').value, franja: $("#fFranja").value, dir: $("#fDir").value.trim(), notas: $("#fNotas").value.trim(),
    };
    Object.assign(datos, { nombre: d.nombre, tel: d.tel, dni: d.dni, entrega: d.entrega, dir: d.dir });
    store.set("tdv-datos", datos);
    const now = new Date();
    const num = `TDV-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(Math.floor(Math.random() * 900) + 100)}`;
    const lines = cart.map((l) => {
      const i = lineInfo(l);
      const link = l.kit ? "" : `\n  ${CONFIG.sitio}/producto/${l.id}`;
      return `• ${l.qty} x ${i.name}${i.sub ? ` (${i.sub})` : ""} — ${l.kit ? ars(i.unit * l.qty) : i.label}${link}`;
    });
    const msg = `¡Hola Tienda de Vuelo! Quiero hacer este pedido (${num}):\n\n${lines.join("\n")}\n\nTotal${hasUsd() ? " aprox." : ""}: ${ars(total())} + envío\n\n` +
      `Nombre: ${d.nombre}\nTeléfono: ${d.tel}\nEntrega: ${d.entrega}` + (d.entrega === "Envío en el día (CABA)" ? ` · ${d.franja}` : "") + (d.entrega !== "Retiro en CABA" ? `\nDirección: ${d.dir}` : "") +
      (d.dni ? `\nDNI/CUIT: ${d.dni}` : "") + (d.notas ? `\nNotas: ${d.notas}` : "");
    const pedidos = store.get("tdv-pedidos", []);
    pedidos.unshift({ num, fecha: now.toISOString(), total: total(), items: cart.map((l) => ({ ...l })) });
    store.set("tdv-pedidos", pedidos.slice(0, 20));
    window.open(waLink(msg), "_blank", "noopener");
    cart = []; save(); step = "listo";
    $("#cartCount").textContent = "0"; $("#cartCount").classList.remove("show");
    $("#drawerTitle").textContent = "¡Pedido enviado!";
    $("#drawerBody").innerHTML = `<div class="cart-empty done"><div>✈️</div><h4>Gracias, ${esc(d.nombre.split(" ")[0])}</h4>
      <p>Tu pedido <b>${num}</b> se abrió en WhatsApp. Enviá el mensaje y te confirmamos stock, envío y forma de pago.</p>
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
    const t = e.target.closest("[data-add],[data-inc],[data-dec],[data-fav]");
    if (!t) return;
    if (t.dataset.add) { const p = byId[t.dataset.add]; add({ id: p.id, variante: p.variantes ? p.variantes[0] : "" }, p.name); }
    else if (t.dataset.inc) changeQty(t.dataset.inc, 1);
    else if (t.dataset.dec) changeQty(t.dataset.dec, -1);
    else if (t.dataset.fav) { e.preventDefault(); toggleFav(t.dataset.fav); }
  });

  const setWa = (text) => { const a = $("#waFloat"); if (a) a.href = waLink(text || document.body.dataset.wa || "¡Hola Tienda de Vuelo! Quería hacerles una consulta."); };
  window.TDV = { $, esc, ars, usd, byId, store, pesos, priceHTML, art, card, badges, waLink, add, openCart, toast, isFav, toggleFav, enOferta, slug, catEmoji, setWa, avisoHorario, get favs() { return favs; } };
  renderCart();
  window.dispatchEvent(new Event("tdv:listo"));
})();
