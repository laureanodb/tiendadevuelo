// Trae los productos cargados en el panel. Si el panel todavía no está conectado (o tarda), se usan los de products.js.
(async () => {
  const me = document.currentScript;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 2500);
    const r = await fetch("/api/productos", { signal: ctl.signal });
    clearTimeout(t);
    const d = await r.json();
    if (d.configurado && d.productos.length) {
      PRODUCTS.splice(0, PRODUCTS.length, ...d.productos.map((p) => ({
        ...p, icon: ICONS[p.icon] ? p.icon : "tag",
        fotos: p.fotos && p.fotos.length ? p.fotos : undefined,
        destacado: p.destacado || undefined, variantes: p.variantes && p.variantes.length ? p.variantes : undefined,
      })));
      for (const p of PRODUCTS) {
        if (!CATEGORIES.includes(p.cat)) CATEGORIES.push(p.cat);
        if (!CAT_COLORS[p.cat]) CAT_COLORS[p.cat] = ["#0e8be0", "#d6ebfc"];
      }
      // Los kits solo muestran productos que siguen en la tienda.
      const ids = new Set(PRODUCTS.map((p) => p.id));
      for (let i = KITS.length - 1; i >= 0; i--) {
        KITS[i].items = KITS[i].items.filter((id) => ids.has(id));
        if (KITS[i].items.length < 2) KITS.splice(i, 1);
      }
    }
  } catch { /* se usan los productos de muestra */ }
  for (const src of (me.dataset.load || "").split(",").filter(Boolean)) {
    await new Promise((ok) => { const s = document.createElement("script"); s.src = src; s.onload = s.onerror = ok; document.body.appendChild(s); });
  }
})();
