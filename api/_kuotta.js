// Conexión con Kuotta (la app de cobranzas): trae el stock (y si querés, el
// precio de contado en dólares) de cada producto, vinculado por el CÓDIGO.
// Necesita en Vercel: KUOTTA_URL (ej. https://app.kuotta.com.ar) y
// KUOTTA_FEED_SECRET (la misma clave que CATALOG_FEED_SECRET en Kuotta).
import { anotar, q } from "./_lib.js";

const env = process.env;
export const kuottaListo = () => !!(env.KUOTTA_URL && env.KUOTTA_FEED_SECRET);
const norm = (s) => String(s || "").trim().toUpperCase();

export async function leerKuotta() {
  const r = await fetch(`${env.KUOTTA_URL.replace(/\/$/, "")}/api/catalogo-feed`, {
    headers: { authorization: `Bearer ${env.KUOTTA_FEED_SECRET}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error(r.status === 401 ? "Kuotta no aceptó la clave: revisá KUOTTA_FEED_SECRET." : `Kuotta no respondió (${r.status}).`);
  const d = await r.json();
  return Array.isArray(d.products) ? d.products : [];
}

/** Qué cambiaría: productos vinculados por código, con su stock y precio en la web y en Kuotta. */
export async function compararKuotta() {
  const kuotta = await leerKuotta();
  const porCodigo = new Map(kuotta.map((k) => [norm(k.code), k]));
  const { rows } = await q("select id, name, codigo, stock, usd from tdv_productos order by orden, creado");
  const vinculados = [];
  const sinMatch = [];
  for (const p of rows) {
    if (!norm(p.codigo)) continue;
    const k = porCodigo.get(norm(p.codigo));
    if (!k) { sinMatch.push({ id: p.id, name: p.name, codigo: p.codigo }); continue; }
    const usdWeb = p.usd === null ? null : Number(p.usd);
    vinculados.push({
      id: p.id, name: p.name, codigo: p.codigo,
      stockWeb: p.stock, stockKuotta: k.stock,
      usdWeb, usdKuotta: k.priceUsd ?? null,
      // Si en Kuotta no se lleva stock de ese producto (null), la web deja el suyo.
      cambiaStock: k.stock !== null && k.stock !== undefined && p.stock !== k.stock,
      cambiaPrecio: k.priceUsd > 0 && usdWeb !== Number(k.priceUsd),
    });
  }
  const usados = new Set(rows.map((p) => norm(p.codigo)).filter(Boolean));
  const soloKuotta = kuotta.filter((k) => !usados.has(norm(k.code)) && (k.inCatalog || (k.stock ?? 0) > 0)).map((k) => ({ code: k.code, name: k.name, stock: k.stock }));
  return { vinculados, sinMatch, soloKuotta, sinCodigo: rows.filter((p) => !norm(p.codigo)).length };
}

/** Aplica el stock de Kuotta (y el precio, si se pide) a los productos vinculados. */
export async function aplicarKuotta({ precios = false, quien = null } = {}) {
  const c = await compararKuotta();
  let stock = 0, precio = 0;
  const antes = [];
  for (const v of c.vinculados) {
    if (!v.cambiaStock && !(precios && v.cambiaPrecio)) continue;
    antes.push({ id: v.id, stock: v.stockWeb, usd: v.usdWeb });
    if (v.cambiaStock) { await q("update tdv_productos set stock = $1, actualizado = now() where id = $2", [v.stockKuotta, v.id]); stock++; }
    if (precios && v.cambiaPrecio) { await q("update tdv_productos set usd = $1, actualizado = now() where id = $2", [v.usdKuotta, v.id]); precio++; }
  }
  if (stock || precio) await anotar("kuotta", "", "Sincronización con Kuotta", `Desde Kuotta: ${stock} stock${precio ? ` y ${precio} precios` : ""}`, antes, quien);
  return { stock, precio, vinculados: c.vinculados.length };
}
