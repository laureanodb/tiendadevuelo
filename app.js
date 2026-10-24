// Portada: vitrina, destacados, banners, catálogo con filtros, páginas de categoría y marca, kits armables y ficha de producto.
(() => {
  const { $, esc, ars, byId, pesos, priceHTML, art, card, waLink, add, toast, isFav, toggleFav, enOferta, slug, catEmoji, setWa, opciones, conOpcion, estrellas, fechaCorta, toggleComparar } = window.TDV;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const visibles = PRODUCTS.filter((p) => !p.agotado);

  // ---------- Destacados, tripulantes, regalos ----------
  const renderRows = () => {
    const dest = visibles.filter((p) => p.destacado).sort((a, b) => a.destacado - b.destacado).slice(0, 4);
    $("#destacados").innerHTML = dest.map(card).join("");
    // Cada producto aparece una sola vez en la portada
    const ya = new Set(dest.map((p) => p.id));
    const tcp = visibles.filter((p) => p.tcp && !ya.has(p.id)).slice(0, 4);
    tcp.forEach((p) => ya.add(p.id));
    const regalos = visibles.filter((p) => p.regalo && !ya.has(p.id));
    $("#tripulantes").hidden = !tcp.length; $("#regalos").hidden = !regalos.length;
    $("#tcpGrid").innerHTML = tcp.map(card).join("");
    $("#regalosGrid").innerHTML = regalos.slice(0, 4).map(card).join("");
    $("#kits").hidden = !KITS.length;
    $("#kitsGrid").style.setProperty("--n", Math.min(Math.max(KITS.length, 1), 4));
    $("#kitsGrid").style.setProperty("--n3", Math.min(Math.max(KITS.length, 1), 3));
    document.querySelectorAll('a[href="#kits"]').forEach((a) => (a.hidden = !KITS.length));
    const usados = visibles.filter((p) => p.reacond);
    $("#usados").hidden = !usados.length;
    $("#usadosGrid").innerHTML = usados.slice(0, 4).map(card).join("");
  };

  // ---------- Banners que rotan ----------
  const BAN = BANNERS.filter((b) => KITS.length || !String(b.href).includes("#kits"));
  $("#banners").innerHTML = `<div class="banner-track" id="bannerTrack">${BAN.map((b, i) => `
    <a class="banner b${i % 3}${b.img ? " banner-con-foto" : ""}" href="${b.href}">
      ${b.img ? `<img class="banner-img" src="${esc(b.img)}" alt="" loading="lazy">` : ""}
      <span class="kicker">${esc(b.kicker)}</span><h3>${esc(b.title)}</h3><p>${esc(b.text)}</p><span class="banner-cta">${esc(b.cta)} →</span>
    </a>`).join("")}</div>
    <div class="dots" role="tablist" aria-label="Banners">${BAN.map((_, i) => `<button role="tab" aria-label="Banner ${i + 1}" data-dot="${i}"></button>`).join("")}</div>`;
  let bi = 0, bTimer;
  const showBanner = (i) => {
    bi = (i + BAN.length) % BAN.length;
    $("#bannerTrack").style.transform = `translateX(-${bi * 100}%)`;
    document.querySelectorAll("[data-dot]").forEach((d, k) => d.setAttribute("aria-selected", k === bi));
  };
  const autoBanner = () => { clearInterval(bTimer); if (!reduceMotion) bTimer = setInterval(() => showBanner(bi + 1), 5500); };
  document.querySelectorAll("[data-dot]").forEach((d) => (d.onclick = () => { showBanner(+d.dataset.dot); autoBanner(); }));
  showBanner(0); autoBanner();

  // ---------- Categorías ----------
  const tiles = CATEGORIES.filter((c) => visibles.some((p) => p.cat === c)).map((c) => ({ href: `/categoria/${slug(c)}`, e: catEmoji[c] || "✈", t: c }));
  const extras = [
    visibles.some((p) => p.brand === "Garmin") && { href: "/marca/garmin", e: "📟", t: "Aviónica Garmin" },
    KITS.length && { href: "#kits", e: "🧰", t: "Kits con descuento" },
    visibles.some((p) => p.tcp) && { href: "#tripulantes", e: "🧑‍✈️", t: "Tripulantes" },
    { href: "/aviones", e: "✈️", t: "Equipos por avión" },
    { href: "/comparativas", e: "⚖️", t: "Comparativas" },
  ].filter(Boolean);
  while (tiles.length % 4 && extras.length) tiles.push(extras.shift());
  $("#cats").innerHTML = tiles.map((x) => `<a class="cat-card" href="${x.href}"${x.href.startsWith("/categoria/") ? " data-ruta" : ""}><span aria-hidden="true">${x.e}</span>${esc(x.t)}</a>`).join("");

  // ---------- Capturas de mensajes de clientes (con su permiso) ----------
  if (CONFIG.testimonios?.length) {
    $("#capturas").hidden = false;
    $("#capturasGrid").innerHTML = CONFIG.testimonios.map((t) => `<a class="captura" href="${esc(t.url)}" target="_blank" rel="noopener"><img src="${esc(t.url)}" alt="Mensaje de ${esc(t.nombre || "un cliente")} por WhatsApp" loading="lazy"><span>${esc(t.nombre || "")}</span></a>`).join("");
  }

  // ---------- Catálogo ----------
  const state = { f: "Todos", q: new URLSearchParams(location.search).get("q") || "", sort: "destacados", brand: "", min: "", max: "", vista: "grid" };
  try { state.vista = localStorage.getItem("tdv-vista") || "grid"; } catch {}
  const hace30 = Date.now() - 30 * 864e5;
  const esNovedad = (p) => p.nuevo || (p.creado && new Date(p.creado).getTime() > hace30);
  const FILTROS = ["Todos", ...(visibles.some(enOferta) ? ["Ofertas"] : []), ...(visibles.some(esNovedad) ? ["Novedades del mes"] : []), ...(visibles.some((p) => p.top) ? ["Más vendidos"] : []), ...(visibles.some((p) => p.reacond) ? ["Usados y reacondicionados"] : []), ...(visibles.some((p) => p.liquidacion) ? ["Liquidación"] : []), ...(visibles.some((p) => p.encargo) ? ["Por encargo"] : []), "Favoritos", ...CATEGORIES.filter((c) => visibles.some((p) => p.cat === c))];
  const marcasTodas = [...new Set(visibles.map((p) => p.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
  // Franja de marcas: primero las que somos distribuidor oficial
  const oficiales = new Set(visibles.filter((p) => p.oficial).map((p) => p.brand));
  const marcasOrden = [...marcasTodas].sort((a, b) => (oficiales.has(b) ? 1 : 0) - (oficiales.has(a) ? 1 : 0));
  $("#marcas").innerHTML = marcasOrden.map((m) => `<a class="marca${oficiales.has(m) ? " oficial" : ""}" href="/marca/${slug(m)}"><b>${esc(m)}</b>${oficiales.has(m) ? "<small>✔ Distribuidor oficial</small>" : ""}</a>`).join("");
  $("#marcasSec").hidden = marcasTodas.length < 3;
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
      "Usados y reacondicionados": (p) => p.reacond, "Liquidación": (p) => p.liquidacion, "Por encargo": (p) => p.encargo, "Favoritos": (p) => isFav(p.id),
    };
    const min = Number(state.min) || 0, max = Number(state.max) || Infinity;
    let list = visibles.filter((p) => (pass[state.f] ? pass[state.f](p) : p.cat === state.f) &&
      (!state.brand || p.brand === state.brand) &&
      (!state.min && !state.max || (pesos(p) !== null && pesos(p) >= min && pesos(p) <= max)) &&
      (!q || TDV.coincide(p, state.q)));
    const precio = (p) => pesos(p) ?? Infinity;
    const sorters = {
      destacados: (a, b) => (a.destacado || (a.top ? 50 : 99)) - (b.destacado || (b.top ? 50 : 99)),
      "precio-asc": (a, b) => precio(a) - precio(b),
      "precio-desc": (a, b) => (pesos(b) ?? -1) - (pesos(a) ?? -1),
      nombre: (a, b) => a.name.localeCompare(b.name, "es"),
    };
    list.sort(sorters[state.sort]);
    // En la portada sin filtros se muestran 8 (sin repetir los destacados) y un botón para ver todos
    const portada = !state.todos && state.f === "Todos" && !state.brand && !q && !state.min && !state.max;
    let mostrar = list;
    if (portada) {
      const dest = new Set(visibles.filter((p) => p.destacado).sort((a, b) => a.destacado - b.destacado).slice(0, 4).map((p) => p.id));
      mostrar = list.filter((p) => !dest.has(p.id)).slice(0, 8);
    }
    $("#grid").innerHTML = mostrar.map(card).join("");
    $("#verTodos").hidden = !portada || mostrar.length >= list.length;
    $("#verTodos").textContent = `Ver los ${list.length} productos`;
    $("#grid").classList.toggle("as-list", state.vista === "list");
    $("#vGrid").setAttribute("aria-pressed", state.vista === "grid"); $("#vList").setAttribute("aria-pressed", state.vista === "list");
    $("#empty").hidden = list.length > 0;
    const fs = $("#favShare");
    fs.hidden = !(state.f === "Favoritos" && list.length);
    if (!fs.hidden && !fs.dataset.listo) {
      fs.dataset.listo = "1";
      fs.innerHTML = `<div><b>Compartí tu lista de deseos</b><span class="muted small">Ideal para que tu familia sepa qué regalarte.</span></div>
        <form id="favForm"><input id="favNom" maxlength="40" placeholder="Tu nombre" aria-label="Tu nombre" required value="${esc(TDV.store.get("tdv-datos", {}).nombre?.split(" ")[0] || "")}"><button class="btn btn-primary btn-sm">Compartir</button></form>`;
      $("#favForm").onsubmit = async (e) => {
        e.preventDefault();
        const url = `${CONFIG.sitio}/lista#${TDV.b64({ n: $("#favNom").value.trim(), i: TDV.favs.filter((id) => byId[id]) })}`, texto = "Esta es mi lista de deseos de Tienda de Vuelo ✈";
        if (navigator.share) { try { await navigator.share({ title: "Mi lista de deseos", text: texto, url }); return; } catch (x) { if (x.name === "AbortError") return; } }
        try { await navigator.clipboard.writeText(url); toast("Link copiado. Mandáselo a quien quieras."); } catch { window.open(`https://wa.me/?text=${encodeURIComponent(texto + " " + url)}`, "_blank", "noopener"); }
      };
    }
    $("#empty").innerHTML = state.f === "Favoritos" && !state.q
      ? "Todavía no guardaste favoritos. Tocá el ♡ de cualquier producto."
      : `No encontramos nada con esa búsqueda. <a href="/contacto#pedido">Pedinos el producto</a> y lo conseguimos.`;
  }
  $("#search").addEventListener("input", (e) => { state.q = e.target.value; render(); });
  $("#verTodos").onclick = () => { state.todos = true; render(); };
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
    else if (m) { const b = marcasTodas.find((x) => slug(x) === m[2]); if (b) { brand = b; kicker = MARCAS[b]?.oficial ? "Distribuidor oficial" : "Marca"; title = b; text = MARCAS[b]?.texto || `Productos ${b} originales para pilotos, con envío a todo el país.`; pageTitle = `${b} en Argentina`; } }
    else if (path === "/ofertas") { f = "Ofertas"; kicker = "Ofertas"; title = "Ofertas del momento"; text = "Precios rebajados por tiempo limitado."; pageTitle = "Ofertas"; }
    else if (path === "/liquidacion") { f = "Liquidación"; kicker = "Liquidación"; title = "Liquidación"; text = "Saldos y últimas unidades a precio de liquidación, hasta agotar stock."; pageTitle = "Liquidación"; }
    else if (path === "/usados") { f = "Usados y reacondicionados"; kicker = "Usados"; title = "Usados y reacondicionados"; text = "Equipos revisados y probados, a mejor precio."; pageTitle = "Usados y reacondicionados"; }
    else if (path === "/novedades") { f = "Novedades del mes"; kicker = "Novedades"; title = "Novedades del mes"; text = "Lo último que llegó a la tienda."; pageTitle = "Novedades"; }
    else return false;
    Object.assign(state, { f, brand, q: "", min: "", max: "" });
    $("#search").value = ""; $("#brand").value = brand; $("#pMin").value = ""; $("#pMax").value = "";
    $("#catKicker").textContent = kicker; $("#catTitle").textContent = title;
    $("#catText").textContent = text; $("#catText").hidden = !text;
    // Página de marca: sello oficial y preguntas frecuentes
    const info = brand && MARCAS[brand];
    $("#catMarca").hidden = !(info && (info.oficial || info.faqs?.length));
    $("#catMarca").innerHTML = info ? `${info.oficial ? `<p class="marca-sello">✔ Somos distribuidores oficiales de ${esc(brand)} en Argentina · Garantía oficial</p>` : ""}${info.faqs?.length ? `<div class="faq">${info.faqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</div>` : ""}` : "";
    document.title = `${pageTitle} · Tienda de Vuelo`;
    if (text) metaDesc.content = text;
    if (push) history.pushState({ ruta: path }, "", path);
    closeView(false); render();
    $("#catalogo").scrollIntoView({ behavior: push && !reduceMotion ? "smooth" : "auto" });
    return true;
  }
  const rutaBase = () => { $("#catKicker").textContent = baseHead.kicker; $("#catTitle").textContent = baseHead.title; $("#catText").hidden = true; $("#catMarca").hidden = true; metaDesc.content = baseDesc; };
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href^='/categoria/'], a[href^='/marca/'], a[href='/ofertas'], a[href='/usados'], a[href='/novedades'], a[href='/liquidacion']");
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
      const sinPrecio = sel.some((id) => pesos(byId[id]) === null);
      return `<article class="kit${k.highlight ? " kit-hl" : ""}">
        ${k.highlight ? '<span class="badge">El más elegido</span>' : ""}
        <div class="kit-emoji">${k.emoji}</div>
        <h3>${esc(k.name)}</h3>
        <p class="muted">${esc(k.tagline)}</p>
        <ul>${k.items.map((id) => `<li><label><input type="checkbox" data-kit="${k.id}" data-item="${id}" ${kitSel[k.id].has(id) ? "checked" : ""}> ${esc(byId[id].name)}</label></li>`).join("")}</ul>
        <div class="kit-price"><b>${!sel.length ? "—" : sinPrecio ? "Consultá el precio" : ars(price)}</b><span class="muted small">con ${Math.round(k.off * 100)}% off</span></div>
        ${sinPrecio && sel.length >= 2
          ? `<a class="btn btn-primary btn-block" target="_blank" rel="noopener" href="${waLink(`¡Hola! Quiero el ${k.name} con ${Math.round(k.off * 100)}% off: ${sel.map((id) => byId[id].name).join(", ")}. ¿Cuánto sale?`)}">Pedir precio del kit</a>`
          : `<button class="btn btn-primary btn-block" data-addkit="${k.id}" ${sel.length < 2 ? "disabled" : ""}>${sel.length < 2 ? "Elegí al menos 2" : "Agregar kit"}</button>`}
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


  // ---------- Ficha de producto (/producto/id) ----------
  const view = $("#pview");
  let current = null, lastScroll = 0;
  const baseTitle = document.title;
  function openView(id, push = true) {
    const p = byId[id];
    if (!p) return;
    current = p;
    TDV.medir("ViewContent", { content_ids: [p.id], content_type: "product", content_name: p.name });
    if (view.hidden) lastScroll = scrollY;
    const fotos = p.fotos && p.fotos.length ? p.fotos : null;
    $("#pvGallery").innerHTML = fotos
      ? `<div class="swipe" id="pvSwipe" tabindex="0" role="group" aria-label="Fotos del producto (deslizá para ver más)">${fotos.map((f, i) => `<div class="zoom"><img src="${esc(f)}" alt="${esc(p.name)} (foto ${i + 1})" ${i ? 'loading="lazy"' : ""}></div>`).join("")}</div>
         ${fotos.length > 1 ? `<div class="thumbs">${fotos.map((f, i) => `<button data-foto="${i}" aria-label="Foto ${i + 1}"${i ? "" : ' aria-current="true"'}><img src="${esc(f)}" alt=""></button>`).join("")}</div>` : ""}`
      : art(p, true);
    $("#pvBrand").textContent = [p.brand, p.model].filter(Boolean).join(" · ") || p.cat;
    $("#pvTitle").textContent = p.name;
    $("#pvTags").innerHTML = [
      !p.oficial && '<span class="seal seal-sm">✈ Recomendado por pilotos</span>',
      p.encargo && '<span class="tag tag-order">Por encargo · 15 a 30 días</span>',
      p.reacond && '<span class="tag">Reacondicionado</span>',
      p.nuevo && '<span class="tag tag-new">Nuevo ingreso</span>',
      p.ultimas && '<span class="tag tag-order">Últimas unidades</span>',
      p.oficial && '<span class="tag tag-oficial">✔ Distribuidor oficial</span>',
      p.llega && `<span class="tag tag-order">Preventa · llega el ${fechaCorta(p.llega)}</span>`,
      enOferta(p) && `<span class="tag tag-sale">Oferta${p.ofertaHasta ? " hasta el " + p.ofertaHasta.split("-").reverse().slice(0, 2).join("/") : ""}</span>`,
    ].filter(Boolean).join("");
    $("#pvDesc").textContent = p.desc;
    // "Atenuación: 24 dB" va a la tabla técnica; lo demás, a la lista
    const { tabla, sueltas } = TDV.fichaTecnica(p);
    $("#pvSpecs").innerHTML = (tabla.length ? `<table class="spec-table"><tbody>${tabla.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</tbody></table>` : "") +
      (sueltas.length ? `<ul class="specs">${sueltas.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>` : "");
    $("#pvFaqsWrap").hidden = !p.faqs?.length;
    $("#pvFaqs").innerHTML = (p.faqs || []).map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("");
    $("#pvEtapas").innerHTML = p.etapas?.length ? `<span class="muted small">Ideal para:</span> ${p.etapas.map((e) => `<span class="tag">${ETAPAS[e]}</span>`).join("")}` : "";
    $("#pvVariantWrap").hidden = !p.variantes;
    const ops = opciones(p);
    $("#pvVariant").innerHTML = ops.map((o) => `<option value="${esc(o.nombre)}">${esc(o.nombre)}${o.precio !== null && o.precio !== (p.usd || p.ars) ? ` — ${p.usd ? "US$ " + o.precio.toLocaleString("es-AR") : ars(o.precio)}` : ""}</option>`).join("");
    const precioOpcion = () => {
      const pp = p.variantes ? conOpcion(p, $("#pvVariant").value) : p;
      $("#pvPrice").hidden = !(pp.usd || pp.ars);
      $("#pvPrice").innerHTML = priceHTML(pp, true) + (p.usd ? `<p class="muted small">Precio en dólares. El equivalente en pesos es al dólar del día: ${ars(TDV.dolar)}.</p>` : "");
      $("#pvStickPrice").innerHTML = pp.usd ? `US$ ${pp.usd.toLocaleString("es-AR")}` : pp.ars ? ars(pp.ars) : "Consultar precio";
      const o = ops.find((x) => x.nombre === $("#pvVariant").value);
      const sw = $("#pvSwipe");
      if (o && o.foto !== null && sw) sw.scrollTo({ left: sw.clientWidth * o.foto, behavior: reduceMotion ? "auto" : "smooth" });
    };
    const conPrecio = p.usd || p.ars;
    $("#pvAdd").hidden = !conPrecio;
    $("#pvPedir").hidden = !!conPrecio;
    $("#pvPedir").onclick = () => TDV.pedirPrecio(p, p.variantes ? $("#pvVariant").value : "");
    // Si las opciones son fichas, el selector explica cuál usa cada tipo de avión
    const FICHAS = { dual: "La de los aviones de escuela y de aviación general (Cessna, Piper, Tecnam, Diamond): dos fichas separadas.", lemo: "Ficha redonda de 6 pines en el panel: además alimenta el auricular desde el avión, sin pilas.", xlr: "Ficha redonda de 5 pines, la de los aviones de línea Airbus.", "u-174": "La de los helicópteros." };
    const claveFicha = (v) => Object.keys(FICHAS).find((k) => String(v).toLowerCase().includes(k));
    const sonFichas = !!p.variantes && p.variantes.filter(claveFicha).length > 1;
    $("#pvVariantLbl").textContent = sonFichas ? "Ficha según tu avión" : "Opción";
    const ayudaFicha = () => {
      const k = sonFichas && claveFicha($("#pvVariant").value);
      $("#pvVarAyuda").hidden = !sonFichas;
      if (sonFichas) $("#pvVarAyuda").innerHTML = `${k ? esc(FICHAS[k]) + " " : ""}<a href="/aviones">¿Qué ficha usa tu avión?</a>`;
    };
    const consulta = `¡Hola! Quiero consultar por ${p.name}${p.brand ? ` (${p.brand})` : ""}: ${CONFIG.sitio}/producto/${p.id}`;
    $("#pvAsk").href = waLink(consulta);
    $("#pvAsk").hidden = !conPrecio;
    const loQuiero = () => {
      const op = p.variantes ? $("#pvVariant").value : "";
      const pp = op ? conOpcion(p, op) : p;
      const precio = pp.usd ? `US$ ${pp.usd.toLocaleString("es-AR")}` : pp.ars ? ars(pp.ars) : "";
      $("#pvWant").href = waLink(`¡Hola! ${p.llega ? "Quiero reservar (preventa)" : "Lo quiero"}: ${p.name}${p.brand ? ` (${p.brand}${p.model ? " " + p.model : ""})` : ""}${op ? `\nOpción: ${op}` : ""}${precio ? `\nPrecio: ${precio}` : ""}\n${CONFIG.sitio}/producto/${p.id}`);
    };
    $("#pvVariant").onchange = () => { loQuiero(); precioOpcion(); ayudaFicha(); }; loQuiero(); precioOpcion(); ayudaFicha();
    $("#pvAdd").textContent = p.llega ? "Reservar (preventa)" : "Agregar al carrito";
    $("#pvRating").hidden = !p.rating;
    if (p.rating) $("#pvRating").innerHTML = `<span class="stars">${estrellas(p.rating)}</span> ${p.rating} · ${p.resenas} ${p.resenas === 1 ? "opinión" : "opiniones"}`;
    $("#pvCmp").textContent = TDV_cmpTxt(p.id);
    $("#pvDocs").hidden = !(p.docs && p.docs.length);
    $("#pvDocs").innerHTML = (p.docs || []).map((d) => `<a class="doc" href="${esc(d.url)}" target="_blank" rel="noopener">📄 ${esc(d.nombre)}</a>`).join("");
    $("#pvAlq").hidden = !p.alquiler;
    $("#pvExtra").innerHTML = [
      p.reacond && "♻️ <b>Usado o reacondicionado:</b> revisado y probado. Tiene la garantía legal de 3 meses.",
      p.digital && "📩 <b>Producto digital:</b> lo recibís por WhatsApp o mail cuando se acredita el pago. No lleva envío.",
      !p.digital && "🎁 Cada pedido va con un regalito de la tienda.",
      p.regalo && CONFIG.porCantidad && `🔑 <b>Llevá ${CONFIG.porCantidad.min} o más</b> llaveros o regalos y tenés ${Math.round(CONFIG.porCantidad.off * 100)}% de descuento en ellos.`,
      `💬 ¿Lo viste más barato en otra tienda? <a href="${waLink(`¡Hola! Vi el ${p.name} más barato en otro lado. ¿Lo pueden revisar?`)}" target="_blank" rel="noopener">Escribinos y lo revisamos</a>.`,
    ].filter(Boolean).map((x) => `<li>${x}</li>`).join("");
    if (p.alquiler) $("#pvAlq").innerHTML = `También lo alquilamos: <b>${p.alquilerMoneda === "USD" ? "US$ " + p.alquiler : ars(p.alquiler)} por semana</b>, con depósito en garantía. <a href="/alquiler">Ver alquileres</a>`;
    cargarSocial(p);
    $("#pvWant").dataset.quiero = p.id; $("#pvAsk").dataset.consulta = p.id;
    $("#pvWant").textContent = conPrecio ? "Lo quiero por WhatsApp" : "Consultar por WhatsApp";
    $("#pvWant").classList.toggle("btn-ghost-wa", !conPrecio);
    // Barra fija abajo en el celular con el precio y el botón
    $("#pvStickName").textContent = p.name;
    $("#pvStickBtn").textContent = conPrecio ? (p.llega ? "Reservar" : "Agregar") : "📩 Pedime el precio";
    $("#pvStickBtn").onclick = () => (conPrecio ? $("#pvAdd") : $("#pvPedir")).click();
    setWa(consulta);
    const yt = (p.video || "").match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{11})/);
    $("#pvVideo").hidden = !p.video;
    $("#pvVideo").innerHTML = yt
      ? `<div class="video-wrap"><iframe src="https://www.youtube-nocookie.com/embed/${yt[1]}" title="Video de ${esc(p.name)}" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`
      : p.video ? `<a class="btn btn-ghost" href="${esc(p.video)}" target="_blank" rel="noopener">▶ Ver video del producto</a>` : "";
    $("#pvShare").href = `https://wa.me/?text=${encodeURIComponent(`Mirá esto en Tienda de Vuelo: ${p.name} ${CONFIG.sitio}/producto/${p.id}`)}`;
    syncFav();
    // Se lleva junto con: primero lo que lo complementa (repuestos, adaptadores), después los kits y la misma etapa
    const compl = TDV.complementosDe(p, 4).map((x) => x.id);
    const enKits = KITS.filter((k) => k.items.includes(p.id)).flatMap((k) => k.items);
    const etapa = visibles.filter((x) => x.etapas?.some((e) => p.etapas?.includes(e)) && x.cat !== p.cat);
    const together = [...new Set([...compl, ...enKits, ...etapa.map((x) => x.id)])].filter((id) => id !== p.id && byId[id] && !byId[id].agotado).slice(0, 4);
    $("#pvJunto").hidden = !compl.length;
    $("#pvJuntoLista").innerHTML = compl.slice(0, 3).map((id) => { const x = byId[id]; return `<a class="pv-junto-item" href="/producto/${x.id}" data-view="${x.id}">${art(x)}<span><b>${esc(x.name)}</b>${x.nota ? `<small>${esc(x.nota)}</small>` : ""}</span><span class="pv-junto-ver" aria-hidden="true">›</span></a>`; }).join("");
    $("#pvInstala").href = `/avionica?equipo=${encodeURIComponent(p.id)}#presupuesto`;
    $("#pvInstala").hidden = !(p.cat === "Aviónica" || p.cat === "Seguridad y emergencia") || p.icon === "watch" || p.id === "garmin-aera-660";
    $("#pvTogether").innerHTML = together.map((id) => card(byId[id])).join("");
    $("#pvRelated").innerHTML = visibles.filter((x) => x.cat === p.cat && x.id !== p.id).slice(0, 4).map(card).join("");
    view.hidden = false;
    document.body.classList.add("viewing");
    document.title = `${p.name} · Tienda de Vuelo`;
    if (push) history.pushState({ id }, "", `/producto/${id}`);
    view.scrollTop = 0; window.scrollTo(0, 0);
  }
  function closeView(push = true) { $("#pvStick").hidden = true;
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
  // La barra fija aparece cuando los botones principales quedan fuera de la pantalla
  if ("IntersectionObserver" in window) new IntersectionObserver(([e]) => { $("#pvStick").hidden = $("#pview").hidden || e.isIntersecting || e.boundingClientRect.top > 0; }).observe(document.querySelector(".pv-actions"));
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
          <div class="sc-img">${art(p, true, i === 0)}</div>
          <div class="sc-info">
            <span class="sc-brand">${esc(p.brand || p.cat)}</span>
            <b class="sc-name">${esc(p.name)}</b>
            ${p.usd || p.ars ? priceHTML(p) : p.nota ? `<span class="sc-nota">${esc(p.nota)}</span>` : ""}
            <span class="sc-cta">Ver producto →</span>
          </div>
        </a>`).join("")}</div>
      <div class="sc-thumbs">${lista.map((p, i) => `<button class="sc-thumb" data-sc="${i}" aria-label="Ver ${esc(p.name)}">${art(p, false, true)}</button>`).join("")}</div>`;
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
