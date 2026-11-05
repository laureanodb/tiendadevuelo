// Página de ayuda para cargar el catálogo de WhatsApp Business (catalogo-whatsapp.html).
(() => {
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = (n) => Number(n).toLocaleString("es-AR");
  const CLAVE = "tdv-wa-cargados";
  let hechos = new Set();
  try { hechos = new Set(JSON.parse(localStorage.getItem(CLAVE) || "[]")); } catch {}
  const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify([...hechos])); } catch {} };
  const lista = PRODUCTS.filter((p) => !p.agotado);
  const imagen = (p) => `/img/wa/${p.id}.jpg`;
  const link = (p) => `${CONFIG.sitio}/producto/${p.id}`;
  const precio = (p) => p.usd ? `Precio: US$ ${num(p.usd)} (en pesos al dólar del día).` : p.ars ? `Precio: $${num(p.ars)}.` : "Precio: consultanos por este chat.";
  const descripcion = (p) => [
    p.desc || "",
    (p.specs || []).slice(0, 4).map((s) => "• " + s).join("\n"),
    p.variantes?.length ? "Opciones: " + p.variantes.map((v) => String(v).split("|")[0].trim()).join(" · ") : "",
    p.oficial ? "Distribuidor oficial: garantía oficial del fabricante." : "",
    precio(p),
    "Envíos a todo el país, en el día en CABA o retiro en CABA.",
  ].filter(Boolean).join("\n\n").slice(0, 2000);
  const nombre = (p) => String(p.name).slice(0, 100);
  const cats = [...new Set(lista.map((p) => p.cat))];
  const textos = {};
  const campo = (t, v, k) => { textos[k] = v; return `<div class="campo"><b>${t}</b><div class="valor"><div>${esc(v)}</div><button class="btn" type="button" data-copiar="${esc(k)}" aria-label="Copiar ${t.toLowerCase()}">Copiar</button></div></div>`; };
  // ---------- Perfil de empresa: imágenes y textos ----------
  const wa = CONFIG.whatsappVisible, sitio = CONFIG.sitio.replace(/^https:\/\/(www\.)?/, "");
  const IMAGENES = [
    ["logo-azul", "Foto de perfil (recomendada)"], ["logo-blanco", "Foto de perfil · blanco"], ["logo-celeste", "Foto de perfil · celeste"],
    ["portada", "Portada del perfil"], ["estado-1-como-comprar", "Estado: cómo comprar"], ["estado-2-bose-oficial", "Estado: Bose oficial"], ["estado-3-envios", "Estado: envíos"],
  ];
  const PERFIL = [
    ["Descripción del perfil", `Pilot shop en Argentina. Auriculares, radios, aviónica y accesorios originales para pilotos. Distribuidor oficial Bose · ${CONFIG.ventas} ventas. Precios en dólares y en pesos al dólar del día. Envíos a todo el país, en el día en CABA y retiro en CABA.`],
    ["Sitio web 1", CONFIG.sitio], ["Sitio web 2 (tarjeta)", CONFIG.sitio + "/tarjeta"],
    ["Mensaje de bienvenida", `¡Hola! Gracias por escribir a Tienda de Vuelo ✈️\nMientras te respondemos, podés ver el catálogo con precios en ${sitio}\nSi ya sabés qué buscás, contanos el producto y el avión en que volás, así te recomendamos la ficha correcta.`],
    ["Mensaje de ausencia", `Gracias por escribir a Tienda de Vuelo. Ahora estamos fuera de horario: te respondemos desde las ${CONFIG.horario?.desde ?? 9} h.\nPodés armar tu pedido en ${sitio} y mandarlo por acá; queda registrado.`],
    ["Mensaje del link corto", "¡Hola! Quiero consultar por un producto"],
  ];
  const RAPIDAS = [
    ["/pago", "Podés pagar por transferencia en pesos o en dólares, en efectivo al retirar o en dólares billete. Para reservar alcanza con una seña, que dura 48 h."],
    ["/envio", `Despachamos en 48 h hábiles a todo el país por Andreani, Correo Argentino o Vía Cargo. En CABA hacemos envíos en el día en moto. El envío se cotiza aparte según destino. Más info: ${sitio}/envios`],
    ["/ficha", `¿En qué avión volás? Los de escuela usan Dual plug, los que alimentan el auricular desde el panel usan LEMO y los Airbus, XLR. Te ayudamos a elegir: ${sitio}/aviones`],
    ["/bose", "Somos distribuidores oficiales de Bose en Argentina: el A30 tiene garantía oficial del fabricante y te ayudamos a gestionarla."],
    ["/retiro", "Podés retirar en CABA. Decime qué día te queda cómodo y coordinamos el horario."],
    ["/datos", "Para armar el envío necesito: nombre y apellido, DNI, dirección con código postal y un teléfono."],
    ["/gracias", "¡Gracias por tu compra! Cualquier duda con el equipo, escribinos por acá. Buenos vuelos ✈️"],
    ["/turno", `Si querés, te asesoramos por videollamada para elegir el equipo: reservá tu turno en ${sitio}/asesoramiento`],
    ["/catalogo", `Te paso el catálogo completo con precios al día: ${sitio}`],
  ];
  const ETIQUETAS = ["🆕 Nuevo pedido", "💰 Esperando pago", "📦 Para despachar", "✅ Entregado", "🔴 Urgente", "🎁 Regalo", "🛩️ Aeródromo", "🏪 Revendedor", "🎓 Escuela"];
  $("#perfil").innerHTML = `<h2 style="font-size:26px">Perfil de empresa</h2>
    <p class="muted">Se carga en <b>Configuración → Herramientas para la empresa → Perfil de empresa</b>. Categoría sugerida: <b>Compras y ventas minoristas</b>. Dirección: solo “CABA, Buenos Aires”.</p>
    <div class="galeria">${IMAGENES.map(([f, t]) => `<figure><img src="/img/wa/perfil/${f}.jpg" alt="${esc(t)}" loading="lazy"><figcaption>${esc(t)}</figcaption><a class="btn btn-pri" href="/img/wa/perfil/${f}.jpg" download="${f}.jpg">⬇ Descargar</a></figure>`).join("")}</div>
    <h2>Textos del perfil y mensajes automáticos</h2>
    <p class="muted">Bienvenida y ausencia: <b>Herramientas para la empresa → Mensaje de bienvenida / Mensaje de ausencia</b> (ausencia: “Fuera del horario comercial”).</p>
    ${PERFIL.map(([t, v], i) => campo(t, v, "p:" + i)).join("")}
    <h2>Respuestas rápidas</h2>
    <p class="muted"><b>Herramientas para la empresa → Respuestas rápidas → ＋</b>. Pegá el atajo y el mensaje; después en un chat escribís “/” y aparecen.</p>
    <div class="rapidas">${RAPIDAS.map(([a, v]) => campo(a, v, "r:" + a)).join("")}</div>
    <h2>Etiquetas</h2>
    <p class="muted">En la lista de chats: mantené apretado un chat → ícono de etiqueta → Nueva etiqueta. Son las mismas del panel.</p>
    <p>${ETIQUETAS.map((e) => `<span class="btn" style="cursor:default;margin:0 6px 6px 0">${e}</span>`).join("")}</p>`;

  $("#lista").innerHTML = cats.map((c) => {
    const ps = lista.filter((p) => p.cat === c);
    textos["col:" + c] = c;
    return `<h2>${esc(c)}</h2><div class="col"><span>Colección <b>“${esc(c)}”</b> · ${ps.length} producto${ps.length === 1 ? "" : "s"}</span><button class="btn" type="button" data-copiar="${esc("col:" + c)}">Copiar nombre de la colección</button></div>` +
      ps.map((p) => {
        const extra = (p.fotos || []).map((f, i) => `<a class="btn" href="${esc(f)}" download>Foto ${i + 1}</a>`).join("");
        return `<article class="item${hechos.has(p.id) ? " hecho" : ""}">
          <div class="fotos"><img src="${imagen(p)}" alt="${esc(p.name)}" loading="lazy" data-alt="${esc(p.fotos?.[0] || "/img/logo-512.png")}">
            <div class="mas"><a class="btn btn-pri" href="${imagen(p)}" download="${esc(p.id)}.jpg">⬇ Descargar</a>${extra}</div></div>
          <div>${campo("Nombre", nombre(p), "n:" + p.id)}${campo("Descripción", descripcion(p), "d:" + p.id)}${campo("Link", link(p), "l:" + p.id)}${campo("Código del artículo", p.id, "c:" + p.id)}
            <label class="hecho-chk"><input type="checkbox" data-hecho="${esc(p.id)}"${hechos.has(p.id) ? " checked" : ""}> Ya lo cargué</label></div>
        </article>`;
      }).join("");
  }).join("");
  // Productos nuevos del panel que todavía no tienen imagen de catálogo: se usa su primera foto
  document.querySelectorAll("img[data-alt]").forEach((img) => img.addEventListener("error", () => { if (img.src.includes("/img/wa/")) { img.src = img.dataset.alt; img.nextElementSibling.firstElementChild.href = img.dataset.alt; } }, { once: true }));
  const contar = () => ($("#cuenta").textContent = `${lista.filter((p) => hechos.has(p.id)).length} de ${lista.length} cargados`);
  contar();
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-copiar]"); if (!b) return;
    const t = textos[b.dataset.copiar], antes = b.textContent;
    try { await navigator.clipboard.writeText(t); b.textContent = "✓ Copiado"; setTimeout(() => (b.textContent = antes), 1500); } catch { prompt("Copiá el texto:", t); }
  });
  document.addEventListener("change", (e) => {
    const c = e.target.closest("[data-hecho]"); if (!c) return;
    if (c.checked) hechos.add(c.dataset.hecho); else hechos.delete(c.dataset.hecho);
    guardar(); c.closest(".item").classList.toggle("hecho", c.checked); contar();
  });
  $("#zip").onclick = async () => {
    const b = $("#zip"); if (!window.JSZip) return alert("No se pudo cargar el compresor. Descargalas de a una.");
    b.disabled = true; const zip = new JSZip(); let n = 0;
    for (const p of lista) {
      b.textContent = `Preparando ${++n} de ${lista.length}…`;
      try { const r = await fetch(imagen(p)); if (r.ok) zip.file(`${String(n).padStart(2, "0")}-${p.id}.jpg`, await r.blob()); } catch {}
    }
    const a = document.createElement("a"); a.href = URL.createObjectURL(await zip.generateAsync({ type: "blob" })); a.download = "catalogo-whatsapp-tienda-de-vuelo.zip"; a.click();
    b.disabled = false; b.textContent = "⬇ Descargar todas las imágenes (.zip)";
  };
})();
