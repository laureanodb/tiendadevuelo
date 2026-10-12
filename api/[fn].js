// Una sola función para todo lo público de la web (el plan gratis de Vercel permite pocas funciones).
const RUTAS = {
  productos: () => import("./_web/productos.js"),
  pedido: () => import("./_web/pedido.js"),
  seguimiento: () => import("./_web/seguimiento.js"),
  evento: () => import("./_web/evento.js"),
  resenas: () => import("./_web/resenas.js"),
  preguntas: () => import("./_web/preguntas.js"),
  asistente: () => import("./_web/asistente.js"),
  carrito: () => import("./_web/carrito.js"),
  comprobante: () => import("./_web/comprobante.js"),
  nps: () => import("./_web/nps.js"),
  catalogo: () => import("./_web/catalogo.js"),
  envios: () => import("./_web/envios.js"),
  salud: () => import("./_web/salud.js"),
};

export default async function handler(req, res) {
  const cargar = RUTAS[String(req.query.fn || "")];
  if (!cargar) { res.setHeader("Content-Type", "application/json"); return res.status(404).send('{"error":"no_existe"}'); }
  return (await cargar()).default(req, res);
}
