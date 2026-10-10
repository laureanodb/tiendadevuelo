(() => {
  const $ = (s) => document.querySelector(s);
  const money = (n) => "$" + Math.round(n).toLocaleString("es-AR");
  const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const art = (p, big) => {
    const [a, b] = CAT_COLORS[p.cat];
    return `<div class="art${big ? " art-big" : ""}" style="--a:${a};--b:${b}">
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[p.icon]}</svg>
    </div>`;
  };

  // ---------- Catálogo ----------
  const state = { cat: "Todos", q: "", sort: "destacados" };
  const chips = $("#chips");
  ["Todos", ...CATEGORIES].forEach((c) => {
    const b = document.createElement("button");
    b.className = "chip";
    b.textContent = c;
    b.setAttribute("role", "tab");
    b.onclick = () => { state.cat = c; render(); };
    chips.appendChild(b);
  });

  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  function render() {
    chips.querySelectorAll(".chip").forEach((c) => {
      const on = c.textContent === state.cat;
      c.classList.toggle("on", on);
      c.setAttribute("aria-selected", on);
    });
    const q = norm(state.q);
    let list = PRODUCTS.filter((p) =>
      (state.cat === "Todos" || p.cat === state.cat) &&
      (!q || norm(p.name + " " + p.desc + " " + p.cat).includes(q)));
    const sorters = {
      destacados: (a, b) => (a.featured || 99) - (b.featured || 99),
      "precio-asc": (a, b) => a.price - b.price,
      "precio-desc": (a, b) => b.price - a.price,
      nombre: (a, b) => a.name.localeCompare(b.name, "es"),
    };
    list.sort(sorters[state.sort]);

    $("#grid").innerHTML = list.map((p, i) => `
      <article class="card" style="--i:${i}" data-id="${p.id}">
        ${p.badge ? `<span class="badge">${p.badge}</span>` : ""}
        ${p.old ? `<span class="badge badge-off">-${Math.round((1 - p.price / p.old) * 100)}%</span>` : ""}
        <button class="card-art" data-view="${p.id}" aria-label="Ver ${p.name}">${art(p)}</button>
        <div class="card-body">
          <span class="card-cat">${p.cat}</span>
          <h3><button class="link" data-view="${p.id}">${p.name}</button></h3>
          <div class="price">${p.old ? `<s>${money(p.old)}</s>` : ""}<b>${money(p.price)}</b></div>
          <div class="cuotas">6 cuotas de ${money(p.price / 6)}</div>
        </div>
        <button class="add" data-add="${p.id}">Agregar <span aria-hidden="true">+</span></button>
      </article>`).join("");
    $("#empty").hidden = list.length > 0;
  }

  $("#search").addEventListener("input", (e) => { state.q = e.target.value; render(); });
  $("#sort").addEventListener("change", (e) => { state.sort = e.target.value; render(); });

  document.querySelectorAll("[data-goto]").forEach((b) => b.addEventListener("click", () => {
    state.cat = b.dataset.goto;
    render();
    $("#catalogo").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  }));

  // ---------- Kits ----------
  $("#kitsGrid").innerHTML = KITS.map((k) => {
    const full = k.items.reduce((s, id) => s + byId[id].price, 0);
    const price = full * (1 - k.off);
    return `<article class="kit reveal${k.highlight ? " kit-hl" : ""}">
      ${k.highlight ? '<span class="badge">El más elegido</span>' : ""}
      <div class="kit-emoji">${k.emoji}</div>
      <h3>${k.name}</h3>
      <p class="muted">${k.tagline}</p>
      <ul>${k.items.map((id) => `<li>${byId[id].name}</li>`).join("")}</ul>
      <div class="kit-price"><s>${money(full)}</s><b>${money(price)}</b><span class="save">Ahorrás ${money(full - price)}</span></div>
      <button class="btn btn-primary btn-block" data-kit="${k.id}">Agregar kit</button>
    </article>`;
  }).join("");

  // ---------- Carrito ----------
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem("tdv-cart")) || []; } catch { cart = []; }
  const save = () => { try { localStorage.setItem("tdv-cart", JSON.stringify(cart)); } catch {} };

  const lineOf = (line) => {
    if (line.kit) {
      const k = KITS.find((x) => x.id === line.kit);
      const full = k.items.reduce((s, id) => s + byId[id].price, 0);
      return { name: k.name, unit: full * (1 - k.off), emoji: k.emoji };
    }
    const p = byId[line.id];
    return { name: p.name, unit: p.price, p };
  };
  const key = (l) => l.kit || l.id;
  const total = () => cart.reduce((s, l) => s + lineOf(l).unit * l.qty, 0);

  function add(line, label) {
    const found = cart.find((l) => key(l) === key(line));
    if (found) found.qty++; else cart.push({ ...line, qty: 1 });
    save(); renderCart();
    const btn = $("#cartBtn");
    btn.classList.remove("bump"); void btn.offsetWidth; btn.classList.add("bump");
    toast(`✈️ ${label} agregado al carrito`);
  }

  function renderCart() {
    const count = cart.reduce((s, l) => s + l.qty, 0);
    $("#cartCount").textContent = count;
    $("#cartCount").classList.toggle("show", count > 0);
    const t = total();
    $("#cartTotal").textContent = money(t);
    $("#transferNote").textContent = t ? `Con transferencia: ${money(t * (1 - CONFIG.descuentoTransferencia))} · o 6 cuotas de ${money(t / 6)}` : "";

    const pct = Math.min(100, (t / CONFIG.envioGratisDesde) * 100);
    $("#fuelFill").style.width = pct + "%";
    $("#fuelFill").classList.toggle("full", pct >= 100);
    $("#fuelLabel").innerHTML = pct >= 100
      ? "⛽ <b>¡Tanque lleno!</b> Tenés envío gratis"
      : `⛽ Te faltan <b>${money(CONFIG.envioGratisDesde - t)}</b> para el envío gratis`;

    $("#cartItems").innerHTML = cart.length ? cart.map((l) => {
      const info = lineOf(l);
      return `<div class="line">
        ${info.p ? art(info.p) : `<div class="art art-kit">${info.emoji}</div>`}
        <div class="line-info">
          <b>${info.name}</b>
          <span class="muted">${money(info.unit)}</span>
          <div class="qty">
            <button data-dec="${key(l)}" aria-label="Quitar uno">−</button>
            <span>${l.qty}</span>
            <button data-inc="${key(l)}" aria-label="Agregar uno">+</button>
          </div>
        </div>
        <b class="line-total">${money(info.unit * l.qty)}</b>
      </div>`;
    }).join("") : `<div class="cart-empty"><div>🛫</div><p>Tu carrito está vacío.<br>¡Preparate para despegar!</p></div>`;
    $("#checkout").disabled = !cart.length;
  }

  function changeQty(k, d) {
    const l = cart.find((x) => key(x) === k);
    if (!l) return;
    l.qty += d;
    if (l.qty <= 0) cart = cart.filter((x) => x !== l);
    save(); renderCart();
  }

  const drawer = $("#drawer"), overlay = $("#overlay");
  const openCart = () => { overlay.hidden = false; drawer.classList.add("open"); drawer.setAttribute("aria-hidden", "false"); };
  const closeCart = () => { drawer.classList.remove("open"); drawer.setAttribute("aria-hidden", "true"); overlay.hidden = true; };
  $("#cartBtn").onclick = openCart;
  $("#closeCart").onclick = closeCart;
  overlay.onclick = () => { closeCart(); closeModal(); };

  const waLink = (text) => `https://wa.me/${CONFIG.whatsapp}${text ? "?text=" + encodeURIComponent(text) : ""}`;
  document.querySelectorAll("[data-wa]").forEach((a) => {
    a.href = waLink("¡Hola Tienda de Vuelo! Quería hacerles una consulta.");
    a.target = "_blank"; a.rel = "noopener";
  });

  $("#checkout").onclick = () => {
    const t = total();
    const lines = cart.map((l) => { const i = lineOf(l); return `• ${l.qty} x ${i.name} — ${money(i.unit * l.qty)}`; });
    const msg = `¡Hola Tienda de Vuelo! Quiero hacer este pedido:\n\n${lines.join("\n")}\n\nTotal: ${money(t)}` +
      (t >= CONFIG.envioGratisDesde ? "\n(Con envío gratis)" : "");
    window.open(waLink(msg), "_blank", "noopener");
  };

  // ---------- Vista rápida ----------
  const modal = $("#modal");
  let current = null;
  function openModal(id) {
    const p = byId[id]; current = p;
    $("#modalArt").innerHTML = art(p, true);
    $("#modalCat").textContent = p.cat;
    $("#modalTitle").textContent = p.name;
    $("#modalDesc").textContent = p.desc;
    $("#modalSpecs").innerHTML = p.specs.map((s) => `<li>${s}</li>`).join("");
    $("#modalPrice").innerHTML = `${p.old ? `<s>${money(p.old)}</s>` : ""}<b>${money(p.price)}</b><span class="muted">6 cuotas sin interés de ${money(p.price / 6)}</span>`;
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add("open"));
    $("#closeModal").focus();
  }
  function closeModal() { modal.classList.remove("open"); modal.hidden = true; }
  $("#closeModal").onclick = closeModal;
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  $("#modalAdd").onclick = () => { add({ id: current.id }, current.name); closeModal(); };
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeModal(); closeCart(); } });

  // Clicks delegados
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-add],[data-view],[data-kit],[data-inc],[data-dec]");
    if (!t) return;
    if (t.dataset.add) add({ id: t.dataset.add }, byId[t.dataset.add].name);
    else if (t.dataset.view) openModal(t.dataset.view);
    else if (t.dataset.kit) add({ kit: t.dataset.kit }, KITS.find((k) => k.id === t.dataset.kit).name);
    else if (t.dataset.inc) changeQty(t.dataset.inc, 1);
    else if (t.dataset.dec) changeQty(t.dataset.dec, -1);
  });

  // ---------- Avisos ----------
  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg; el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
  }

  $("#newsForm").addEventListener("submit", (e) => {
    e.preventDefault();
    e.target.reset();
    toast("¡Bienvenido a bordo! Te vamos a escribir pronto 📬");
  });

  // ---------- Horizonte artificial ----------
  const horizon = $("#horizon");
  let target = { bank: 0, pitch: 0 }, cur = { bank: 0, pitch: 0 }, userMoved = false;
  window.addEventListener("pointermove", (e) => {
    userMoved = true;
    target.bank = ((e.clientX / innerWidth) - 0.5) * 50;
    target.pitch = ((e.clientY / innerHeight) - 0.5) * 30;
  });
  window.addEventListener("deviceorientation", (e) => {
    if (e.gamma == null) return;
    userMoved = true;
    target.bank = Math.max(-35, Math.min(35, e.gamma));
    target.pitch = Math.max(-15, Math.min(15, (e.beta || 45) - 45));
  });
  function loop(t) {
    if (!userMoved) { target.bank = Math.sin(t / 1800) * 12; target.pitch = Math.sin(t / 2600) * 5; }
    cur.bank += (target.bank - cur.bank) * 0.06;
    cur.pitch += (target.pitch - cur.pitch) * 0.06;
    horizon.style.transform = `rotate(${-cur.bank}deg) translateY(${cur.pitch * 2}px)`;
    requestAnimationFrame(loop);
  }
  if (!reduceMotion) requestAnimationFrame(loop);

  // ---------- Animaciones al hacer scroll ----------
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
  }), { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  window.addEventListener("scroll", () => $("#nav").classList.toggle("scrolled", scrollY > 30), { passive: true });
  $("#year").textContent = new Date().getFullYear();

  render();
  renderCart();
})();
