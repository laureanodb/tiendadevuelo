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
    lista();
  }

  // ---------- Lista ----------
  const stockBajo = (p) => p.stock !== null && p.stockMin !== null && p.stock <= p.stockMin;
  const precioTxt = (p) => p.usd !== null ? usd(p.usd) : p.ars !== null ? ars(p.ars) : "Consultar";
  const miniArt = (p) => p.fotos?.length
    ? `<img src="${esc(p.fotos[0])}" alt="" loading="lazy">`
    : `<svg viewBox="0 0 64 64" fill="none" stroke="${(CAT_COLORS[p.cat] || ["#0e8be0"])[0]}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${ICONS[p.icon] || ICONS.tag}</svg>`;

  function lista() {
    history.replaceState(null, "", "/panel");
    const ocultos = productos.filter((p) => !p.visible).length;
    const bajos = productos.filter(stockBajo).length;
    const FILTROS = ["Todos", "En la web", "Ocultos", "Stock bajo", ...CATEGORIES];
    const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const pasa = { "Todos": () => true, "En la web": (p) => p.visible, "Ocultos": (p) => !p.visible, "Stock bajo": stockBajo };
    const vis = productos.filter((p) => (pasa[filtro] ? pasa[filtro](p) : p.cat === filtro) &&
      (!busca || norm([p.name, p.brand, p.model, p.proveedor].join(" ")).includes(norm(busca))));

    app.innerHTML = `
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
          <label><span>Características <span class="muted">(una por renglón)</span></span><textarea id="specs" rows="4">${esc((p.specs || []).join("\n"))}</textarea></label>
          <label><span>Opciones para elegir <span class="muted">(una por renglón, ej.: Fichas GA dual)</span></span><textarea id="variantes" rows="3">${esc((p.variantes || []).join("\n"))}</textarea></label>
        </section>

        <section class="p-card">
          <h2>Precio</h2>
          <div class="p-seg" role="radiogroup" aria-label="Moneda">
            ${[["USD", "En dólares"], ["ARS", "En pesos"], ["consultar", "A consultar"]].map(([v, t]) => `<label><input type="radio" name="moneda" value="${v}"${v === moneda ? " checked" : ""}> ${t}</label>`).join("")}
          </div>
          <label id="precioWrap">Precio de venta<input id="precio" type="number" min="0" step="0.01" inputmode="decimal" value="${esc(precio)}"></label>
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
            ${[["nuevo", "Nuevo ingreso"], ["top", "Más vendido"], ["encargo", "Por encargo (15 a 30 días)"], ["reacond", "Reacondicionado"], ["regalo", "Sección Regalos"], ["tcp", "Sección Tripulantes"]]
              .map(([k, t]) => `<label><input type="checkbox" id="f_${k}"${p[k] ? " checked" : ""}> ${t}</label>`).join("")}
          </div>
          <label>Destacado en la portada<select id="destacado"><option value="">No</option>${[1, 2, 3, 4].map((n) => `<option value="${n}"${p.destacado === n ? " selected" : ""}>Lugar ${n}</option>`).join("")}</select></label>
          <fieldset class="p-checks"><legend>Ideal para</legend>
            ${Object.entries(ETAPAS).map(([k, t]) => `<label><input type="checkbox" data-etapa="${k}"${(p.etapas || []).includes(k) ? " checked" : ""}> ${t}</label>`).join("")}
          </fieldset>
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
          const data = await achicar(f);
          const d = await api("foto", { method: "POST", body: { data, tipo: "image/jpeg", producto: val("name") || p.id || "producto" } });
          fotos.push(d.url); renderFotos();
        } catch (x) { toast(x.message); }
      }
      toast("Fotos listas. Acordate de guardar.");
    };

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
    ["precio", "costo", "costoMoneda"].forEach((id) => ($(id).oninput = ganancia));
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
        costo: val("costo"), costoMoneda: $("costoMoneda").value, stock: val("stock"), stockMin: val("stockMin"),
        desc: val("desc"), specs: $("specs").value, variantes: $("variantes").value, proveedor: val("proveedor"), notas: val("notas"),
        visible: $("visible").checked, destacado: $("destacado").value, fotos,
        etapas: [...document.querySelectorAll("[data-etapa]:checked")].map((c) => c.dataset.etapa),
        orden: p.orden ?? productos.length,
      };
      for (const k of ["nuevo", "top", "encargo", "reacond", "regalo", "tcp"]) datos[k] = $("f_" + k).checked;
      $("guardar").disabled = true;
      try {
        await api("productos", { method: "POST", body: datos });
        toast(nuevo ? "Producto guardado. Ya está en la web." : "Cambios guardados. En unos segundos se ven en la web.");
        await cargar();
      } catch (x) { toast(x.message); $("guardar").disabled = false; }
    };
  }

  // Achica la foto en el celular antes de subirla (máx. 1600 px, JPG).
  function achicar(file) {
    return new Promise((ok, mal) => {
      const img = new Image();
      img.onload = () => {
        const max = 1600, k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        ok(c.toDataURL("image/jpeg", 0.85).split(",")[1]);
      };
      img.onerror = () => mal(new Error("No se pudo leer la foto."));
      img.src = URL.createObjectURL(file);
    });
  }

  inicio();
})();
