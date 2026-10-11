// Portada: vitrina, destacados, banners, catálogo con filtros, páginas de categoría y marca, kits armables y ficha de producto.
(() => {
  const { $, esc, ars, byId, pesos, priceHTML, art, card, waLink, add, toast, isFav, toggleFav, enOferta, slug, catEmoji, setWa, opciones, conOpcion, estrellas, fechaCorta, toggleComparar } = window.TDV;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const visibles = PRODUCTS.filter((p) => !p.agotado);

  // ---------- Destacados, tripulantes, regalos ----------
  const renderRows = () => {
    $("#destacados").innerHTML = visibles.filter((p) => p.destacado).sort((a, b) => a.destacado - b.destacado).slice(0, 4).map(card).join("");
    $("#tcpGrid").innerHTML = visibles.filter((p) => p.tcp).slice(0, 4).map(card).join("");
    $("#regalosGrid").innerHTML = visibles.filter((p) => p.regalo).slice(0, 4).map(card).join("");
    const usados = visibles.filter((p) => p.reacond);
    $("#usados").hidden = !usados.length;
    $("#usadosGrid").innerHTML = usados.slice(0, 4).map(card).join("");
  };

  // ---------- Banners que rotan ----------
  $("#banners").innerHTML = `<div class="banner-track" id="bannerTrack">${BANNERS.map((b, i) => `
    <a class="banner b${i % 3}" href="${b.href}">
      <span class="kicker">${esc(b.kicker)}</span><h3>${esc(b.title)}</h3><p>${esc(b.text)}</p><span class="banner-cta">${esc(b.cta)} →</span>
    </a>`).join("")}</div>
    <div class="dots" role="tablist" aria-label="Banners">${BANNERS.map((_, i) => `<button role="tab" aria-label="Banner ${i + 1}" data-dot="${i}"></button>`).join("")}</div>`;
  let bi = 0, bTimer;
  const showBanner = (i) => {
    bi = (i + BANNERS.length) % BANNERS.length;
    $("#bannerTrack").style.transform = `translateX(-${bi * 100}%)`;
    document.querySelectorAll("[data-dot]").forEach((d, k) => d.setAttribute("aria-selected", k === bi));
  };
  const autoBanner = () => { clearInterval(bTimer); if (!reduceMotion) bTimer = setInterval(() => showBanner(bi + 1), 5500); };
  document.querySelectorAll("[data-dot]").forEach((d) => (d.onclick = () => { showBanner(+d.dataset.dot); autoBanner(); }));
  showBanner(0); autoBanner();

  // ---------- Categorías ----------
  $("#cats").innerHTML = CATEGORIES.map((c) => `<a class="cat-card" href="/categoria/${slug(c)}" data-ruta><span>${catEmoji[c] || "✈"}</span>${esc(c)}</a>`).join("");

  // ---------- Catálogo ----------
  const state = { f: "Todos", q: new URLSearchParams(location.search).get("q") || "", sort: "destacados", brand: "", min: "", max: "", vista: "grid" };
  try { state.vista = localStorage.getItem("tdv-vista") || "grid"; } catch {}
  const hace30 = Date.now() - 30 * 864e5;
  const esNovedad = (p) => p.nuevo || (p.creado && new Date(p.creado).getTime() > hace30);
  const FILTROS = ["Todos", ...(visibles.some(enOferta) ? ["Ofertas"] : []), "Novedades del mes", "Más vendidos", ...(visibles.some((p) => p.reacond) ? ["Usados y reacondicionados"] : []), "Por encargo", "Favoritos", ...CATEGORIES];
  const marcasTodas = [...new Set(visibles.map((p) => p.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
  $("#brand").insertAdjacentHTML("beforeend", marcasTodas.map((m) => `<option>${esc(m)}</option>`).join(""));
  const chips = $("#chips");
  chips.innerHTML = FILTROS.map((f) => `<button class="chip" role="tab" data-f="${f}">${f === "Favoritos" ? "♥ Favoritos" : f}</button>`).join("");
  chips.addEventListener("click", (e) => { const b = e.target.closest("[data-f]"); if (b) { state.f = b.dataset.f; render(); } });
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  $("#search").value = state.q;

  function render() {
    chips.querySelectorAll(".chip").forEach((c) => { const on = c.dataset.f === state.f; c.classList.toggle("on", on); c.setAttribute("aria-selected", on); });
    const q = norm(state.q);
    const pass = {
      "Todos": () => true, "Ofertas": enOferta, "Novedades del mes": esNovedad, "Más vendidos": (p) => p.top,
      "Usados y reacondicionados": (p) => p.reacond, "Por encargo": (p) => p.encargo, "Favoritos": (p) => isFav(p.id),
    };
    const min = Number(state.min) || 0, max = Number(state.max) || Infinity;
    let list = visibles.filter((p) => (pass[state.f] ? pass[state.f](p) : p.cat === state.f) &&
      (!state.brand || p.brand === state.brand) &&
      (!state.min && !state.max || (pesos(p) !== null && pesos(p) >= min && pesos(p) <= max)) &&
      (!q || q.split(/\s+/).every((w) => norm([p.name, p.brand, p.model, p.desc, p.cat].join(" ")).includes(w))));
    const precio = (p) => pesos(p) ?? Infinity;
    const sorters = {
      destacados: (a, b) => (a.destacado || (a.top ? 50 : 99)) - (b.destacado || (b.top ? 50 : 99)),
      "precio-asc": (a, b) => precio(a) - precio(b),
      "precio-desc": (a, b) => (pesos(b) ?? -1) - (pesos(a) ?? -1),
      nombre: (a, b) => a.name.localeCompare(b.name, "es"),
    };
    list.sort(sorters[state.sort]);
    $("#grid").innerHTML = list.map(card).join("");
    $("#grid").classList.toggle("as-list", state.vista === "list");
    $("#vGrid").setAttribute("aria-pressed", state.vista === "grid"); $("#vList").setAttribute("aria-pressed", state.vista === "list");
    $("#empty").hidden = list.length > 0;
    $("#empty").innerHTML = state.f === "Favoritos" && !state.q
      ? "Todavía no guardaste favoritos. Tocá el ♡ de cualquier producto."
      : `No encontramos nada con esa búsqueda. <a href="/contacto#pedido">Pedinos el producto</a> y lo conseguimos.`;
  }
  $("#search").addEventListener("input", (e) => { state.q = e.target.value; render(); });
  $("#sort").addEventListener("change", (e) => { state.sort = e.target.value; render(); });
  $("#brand").addEventListener("change", (e) => { state.brand = e.target.value; render(); });
  $("#pMin").addEventListener("input", (e) => { state.min = e.target.value; render(); });
  $("#pMax").addEventListener("input", (e) => { state.max = e.target.value; render(); });
  const setVista = (v) => { state.vista = v; try { localStorage.setItem("tdv-vista", v); } catch {} render(); };
  $("#vGrid").onclick = () => setVista("grid"); $("#vList").onclick = () => setVista("list");

  // ---------- Páginas de categoría, marca, ofertas, usados y novedades ----------
  const baseHead = { kicker: "Catálogo", title: "Equipate como un profesional" };
  const metaDesc = document.querySelector('meta[name="description"]'), baseDesc = metaDesc.content;
  function ruta(path, push) {
    let f = "Todos", brand = "", kicker = baseHead.kicker, title = baseHead.title, text = "", pageTitle = "";
    const m = path.match(/^\/(categoria|marca)\/([\w-]+)/);
    if (m && m[1] === "categoria") { const c = CATEGORIES.find((x) => slug(x) === m[2]); if (c) { f = c; kicker = "Categoría"; title = c; text = CAT_INFO[c] || ""; pageTitle = `${c} para pilotos`; } }
    else if (m) { const b = marcasTodas.find((x) => slug(x) === m[2]); if (b) { brand = b; kicker = "Marca"; title = b; text = `Productos ${b} originales para pilotos, con envío a todo el país.`; pageTitle = `${b} en Argentina`; } }
    else if (path === "/ofertas") { f = "Ofertas"; kicker = "Ofertas"; title = "Ofertas del momento"; text = "Precios rebajados por tiempo limitado."; pageTitle = "Ofertas"; }
    else if (path === "/usados") { f = "Usados y reacondicionados"; kicker = "Usados"; title = "Usados y reacondicionados"; text = "Equipos revisados y probados, a mejor precio."; pageTitle = "Usados y reacondicionados"; }
    else if (path === "/novedades") { f = "Novedades del mes"; kicker = "Novedades"; title = "Novedades del mes"; text = "Lo último que llegó a la tienda."; pageTitle = "Novedades"; }
    else return false;
    Object.assign(state, { f, brand, q: "", min: "", max: "" });
    $("#search").value = ""; $("#brand").value = brand; $("#pMin").value = ""; $("#pMax").value = "";
    $("#catKicker").textContent = kicker; $("#catTitle").textContent = title;
    $("#catText").textContent = text; $("#catText").hidden = !text;
    document.title = `${pageTitle} · Tienda de Vuelo`;
    if (text) metaDesc.content = text;
    if (push) history.pushState({ ruta: path }, "", path);
    closeView(false); render();
    $("#catalogo").scrollIntoView({ behavior: push && !reduceMotion ? "smooth" : "auto" });
    return true;
  }
  const rutaBase = () => { $("#catKicker").textContent = baseHead.kicker; $("#catTitle").textContent = baseHead.title; $("#catText").hidden = true; metaDesc.content = baseDesc; };
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href^='/categoria/'], a[href^='/marca/'], a[href='/ofertas'], a[href='/usados'], a[href='/novedades']");
    if (!a || e.metaKey || e.ctrlKey) return;
    if (ruta(a.getAttribute("href"), true)) e.preventDefault();
  });
  window.TDV_SEARCH = (q) => { state.q = q; state.f = "Todos"; state.brand = ""; $("#brand").value = ""; rutaBase(); $("#search").value = q; render(); closeView(); $("#catalogo").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" }); };

  // ---------- Kits armables ----------
  const kitSel = Object.fromEntries(KITS.map((k) => [k.id, new Set(k.items)]));
  function renderKits() {
    $("#kitsGrid").innerHTML = KITS.map((k) => {
      const sel = [...kitSel[k.id]];
      const price = sel.reduce((s, id) => s + (pesos(byId[id]) || 0), 0) * (1 - k.off);
      return `<article class="kit${k.highlight ? " kit-hl" : ""}">
        ${k.highlight ? '<span class="badge">El más elegido</span>' : ""}
        <div class="kit-emoji">${k.emoji}</div>
        <h3>${esc(k.name)}</h3>
        <p class="muted">${esc(k.tagline)}</p>
        <ul>${k.items.map((id) => `<li><label><input type="checkbox" data-kit="${k.id}" data-item="${id}" ${kitSel[k.id].has(id) ? "checked" : ""}> ${esc(byId[id].name)}</label></li>`).join("")}</ul>
        <div class="kit-price"><b>${sel.length ? ars(price) : "—"}</b><span class="muted small">con 10% off</span></div>
        <button class="btn btn-primary btn-block" data-addkit="${k.id}" ${sel.length < 2 ? "disabled" : ""}>${sel.length < 2 ? "Elegí al menos 2" : "Agregar kit"}</button>
      </article>`;
    }).join("");
  }
  $("#kitsGrid").addEventListener("change", (e) => {
    const c = e.target.closest("[data-kit]"); if (!c) return;
    const s = kitSel[c.dataset.kit];
    c.checked ? s.add(c.dataset.item) : s.delete(c.dataset.item);
    renderKits();
  });
  $("#kitsGrid").addEventListener("click", (e) => {
    const b = e.target.closest("[data-addkit]"); if (!b) return;
    const k = KITS.find((x) => x.id === b.dataset.addkit);
    add({ kit: k.id, items: k.items.filter((id) => kitSel[k.id].has(id)) }, k.name);
  });

  // ---------- Marcas ----------
  const marcas = [...new Set(PRODUCTS.map((p) => p.brand).filter(Boolean))];
  $("#brands").innerHTML = marcas.map((m) => `<a class="brand-chip" href="/marca/${slug(m)}">${esc(m)}</a>`).join("");

  // ---------- Ficha de producto (/producto/id) ----------
  const view = $("#pview");
  let current = null, lastScroll = 0;
  const baseTitle = document.title;
  function openView(id, push = true) {
    const p = byId[id];
    if (!p) return;
    current = p;
    if (view.hidden) lastScroll = scrollY;
    const fotos = p.fotos && p.fotos.length ? p.fotos : null;
    $("#pvGallery").innerHTML = fotos
      ? `<div class="swipe" id="pvSwipe">${fotos.map((f, i) => `<div class="zoom"><img src="${esc(f)}" alt="${esc(p.name)} (foto ${i + 1})" ${i ? 'loading="lazy"' : ""}></div>`).join("")}</div>
         ${fotos.length > 1 ? `<div class="thumbs">${fotos.map((f, i) => `<button data-foto="${i}" aria-label="Foto ${i + 1}"${i ? "" : ' aria-current="true"'}><img src="${esc(f)}" alt=""></button>`).join("")}</div>` : ""}`
      : art(p, true);
    $("#pvBrand").textContent = [p.brand, p.model].filter(Boolean).join(" · ") || p.cat;
    $("#pvTitle").textContent = p.name;
    $("#pvTags").innerHTML = [
      '<span class="seal seal-sm">✈ Recomendado por pilotos</span>',
      p.encargo && '<span class="tag tag-order">Por encargo · 15 a 30 días</span>',
      p.reacond && '<span class="tag">Reacondicionado</span>',
      p.nuevo && '<span class="tag tag-new">Nuevo ingreso</span>',
      p.ultimas && '<span class="tag tag-order">Últimas unidades</span>',
      p.oficial && '<span class="tag tag-oficial">✔ Distribuidor oficial</span>',
      p.llega && `<span class="tag tag-order">Preventa · llega el ${fechaCorta(p.llega)}</span>`,
      enOferta(p) && `<span class="tag tag-sale">Oferta${p.ofertaHasta ? " hasta el " + p.ofertaHasta.split("-").reverse().slice(0, 2).join("/") : ""}</span>`,
    ].filter(Boolean).join("");
    $("#pvDesc").textContent = p.desc;
    $("#pvSpecs").innerHTML = p.specs.map((s) => `<li>${esc(s)}</li>`).join("");
    $("#pvEtapas").innerHTML = p.etapas?.length ? `<span class="muted small">Ideal para:</span> ${p.etapas.map((e) => `<span class="tag">${ETAPAS[e]}</span>`).join("")}` : "";
    $("#pvVariantWrap").hidden = !p.variantes;
    const ops = opciones(p);
    $("#pvVariant").innerHTML = ops.map((o) => `<option value="${esc(o.nombre)}">${esc(o.nombre)}${o.precio !== null && o.precio !== (p.usd || p.ars) ? ` — ${p.usd ? "US$ " + o.precio.toLocaleString("es-AR") : ars(o.precio)}` : ""}</option>`).join("");
    const precioOpcion = () => {
      const pp = p.variantes ? conOpcion(p, $("#pvVariant").value) : p;
      $("#pvPrice").innerHTML = priceHTML(pp, true) + (p.usd ? '<p class="muted small">Precio en dólares. El equivalente en pesos es al dólar oficial del día.</p>' : "");
      const o = ops.find((x) => x.nombre === $("#pvVariant").value);
      const sw = $("#pvSwipe");
      if (o && o.foto !== null && sw) sw.scrollTo({ left: sw.clientWidth * o.foto, behavior: reduceMotion ? "auto" : "smooth" });
    };
    const conPrecio = p.usd || p.ars;
    $("#pvAdd").hidden = !conPrecio;
    const consulta = `¡Hola! Quiero consultar por ${p.name}${p.brand ? ` (${p.brand})` : ""}: ${CONFIG.sitio}/producto/${p.id}`;
    $("#pvAsk").href = waLink(consulta);
    $("#pvAsk").hidden = !conPrecio;
    const loQuiero = () => {
      const op = p.variantes ? $("#pvVariant").value : "";
      const pp = op ? conOpcion(p, op) : p;
      const precio = pp.usd ? `US$ ${pp.usd.toLocaleString("es-AR")}` : pp.ars ? ars(pp.ars) : "";
      $("#pvWant").href = waLink(`¡Hola! ${p.llega ? "Quiero reservar (preventa)" : "Lo quiero"}: ${p.name}${p.brand ? ` (${p.brand}${p.model ? " " + p.model : ""})` : ""}${op ? `\nOpción: ${op}` : ""}${precio ? `\nPrecio: ${precio}` : ""}\n${CONFIG.sitio}/producto/${p.id}`);
    };
    $("#pvVariant").onchange = () => { loQuiero(); precioOpcion(); }; loQuiero(); precioOpcion();
    $("#pvAdd").textContent = p.llega ? "Reservar (preventa)" : "Agregar al carrito";
    $("#pvRating").hidden = !p.rating;
    if (p.rating) $("#pvRating").innerHTML = `<span class="stars">${estrellas(p.rating)}</span> ${p.rating} · ${p.resenas} ${p.resenas === 1 ? "opinión" : "opiniones"}`;
    $("#pvCmp").textContent = TDV_cmpTxt(p.id);
    $("#pvDocs").hidden = !(p.docs && p.docs.length);
    $("#pvDocs").innerHTML = (p.docs || []).map((d) => `<a class="doc" href="${esc(d.url)}" target="_blank" rel="noopener">📄 ${esc(d.nombre)}</a>`).join("");
    $("#pvAlq").hidden = !p.alquiler;
    if (p.alquiler) $("#pvAlq").innerHTML = `También lo alquilamos: <b>${p.alquilerMoneda === "USD" ? "US$ " + p.alquiler : ars(p.alquiler)} por día</b>. <a href="/alquiler">Ver alquileres</a>`;
    cargarSocial(p);
    $("#pvWant").dataset.quiero = p.id; $("#pvAsk").dataset.consulta = p.id;
    $("#pvWant").textContent = conPrecio ? "Lo quiero por WhatsApp" : "Consultar precio por WhatsApp";
    setWa(consulta);
    const yt = (p.video || "").match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{11})/);
    $("#pvVideo").hidden = !p.video;
    $("#pvVideo").innerHTML = yt
      ? `<div class="video-wrap"><iframe src="https://www.youtube-nocookie.com/embed/${yt[1]}" title="Video de ${esc(p.name)}" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`
      : p.video ? `<a class="btn btn-ghost" href="${esc(p.video)}" target="_blank" rel="noopener">▶ Ver video del producto</a>` : "";
    $("#pvShare").href = `https://wa.me/?text=${encodeURIComponent(`Mirá esto en Tienda de Vuelo: ${p.name} ${CONFIG.sitio}/producto/${p.id}`)}`;
    syncFav();
    // Se lleva junto con: productos de los kits donde está, o de la misma etapa
    const enKits = KITS.filter((k) => k.items.includes(p.id)).flatMap((k) => k.items);
    const etapa = visibles.filter((x) => x.etapas?.some((e) => p.etapas?.includes(e)));
    const together = [...new Set([...enKits, ...etapa.map((x) => x.id)])].filter((id) => id !== p.id && byId[id].cat !== p.cat).slice(0, 4);
    $("#pvTogether").innerHTML = together.map((id) => card(byId[id])).join("");
    $("#pvRelated").innerHTML = visibles.filter((x) => x.cat === p.cat && x.id !== p.id).slice(0, 4).map(card).join("");
    view.hidden = false;
    document.body.classList.add("viewing");
    document.title = `${p.name} · Tienda de Vuelo`;
    if (push) history.pushState({ id }, "", `/producto/${id}`);
    view.scrollTop = 0; window.scrollTo(0, 0);
  }
  function closeView(push = true) {
    if (view.hidden) return;
    view.hidden = true; current = null;
    document.body.classList.remove("viewing");
    document.title = baseTitle;
    setWa();
    if (push) history.pushState({}, "", "/");
    window.scrollTo(0, lastScroll);
  }
  const syncFav = () => { if (current) $("#pvFav").textContent = isFav(current.id) ? "♥ En favoritos" : "♡ Guardar en favoritos"; };
  $("#pvFav").onclick = () => { toggleFav(current.id); };
  $("#pvBack").onclick = () => (history.state && history.length > 1 ? history.back() : closeView());
  $("#pvAdd").onclick = () => add({ id: current.id, variante: current.variantes ? $("#pvVariant").value : "" }, current.name);
  document.addEventListener("click", (e) => { if (e.target.closest("#pvRating")) { e.preventDefault(); $("#pvResenasH").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" }); } });
  $("#pvGallery").addEventListener("click", (e) => {
    const t = e.target.closest("[data-foto]"); if (!t) return;
    const sw = $("#pvSwipe"); sw.scrollTo({ left: sw.clientWidth * +t.dataset.foto, behavior: reduceMotion ? "auto" : "smooth" });
  });
  $("#pvGallery").addEventListener("scroll", (e) => {
    const sw = e.target.closest?.("#pvSwipe") || (e.target.id === "pvSwipe" ? e.target : null); if (!sw) return;
    const i = Math.round(sw.scrollLeft / sw.clientWidth);
    document.querySelectorAll("#pvGallery [data-foto]").forEach((b) => b.setAttribute("aria-current", +b.dataset.foto === i));
  }, true);
  $("#pvGallery").addEventListener("mousemove", (e) => {
    const z = e.target.closest(".zoom"); if (!z || matchMedia("(hover: none)").matches) return;
    const r = z.getBoundingClientRect();
    z.style.setProperty("--zx", ((e.clientX - r.left) / r.width) * 100 + "%");
    z.style.setProperty("--zy", ((e.clientY - r.top) / r.height) * 100 + "%");
  });
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-view]");
    if (!a || e.metaKey || e.ctrlKey) return;
    e.preventDefault(); openView(a.dataset.view);
  });
  window.addEventListener("popstate", () => {
    const m = location.pathname.match(/^\/producto\/([\w-]+)/);
    if (m) return openView(m[1], false);
    if (!ruta(location.pathname, false)) { closeView(false); rutaBase(); Object.assign(state, { f: "Todos", brand: "" }); $("#brand").value = ""; render(); }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !view.hidden) closeView(); });

  // ---------- Comparar y regalar desde la ficha ----------
  const TDV_cmpTxt = (id) => (JSON.parse(localStorage.getItem("tdv-cmp") || "[]").includes(id) ? "⇄ En comparación" : "⇄ Comparar");
  $("#pvCmp").onclick = () => { toggleComparar(current.id); $("#pvCmp").textContent = TDV_cmpTxt(current.id); };
  $("#pvGift").onclick = () => regalar(current);
  function regalar(p) {
    const m = document.createElement("div");
    m.className = "cmp-modal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.setAttribute("aria-label", "Regalar");
    m.innerHTML = `<form class="cmp-card gift-card" id="giftForm"><div class="drawer-head"><h3>🎁 Regalar ${esc(p.name)}</h3><button type="button" class="icon-btn" id="gClose" aria-label="Cerrar">✕</button></div>
      <div class="gift-body"><p class="muted">Armamos un link de regalo: la persona lo abre, ve tu mensaje${p.variantes ? " y elige la opción" : ""}, y nos escribe para recibirlo. Vos coordinás el pago con nosotros por WhatsApp.</p>
      <label>Tu nombre<input id="gDe" required maxlength="40"></label>
      <label>Para<input id="gPara" required maxlength="40"></label>
      <label>Mensaje<textarea id="gMsg" rows="3" maxlength="300" placeholder="¡Feliz primer solo! Que tengas muchas horas de vuelo."></textarea></label>
      <button class="btn btn-primary" type="submit">Crear link de regalo</button>
      <div id="gOut"></div></div></form>`;
    document.body.appendChild(m);
    m.querySelector("#gClose").onclick = () => m.remove();
    m.addEventListener("click", (e) => { if (e.target === m) m.remove(); });
    m.querySelector("#giftForm").onsubmit = (e) => {
      e.preventDefault();
      const datos = { p: p.id, de: $("#gDe").value.trim(), para: $("#gPara").value.trim(), msg: $("#gMsg").value.trim() };
      const cod = btoa(unescape(encodeURIComponent(JSON.stringify(datos)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      const link = `${CONFIG.sitio}/regalo#${cod}`;
      $("#gOut").innerHTML = `<div class="gift-link"><input readonly value="${esc(link)}" aria-label="Link de regalo"><button type="button" class="btn btn-ghost btn-sm" id="gCopy">Copiar</button></div>
        <a class="btn btn-wa btn-block" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(`¡${datos.para}, tenés un regalo de ${datos.de}! 🎁✈ Abrilo acá: ${link}`)}">Mandárselo por WhatsApp</a>
        <a class="btn btn-ghost btn-block" target="_blank" rel="noopener" href="${waLink(`¡Hola! Quiero regalar ${p.name} a ${datos.para}. Link del regalo: ${link}`)}">Coordinar el pago con la tienda</a>`;
      $("#gCopy").onclick = async () => { try { await navigator.clipboard.writeText(link); $("#gCopy").textContent = "Copiado ✓"; } catch { m.querySelector(".gift-link input").select(); } };
    };
    $("#gDe").focus();
  }

  // ---------- Opiniones y preguntas del producto ----------
  const fechaLarga = (d) => new Date(d).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
  async function cargarSocial(p) {
    $("#pvResenas").innerHTML = '<p class="muted">Cargando…</p>'; $("#pvPreguntas").innerHTML = "";
    $("#qMsg").textContent = ""; $("#pvQForm").reset();
    try {
      const [r, q] = await Promise.all([fetch(`/api/resenas?producto=${p.id}`).then((x) => x.json()), fetch(`/api/preguntas?producto=${p.id}`).then((x) => x.json())]);
      if (current !== p) return;
      $("#pvResenas").innerHTML = r.resenas?.length
        ? `<div class="reviews">${r.resenas.map((x) => `<figure class="review"><div class="stars">${estrellas(x.estrellas)}</div>${x.texto ? `<blockquote>${esc(x.texto)}</blockquote>` : ""}<figcaption>${esc(x.nombre)} · <span class="verif">✔ Compra verificada</span> · ${fechaLarga(x.fecha)}</figcaption></figure>`).join("")}</div>`
        : '<p class="muted">Todavía no hay opiniones. Las dejan clientes que compraron este producto.</p>';
      $("#pvPreguntas").innerHTML = q.preguntas?.length
        ? `<dl class="qa">${q.preguntas.map((x) => `<dt>${esc(x.pregunta)}</dt><dd>${esc(x.respuesta)}</dd>`).join("")}</dl>` : "";
    } catch { $("#pvResenas").innerHTML = '<p class="muted">Todavía no hay opiniones.</p>'; }
  }
  $("#pvQForm").onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button"); btn.disabled = true;
    try {
      const r = await fetch("/api/preguntas", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ producto: current.id, pregunta: $("#qTxt").value, nombre: $("#qNom").value, contacto: $("#qCon").value, web: $("#qWeb").value }) });
      const d = await r.json();
      $("#qMsg").textContent = r.ok ? "¡Gracias! Te respondemos pronto y la respuesta se publica acá." : d.mensaje || "No se pudo enviar.";
      if (r.ok) $("#pvQForm").reset();
    } catch { $("#qMsg").textContent = "No se pudo enviar. Probá de nuevo."; }
    btn.disabled = false;
  };

  // ---------- Opiniones en la portada ----------
  fetch("/api/resenas").then((r) => r.json()).then((d) => {
    if (!d.resenas?.length) return;
    $("#opiniones").hidden = false;
    $("#opinionesGrid").innerHTML = d.resenas.map((x) => `<figure class="review"><div class="stars">${estrellas(x.estrellas)}</div><blockquote>${esc(x.texto)}</blockquote>
      <figcaption>${esc(x.nombre)} · <span class="verif">✔ Compra verificada</span>${x.productoNombre ? ` · <a href="/producto/${esc(x.producto)}">${esc(x.productoNombre)}</a>` : ""}</figcaption></figure>`).join("");
  }).catch(() => {});

  // ---------- Vitrina de la portada ----------
  let vi = 0, vTimer;
  function renderShowcase() {
    const dest = visibles.filter((p) => p.destacado).sort((a, b) => a.destacado - b.destacado);
    const lista = (dest.length >= 2 ? dest : visibles.filter((p) => p.top || p.nuevo)).slice(0, 5);
    if (!lista.length) { $("#showcase").hidden = true; return; }
    $("#showcase").innerHTML = `
      <div class="sc-stage">${lista.map((p, i) => `
        <a class="sc-slide" href="/producto/${p.id}" data-view="${p.id}" data-i="${i}" aria-label="${esc(p.name)}">
          <div class="sc-img">${art(p, true)}</div>
          <div class="sc-info">
            <span class="sc-brand">${esc(p.brand || p.cat)}</span>
            <b class="sc-name">${esc(p.name)}</b>
            ${priceHTML(p)}
            <span class="sc-cta">Ver producto →</span>
          </div>
        </a>`).join("")}</div>
      <div class="sc-thumbs">${lista.map((p, i) => `<button class="sc-thumb" data-sc="${i}" aria-label="Ver ${esc(p.name)}">${art(p)}</button>`).join("")}</div>`;
    showSlide(vi % lista.length);
    clearInterval(vTimer);
    if (!reduceMotion && lista.length > 1) vTimer = setInterval(() => showSlide((vi + 1) % lista.length), 4500);
  }
  function showSlide(i) {
    vi = i;
    document.querySelectorAll(".sc-slide").forEach((s) => s.classList.toggle("on", +s.dataset.i === i));
    document.querySelectorAll(".sc-thumb").forEach((t) => t.setAttribute("aria-current", +t.dataset.sc === i));
  }
  $("#showcase").addEventListener("click", (e) => {
    const t = e.target.closest("[data-sc]"); if (!t) return;
    showSlide(+t.dataset.sc); renderShowcaseTimer();
  });
  const renderShowcaseTimer = () => { clearInterval(vTimer); const n = document.querySelectorAll(".sc-slide").length; if (!reduceMotion && n > 1) vTimer = setInterval(() => showSlide((vi + 1) % n), 4500); };

  // ---------- Arranque ----------
  const rerender = () => { renderShowcase(); renderRows(); render(); renderKits(); if (current) openView(current.id, false); };
  document.addEventListener("tdv:precios", rerender);
  document.addEventListener("tdv:favs", () => { if (state.f === "Favoritos") render(); syncFav(); });
  rerender();
  const m = location.pathname.match(/^\/producto\/([\w-]+)/);
  if (m) openView(m[1], false);
  else if (!ruta(location.pathname, false) && state.q) $("#catalogo").scrollIntoView();
})();
