// Catálogo para Instagram, Facebook y WhatsApp (Meta Commerce Manager): una planilla que Meta lee sola cada día.
import { DB_URL, ensureSchema, fromRow, q, redondear, valorDolar } from "../_lib.js";

const SITIO = "https://www.tiendadevuelo.com.ar";
const cel = (v) => { const s = String(v ?? "").replace(/\s+/g, " ").trim(); return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

export default async function handler(req, res) {
  if (req.query.formato === "google") return google(req, res);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  const cols = ["id", "title", "description", "availability", "condition", "price", "sale_price", "link", "image_link", "additional_image_link", "brand", "product_type"];
  if (!DB_URL) return res.status(200).send(cols.join(",") + "\n");
  try {
    await ensureSchema();
    const [{ rows }, dolar] = await Promise.all([q("select * from tdv_productos where visible order by orden, creado"), valorDolar()]);
    const filas = [];
    for (const r of rows) {
      const p = fromRow(r);
      if (!p.fotos?.length || (p.usd === null && p.ars === null)) continue; // Meta exige foto y precio
      const pesos = (n) => (p.usd !== null ? redondear(n * dolar) : n);
      const actual = pesos(p.usd ?? p.ars);
      const precio = p.antes ? pesos(p.antes) : actual;
      filas.push([p.id, p.name, (p.desc || [p.brand, p.model, p.cat].filter(Boolean).join(" ")).slice(0, 4900),
        p.agotado ? "out of stock" : p.llega ? "preorder" : "in stock", p.reacond ? "refurbished" : "new",
        `${precio}.00 ARS`, p.antes ? `${actual}.00 ARS` : "", `${SITIO}/producto/${p.id}`, p.fotos[0], p.fotos.slice(1, 10).join(","), p.brand || "Tienda de Vuelo", p.cat].map(cel).join(","));
    }
    res.status(200).send(cols.join(",") + "\n" + filas.join("\n") + "\n");
  } catch (e) { console.error(e); res.status(500).send(cols.join(",") + "\n"); }
}

// Google Merchant Center: texto separado por tabulaciones, con los nombres de campo de Google
async function google(req, res) {
  res.setHeader("Content-Type", "text/tab-separated-values; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  const cols = ["id", "title", "description", "link", "image_link", "additional_image_link", "availability", "price", "sale_price", "brand", "condition", "identifier_exists", "product_type"];
  const limpio = (v) => String(v ?? "").replace(/[\t\r\n]+/g, " ").trim();
  if (!DB_URL) return res.status(200).send(cols.join("\t") + "\n");
  try {
    await ensureSchema();
    const [{ rows }, dolar] = await Promise.all([q("select * from tdv_productos where visible order by orden, creado"), valorDolar()]);
    const filas = [];
    for (const r of rows) {
      const p = fromRow(r);
      if (!p.fotos?.length || (p.usd === null && p.ars === null)) continue;
      const pesos = (n) => (p.usd !== null ? redondear(n * dolar) : n);
      const actual = pesos(p.usd ?? p.ars), precio = p.antes ? pesos(p.antes) : actual;
      const foto = (u) => (String(u).startsWith("/") ? SITIO + u : u);
      filas.push([p.id, p.name, p.desc || p.name, `${SITIO}/producto/${p.id}`, foto(p.fotos[0]), p.fotos.slice(1, 10).map(foto).join(","),
        p.agotado ? "out_of_stock" : p.llega ? "preorder" : "in_stock", `${precio}.00 ARS`, p.antes ? `${actual}.00 ARS` : "", p.brand || "Tienda de Vuelo",
        p.reacond ? "refurbished" : "new", "no", p.cat].map(limpio).join("\t"));
    }
    res.status(200).send(cols.join("\t") + "\n" + filas.join("\n") + "\n");
  } catch (e) { console.error(e); res.status(500).send(cols.join("\t") + "\n"); }
}
