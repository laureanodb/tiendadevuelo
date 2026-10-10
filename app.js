// Portada: destacados, banners, catálogo, kits armables, altímetro y ficha de producto.
(() => {
  const { $, esc, ars, byId, pesos, priceHTML, art, card, waLink, add, toast, isFav, toggleFav } = window.TDV;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const visibles = PRODUCTS.filter((p) => !p.agotado);

  // ---------- Destacados, tripulantes, regalos ----------
  const renderRows = () => {
    $("#destacados").innerHTML = visibles.filter((p) => p.destacado).sort((a, b) => a.destacado - b.destacado).slice(0, 4).map(card).join("");
    $("#tcpGrid").innerHTML = visibles.filter((p) => p.tcp).slice(0, 4).map(card).join("");
    $("#regalosGrid").innerHTML = visibles.filter((p) => p.regalo).slice(0, 4).map(card).join("");
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
  const catEmoji = { "Comunicaciones": "🎧", "Navegación": "🧭", "Aviónica": "🛰️", "Uniforme": "🪽", "Accesorios": "🎒", "Libros y regalos": "📚" };
  $("#cats").innerHTML = CATEGORIES.map((c) => `<button class="cat-card" data-goto="${c}"><span>${catEmoji[c] || "✈"}</span>${c}</button>`).join("");

  // ---------- Catálogo ----------
  const state = { f: "Todos", q: new URLSearchParams(location.search).get("q") || "", sort: "destacados" };
  const FILTROS = ["Todos", "Más vendidos", "Nuevo ingreso", "Por encargo", "Favoritos", ...CATEGORIES];
  const chips = $("#chips");
  chips.innerHTML = FILTROS.map((f) => `<button class="chip" role="tab" data-f="${f}">${f === "Favoritos" ? "♥ Favoritos" : f}</button>`).join("");
  chips.addEventListener("click", (e) => { const b = e.target.closest("[data-f]"); if (b) { state.f = b.dataset.f; render(); } });
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  $("#search").value = state.q;

  function render() {
    chips.querySelectorAll(".chip").forEach((c) => { const on = c.dataset.f === state.f; c.classList.toggle("on", on); c.setAttribute("aria-selected", on); });
    const q = norm(state.q);
    const pass = {
      "Todos": () => true, "Más vendidos": (p) => p.top, "Nuevo ingreso": (p) => p.nuevo, "Por encargo": (p) => p.encargo, "Favoritos": (p) => isFav(p.id),
    };
    let list = visibles.filter((p) => (pass[state.f] ? pass[state.f](p) : p.cat === state.f) &&
      (!q || norm([p.name, p.brand, p.model, p.desc, p.cat].join(" ")).includes(q)));
    const precio = (p) => pesos(p) ?? Infinity;
    const sorters = {
      destacados: (a, b) => (a.destacado || (a.top ? 50 : 99)) - (b.destacado || (b.top ? 50 : 99)),
      "precio-asc": (a, b) => precio(a) - precio(b),
      "precio-desc": (a, b) => (pesos(b) ?? -1) - (pesos(a) ?? -1),
      nombre: (a, b) => a.name.localeCompare(b.name, "es"),
    };
    list.sort(sorters[state.sort]);
    $("#grid").innerHTML = list.map(card).join("");
    $("#empty").hidden = list.length > 0;
    $("#empty").innerHTML = state.f === "Favoritos" && !state.q
      ? "Todavía no guardaste favoritos. Tocá el ♡ de cualquier producto."
      : `No encontramos nada con esa búsqueda. <a href="/contacto#pedido">Pedinos el producto</a> y lo conseguimos.`;
  }
  $("#search").addEventListener("input", (e) => { state.q = e.target.value; render(); });
  $("#sort").addEventListener("change", (e) => { state.sort = e.target.value; render(); });
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-goto]");
    if (!b) return;
    state.f = b.dataset.goto; render();
    $("#catalogo").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  });
  window.TDV_SEARCH = (q) => { state.q = q; state.f = "Todos"; $("#search").value = q; render(); closeView(); $("#catalogo").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" }); };

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
  $("#brands").innerHTML = marcas.map((m) => `<button class="brand-chip" data-brand="${esc(m)}">${esc(m)}</button>`).join("");
  $("#brands").addEventListener("click", (e) => { const b = e.target.closest("[data-brand]"); if (b) window.TDV_SEARCH(b.dataset.brand); });

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
      ? `<div class="zoom" id="pvZoom"><img id="pvMain" src="${esc(fotos[0])}" alt="${esc(p.name)}"></div>
         <div class="thumbs">${fotos.map((f, i) => `<button data-foto="${esc(f)}" aria-label="Foto ${i + 1}"><img src="${esc(f)}" alt=""></button>`).join("")}</div>`
      : art(p, true);
    $("#pvBrand").textContent = [p.brand, p.model].filter(Boolean).join(" · ") || p.cat;
    $("#pvTitle").textContent = p.name;
    $("#pvTags").innerHTML = [
      '<span class="seal seal-sm">✈ Recomendado por pilotos</span>',
      p.encargo && '<span class="tag tag-order">Por encargo · 15 a 30 días</span>',
      p.reacond && '<span class="tag">Reacondicionado</span>',
      p.nuevo && '<span class="tag tag-new">Nuevo ingreso</span>',
    ].filter(Boolean).join("");
    $("#pvPrice").innerHTML = priceHTML(p, true) + (p.usd ? '<p class="muted small">Precio en dólares. El equivalente en pesos es al dólar oficial del día.</p>' : "");
    $("#pvDesc").textContent = p.desc;
    $("#pvSpecs").innerHTML = p.specs.map((s) => `<li>${esc(s)}</li>`).join("");
    $("#pvEtapas").innerHTML = p.etapas?.length ? `<span class="muted small">Ideal para:</span> ${p.etapas.map((e) => `<span class="tag">${ETAPAS[e]}</span>`).join("")}` : "";
    $("#pvVariantWrap").hidden = !p.variantes;
    $("#pvVariant").innerHTML = (p.variantes || []).map((v) => `<option>${esc(v)}</option>`).join("");
    const conPrecio = p.usd || p.ars;
    $("#pvAdd").hidden = !conPrecio;
    $("#pvAsk").href = waLink(`¡Hola! Quiero consultar por ${p.name}${p.brand ? ` (${p.brand})` : ""}: ${CONFIG.sitio}/producto/${p.id}`);
    $("#pvAsk").textContent = conPrecio ? "Consultar por WhatsApp" : "Consultar precio por WhatsApp";
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
    if (push) history.pushState({}, "", "/");
    window.scrollTo(0, lastScroll);
  }
  const syncFav = () => { if (current) $("#pvFav").textContent = isFav(current.id) ? "♥ En favoritos" : "♡ Guardar en favoritos"; };
  $("#pvFav").onclick = () => { toggleFav(current.id); };
  $("#pvBack").onclick = () => (history.state && history.length > 1 ? history.back() : closeView());
  $("#pvAdd").onclick = () => add({ id: current.id, variante: current.variantes ? $("#pvVariant").value : "" }, current.name);
  $("#pvGallery").addEventListener("click", (e) => { const t = e.target.closest("[data-foto]"); if (t) $("#pvMain").src = t.dataset.foto; });
  $("#pvGallery").addEventListener("mousemove", (e) => {
    const z = e.target.closest("#pvZoom"); if (!z) return;
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
    m ? openView(m[1], false) : closeView(false);
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !view.hidden) closeView(); });

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
  if (state.q) $("#catalogo").scrollIntoView();
})();
