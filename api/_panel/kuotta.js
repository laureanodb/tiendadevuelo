// Panel: ver y aplicar el stock (y precios) que vienen de Kuotta.
import { body, panel, send } from "../_lib.js";
import { aplicarKuotta, compararKuotta, kuottaListo } from "../_kuotta.js";

export default panel(async (req, res) => {
  if (!kuottaListo()) return send(res, 200, { listo: false });
  try {
    if (req.method === "POST") return send(res, 200, { listo: true, ...(await aplicarKuotta({ precios: !!body(req).precios, quien: req.usuario })) });
    send(res, 200, { listo: true, ...(await compararKuotta()) });
  } catch (e) {
    send(res, 502, { error: "kuotta", mensaje: e.message || "No se pudo leer Kuotta." });
  }
}, { soloDueno: true });
