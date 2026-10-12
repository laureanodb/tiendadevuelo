// Panel de la tienda: entrar con clave, ver la lista y cargar o editar productos con fotos.
(() => {
  const app = document.getElementById("app");
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const ars = (n) => "$" + Math.round(n).toLocaleString("es-AR");
  const usd = (n) => "US$ " + Number(n).toLocaleString("es-AR", { maximumFractionDigits: 2 });
  let productos = [], estado = {}, filtro = "Todos", busca = "", dolar = 1500;

  fetch("https://dolarapi.com/v1/dolares/oficial").then((r) => r.json()).then((d) => { if (d.venta) dolar = d.venta; }).catch(() => {});

  // ---------- Avisos y llamadas al servidor ----------
  let tt;
  function toast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg; el.classList.add("show");
    clearTimeout(tt); tt = setTimeout(() => el.classList.remove("show"), 2600);
  }
  async function api(path, opts = {}) {
    const r = await fetch("/api/panel/" + path, {
      ...opts, headers: opts.body ? { "content-type": "application/json" } : {}, credentials: "same-origin",
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    let d = {};
    try { d = await r.json(); } catch {}
    if (r.status === 401 && path !== "sesion") { login(); throw new Error("sin sesión"); }
    if (!r.ok) throw new Error(d.mensaje || "No se pudo completar. Probá de nuevo.");
    return d;
  }

  // ---------- Arranque ----------
  async function inicio() {
    try { estado = await (await fetch("/api/panel/sesion", { credentials: "same-origin" })).json(); }
    catch { estado = { base: false, clave: false }; }
    if (!estado.base || !estado.clave) return configurar();
    if (!estado.sesion) return login();
    document.getElementById("salir").hidden = false;
    await cargar();
  }

  function configurar() {
    app.innerHTML = `
      <section class="p-card p-setup">
        <h1>Falta un paso en Vercel</h1>
        <p>El panel está listo, pero todavía no tiene dónde guardar los productos. Hacelo una sola vez:</p>
        <ol>
          <li class="${estado.base ? "ok" : ""}"><b>Conectar la base de datos.</b> En vercel.com abrí el proyecto de la tienda → <b>Storage</b> → <b>Create Database</b> → <b>Supabase</b> → seguí los pasos y conectalo al proyecto.${estado.base ? " ✓ Listo" : ""}</li>
          <li class="${estado.clave ? "ok" : ""}"><b>Crear tu clave del panel.</b> En el proyecto → <b>Settings</b> → <b>Environment Variables</b> → nombre <code>PANEL_CLAVE</code>, valor: la clave que quieras (mínimo 6 caracteres) → <b>Save</b>.${estado.clave ? " ✓ Listo" : ""}</li>
          <li><b>Volver a publicar.</b> En <b>Deployments</b>, tocá los tres puntos del último → <b>Redeploy</b>.</li>
        </ol>
        <button class="btn btn-primary" onclick="location.reload()">Ya lo hice, revisar</button>
      </section>`;
  }

  function login() {
    document.getElementById("salir").hidden = true;
    app.innerHTML = `
      <form class="p-card p-login" id="loginForm">
        <img src="/logo.svg" alt="" width="64" height="64">
        <h1>Panel de la tienda</h1>
        <label>Clave<input id="clave" type="password" autocomplete="current-password" required></label>
        <p class="p-error" id="loginError" hidden></p>
        <button class="btn btn-primary btn-block" type="submit">Entrar</button>
      </form>`;
    document.getElementById("clave").focus();
    document.getElementById("loginForm").onsubmit = async (e) => {
      e.preventDefault();
      const err = document.getElementById("loginError");
      err.hidden = true;
      try {
        await api("sesion", { method: "POST", body: { clave: document.getElementById("clave").value } });
        document.getElementById("salir").hidden = false;
        await cargar();
      } catch (x) { err.textContent = x.message; err.hidden = false; }
    };
  }
  document.getElementById("salir").onclick = async () => { await api("sesion", { method: "DELETE" }).catch(() => {}); login(); };

  async function cargar() {
    const d = await api("productos");
    productos = d.productos;
    ir(location.hash.slice(1) || "productos");
    // Cuenta los pedidos nuevos para mostrarlos en la pestaña
    Promise.all([api("resenas"), api("preguntas")]).then(([r, g]) => { porRevisar = r.resenas.filter((x) => x.estado === "pendiente").length + g.preguntas.filter((x) => x.estado === "pendiente").length; const nav = app.querySelector(".p-tabs"); if (nav) nav.outerHTML = tabsHTML(nav.querySelector("[aria-current]")?.dataset.tab || "productos"); }).catch(() => {});
    cargarPedidos().then(() => { const nav = app.querySelector(".p-tabs"); if (nav) nav.outerHTML = tabsHTML(nav.querySelector("[aria-current]")?.dataset.tab || "productos"); }).catch(() => {});
  }

  // ---------- Pestañas ----------
  const TABS = [["productos", "Productos"], ["pedidos", "Pedidos"], ["ventas", "Ventas"], ["clientes", "Clientes"], ["opiniones", "Opiniones"], ["respuestas", "Respuestas"], ["actividad", "Actividad"], ["ajustes", "Ajustes"]];
  const tabsHTML = (act) => `<nav class="p-tabs" aria-label="Secciones del panel">${TABS.map(([k, t]) => `<button type="button" data-tab="${k}"${k === act ? ' aria-current="page"' : ""}>${t}${k === "pedidos" && pendientes ? ` <span class="p-dot">${pendientes}</span>` : ""}${k === "opiniones" && porRevisar ? ` <span class="p-dot">${porRevisar}</span>` : ""}</button>`).join("")}</nav>`;
  let pendientes = 0, pedidosCache = null, porRevisar = 0;
  function ir(tab) {
    if (tab === "pedidos") return verPedidos();
    if (tab === "clientes") return verClientes();
    if (tab === "actividad") return verActividad();
    if (tab === "opiniones") return verOpiniones();
    if (tab === "respuestas") return verRespuestas();
    if (tab === "ajustes") return verAjustes();
    if (tab === "ventas") return verVentas();
    lista();
  }
  app.addEventListener("click", (e) => { const t = e.target.closest("[data-tab]"); if (t) { history.replaceState(null, "", "/panel#" + t.dataset.tab); ir(t.dataset.tab); window.scrollTo(0, 0); } });

  // ---------- Lista ----------
  const stockBajo = (p) => p.stock !== null && p.stockMin !== null && p.stock <= p.stockMin;
  const precioTxt = (p) => p.usd !== null ? usd(p.usd) : p.ars !== null ? ars(p.ars) : "Consultar";
  const miniArt = (p) => p.fotos?.length
    ? `<img src="${esc(p.fotos[0])}" alt="" loading="lazy">`
    : `<svg viewBox="0 0 64 64" fill="none" stroke="${(CAT_COLORS[p.cat] || ["#0e8be0"])[0]}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${ICONS[p.icon] || ICONS.tag}</svg>`;

  function lista() {
    history.replaceState(null, "", "/panel#productos");
    const ocultos = productos.filter((p) => !p.visible).length;
    const bajos = productos.filter(stockBajo).length;
    const FILTROS = ["Todos", "En la web", "Ocultos", "Stock bajo", ...CATEGORIES];
    const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const pasa = { "Todos": () => true, "En la web": (p) => p.visible, "Ocultos": (p) => !p.visible, "Stock bajo": stockBajo };
    const vis = productos.filter((p) => (pasa[filtro] ? pasa[filtro](p) : p.cat === filtro) &&
      (!busca || norm([p.name, p.brand, p.model, p.proveedor].join(" ")).includes(norm(busca))));

    app.innerHTML = tabsHTML("productos") + `
      <div class="p-head">
        <div><h1>Productos</h1>
          <p class="muted">${productos.length} cargados · ${productos.length - ocultos} en la web${ocultos ? ` · ${ocultos} ocultos` : ""}</p></div>
        <div class="p-head-btns">
          <button class="btn btn-ghost" id="bloque">Cambiar precios</button>
          <button class="btn btn-primary" id="nuevo">＋ Nuevo producto</button>
        </div>
      </div>
      ${bajos ? `<button class="p-alert" id="verBajos">⚠ ${bajos} ${bajos === 1 ? "producto tiene" : "productos tienen"} stock bajo. Ver cuáles →</button>` : ""}
      <div id="bloqueBox"></div>
      ${productos.length ? `
      <div class="p-tools">
        <label class="search"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
          <input id="busca" type="search" placeholder="Buscar por nombre, marca o proveedor" value="${esc(busca)}"></label>
        <div class="chips">${FILTROS.map((f) => `<button class="chip${f === filtro ? " on" : ""}" data-f="${esc(f)}">${esc(f)}</button>`).join("")}</div>
      </div>
      <div class="p-list">
        ${vis.map((p) => `
          <button class="p-row${p.visible ? "" : " off"}" data-edit="${esc(p.id)}">
            <span class="p-thumb">${miniArt(p)}</span>
            <span class="p-row-info"><b>${esc(p.name)}</b><span class="muted small">${esc([p.brand, p.cat].filter(Boolean).join(" · "))}</span>
              <span class="p-flags">${!p.visible ? '<i class="f-off">Oculto</i>' : ""}${p.encargo ? '<i class="f-enc">Por encargo</i>' : ""}${p.destacado ? `<i>Destacado ${p.destacado}</i>` : ""}${stockBajo(p) ? '<i class="f-low">Stock bajo</i>' : ""}</span></span>
            <span class="p-row-num"><b>${precioTxt(p)}</b>${p.stock !== null ? `<span class="muted small">Stock ${p.stock}</span>` : ""}</span>
          </button>`).join("") || '<p class="empty">No hay productos con ese filtro.</p>'}
      </div>` : `
      <section class="p-card p-empty">
        <h2>Todavía no hay productos</h2>
        <p class="muted">Podés empezar con los ${PRODUCTS.length} productos de muestra que tiene hoy la web y editarlos, o cargar los tuyos desde cero.</p>
        <div class="p-head-btns"><button class="btn btn-ghost" id="importar">Empezar con los de muestra</button><button class="btn btn-primary" id="nuevo2">Cargar el primero</button></div>
      </section>`}`;

    const $ = (id) => document.getElementById(id);
    $("nuevo").onclick = () => editar(null);
    if ($("nuevo2")) $("nuevo2").onclick = () => editar(null);
    if ($("verBajos")) $("verBajos").onclick = () => { filtro = "Stock bajo"; lista(); };
    if ($("importar")) $("importar").onclick = async () => {
      $("importar").disabled = true;
      try { const d = await api("importar", { method: "POST", body: { productos: PRODUCTS } }); toast(`Listo: ${d.importados} productos cargados`); await cargar(); }
      catch (x) { toast(x.message); $("importar").disabled = false; }
    };
    $("bloque").onclick = bloque;
    if ($("busca")) $("busca").oninput = (e) => { busca = e.target.value; const pos = e.target.selectionStart; lista(); const b = $("busca"); b.focus(); b.setSelectionRange(pos, pos); };
    app.querySelectorAll("[data-f]").forEach((b) => (b.onclick = () => { filtro = b.dataset.f; lista(); }));
    app.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => editar(productos.find((p) => p.id === b.dataset.edit))));
  }

  // ---------- Cambio de precios en bloque ----------
  function bloque() {
    const box = document.getElementById("bloqueBox");
    if (box.innerHTML) { box.innerHTML = ""; return; }
    box.innerHTML = `
      <form class="p-card p-bloque" id="bloqueForm">
        <h2>Cambiar precios en bloque</h2>
        <div class="p-grid3">
          <label>Porcentaje<input id="bPct" type="number" step="0.1" required placeholder="Ej.: 10 o -5"></label>
          <label>Qué precios<select id="bMon"><option value="todos">Dólares y pesos</option><option value="USD">Solo en dólares</option><option value="ARS">Solo en pesos</option></select></label>
          <label>Categoría<select id="bCat"><option value="">Todas</option>${CATEGORIES.map((c) => `<option>${esc(c)}</option>`).join("")}</select></label>
        </div>
        <p class="muted small" id="bResumen">Los precios en pesos se redondean a la centena.</p>
        <div class="p-head-btns"><button type="button" class="btn btn-ghost" id="bCancel">Cancelar</button><button class="btn btn-primary" id="bOk" type="submit">Aplicar</button></div>
      </form>`;
    const f = document.getElementById("bloqueForm");
    const resumen = () => {
      const pct = Number(document.getElementById("bPct").value), cat = document.getElementById("bCat").value, mon = document.getElementById("bMon").value;
      const n = productos.filter((p) => (!cat || p.cat === cat) && ((mon !== "ARS" && p.usd !== null) || (mon !== "USD" && p.ars !== null))).length;
      document.getElementById("bResumen").textContent = pct ? `Vas a ${pct > 0 ? "subir" : "bajar"} un ${Math.abs(pct)}% el precio de ${n} productos.` : "Los precios en pesos se redondean a la centena.";
    };
    f.oninput = resumen;
    document.getElementById("bCancel").onclick = () => (document.getElementById("bloqueBox").innerHTML = "");
    f.onsubmit = async (e) => {
      e.preventDefault();
      document.getElementById("bOk").disabled = true;
      try {
        const d = await api("precios", { method: "POST", body: { porcentaje: document.getElementById("bPct").value, moneda: document.getElementById("bMon").value, cat: document.getElementById("bCat").value } });
        toast(`Precios actualizados (${d.cambiados})`); await cargar();
      } catch (x) { toast(x.message); document.getElementById("bOk").disabled = false; }
    };
  }

  // ---------- Formulario de producto ----------
  function editar(p) {
    const nuevo = !p;
    p = p ? structuredClone(p) : { name: "", brand: "", model: "", cat: CATEGORIES[0], icon: "tag", usd: null, ars: null, costo: null, costoMoneda: "USD",
      stock: null, stockMin: null, etapas: [], variantes: [], specs: [], desc: "", fotos: [], visible: true, proveedor: "", notas: "" };
    const moneda = p.usd !== null ? "USD" : p.ars !== null ? "ARS" : "consultar";
    const precio = p.usd ?? p.ars ?? "";
    let fotos = [...(p.fotos || [])];
    window.scrollTo(0, 0);

    app.innerHTML = `
      <button class="back-btn" id="volver">← Productos</button>
      <form class="p-form" id="form" novalidate>
        <h1>${nuevo ? "Nuevo producto" : esc(p.name)}</h1>

        <section class="p-card">
          <h2>Fotos</h2>
          <div class="p-fotos" id="fotos"></div>
          ${estado.fotos ? `<label class="btn btn-ghost p-upload">📷 Agregar fotos<input type="file" id="fotoIn" accept="image/*" multiple hidden></label>
            <p class="muted small">Hasta 8. La primera es la principal. Se achican solas antes de subir.</p>`
            : `<p class="muted small">Para subir fotos falta conectar Supabase en Vercel (Storage). Mientras tanto se usa el dibujo.</p>`}
          <label>Dibujo (si no hay fotos)<select id="icon">${Object.keys(ICONS).map((k) => `<option value="${k}"${k === p.icon ? " selected" : ""}>${k}</option>`).join("")}</select></label>
        </section>

        <section class="p-card">
          <h2>Datos</h2>
          <label>Nombre<input id="name" required maxlength="120" value="${esc(p.name)}" placeholder="Ej.: Auricular ANR"></label>
          <div class="p-grid2">
            <label>Marca<input id="brand" maxlength="60" value="${esc(p.brand)}"></label>
            <label>Modelo<input id="model" maxlength="60" value="${esc(p.model)}"></label>
          </div>
          <label>Categoría<select id="cat">${CATEGORIES.map((c) => `<option${c === p.cat ? " selected" : ""}>${esc(c)}</option>`).join("")}</select></label>
          <label>Descripción corta<textarea id="desc" rows="2" maxlength="600">${esc(p.desc)}</textarea></label>
          <label><span>Características <span class="muted">(una por renglón; para la ficha técnica usá “Atenuación: 24 dB”)</span></span><textarea id="specs" rows="4">${esc((p.specs || []).join("\n"))}</textarea></label>
          <label><span>Opciones para elegir <span class="muted">(una por renglón. Si una tiene otro precio o foto: «Ficha LEMO | 1350 | foto 2»)</span></span><textarea id="variantes" rows="3">${esc((p.variantes || []).join("\n"))}</textarea></label>
          <label><span>Video <span class="muted">(link de YouTube o Instagram, opcional)</span></span><input id="video" type="url" inputmode="url" placeholder="https://youtu.be/…" value="${esc(p.video || "")}"></label>
        </section>

        <section class="p-card">
          <h2>Precio</h2>
          <div class="p-seg" role="radiogroup" aria-label="Moneda">
            ${[["USD", "En dólares"], ["ARS", "En pesos"], ["consultar", "A consultar"]].map(([v, t]) => `<label><input type="radio" name="moneda" value="${v}"${v === moneda ? " checked" : ""}> ${t}</label>`).join("")}
          </div>
          <div id="precioWrap" class="p-grid2">
            <label>Precio de venta<input id="precio" type="number" min="0" step="0.01" inputmode="decimal" value="${esc(precio)}"></label>
            <label><span>Precio anterior <span class="muted">(para mostrarlo en oferta)</span></span><input id="antes" type="number" min="0" step="0.01" inputmode="decimal" value="${esc(p.antes ?? "")}"></label>
            <label><span>Oferta hasta <span class="muted">(vacío = sin fecha)</span></span><input id="ofertaHasta" type="date" value="${esc(p.ofertaHasta || "")}"></label>
          </div>
          <p class="muted small" id="ofertaInfo"></p>
          <div class="p-grid2">
            <label><span>Costo <span class="muted">(no se muestra)</span></span><input id="costo" type="number" min="0" step="0.01" inputmode="decimal" value="${esc(p.costo ?? "")}"></label>
            <label>Moneda del costo<select id="costoMoneda"><option value="USD"${p.costoMoneda === "USD" ? " selected" : ""}>Dólares</option><option value="ARS"${p.costoMoneda === "ARS" ? " selected" : ""}>Pesos</option></select></label>
          </div>
          <p class="p-ganancia" id="ganancia"></p>
        </section>

        <section class="p-card">
          <h2>Stock</h2>
          <div class="p-grid2">
            <label><span>Unidades <span class="muted">(vacío = no controlar)</span></span><input id="stock" type="number" min="0" step="1" inputmode="numeric" value="${esc(p.stock ?? "")}"></label>
            <label><span>Avisame con <span class="muted">(o menos)</span></span><input id="stockMin" type="number" min="0" step="1" inputmode="numeric" value="${esc(p.stockMin ?? "")}"></label>
          </div>
          <p class="muted small">Si llega a 0 y no es por encargo, se oculta solo de la web.</p>
          <label><span>Proveedor <span class="muted">(no se muestra)</span></span><input id="proveedor" maxlength="120" value="${esc(p.proveedor)}"></label>
        </section>

        <section class="p-card">
          <h2>En la web</h2>
          <label class="p-switch"><input type="checkbox" id="visible"${p.visible ? " checked" : ""}> Mostrar en la web</label>
          <div class="p-checks">
            ${[["nuevo", "Nuevo ingreso"], ["top", "Más vendido"], ["encargo", "Por encargo (15 a 30 días)"], ["reacond", "Reacondicionado"], ["regalo", "Sección Regalos"], ["tcp", "Sección Tripulantes"], ["oficial", "Distribuidor oficial de la marca"]]
              .map(([k, t]) => `<label><input type="checkbox" id="f_${k}"${p[k] ? " checked" : ""}> ${t}</label>`).join("")}
          </div>
          <label><span>Preventa: llega el <span class="muted">(vacío = no es preventa)</span></span><input id="llega" type="date" value="${esc(p.llega || "")}"></label>
          <label>Destacado en la portada<select id="destacado"><option value="">No</option>${[1, 2, 3, 4].map((n) => `<option value="${n}"${p.destacado === n ? " selected" : ""}>Lugar ${n}</option>`).join("")}</select></label>
          <fieldset class="p-checks"><legend>Ideal para</legend>
            ${Object.entries(ETAPAS).map(([k, t]) => `<label><input type="checkbox" data-etapa="${k}"${(p.etapas || []).includes(k) ? " checked" : ""}> ${t}</label>`).join("")}
          </fieldset>
        </section>

        <section class="p-card">
          <h2>Manuales y fichas en PDF</h2>
          <div id="docs"></div>
          ${estado.fotos ? `<label class="btn btn-ghost p-upload">📄 Subir PDF<input type="file" id="docIn" accept="application/pdf" hidden></label><p class="muted small">Hasta 3 MB cada uno. Se muestran en la ficha para descargar.</p>` : ""}
        </section>

        <section class="p-card">
          <h2>Alquiler</h2>
          <div class="p-grid2">
            <label><span>Precio por día <span class="muted">(vacío = no se alquila)</span></span><input id="alquiler" type="number" min="0" step="0.01" inputmode="decimal" value="${esc(p.alquiler ?? "")}"></label>
            <label>Moneda<select id="alqMon"><option value="ARS"${p.alquilerMoneda !== "USD" ? " selected" : ""}>Pesos</option><option value="USD"${p.alquilerMoneda === "USD" ? " selected" : ""}>Dólares</option></select></label>
          </div>
        </section>

        <section class="p-card">
          <h2>Notas internas</h2>
          <textarea id="notas" rows="3" maxlength="1000" placeholder="Solo las ves vos">${esc(p.notas)}</textarea>
        </section>

        ${nuevo ? "" : `<section class="p-card p-danger"><div id="delBox"><button type="button" class="btn btn-ghost" id="del">Borrar producto</button></div>
          ${p.visible ? "" : ""}<a class="p-link" href="/producto/${esc(p.id)}" target="_blank" rel="noopener">Ver en la web ↗</a></section>`}

        <div class="p-save">
          <button type="button" class="btn btn-ghost" id="cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary" id="guardar">${nuevo ? "Guardar producto" : "Guardar cambios"}</button>
        </div>
      </form>`;

    const $ = (id) => document.getElementById(id);
    const val = (id) => $(id).value.trim();
    const monedaSel = () => document.querySelector('input[name="moneda"]:checked').value;

    function renderFotos() {
      $("fotos").innerHTML = fotos.length ? fotos.map((u, i) => `
        <figure class="p-foto${i === 0 ? " main" : ""}"><img src="${esc(u)}" alt="">
          <figcaption>${i > 0 ? `<button type="button" data-izq="${i}" aria-label="Mover a la izquierda">←</button>` : "<span>Principal</span>"}<button type="button" data-quitar="${i}" aria-label="Quitar foto">✕</button></figcaption>
        </figure>`).join("") : `<p class="muted small">Sin fotos todavía.</p>`;
    }
    renderFotos();
    let docs = [...(p.docs || [])];
    const renderDocs = () => {
      $("docs").innerHTML = docs.length ? docs.map((d, i) => `<div class="p-doc"><input value="${esc(d.nombre)}" data-docn="${i}" aria-label="Nombre del documento"><a href="${esc(d.url)}" target="_blank" rel="noopener">Ver</a><button type="button" class="icon-btn" data-docx="${i}" aria-label="Quitar">✕</button></div>`).join("") : '<p class="muted small">Sin documentos.</p>';
    };
    renderDocs();
    $("docs").oninput = (e) => { const i = e.target.dataset.docn; if (i !== undefined) docs[i].nombre = e.target.value; };
    $("docs").onclick = (e) => { const b = e.target.closest("[data-docx]"); if (b) { docs.splice(+b.dataset.docx, 1); renderDocs(); } };
    if ($("docIn")) $("docIn").onchange = async (e) => {
      const f = e.target.files[0]; e.target.value = "";
      if (!f) return;
      if (f.size > 3_000_000) { toast("El PDF pesa más de 3 MB."); return; }
      toast("Subiendo PDF…");
      try {
        const data = await new Promise((ok, mal) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1]); r.onerror = mal; r.readAsDataURL(f); });
        const d = await api("foto", { method: "POST", body: { data, tipo: "application/pdf", producto: val("name") || p.id || "producto" } });
        docs.push({ nombre: f.name.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ").slice(0, 60) || "Manual", url: d.url }); renderDocs();
        toast("PDF listo. Acordate de guardar.");
      } catch (x) { toast(x.message); }
    };
    $("fotos").onclick = (e) => {
      const t = e.target.closest("button"); if (!t) return;
      if (t.dataset.quitar) fotos.splice(+t.dataset.quitar, 1);
      if (t.dataset.izq) { const i = +t.dataset.izq; [fotos[i - 1], fotos[i]] = [fotos[i], fotos[i - 1]]; }
      renderFotos();
    };
    if ($("fotoIn")) $("fotoIn").onchange = async (e) => {
      const files = [...e.target.files].slice(0, 8 - fotos.length);
      e.target.value = "";
      for (const [i, f] of files.entries()) {
        toast(`Subiendo foto ${i + 1} de ${files.length}…`);
        try {
          const [data, mini] = await Promise.all([achicar(f), achicar(f, 600, 0.8)]);
          const d = await api("foto", { method: "POST", body: { data, mini, tipo: "image/jpeg", producto: val("name") || p.id || "producto" } });
          fotos.push(d.url); renderFotos();
        } catch (x) { toast(x.message); }
      }
      toast("Fotos listas. Acordate de guardar.");
    };

    const ofertaInfo = () => {
      const pr = Number(val("precio")), an = Number(val("antes"));
      $("ofertaInfo").textContent = an && pr && an > pr ? `Se va a mostrar como oferta: ${Math.round((1 - pr / an) * 100)}% off${val("ofertaHasta") ? ", hasta el " + val("ofertaHasta").split("-").reverse().join("/") : ""}.` : an && pr ? "El precio anterior tiene que ser mayor que el de venta para mostrarse como oferta." : "";
    };
    ["antes", "ofertaHasta"].forEach((id) => ($(id).oninput = ofertaInfo));
    const syncPrecio = () => { $("precioWrap").hidden = monedaSel() === "consultar"; ganancia(); };
    function ganancia() {
      const m = monedaSel(), pr = Number(val("precio")), co = Number(val("costo")), cm = $("costoMoneda").value;
      if (m === "consultar" || !pr || !co) { $("ganancia").textContent = ""; return; }
      const enPesos = (v, mon) => (mon === "USD" ? v * dolar : v);
      const g = enPesos(pr, m) - enPesos(co, cm);
      const pct = (g / enPesos(co, cm)) * 100;
      $("ganancia").innerHTML = `Ganancia: <b>${m === "USD" && cm === "USD" ? usd(pr - co) : ars(g)}</b> por unidad (${pct.toFixed(0)}% sobre el costo)${m !== cm ? " · al dólar oficial de hoy" : ""}`;
      $("ganancia").classList.toggle("neg", g < 0);
    }
    document.querySelectorAll('input[name="moneda"]').forEach((r) => (r.onchange = syncPrecio));
    ["precio", "costo", "costoMoneda"].forEach((id) => ($(id).oninput = () => { ganancia(); ofertaInfo(); }));
    ofertaInfo();
    syncPrecio();

    let dirty = false;
    $("form").addEventListener("input", () => (dirty = true));
    const salir = () => { if (!dirty || confirmarSalida()) lista(); };
    function confirmarSalida() {
      const bar = document.querySelector(".p-save");
      if (bar.dataset.confirm) return true;
      bar.dataset.confirm = "1";
      $("cancel").textContent = "Salir sin guardar";
      toast("Tenés cambios sin guardar. Tocá de nuevo para salir igual.");
      return false;
    }
    $("volver").onclick = salir;
    $("cancel").onclick = salir;

    if ($("del")) $("del").onclick = () => {
      $("delBox").innerHTML = `<span>¿Borrar <b>${esc(p.name)}</b>? No se puede deshacer.</span>
        <div class="p-head-btns"><button type="button" class="btn btn-ghost" id="delNo">No</button><button type="button" class="btn p-btn-danger" id="delSi">Sí, borrar</button></div>`;
      $("delNo").onclick = () => editar(productos.find((x) => x.id === p.id));
      $("delSi").onclick = async () => {
        try { await api("productos?id=" + encodeURIComponent(p.id), { method: "DELETE" }); toast("Producto borrado"); await cargar(); }
        catch (x) { toast(x.message); }
      };
    };

    $("form").onsubmit = async (e) => {
      e.preventDefault();
      if (!val("name")) { $("name").focus(); toast("Poné el nombre del producto."); return; }
      const m = monedaSel();
      if (m !== "consultar" && !(Number(val("precio")) > 0)) { $("precio").focus(); toast("Poné el precio o elegí «A consultar»."); return; }
      const datos = {
        id: p.id, name: val("name"), brand: val("brand"), model: val("model"), cat: $("cat").value, icon: $("icon").value,
        usd: m === "USD" ? val("precio") : null, ars: m === "ARS" ? val("precio") : null,
        costo: val("costo"), costoMoneda: $("costoMoneda").value, antes: m === "consultar" ? null : val("antes"), ofertaHasta: val("ofertaHasta"), video: val("video"), stock: val("stock"), stockMin: val("stockMin"),
        desc: val("desc"), specs: $("specs").value, variantes: $("variantes").value, proveedor: val("proveedor"), notas: val("notas"),
        visible: $("visible").checked, destacado: $("destacado").value, fotos,
        etapas: [...document.querySelectorAll("[data-etapa]:checked")].map((c) => c.dataset.etapa),
        orden: p.orden ?? productos.length,
      };
      for (const k of ["nuevo", "top", "encargo", "reacond", "regalo", "tcp", "oficial"]) datos[k] = $("f_" + k).checked;
      Object.assign(datos, { llega: val("llega"), alquiler: val("alquiler"), alquilerMoneda: $("alqMon").value, docs });
      $("guardar").disabled = true;
      try {
        await api("productos", { method: "POST", body: datos });
        toast(nuevo ? "Producto guardado. Ya está en la web." : "Cambios guardados. En unos segundos se ven en la web.");
        await cargar();
      } catch (x) { toast(x.message); $("guardar").disabled = false; }
    };
  }

  // ---------- Pedidos ----------
  const ESTADOS = [["nuevo", "Nuevo"], ["señado", "Señado"], ["pagado", "Pagado"], ["enviado", "Enviado"], ["entregado", "Entregado"], ["cancelado", "Cancelado"]];
  const estadoTxt = (e) => (ESTADOS.find((x) => x[0] === e) || [e, e])[1];
  const fechaCorta = (d) => new Date(d).toLocaleString("es-AR", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });
  const waCliente = (tel, msg) => `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
  const sitio = CONFIG.sitio;
  let filtroPed = "Activos", buscaPed = "";

  const sinVer = (p) => (p.comprobantes || []).some((c) => !c.visto);
  async function cargarPedidos() {
    const d = await api("pedidos");
    pedidosCache = d;
    pendientes = d.pedidos.filter((p) => p.estado === "nuevo" || sinVer(p)).length;
    return d;
  }
  async function verPedidos() {
    app.innerHTML = tabsHTML("pedidos") + '<p class="p-loading">Cargando pedidos…</p>';
    let d;
    try { d = await cargarPedidos(); } catch (x) { app.innerHTML = tabsHTML("pedidos") + `<p class="p-error">${esc(x.message)}</p>`; return; }
    const r = d.resumen;
    const monto = (o) => [o.ars ? ars(o.ars) : "", o.usd ? usd(o.usd) : ""].filter(Boolean).join(" + ") || "$0";
    const FILT = ["Activos", "Todos", ...ESTADOS.map((x) => x[1])];
    const norm = (x) => String(x).toLowerCase();
    const vis = d.pedidos.filter((p) => (filtroPed === "Todos" ? true : filtroPed === "Activos" ? !["entregado", "cancelado"].includes(p.estado) : estadoTxt(p.estado) === filtroPed) &&
      (!buscaPed || norm(p.num + " " + p.cliente.nombre + " " + p.cliente.tel).includes(norm(buscaPed))));
    app.innerHTML = tabsHTML("pedidos") + `
      <div class="p-head"><div><h1>Pedidos</h1><p class="muted">${d.pedidos.length} en total${pendientes ? ` · <b>${pendientes} nuevos para atender</b>` : ""}</p></div></div>
      <div class="p-stats">
        <div class="p-stat"><span>Hoy</span><b>${monto(r.hoy)}</b><small>${r.hoy.n} ${r.hoy.n === 1 ? "venta" : "ventas"}</small></div>
        <div class="p-stat"><span>Este mes</span><b>${monto(r.mes)}</b><small>${r.mes.n} ${r.mes.n === 1 ? "venta" : "ventas"}</small></div>
        <div class="p-stat"><span>Mes anterior</span><b>${monto(r.anterior)}</b><small>&nbsp;</small></div>
      </div>
      <p class="muted small">Las ventas cuentan lo que anotás como cobrado en pedidos pagados, enviados o entregados. Pesos y dólares por separado.</p>
      ${(() => { const v = d.pedidos.filter((p) => p.nps !== null && p.nps !== undefined); if (!v.length) return "";
        const prom = v.filter((p) => p.nps >= 9).length, det = v.filter((p) => p.nps <= 6).length, nps = Math.round(((prom - det) / v.length) * 100);
        const coments = v.filter((p) => p.npsComent).slice(0, 5);
        return `<details class="p-card p-nps"><summary><b>¿Nos recomendarían?</b> Puntaje ${nps > 0 ? "+" : ""}${nps} <span class="muted small">(${v.length} ${v.length === 1 ? "respuesta" : "respuestas"}: ${prom} recomiendan, ${det} no)</span></summary>
          <p class="muted small">Va de −100 a +100. Más de +50 es excelente.</p>${coments.map((p) => `<p class="small"><b>${p.nps}</b> · ${esc(p.cliente.nombre || "")}: “${esc(p.npsComent)}”</p>`).join("")}</details>`; })()}
      <div class="p-tools">
        <label class="search"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
          <input id="buscaPed" type="search" placeholder="Buscar por número, nombre o teléfono" value="${esc(buscaPed)}"></label>
        <div class="chips">${FILT.map((f) => `<button class="chip${f === filtroPed ? " on" : ""}" data-fp="${esc(f)}">${esc(f)}</button>`).join("")}</div>
      </div>
      <div class="p-list">${vis.map((p) => `
        <button class="p-row p-order" data-ped="${esc(p.num)}">
          <span class="p-row-info"><b>${esc(p.cliente.nombre || "Sin nombre")}</b><span class="muted small">${esc(p.num)} · ${fechaCorta(p.creado)}</span>
            <span class="muted small">${esc(p.items.map((i) => `${i.qty}× ${i.name}`).join(", "))}</span></span>
          <span class="p-row-num">${sinVer(p) ? '<i class="p-estado e-comp">💳 Comprobante</i>' : ""}<i class="p-estado e-${esc(p.estado)}">${estadoTxt(p.estado)}</i><b>${p.cobradoArs || p.cobradoUsd ? [p.cobradoArs ? ars(p.cobradoArs) : "", p.cobradoUsd ? usd(p.cobradoUsd) : ""].filter(Boolean).join(" + ") : p.totalArs ? "≈ " + ars(p.totalArs) : ""}</b></span>
        </button>`).join("") || '<p class="empty">No hay pedidos con ese filtro.</p>'}</div>
      <section class="p-card p-carritos" id="carritos"><h2>Carritos sin terminar</h2><p class="muted small">Dejaron nombre y teléfono pero no mandaron el pedido. Un mensaje a tiempo suele cerrar la venta.</p><p class="p-loading">Cargando…</p></section>`;
    verCarritos();
    app.querySelectorAll("[data-fp]").forEach((b) => (b.onclick = () => { filtroPed = b.dataset.fp; verPedidos(); }));
    app.querySelectorAll("[data-ped]").forEach((b) => (b.onclick = () => verPedido(d.pedidos.find((p) => p.num === b.dataset.ped))));
    const bp = document.getElementById("buscaPed");
    bp.oninput = () => { buscaPed = bp.value; clearTimeout(bp._t); bp._t = setTimeout(() => { const pos = bp.selectionStart; verPedidos().then(() => { const n = document.getElementById("buscaPed"); n.focus(); n.setSelectionRange(pos, pos); }); }, 250); };
  }

  async function verCarritos() {
    const box = document.getElementById("carritos");
    if (!box) return;
    let d;
    try { d = await api("carritos"); } catch { box.querySelector(".p-loading").textContent = "No se pudieron cargar."; return; }
    const lista = d.carritos;
    box.querySelector(".p-loading").outerHTML = lista.length ? `<div class="p-list">${lista.map((c) => `
      <div class="p-cart-row" data-cid="${esc(c.id)}"><div><b>${esc(c.nombre)}</b> <span class="muted small">${fechaCorta(c.fecha)}${c.total ? " · ≈ " + ars(c.total) : ""}</span><br>
        <span class="muted small">${esc(c.items.map((i) => `${i.qty}× ${i.name}${i.sub ? " (" + i.sub + ")" : ""}`).join(", "))}</span></div>
        <div class="p-head-btns"><a class="btn btn-wa btn-sm" target="_blank" rel="noopener" data-cok="contactado" href="${waCliente(c.tel, `¡Hola ${c.nombre.split(" ")[0]}! Te escribo de Tienda de Vuelo ✈ Vi que estabas por pedir ${c.items.length === 1 ? c.items[0].name : "algunos productos"}. ¿Te puedo ayudar con alguna duda, el envío o la forma de pago?`)}">Escribirle</a>
        <button class="btn btn-ghost btn-sm" data-cok="descartado">Descartar</button></div></div>`).join("")}</div>` : '<p class="muted">No hay carritos sin terminar. 👌</p>';
    box.querySelectorAll("[data-cok]").forEach((b) => b.addEventListener("click", () => {
      const row = b.closest("[data-cid]");
      api("carritos", { method: "POST", body: { id: row.dataset.cid, estado: b.dataset.cok } }).then(() => row.remove()).catch((x) => toast(x.message));
    }));
  }

  function mensajeCliente(p) {
    const nombre = (p.cliente.nombre || "").split(" ")[0];
    const link = `${sitio}/seguimiento#${p.num}.${p.token}`;
    const m = {
      nuevo: `¡Hola ${nombre}! Recibimos tu pedido ${p.num}. Ya te confirmamos stock, envío y forma de pago.`,
      "señado": `¡Hola ${nombre}! Recibimos la seña de tu pedido ${p.num}: el producto queda reservado. Podés seguirlo acá: ${link}`,
      pagado: `¡Hola ${nombre}! Recibimos el pago de tu pedido ${p.num}. Ya lo estamos preparando. Seguilo acá: ${link}`,
      enviado: `¡Hola ${nombre}! Tu pedido ${p.num} ya salió${p.envioEmpresa ? " por " + p.envioEmpresa : ""}.${p.envioCodigo ? " Código de seguimiento: " + p.envioCodigo + "." : ""} Seguilo acá: ${link} ¡Buen vuelo! ✈`,
      entregado: `¡Hola ${nombre}! ¿Te llegó bien tu pedido ${p.num}? Gracias por comprar en Tienda de Vuelo. Si tenés un minuto, contanos qué te pareció acá: ${sitio}/resena#${p.num}.${p.token} ✈`,
      cancelado: `¡Hola ${nombre}! Cancelamos tu pedido ${p.num}. Si fue un error o querés retomarlo, escribinos.`,
    };
    return m[p.estado] || m.nuevo;
  }

  function verPedido(p) {
    window.scrollTo(0, 0);
    const c = p.cliente;
    app.innerHTML = `
      <button class="back-btn" id="volverPed">← Pedidos</button>
      <form class="p-form" id="pedForm">
        <h1>${esc(p.num)}</h1>
        <p class="muted">Hecho el ${fechaCorta(p.creado)}${p.historial.length > 1 ? " · " + p.historial.slice(1).map((h) => `${estadoTxt(h.estado)} ${fechaCorta(h.at)}`).join(" · ") : ""}</p>
        <section class="p-card">
          <h2>Estado</h2>
          <div class="p-seg" role="radiogroup" aria-label="Estado del pedido">${ESTADOS.map(([k, t]) => `<label><input type="radio" name="estado" value="${k}"${k === p.estado ? " checked" : ""}> ${t}</label>`).join("")}</div>
        </section>
        <section class="p-card">
          <h2>Cliente</h2>
          <p class="p-cli"><b>${esc(c.nombre)}</b><br>
            <a href="https://wa.me/${esc(p.tel)}" target="_blank" rel="noopener">${esc(c.tel)}</a>${c.dni ? ` · DNI/CUIT ${esc(c.dni)}` : ""}<br>
            ${esc(c.entrega || "")}${c.entrega && c.entrega.includes("día") && c.franja ? " · " + esc(c.franja) : ""}${c.dir ? "<br>" + esc(c.dir) + (c.provincia && c.provincia !== "CABA" ? ", " + esc(c.provincia) : "") : ""}
            ${c.notas ? `<br><i>“${esc(c.notas)}”</i>` : ""}</p>
        </section>
        <section class="p-card">
          <h2>Productos</h2>
          <div class="table-wrap"><table><tbody>${p.items.map((i) => `<tr><td>${i.qty} × ${esc(i.name)}${i.sub ? `<br><small class="muted">${esc(i.sub)}</small>` : ""}</td><td class="num">${esc(i.label || "")}</td></tr>`).join("")}
            ${p.totalArs ? `<tr><td>Total aproximado al pedir</td><td class="num"><b>${ars(p.totalArs)}</b>${p.usdSub ? `<br><small class="muted">incluye ${usd(p.usdSub)}</small>` : ""}</td></tr>` : ""}</tbody></table></div>
          ${p.stockDescontado ? '<p class="muted small">✓ Ya se descontó del stock.</p>' : '<button type="button" class="btn btn-ghost" id="descontar">Descontar del stock</button>'}
        </section>
        ${p.comprobantes?.length ? `<section class="p-card"><h2>Comprobantes que subió el cliente</h2><div class="p-acciones">${p.comprobantes.map((c, i) => `<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="/api/panel/comprobante?num=${encodeURIComponent(p.num)}&i=${i}">${c.tipo === "application/pdf" ? "📄" : "🖼"} ${fechaCorta(c.at)}${c.visto ? "" : " · nuevo"}</a>`).join("")}</div></section>` : ""}
        ${p.nps !== null && p.nps !== undefined ? `<section class="p-card"><h2>Encuesta</h2><p>¿Nos recomendaría? <b>${p.nps}/10</b>${p.npsComent ? `<br><i>“${esc(p.npsComent)}”</i>` : ""}</p></section>` : ""}
        <section class="p-card">
          <h2>Cobro</h2>
          <div class="p-grid2">
            <label><span>Cobrado en pesos</span><input id="cArs" type="number" min="0" step="1" inputmode="numeric" value="${esc(p.cobradoArs ?? "")}"></label>
            <label><span>Cobrado en dólares</span><input id="cUsd" type="number" min="0" step="0.01" inputmode="decimal" value="${esc(p.cobradoUsd ?? "")}"></label>
          </div>
          <p class="muted small">Cuenta para las ventas cuando el pedido está pagado, enviado o entregado.</p>
        </section>
        <section class="p-card">
          <h2>Envío</h2>
          <div class="p-grid2">
            <label>Empresa<select id="envEmp">${["", "Andreani", "Correo Argentino", "Vía Cargo", "OCA", "Moto o cadete", "Retiro en persona", "Otra"].map((x) => `<option${x === p.envioEmpresa ? " selected" : ""} value="${x}">${x || "—"}</option>`).join("")}</select></label>
            <label>Código de seguimiento<input id="envCod" value="${esc(p.envioCodigo)}"></label>
          </div>
        </section>
        <section class="p-card">
          <h2>Notas internas</h2>
          <textarea id="pedNotas" rows="3" placeholder="Solo las ves vos">${esc(p.notas)}</textarea>
        </section>
        <section class="p-card p-acciones">
          <a class="btn btn-wa" id="avisar" target="_blank" rel="noopener">Avisar al cliente por WhatsApp</a>
          <button type="button" class="btn btn-ghost" id="etiqueta">Imprimir etiqueta</button>
          <a class="btn btn-ghost" href="/seguimiento#${esc(p.num)}.${esc(p.token)}" target="_blank" rel="noopener">Ver lo que ve el cliente ↗</a>
        </section>
        <div class="p-save"><button type="button" class="btn btn-ghost" id="cancelPed">Volver</button><button class="btn btn-primary" id="guardarPed" type="submit">Guardar</button></div>
      </form>`;
    const $ = (id) => document.getElementById(id);
    const actual = () => ({ ...p, estado: document.querySelector('input[name="estado"]:checked').value, envioEmpresa: $("envEmp").value, envioCodigo: $("envCod").value.trim() });
    const syncAviso = () => { $("avisar").href = waCliente(p.tel, mensajeCliente(actual())); };
    $("pedForm").addEventListener("input", syncAviso); $("pedForm").addEventListener("change", syncAviso); syncAviso();
    // Si marcás pagado y no anotaste cobro, se sugiere el total
    document.querySelectorAll('input[name="estado"]').forEach((r) => r.addEventListener("change", () => {
      if (["pagado", "enviado", "entregado"].includes(r.value) && !$("cArs").value && !$("cUsd").value && p.totalArs) { $("cArs").value = p.totalArs; toast("Puse el total del pedido como cobrado. Corregilo si cobraste otro monto."); }
    }));
    $("volverPed").onclick = $("cancelPed").onclick = () => verPedidos();
    $("etiqueta").onclick = () => etiqueta(p);
    if ($("descontar")) $("descontar").onclick = async () => {
      try { const d = await api("pedidos", { method: "POST", body: { num: p.num, accion: "descontar" } }); toast("Listo, se descontó del stock."); const pr = await api("productos"); productos = pr.productos; verPedido(d.pedido); }
      catch (x) { toast(x.message); }
    };
    $("pedForm").onsubmit = async (e) => {
      e.preventDefault();
      $("guardarPed").disabled = true;
      try {
        const a = actual();
        const d = await api("pedidos", { method: "POST", body: { num: p.num, estado: a.estado, cobradoArs: $("cArs").value, cobradoUsd: $("cUsd").value, envioEmpresa: a.envioEmpresa, envioCodigo: a.envioCodigo, notas: $("pedNotas").value } });
        toast(a.estado !== p.estado ? `Guardado como ${estadoTxt(a.estado).toLowerCase()}. Avisale al cliente con el botón verde.` : "Guardado.");
        verPedido(d.pedido);
      } catch (x) { toast(x.message); $("guardarPed").disabled = false; }
    };
  }

  function etiqueta(p) {
    const c = p.cliente;
    const w = window.open("", "_blank");
    if (!w) { toast("Permití las ventanas emergentes para imprimir la etiqueta."); return; }
    w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Etiqueta ${esc(p.num)}</title>
      <style>@page{size:100mm 150mm;margin:6mm}body{font:14px/1.4 Arial,sans-serif;color:#000;margin:0}.e{border:2px solid #000;border-radius:8px;padding:12px;width:86mm}
      h1{font-size:13px;letter-spacing:.2em;margin:0 0 6px;text-transform:uppercase}.para{font-size:20px;font-weight:700;margin:4px 0}.de{border-top:1px dashed #000;margin-top:12px;padding-top:8px;font-size:12px}
      .num{font:700 16px monospace;margin-top:10px}.logo{display:flex;align-items:center;gap:6px;font-weight:700}.logo img{width:26px}</style></head><body>
      <div class="e"><h1>Destinatario</h1><div class="para">${esc(c.nombre)}</div><div>${esc(c.dir || "Retira en CABA")}</div><div>Tel: ${esc(c.tel)}</div>${c.dni ? `<div>DNI/CUIT: ${esc(c.dni)}</div>` : ""}
      ${p.envioEmpresa ? `<div>Envío: ${esc(p.envioEmpresa)}${p.envioCodigo ? " · " + esc(p.envioCodigo) : ""}</div>` : ""}
      <div class="num">${esc(p.num)}</div>
      <div class="de"><div class="logo"><img src="${location.origin}/logo.svg" alt="">Tienda de Vuelo</div>${esc(CONFIG.ciudad)} · WhatsApp ${esc(CONFIG.whatsappVisible)} · tiendadevuelo.com.ar</div></div>
      <script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);
    w.document.close();
  }

  // ---------- Clientes ----------
  let buscaCli = "";
  async function verClientes() {
    app.innerHTML = tabsHTML("clientes") + '<p class="p-loading">Cargando clientes…</p>';
    let d;
    try { d = await api("clientes"); } catch (x) { app.innerHTML = tabsHTML("clientes") + `<p class="p-error">${esc(x.message)}</p>`; return; }
    const hoy = new Date(Date.now() + (new Date().getTimezoneOffset() - 180) * 60000);
    const enDias = (cumple) => { if (!cumple) return null; const [, m, dd] = cumple.split("-").map(Number); let x = new Date(hoy.getFullYear(), m - 1, dd); const h0 = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()); if (x < h0) x = new Date(hoy.getFullYear() + 1, m - 1, dd); return Math.round((x - h0) / 864e5); };
    const cumples = d.clientes.map((c) => ({ ...c, en: enDias(c.cumple) })).filter((c) => c.en !== null && c.en <= 7).sort((a, b) => a.en - b.en);
    const norm = (x) => String(x).toLowerCase();
    const vis = d.clientes.filter((c) => !buscaCli || norm(c.nombre + " " + c.tel + " " + c.escuela).includes(norm(buscaCli)));
    const niveles = ["Comandante", "Piloto", "Alumno"].map((n) => [n, d.clientes.filter((c) => c.nivel === n).length]);
    app.innerHTML = tabsHTML("clientes") + `
      <div class="p-head"><div><h1>Clientes</h1><p class="muted">${d.clientes.length} clientes · ${niveles.map(([n, k]) => `${k} ${n.toLowerCase()}`).join(" · ")}</p></div></div>
      <p class="muted small">Se arman solos con cada pedido. Niveles: Alumno (1 compra), Piloto (2 o 3), Comandante (4 o más).</p>
      ${cumples.length ? `<section class="p-card p-cumples"><h2>🎂 Cumpleaños de esta semana</h2>${cumples.map((c) => `
        <div class="p-cumple"><span><b>${esc(c.nombre)}</b> · ${c.en === 0 ? "¡hoy!" : c.en === 1 ? "mañana" : `en ${c.en} días`}</span>
        <a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="${waCliente(c.tel, `¡Feliz cumpleaños, ${c.nombre.split(" ")[0]}! 🎂✈ Te deseamos un gran año y muchas horas de vuelo. — Tienda de Vuelo`)}">Saludar</a></div>`).join("")}</section>` : ""}
      <div class="p-tools"><label class="search"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
        <input id="buscaCli" type="search" placeholder="Buscar por nombre, teléfono o escuela" value="${esc(buscaCli)}"></label></div>
      <div class="p-list">${vis.map((c) => `
        <button class="p-row p-order" data-cli="${esc(c.tel)}">
          <span class="p-row-info"><b>${esc(c.nombre || c.tel)}</b><span class="muted small">${esc(c.tel)}${c.escuela ? " · " + esc(c.escuela) : ""}${c.cumple ? " · 🎂 " + c.cumple.slice(8) + "/" + c.cumple.slice(5, 7) : ""}</span>
            <span class="muted small">${c.compras} ${c.compras === 1 ? "compra" : "compras"}${c.ultimo ? " · último pedido " + new Date(c.ultimo).toLocaleDateString("es-AR") : ""}</span></span>
          <span class="p-row-num"><i class="p-nivel n-${c.nivel.toLowerCase()}">${c.nivel}</i><b>${[c.totalArs ? ars(c.totalArs) : "", c.totalUsd ? usd(c.totalUsd) : ""].filter(Boolean).join(" + ")}</b></span>
        </button>`).join("") || '<p class="empty">Todavía no hay clientes. Aparecen solos cuando entra el primer pedido.</p>'}</div>`;
    app.querySelectorAll("[data-cli]").forEach((b) => (b.onclick = () => verCliente(d.clientes.find((c) => c.tel === b.dataset.cli))));
    const bc = document.getElementById("buscaCli");
    bc.oninput = () => { buscaCli = bc.value; clearTimeout(bc._t); bc._t = setTimeout(() => { const pos = bc.selectionStart; verClientes().then(() => { const n = document.getElementById("buscaCli"); n.focus(); n.setSelectionRange(pos, pos); }); }, 250); };
  }

  async function verCliente(c) {
    window.scrollTo(0, 0);
    if (!pedidosCache) { try { await cargarPedidos(); } catch {} }
    const suyos = (pedidosCache?.pedidos || []).filter((p) => p.tel === c.tel);
    app.innerHTML = `
      <button class="back-btn" id="volverCli">← Clientes</button>
      <form class="p-form" id="cliForm">
        <h1>${esc(c.nombre || c.tel)}</h1>
        <p><i class="p-nivel n-${c.nivel.toLowerCase()}">${c.nivel}</i> · ${c.compras} ${c.compras === 1 ? "compra" : "compras"}${c.totalArs || c.totalUsd ? " · " + [c.totalArs ? ars(c.totalArs) : "", c.totalUsd ? usd(c.totalUsd) : ""].filter(Boolean).join(" + ") : ""}</p>
        <section class="p-card">
          <label>Nombre<input id="cNom" value="${esc(c.nombre)}"></label>
          <div class="p-grid2">
            <label>Cumpleaños<input id="cCum" type="date" value="${esc(c.cumple || "")}"></label>
            <label>Escuela de vuelo<input id="cEsc" value="${esc(c.escuela)}" placeholder="Ej.: Aeroclub San Fernando"></label>
          </div>
          <label>Notas<textarea id="cNot" rows="3" placeholder="Qué vuela, qué le interesa…">${esc(c.notas)}</textarea></label>
          <a class="btn btn-wa" href="https://wa.me/${esc(c.tel)}" target="_blank" rel="noopener">Escribirle por WhatsApp</a>
        </section>
        <section class="p-card"><h2>Pedidos</h2>${suyos.length ? suyos.map((p) => `<button type="button" class="p-row p-order" data-ped="${esc(p.num)}"><span class="p-row-info"><b>${esc(p.num)}</b><span class="muted small">${fechaCorta(p.creado)} · ${esc(p.items.map((i) => i.name).join(", "))}</span></span><span class="p-row-num"><i class="p-estado e-${esc(p.estado)}">${estadoTxt(p.estado)}</i></span></button>`).join("") : '<p class="muted">Sin pedidos.</p>'}</section>
        <div class="p-save"><button type="button" class="btn btn-ghost" id="cancelCli">Volver</button><button class="btn btn-primary" id="guardarCli" type="submit">Guardar</button></div>
      </form>`;
    const $ = (id) => document.getElementById(id);
    $("volverCli").onclick = $("cancelCli").onclick = () => verClientes();
    app.querySelectorAll("[data-ped]").forEach((b) => (b.onclick = () => verPedido(suyos.find((p) => p.num === b.dataset.ped))));
    $("cliForm").onsubmit = async (e) => {
      e.preventDefault();
      try { await api("clientes", { method: "POST", body: { tel: c.tel, nombre: $("cNom").value, cumple: $("cCum").value, escuela: $("cEsc").value, notas: $("cNot").value } }); toast("Cliente guardado."); verClientes(); }
      catch (x) { toast(x.message); }
    };
  }

  // ---------- Opiniones: reseñas y preguntas ----------
  async function verOpiniones() {
    app.innerHTML = tabsHTML("opiniones") + '<p class="p-loading">Cargando…</p>';
    let r, g;
    try { [r, g] = await Promise.all([api("resenas"), api("preguntas")]); } catch (x) { app.innerHTML = tabsHTML("opiniones") + `<p class="p-error">${esc(x.message)}</p>`; return; }
    porRevisar = r.resenas.filter((x) => x.estado === "pendiente").length + g.preguntas.filter((x) => x.estado === "pendiente").length;
    const st = (n) => "★".repeat(n) + "☆".repeat(5 - n);
    const estR = { pendiente: "Para revisar", aprobada: "Publicada", rechazada: "Oculta" };
    app.innerHTML = tabsHTML("opiniones") + `
      <div class="p-head"><div><h1>Opiniones</h1><p class="muted">Las reseñas las dejan clientes con pedido pagado o entregado. Las preguntas se publican cuando las respondés.</p></div></div>
      <div class="p-grid2 p-act">
        <section class="p-card"><h2>Preguntas</h2>${g.preguntas.length ? g.preguntas.map((q) => `
          <div class="p-op${q.estado === "pendiente" ? " nueva" : ""}">
            <span class="muted small">${esc(q.productoNombre)} · ${fechaCorta(q.creado)}${q.nombre ? " · " + esc(q.nombre) : ""}${q.contacto ? " · " + esc(q.contacto) : ""}</span>
            <b>${esc(q.pregunta)}</b>
            <textarea rows="2" data-resp="${q.id}" placeholder="Tu respuesta (se publica en la ficha)">${esc(q.respuesta)}</textarea>
            <div class="p-head-btns"><button class="btn btn-primary btn-sm" data-qok="${q.id}">${q.estado === "respondida" ? "Actualizar" : "Responder y publicar"}</button>${q.estado !== "oculta" ? `<button class="btn btn-ghost btn-sm" data-qhide="${q.id}">Ocultar</button>` : '<span class="muted small">Oculta</span>'}</div>
          </div>`).join("") : '<p class="muted">Todavía no hay preguntas.</p>'}</section>
        <section class="p-card"><h2>Reseñas</h2>${r.resenas.length ? r.resenas.map((x) => `
          <div class="p-op${x.estado === "pendiente" ? " nueva" : ""}">
            <span class="muted small">${esc(x.productoNombre)} · ${esc(x.nombre)} · ${esc(x.num)} · ${fechaCorta(x.creado)}</span>
            <b class="p-stars">${st(x.estrellas)}</b>${x.texto ? `<p>${esc(x.texto)}</p>` : ""}
            <div class="p-head-btns"><span class="p-estado">${estR[x.estado]}</span>${x.estado !== "aprobada" ? `<button class="btn btn-primary btn-sm" data-rok="${x.id}">Publicar</button>` : ""}${x.estado !== "rechazada" ? `<button class="btn btn-ghost btn-sm" data-rno="${x.id}">Ocultar</button>` : ""}</div>
          </div>`).join("") : '<p class="muted">Todavía no hay reseñas. Llegan cuando mandás el aviso de "Entregado" con el link para opinar.</p>'}</section>
      </div>`;
    const act = async (fn, msg) => { try { await fn(); toast(msg); verOpiniones(); } catch (x) { toast(x.message); } };
    app.querySelectorAll("[data-qok]").forEach((b) => (b.onclick = () => act(() => api("preguntas", { method: "POST", body: { id: b.dataset.qok, respuesta: app.querySelector(`[data-resp="${b.dataset.qok}"]`).value } }), "Respuesta publicada.")));
    app.querySelectorAll("[data-qhide]").forEach((b) => (b.onclick = () => act(() => api("preguntas", { method: "POST", body: { id: b.dataset.qhide, estado: "oculta", respuesta: app.querySelector(`[data-resp="${b.dataset.qhide}"]`).value } }), "Pregunta oculta.")));
    app.querySelectorAll("[data-rok]").forEach((b) => (b.onclick = () => act(() => api("resenas", { method: "POST", body: { id: b.dataset.rok, estado: "aprobada" } }), "Reseña publicada.")));
    app.querySelectorAll("[data-rno]").forEach((b) => (b.onclick = () => act(() => api("resenas", { method: "POST", body: { id: b.dataset.rno, estado: "rechazada" } }), "Reseña oculta.")));
  }

  // ---------- Respuestas rápidas ----------
  const PLANTILLAS = [
    { titulo: "Datos para transferir", texto: "¡Gracias por tu compra! Te paso los datos para transferir:\nAlias: COMPLETAR.ALIAS\nCBU: COMPLETAR\nTitular: COMPLETAR\nCuando transfieras, mandame el comprobante por acá y te confirmo." },
    { titulo: "Costo de envío", texto: "El envío a tu zona sale $COMPLETAR por COMPLETAR (Andreani / Correo Argentino). Llega en COMPLETAR días hábiles desde que despachamos." },
    { titulo: "Hay stock", texto: "¡Sí, lo tenemos en stock! Si querés te lo reservo con una seña y lo despachamos en 48 h hábiles." },
    { titulo: "Por encargo", texto: "Ese producto lo traemos por encargo: tarda entre 15 y 30 días. Para encargarlo pedimos una seña del COMPLETAR%. ¿Querés que te lo reserve?" },
    { titulo: "Seña recibida", texto: "¡Recibimos la seña! El producto queda reservado a tu nombre. Te aviso cuando esté listo para despachar." },
    { titulo: "Retiro en CABA", texto: "Podés retirarlo en CABA (zona COMPLETAR). ¿Qué día y horario te queda bien?" },
  ];
  async function verRespuestas() {
    app.innerHTML = tabsHTML("respuestas") + '<p class="p-loading">Cargando…</p>';
    let lista = PLANTILLAS;
    try { const d = await api("ajustes?clave=plantillas"); if (Array.isArray(d.valor) && d.valor.length) lista = d.valor; } catch {}
    const pintar = () => {
      app.innerHTML = tabsHTML("respuestas") + `
        <div class="p-head"><div><h1>Respuestas rápidas</h1><p class="muted">Mensajes listos para copiar y pegar en WhatsApp. Editalos a tu gusto y completá lo que dice COMPLETAR.</p></div>
          <div class="p-head-btns"><a class="btn btn-ghost" href="/folleto" target="_blank" rel="noopener">Folleto con QR ↗</a><button class="btn btn-ghost" id="plNueva">＋ Nueva</button><button class="btn btn-primary" id="plGuardar">Guardar cambios</button></div></div>
        <div class="p-list">${lista.map((x, i) => `
          <section class="p-card p-pl"><input class="p-pl-t" data-plt="${i}" value="${esc(x.titulo)}" aria-label="Título">
            <textarea rows="4" data-plx="${i}" aria-label="Mensaje">${esc(x.texto)}</textarea>
            <div class="p-head-btns"><button class="btn btn-wa btn-sm" data-copy="${i}">Copiar</button><button class="btn btn-ghost btn-sm" data-pldel="${i}">Borrar</button>${/COMPLETAR/.test(x.texto) ? '<span class="muted small">⚠ Tiene datos para completar</span>' : ""}</div>
          </section>`).join("")}</div>`;
      app.querySelectorAll("[data-plt]").forEach((el) => (el.oninput = () => (lista[el.dataset.plt].titulo = el.value)));
      app.querySelectorAll("[data-plx]").forEach((el) => (el.oninput = () => (lista[el.dataset.plx].texto = el.value)));
      app.querySelectorAll("[data-copy]").forEach((b) => (b.onclick = async () => { try { await navigator.clipboard.writeText(lista[b.dataset.copy].texto); toast("Copiado. Pegalo en WhatsApp."); } catch { app.querySelector(`[data-plx="${b.dataset.copy}"]`).select(); } }));
      app.querySelectorAll("[data-pldel]").forEach((b) => (b.onclick = () => { lista.splice(+b.dataset.pldel, 1); pintar(); }));
      document.getElementById("plNueva").onclick = () => { lista = [...lista, { titulo: "Nueva respuesta", texto: "" }]; pintar(); };
      document.getElementById("plGuardar").onclick = async () => { try { await api("ajustes", { method: "POST", body: { clave: "plantillas", valor: lista } }); toast("Respuestas guardadas."); } catch (x) { toast(x.message); } };
    };
    lista = lista.map((x) => ({ ...x }));
    pintar();
  }

  // ---------- Ventas: gráficos y descarga para Excel ----------
  const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  async function verVentas() {
    app.innerHTML = tabsHTML("ventas") + '<p class="p-loading">Cargando ventas…</p>';
    let d;
    try { d = await api("ventas"); } catch (x) { app.innerHTML = tabsHTML("ventas") + `<p class="p-error">${esc(x.message)}</p>`; return; }
    const porId = Object.fromEntries(productos.map((p) => [p.id, p]));
    const monto = (v) => (v.ars || v.usd ? (v.ars || 0) + (v.usd || 0) * dolar : v.total || 0);
    const clave = (f) => { const x = new Date(f); return x.getFullYear() * 12 + x.getMonth(); };
    const hoy = new Date(), ahora = hoy.getFullYear() * 12 + hoy.getMonth();
    const porMes = {}, ganMes = {}, cubierto = {};
    const cats = {}, marcas = {};
    for (const v of d.ventas) {
      const k = clave(v.fecha);
      porMes[k] = (porMes[k] || 0) + monto(v);
      if (k <= ahora - 12) continue;
      for (const i of v.items) {
        const p = porId[i.id], sub = (i.unitArs || 0) * i.qty;
        const cat = p ? p.cat : i.kit ? "Kits" : "Otros", marca = p?.brand || (i.kit ? "Kits" : "Sin marca");
        cats[cat] = (cats[cat] || 0) + sub; marcas[marca] = (marcas[marca] || 0) + sub;
        if (p && p.costo !== null && p.costo !== undefined) {
          const costo = (p.costoMoneda === "USD" ? p.costo * dolar : p.costo) * i.qty;
          ganMes[k] = (ganMes[k] || 0) + sub - costo; cubierto[k] = (cubierto[k] || 0) + sub;
        }
      }
    }
    const meses = [...Array(12).keys()].map((n) => ahora - 11 + n);
    const max = Math.max(1, ...meses.map((k) => Math.max(porMes[k] || 0, porMes[k - 12] || 0)));
    const W = 900, H = 240, pad = 64, bw = (W - pad) / 12;
    const nombreMes = (k) => MESES[k % 12] + (k % 12 === 0 ? " " + String(Math.floor(k / 12)).slice(2) : "");
    const corto = (n) => (n >= 1e6 ? (n / 1e6).toLocaleString("es-AR", { maximumFractionDigits: 1 }) + " M" : n >= 1e3 ? Math.round(n / 1e3) + " mil" : Math.round(n));
    const yTicks = [0, 0.5, 1].map((t) => t * max);
    const svg = `<svg class="p-chart" viewBox="0 0 ${W} ${H + 24}" role="img" aria-label="Ventas por mes de los últimos 12 meses">
      ${yTicks.map((t) => { const y = H - (t / max) * (H - 16); return `<line x1="${pad}" x2="${W}" y1="${y}" y2="${y}" class="grid"/><text x="${pad - 6}" y="${y + 4}" text-anchor="end" class="ax">${t ? corto(t) : 0}</text>`; }).join("")}
      ${meses.map((k, i) => { const v = porMes[k] || 0, a = porMes[k - 12] || 0, h = (v / max) * (H - 16), x = pad + i * bw + bw * 0.18, w = bw * 0.64, ya = H - (a / max) * (H - 16);
        return `<g class="bar"><title>${nombreMes(k)}: ${ars(v)}${a ? ` · un año antes: ${ars(a)}` : ""}</title><rect x="${pad + i * bw}" y="0" width="${bw}" height="${H}" class="hit"/>
          ${v ? `<path d="M${x},${H} v${-Math.max(h - 4, 0)} q0,-4 4,-4 h${w - 8} q4,0 4,4 v${Math.max(h - 4, 0)} z" class="col"/>` : ""}
          ${a ? `<line x1="${x - 3}" x2="${x + w + 3}" y1="${ya}" y2="${ya}" class="prev"/>` : ""}
          <text x="${x + w / 2}" y="${H + 16}" text-anchor="middle" class="ax">${nombreMes(k)}</text></g>`; }).join("")}
      <line x1="${pad}" x2="${W}" y1="${H}" y2="${H}" class="base"/></svg>`;
    const barras = (o) => { const e = Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 8), m = Math.max(1, ...e.map((x) => x[1]));
      return e.length ? `<div class="p-hbars">${e.map(([k, v]) => `<div class="p-hbar"><span>${esc(k)}</span><div><i style="width:${Math.max(2, (v / m) * 100)}%"></i></div><b>${ars(v)}</b></div>`).join("")}</div>` : '<p class="muted">Todavía no hay ventas.</p>'; };
    const esteMes = porMes[ahora] || 0, anioAntes = porMes[ahora - 12] || 0;
    const gan = ganMes[ahora] || 0, cub = cubierto[ahora] || 0;
    app.innerHTML = tabsHTML("ventas") + `
      <div class="p-head"><div><h1>Ventas</h1><p class="muted">Pesos y dólares sumados al dólar oficial de hoy (${ars(dolar)}).</p></div>
        <div class="p-head-btns"><button class="btn btn-ghost" data-csv="pedidos">⬇ Pedidos</button><button class="btn btn-ghost" data-csv="productos">⬇ Productos y stock</button><button class="btn btn-ghost" data-csv="clientes">⬇ Clientes</button></div></div>
      <div class="p-stats">
        <div class="p-stat"><span>Este mes</span><b>${ars(esteMes)}</b><small>${anioAntes ? `${esteMes >= anioAntes ? "▲" : "▼"} ${Math.abs(Math.round((esteMes / anioAntes - 1) * 100))}% vs. hace un año` : "&nbsp;"}</small></div>
        <div class="p-stat"><span>Ganancia estimada del mes</span><b>${cub ? ars(gan) : "—"}</b><small>${cub ? `Margen ${Math.round((gan / cub) * 100)}% · ${Math.round((cub / Math.max(esteMes, cub)) * 100)}% con costo cargado` : "Cargá el costo de los productos"}</small></div>
        <div class="p-stat"><span>Últimos 12 meses</span><b>${ars(meses.reduce((s, k) => s + (porMes[k] || 0), 0))}</b><small>${d.ventas.filter((v) => clave(v.fecha) > ahora - 12).length} ventas</small></div>
      </div>
      <section class="p-card"><h2>Ventas por mes</h2><div class="p-legend"><span><i class="lg-col"></i>Este período</span><span><i class="lg-prev"></i>Mismo mes, un año antes</span></div><div class="p-chart-wrap">${svg}</div>
        <details><summary class="small">Ver como tabla</summary><div class="table-wrap"><table><thead><tr><th>Mes</th><th class="num">Ventas</th><th class="num">Un año antes</th><th class="num">Ganancia estimada</th></tr></thead><tbody>${meses.slice().reverse().map((k) => `<tr><td>${nombreMes(k)}</td><td class="num">${ars(porMes[k] || 0)}</td><td class="num">${porMes[k - 12] ? ars(porMes[k - 12]) : "—"}</td><td class="num">${cubierto[k] ? ars(ganMes[k]) : "—"}</td></tr>`).join("")}</tbody></table></div></details></section>
      <div class="p-grid2 p-act">
        <section class="p-card"><h2>Por categoría</h2><p class="muted small">Últimos 12 meses, al precio de cada pedido.</p>${barras(cats)}</section>
        <section class="p-card"><h2>Por marca</h2><p class="muted small">Las 8 que más venden.</p>${barras(marcas)}</section>
      </div>`;
    app.querySelectorAll("[data-csv]").forEach((b) => (b.onclick = () => exportar(b.dataset.csv).catch((x) => toast(x.message))));
  }

  // Archivos para Excel (separados por punto y coma, como lo abre Excel en castellano)
  async function exportar(que) {
    const num = (v) => (v === null || v === undefined || v === "" ? "" : String(v).replace(".", ","));
    const cel = (v) => { const s = String(v ?? ""); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const fecha = (f) => (f ? new Date(f).toLocaleDateString("es-AR") : "");
    let filas = [];
    if (que === "pedidos") {
      const d = pedidosCache || (await cargarPedidos());
      filas = [["Número", "Fecha", "Estado", "Cliente", "Teléfono", "DNI/CUIT", "Entrega", "Productos", "Total aprox. ($)", "Cobrado ($)", "Cobrado (US$)", "Fecha de pago", "Envío", "Código de seguimiento"],
        ...d.pedidos.map((p) => [p.num, fecha(p.creado), estadoTxt(p.estado), p.cliente.nombre, p.cliente.tel, p.cliente.dni, p.cliente.entrega, p.items.map((i) => `${i.qty} x ${i.name}${i.sub ? " (" + i.sub + ")" : ""}`).join(" | "),
          num(p.totalArs), num(p.cobradoArs), num(p.cobradoUsd), fecha(p.pagadoEn), p.envioEmpresa, p.envioCodigo])];
    } else if (que === "productos") {
      filas = [["Código", "Nombre", "Marca", "Modelo", "Categoría", "Precio US$", "Precio $", "Costo", "Moneda del costo", "Stock", "Stock mínimo", "Proveedor", "Visible"],
        ...productos.map((p) => [p.id, p.name, p.brand, p.model, p.cat, num(p.usd), num(p.ars), num(p.costo), p.costoMoneda, num(p.stock), num(p.stockMin), p.proveedor, p.visible ? "Sí" : "No"])];
    } else {
      const d = await api("clientes");
      filas = [["Nombre", "Teléfono", "DNI/CUIT", "Cumpleaños", "Escuela", "Nivel", "Compras", "Total $", "Total US$", "Último pedido", "Notas"],
        ...d.clientes.map((c) => [c.nombre, c.tel, c.dni, c.cumple ? c.cumple.split("-").reverse().join("/") : "", c.escuela, c.nivel, c.compras, num(c.totalArs), num(c.totalUsd), fecha(c.ultimo), c.notas])];
    }
    const csv = "\ufeff" + filas.map((f) => f.map(cel).join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `tiendadevuelo-${que}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast("Descargado. Abrilo con Excel o Google Sheets.");
  }

  // ---------- Ajustes: datos de pago que ve el cliente ----------
  async function verAjustes() {
    app.innerHTML = tabsHTML("ajustes") + '<p class="p-loading">Cargando…</p>';
    let v = {};
    try { v = (await api("ajustes?clave=pago")).valor || {}; } catch {}
    const C = [["titular", "Titular de la cuenta", "Nombre y apellido o razón social"], ["cuit", "CUIT", ""], ["banco", "Banco o billetera", "Ej.: Banco Galicia, Mercado Pago"], ["alias", "Alias", "TIENDA.DE.VUELO"], ["cbu", "CBU o CVU", "22 números"], ["usdtTrc20", "Dirección USDT (red TRC20)", "Empieza con T"], ["usdtBep20", "Dirección USDT (red BEP20)", "Empieza con 0x"]];
    app.innerHTML = tabsHTML("ajustes") + `
      <div class="p-head"><div><h1>Ajustes</h1><p class="muted">Lo que cargues acá aparece al cliente cuando hace un pedido y en la página de seguimiento, con botón para copiar.</p></div></div>
      <form class="p-card p-form" id="pagoForm"><h2>Datos de pago</h2>
        <div class="p-grid2">${C.map(([k, t, ph]) => `<label>${t}<input id="pg_${k}" value="${esc(v[k] || "")}" placeholder="${esc(ph)}" maxlength="120"></label>`).join("")}</div>
        <p class="muted small">Dejá vacío lo que no uses. Revisá bien el CBU y las direcciones cripto: un error hace que el dinero vaya a otra cuenta.</p>
        <button class="btn btn-primary" type="submit">Guardar datos de pago</button></form>
      <section class="p-card p-form"><h2>Catálogo para Instagram, Facebook y WhatsApp</h2>
        <p>Esta dirección tiene todos tus productos con foto y precio, y se actualiza sola:</p>
        <div class="p-doc"><input readonly value="${sitio}/catalogo.csv" id="feedUrl" aria-label="Dirección del catálogo"><button type="button" class="btn btn-ghost btn-sm" id="feedCopy">Copiar</button></div>
        <ol class="small"><li>Entrá a <b>business.facebook.com/commerce</b> → <b>Catálogo</b> → <b>Orígenes de datos</b> → <b>Agregar artículos</b> → <b>Feed de datos</b>.</li>
          <li>Elegí <b>Programar feed</b>, pegá la dirección y poné que se actualice <b>todos los días</b>.</li>
          <li>Moneda: <b>ARS</b>. Listo: vas a poder etiquetar productos en Instagram y Facebook.</li>
          <li>Para WhatsApp: en la app de WhatsApp Business → <b>Herramientas para la empresa</b> → <b>Catálogo</b> → conectá el mismo catálogo de Meta.</li></ol>
        <p class="muted small">Solo salen los productos visibles que tienen al menos una foto. Los precios en dólares se pasan a pesos al oficial del día.</p></section>`;
    document.getElementById("feedCopy").onclick = async () => { try { await navigator.clipboard.writeText(document.getElementById("feedUrl").value); toast("Copiado."); } catch { document.getElementById("feedUrl").select(); } };
    document.getElementById("pagoForm").onsubmit = async (e) => {
      e.preventDefault();
      const valor = Object.fromEntries(C.map(([k]) => [k, document.getElementById("pg_" + k).value.trim()]));
      if (valor.cbu && !/^\d{22}$/.test(valor.cbu.replace(/\s/g, ""))) return toast("El CBU o CVU tiene que tener 22 números.");
      valor.cbu = valor.cbu.replace(/\s/g, "");
      try { await api("ajustes", { method: "POST", body: { clave: "pago", valor } }); toast("Datos de pago guardados. Ya se ven en la web."); } catch (x) { toast(x.message); }
    };
  }

  // ---------- Actividad ----------
  async function verActividad() {
    app.innerHTML = tabsHTML("actividad") + '<p class="p-loading">Cargando…</p>';
    let d;
    try { d = await api("actividad"); } catch (x) { app.innerHTML = tabsHTML("actividad") + `<p class="p-error">${esc(x.message)}</p>`; return; }
    app.innerHTML = tabsHTML("actividad") + `
      <div class="p-head"><div><h1>Actividad</h1><p class="muted">Últimos 30 días</p></div></div>
      <div class="p-grid2 p-act">
        <section class="p-card"><h2>Lo que buscan y no encuentran</h2><p class="muted small">Pistas de qué conviene traer.</p>
          ${d.busquedas.length ? `<ol class="p-rank">${d.busquedas.map((b) => `<li><span>${esc(b.dato)}</span><b>${b.n}</b></li>`).join("")}</ol>` : '<p class="muted">Todavía nada. Aparece cuando alguien busca algo que no está cargado.</p>'}</section>
        <section class="p-card"><h2>Productos más consultados</h2><p class="muted small">Toques en “Lo quiero”, “Consultar” y “Hacer una pregunta”.</p>
          ${d.consultas.length ? `<ol class="p-rank">${d.consultas.map((c) => `<li><span>${esc(c.name)}</span><b>${c.n}</b>${c.quiero ? `<small>${c.quiero} “Lo quiero”</small>` : ""}</li>`).join("")}</ol>` : '<p class="muted">Todavía nada.</p>'}</section>
      </div>
      <section class="p-card p-hist" id="historial"><h2>Historial de cambios</h2><p class="muted small">Precios, stock, productos y pedidos. Si te equivocaste, tocá “Deshacer”.</p><p class="p-loading">Cargando…</p></section>`;
    verHistorial();
  }
  async function verHistorial() {
    const box = document.getElementById("historial");
    if (!box) return;
    let d;
    try { d = await api("cambios"); } catch { box.querySelector(".p-loading").textContent = "No se pudo cargar."; return; }
    const ICO = { producto: "✏️", borrado: "🗑", precios: "💲", pedido: "📦" };
    box.querySelector(".p-loading").outerHTML = d.cambios.length ? `<ol class="p-hist-list">${d.cambios.map((c) => `
      <li class="${c.deshecho ? "deshecho" : ""}"><span aria-hidden="true">${ICO[c.tipo] || "•"}</span><div><b>${esc(c.nombre || c.ref)}</b> <span class="muted small">${fechaCorta(c.creado)}</span><br><span class="small">${esc(c.resumen)}${c.deshecho ? " · deshecho" : ""}</span></div>
        ${c.deshacer ? `<button class="btn btn-ghost btn-sm" data-undo="${c.id}">Deshacer</button>` : ""}</li>`).join("")}</ol>` : '<p class="muted">Todavía no hay cambios anotados.</p>';
    box.querySelectorAll("[data-undo]").forEach((b) => (b.onclick = async () => {
      if (b.dataset.ok !== "1") { b.dataset.ok = "1"; b.textContent = "¿Seguro? Tocá de nuevo"; return; }
      b.disabled = true;
      try { await api("cambios", { method: "POST", body: { id: b.dataset.undo } }); toast("Listo, se deshizo el cambio."); productos = (await api("productos")).productos; verActividad(); }
      catch (x) { toast(x.message); b.disabled = false; }
    }));
  }

  // Achica la foto en el celular antes de subirla (máx. 1600 px, JPG).
  function achicar(file, max = 1600, calidad = 0.85) {
    return new Promise((ok, mal) => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        ok(c.toDataURL("image/jpeg", calidad).split(",")[1]);
      };
      img.onerror = () => mal(new Error("No se pudo leer la foto."));
      img.src = URL.createObjectURL(file);
    });
  }

  inicio();
})();
