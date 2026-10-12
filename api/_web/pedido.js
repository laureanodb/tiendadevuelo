// La web guarda cada pedido al mandarlo por WhatsApp, para verlo en el panel y que el cliente lo siga.
import { DB_URL, avisar, body, ensureSchema, permitido, q, send, telWa } from "../_lib.js";

const PROVINCIAS = ["Buenos Aires", "CABA", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán"];
const s = (v, n = 200) => String(v ?? "").trim().slice(0, n);
const n = (v) => (v === null || v === undefined || v === "" || !isFinite(Number(v)) ? null : Math.max(0, Number(v)));

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return send(res, 405, { error: "metodo" });
  if (!DB_URL) return send(res, 200, { guardado: false });
  try {
    const b = body(req);
    const num = s(b.num, 24), token = s(b.token, 24);
    if (!/^TDV-\d{6}-\d{3,5}$/.test(num) || !/^[a-z0-9]{8,24}$/.test(token)) return send(res, 400, { error: "datos" });
    const c = b.cliente || {};
    const cliente = { nombre: s(c.nombre, 80), tel: s(c.tel, 30), dni: s(c.dni, 20), entrega: s(c.entrega, 40), franja: s(c.franja, 40), dir: s(c.dir, 200), notas: s(c.notas, 500), provincia: PROVINCIAS.includes(c.provincia) ? c.provincia : "",
      empresa: s(c.empresa, 40), modo: s(c.modo, 40), aerodromo: s(c.aerodromo, 60), escuela: s(c.escuela, 80) };
    const cumple = /^\d{4}-\d{2}-\d{2}$/.test(String(c.cumple || "")) ? c.cumple : null;
    if (!cliente.nombre || !cliente.tel) return send(res, 400, { error: "datos" });
    const items = (Array.isArray(b.items) ? b.items : []).slice(0, 40).map((i) => ({
      id: s(i.id, 80), kit: s(i.kit, 80), name: s(i.name, 120), sub: s(i.sub, 300), qty: Math.min(99, Math.max(1, parseInt(i.qty) || 1)),
      label: s(i.label, 80), unitArs: n(i.unitArs), usd: n(i.usd),
    }));
    if (!items.length) return send(res, 400, { error: "datos" });
    await ensureSchema();
    if (!(await permitido(req, "pedido", 12))) return send(res, 429, { guardado: false });
    const tel = telWa(cliente.tel);
    const carrito = /^[a-z0-9]{8,24}$/.test(s(b.carrito, 24)) ? s(b.carrito, 24) : "";
    const { rowCount: nuevo } = await q(`insert into tdv_pedidos (num, token, cliente_tel, cliente, items, total_ars, usd_sub, historial, carrito)
             values ($1, $2, $3, $4, $5, $6, $7, $8, $9) on conflict (num) do nothing`,
      [num, token, tel, cliente, JSON.stringify(items), n(b.totalArs), n(b.usdSub), JSON.stringify([{ estado: "nuevo", at: new Date().toISOString() }]), carrito]);
    if (carrito) await q("update tdv_carritos set estado = 'convertido', actualizado = now() where id = $1", [carrito]);
    if (tel) {
      await q(`insert into tdv_clientes (tel, nombre, dni, cumple, escuela) values ($1, $2, $3, $4, $5)
               on conflict (tel) do update set nombre = excluded.nombre, dni = coalesce(nullif(excluded.dni, ''), tdv_clientes.dni),
                 cumple = coalesce(excluded.cumple, tdv_clientes.cumple), escuela = coalesce(nullif(excluded.escuela, ''), tdv_clientes.escuela)`, [tel, cliente.nombre, cliente.dni, cumple, cliente.escuela]);
    }
    if (nuevo) await avisar(`✈ Pedido nuevo ${num}\n${cliente.nombre} · ${cliente.entrega}\n${items.map((i) => `${i.qty} x ${i.name}`).join("\n")}${n(b.totalArs) ? `\nTotal aprox.: $${Math.round(n(b.totalArs)).toLocaleString("es-AR")}` : ""}\nhttps://www.tiendadevuelo.com.ar/panel#pedidos`);
    send(res, 200, { guardado: true });
  } catch (e) {
    console.error(e);
    send(res, 200, { guardado: false });
  }
}
