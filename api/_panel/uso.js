// Panel: cuánto se usa del plan gratis (base de datos y archivos de Supabase).
import { panel, send, usoPlan } from "../_lib.js";

export default panel(async (req, res) => {
  try { send(res, 200, await usoPlan()); } catch (e) { console.error(e); send(res, 502, { mensaje: "No pude medir el uso ahora." }); }
});
