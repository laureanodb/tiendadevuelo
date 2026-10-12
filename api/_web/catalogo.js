// Catálogo para Instagram, Facebook y WhatsApp (Meta Commerce Manager): una planilla que Meta lee sola cada día.
import { DB_URL, ensureSchema, fromRow, q, redondear, valorDolar } from "../_lib.js";

const SITIO = "https://www.tiendadevuelo.com.ar";
const cel = (v) => { const s = String(v ?? "").replace(/\s+/g, " ").trim(); return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

export default async function handler(req, res) {
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
