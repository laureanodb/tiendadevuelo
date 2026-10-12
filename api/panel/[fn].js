// Una sola función para todo el panel (el plan gratis de Vercel permite pocas funciones).
const RUTAS = {
  sesion: () => import("../_panel/sesion.js"),
  productos: () => import("../_panel/productos.js"),
  foto: () => import("../_panel/foto.js"),
  precios: () => import("../_panel/precios.js"),
  importar: () => import("../_panel/importar.js"),
  pedidos: () => import("../_panel/pedidos.js"),
  clientes: () => import("../_panel/clientes.js"),
  actividad: () => import("../_panel/actividad.js"),
  resenas: () => import("../_panel/resenas.js"),
  preguntas: () => import("../_panel/preguntas.js"),
  ajustes: () => import("../_panel/ajustes.js"),
  comprobante: () => import("../_panel/comprobante.js"),
  carritos: () => import("../_panel/carritos.js"),
  cambios: () => import("../_panel/cambios.js"),
  ventas: () => import("../_panel/ventas.js"),
  gastos: () => import("../_panel/gastos.js"),
};

export default async function handler(req, res) {
  const cargar = RUTAS[String(req.query.fn || "")];
  if (!cargar) { res.setHeader("Content-Type", "application/json"); return res.status(404).send('{"error":"no_existe"}'); }
  return (await cargar()).default(req, res);
}
