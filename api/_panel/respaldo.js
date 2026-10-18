// Panel: copias de seguridad. GET lista las guardadas; ?descargar=ahora arma una al momento; ?descargar=<archivo> baja una guardada.
import { armarRespaldo, bajarPrivado, fotosListas, listarPrivado, panel, send } from "../_lib.js";

export default panel(async (req, res) => {
  if (req.method !== "GET") return send(res, 405, { error: "metodo" });
  const d = String(req.query.descargar || "");
  if (!d) return send(res, 200, { guardadas: fotosListas() ? await listarPrivado("respaldos/") : [], almacenamiento: fotosListas() });
  let buffer, nombre;
  if (d === "ahora") {
    buffer = Buffer.from(JSON.stringify(await armarRespaldo()));
    nombre = `tienda-de-vuelo-${new Date().toISOString().slice(0, 10)}.json`;
  } else {
    if (!/^[\w-]+\.json$/.test(d)) return send(res, 400, { mensaje: "Archivo inválido." });
    const f = await bajarPrivado(`respaldos/${d}`);
    if (!f) return send(res, 404, { mensaje: "No encontré esa copia." });
    buffer = f.buffer; nombre = `tienda-de-vuelo-${d}`;
  }
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${nombre}"`);
  res.status(200).send(buffer);
}, { soloDueno: true });
