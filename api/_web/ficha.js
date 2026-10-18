// Página de producto, marca o categoría armada en el servidor: título, descripción, foto y precio en el HTML,
// para que Google la lea completa y al compartir el link por WhatsApp salga con foto. El resto lo sigue haciendo la web.
import fs from "node:fs";
import vm from "node:vm";
import { DB_URL, ensureSchema, fromRow, q, redondear, valorDolar } from "../_lib.js";

const SITIO = "https://www.tiendadevuelo.com.ar";
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const slug = (s) => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const abs = (u) => (String(u).startsWith("/") ? SITIO + u : u);
let base = null, web = null;
const html = () => (base ??= fs.readFileSync(new URL("../../index.html", import.meta.url), "utf8"));
function datosWeb() {
  if (web) return web;
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(new URL("../../products.js", import.meta.url), "utf8") + ";this.__d={PRODUCTS,MARCAS,CAT_INFO}", ctx);
  return (web = ctx.__d);
}
async function productos() {
  if (DB_URL) {
    try {
      await ensureSchema();
      const { rows } = await q("select * from tdv_productos where visible order by orden, creado");
      if (rows.length) return rows.map((r) => fromRow(r)).filter((p) => !p.agotado);
    } catch (e) { console.error(e); }
  }
  return datosWeb().PRODUCTS;
}
function cabecera(h, { titulo, desc, url, img, tipo = "website", extra = "" }) {
  const reemplazar = (re, nuevo) => { h = h.replace(re, nuevo); };
  reemplazar(/<title>.*?<\/title>/, `<title>${esc(titulo)}</title>`);
  reemplazar(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(desc)}">`);
  reemplazar(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${esc(url)}">`);
  reemplazar(/<meta property="og:type" content="[^"]*">/, `<meta property="og:type" content="${tipo}">`);
  reemplazar(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(titulo)}">`);
  reemplazar(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(desc)}">`);
  reemplazar(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${esc(url)}">`);
  if (img) {
    reemplazar(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${esc(img)}">`);
    reemplazar(/<meta property="og:image:width" content="[^"]*">\s*<meta property="og:image:height" content="[^"]*">/, '<meta property="og:image:width" content="1200">\n  <meta property="og:image:height" content="1200">');
  }
  return h.replace("</head>", extra + "\n</head>");
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400");
  const tipo = String(req.query.tipo || "producto"), id = String(req.query.id || "").slice(0, 100);
  let h = html();
  try {
    const lista = await productos();
    if (tipo === "producto") {
      const p = lista.find((x) => x.id === id);
      if (!p) { res.status(404); return res.send(cabecera(h, { titulo: "Producto no encontrado · Tienda de Vuelo", desc: "Ese producto ya no está en la tienda. Mirá el catálogo completo.", url: SITIO + "/" }).replace("<head>", '<head>\n  <meta name="robots" content="noindex">')); }
      const dolar = p.usd ? await valorDolar() : null;
      const pesos = p.usd ? redondear(p.usd * dolar) : p.ars;
      const precioTxt = p.usd ? `US$ ${p.usd} (≈ $${pesos.toLocaleString("es-AR")})` : p.ars ? `$${Number(p.ars).toLocaleString("es-AR")}` : "";
      const titulo = `${p.name}${precioTxt ? " · " + precioTxt : ""} · Tienda de Vuelo`;
      const desc = `${p.desc || p.name}`.slice(0, 155) + (precioTxt ? "" : " Consultá el precio.") + " Envíos a todo el país.";
      const fotos = (p.fotos || []).map(abs);
      const ld = {
        "@context": "https://schema.org", "@type": "Product", name: p.name, description: p.desc || p.name, sku: p.id,
        ...(fotos.length ? { image: fotos } : {}), ...(p.brand ? { brand: { "@type": "Brand", name: p.brand } } : {}), ...(p.model ? { model: p.model } : {}),
        ...(p.rating ? { aggregateRating: { "@type": "AggregateRating", ratingValue: p.rating, reviewCount: p.resenas } } : {}),
        ...(p.usd || p.ars ? { offers: { "@type": "Offer", url: `${SITIO}/producto/${p.id}`, priceCurrency: p.usd ? "USD" : "ARS", price: p.usd || p.ars,
          availability: p.llega ? "https://schema.org/PreOrder" : "https://schema.org/InStock", itemCondition: p.reacond ? "https://schema.org/RefurbishedCondition" : "https://schema.org/NewCondition",
          seller: { "@type": "Organization", name: "Tienda de Vuelo" } } } : {}),
      };
      const faq = p.faqs?.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: p.faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) } : null;
      const miga = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: SITIO + "/" },
        { "@type": "ListItem", position: 2, name: p.cat, item: `${SITIO}/categoria/${slug(p.cat)}` },
        { "@type": "ListItem", position: 3, name: p.name, item: `${SITIO}/producto/${p.id}` }] };
      const ldTxt = [ld, faq, miga].filter(Boolean).map((x) => `  <script type="application/ld+json">${JSON.stringify(x).replace(/</g, "\\u003c")}</script>`).join("\n");
      return res.status(200).send(cabecera(h, { titulo, desc, url: `${SITIO}/producto/${p.id}`, img: fotos[0], tipo: "product",
        extra: ldTxt + (pesos ? `\n  <meta property="product:price:amount" content="${pesos}">\n  <meta property="product:price:currency" content="ARS">` : "") }));
    }
    if (tipo === "marca" || tipo === "categoria") {
      const { MARCAS, CAT_INFO } = datosWeb();
      const nombre = tipo === "marca" ? [...new Set(lista.map((p) => p.brand).filter(Boolean))].find((b) => slug(b) === id) : [...new Set(lista.map((p) => p.cat))].find((c) => slug(c) === id);
      if (nombre) {
        const items = lista.filter((p) => (tipo === "marca" ? p.brand : p.cat) === nombre);
        const titulo = tipo === "marca" ? `${nombre} en Argentina${MARCAS[nombre]?.oficial ? " · Distribuidor oficial" : ""} · Tienda de Vuelo` : `${nombre} para pilotos · Tienda de Vuelo`;
        const desc = (tipo === "marca" ? MARCAS[nombre]?.texto : CAT_INFO[nombre]) || `${nombre}: productos originales para pilotos con envío a todo el país.`;
        const foto = items.find((p) => p.fotos?.length)?.fotos[0];
        const lst = { "@context": "https://schema.org", "@type": "ItemList", name: nombre, itemListElement: items.slice(0, 30).map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITIO}/producto/${p.id}`, name: p.name })) };
        return res.status(200).send(cabecera(h, { titulo, desc, url: `${SITIO}/${tipo}/${id}`, img: foto && abs(foto), extra: `  <script type="application/ld+json">${JSON.stringify(lst).replace(/</g, "\\u003c")}</script>` }));
      }
    }
  } catch (e) { console.error(e); }
  res.status(200).send(h);
}
