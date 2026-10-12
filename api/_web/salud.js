// Estado de la web para el aviso de caídas (UptimeRobot u otro): 200 si todo anda, 503 si falla la base.
import { DB_URL, q } from "../_lib.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json");
  if (!DB_URL) return res.status(503).send('{"ok":false,"base":false}');
  try {
    const t = Date.now();
    await Promise.race([q("select 1"), new Promise((_, mal) => setTimeout(() => mal(new Error("lenta")), 8000))]);
    res.status(200).send(JSON.stringify({ ok: true, base: true, ms: Date.now() - t }));
  } catch (e) { console.error(e); res.status(503).send('{"ok":false,"base":false}'); }
}
