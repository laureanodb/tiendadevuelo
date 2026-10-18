// Panel: la IA completa un producto a partir de una foto, o redacta la descripción. Solo con ANTHROPIC_API_KEY.
import fs from "node:fs";
import vm from "node:vm";
import Anthropic from "@anthropic-ai/sdk";
import { body, panel, q, send } from "../_lib.js";

const KEY = process.env.ANTHROPIC_API_KEY || "";
const LIMITE_DIA = 150; // para cuidar el gasto (unos centavos de dólar por consulta)

function datosWeb() {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(new URL("../../products.js", import.meta.url), "utf8") + ";this.__d={CATEGORIES,ETAPAS,ICONS}", ctx);
  return ctx.__d;
}

export default panel(async (req, res) => {
  if (!KEY) return send(res, 503, { mensaje: "Falta activar la IA: agregá ANTHROPIC_API_KEY en Vercel." });
  const { rows } = await q("select count(*)::int as n from tdv_eventos where tipo = 'ia_panel' and creado > now() - interval '1 day'");
  if (rows[0].n >= LIMITE_DIA) return send(res, 429, { mensaje: "Por hoy se usó mucho la IA. Probá mañana." });
  await q("insert into tdv_eventos (tipo, dato) values ('ia_panel', $1)", [req.usuario.id]);

  const b = body(req);
  const { CATEGORIES, ETAPAS, ICONS } = datosWeb();
  const cats = [...new Set([...CATEGORIES, ...(Array.isArray(b.categorias) ? b.categorias.map(String).slice(0, 30) : [])])];
  const tono = "Escribí en español rioplatense, tono técnico y profesional, sin exageraciones ni signos de exclamación. No inventes datos que no se vean o no conozcas con seguridad: si dudás de un dato (por ejemplo, la atenuación exacta), dejalo afuera.";
  let content, schema;
  if (b.modo === "foto") {
    if (typeof b.imagen !== "string" || b.imagen.length < 1000 || b.imagen.length > 6e6) return send(res, 400, { mensaje: "Subí una foto del producto." });
    schema = {
      type: "object", additionalProperties: false,
      required: ["name", "brand", "model", "cat", "icon", "desc", "specs", "etapas"],
      properties: {
        name: { type: "string", description: "Nombre corto y claro para la tienda, sin la marca (ej.: Auricular ANR con Bluetooth)" },
        brand: { type: "string", description: "Marca si se reconoce con seguridad; si no, vacío" },
        model: { type: "string", description: "Modelo si se reconoce con seguridad; si no, vacío" },
        cat: { type: "string", enum: cats },
        icon: { type: "string", enum: Object.keys(ICONS) },
        desc: { type: "string", description: "Descripción de 1 a 3 oraciones para la ficha" },
        specs: { type: "array", items: { type: "string" }, description: "3 a 6 características. Usá el formato 'Clave: valor' cuando sea un dato técnico (ej.: 'Fichas: GA dual')" },
        etapas: { type: "array", items: { type: "string", enum: Object.keys(ETAPAS) }, description: "Para quién es ideal" },
      },
    };
    content = [
      { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b.imagen } },
      { type: "text", text: `Es una foto de un producto para un pilot shop argentino (Tienda de Vuelo). Completá los datos para cargarlo en el catálogo. ${tono}${b.nota ? `\nDato del vendedor: ${String(b.nota).slice(0, 300)}` : ""}` },
    ];
  } else if (b.modo === "post") {
    schema = { type: "object", additionalProperties: false, required: ["texto"], properties: { texto: { type: "string", description: "Texto listo para publicar en Instagram, con 3 a 6 hashtags al final" } } };
    content = [{ type: "text", text: `Mejorá este texto para una publicación de Instagram de Tienda de Vuelo (@tiendadevueloar), un pilot shop argentino. Mantené los datos (precio, link, WhatsApp) tal cual. Máximo 900 caracteres. Sin emojis en exceso (2 como mucho). ${tono}\n\nTexto:\n${String(b.texto || "").slice(0, 1500)}` }];
  } else {
    const p = b.producto || {};
    schema = { type: "object", additionalProperties: false, required: ["desc"], properties: { desc: { type: "string", description: "Descripción de 2 a 4 oraciones" } } };
    content = [{ type: "text", text: `Redactá la descripción de este producto para la ficha de un pilot shop argentino (Tienda de Vuelo). Que explique para qué sirve y a quién le conviene. ${tono}\n\nProducto: ${String(p.name || "").slice(0, 120)}\nMarca y modelo: ${String(p.brand || "").slice(0, 60)} ${String(p.model || "").slice(0, 60)}\nCategoría: ${String(p.cat || "").slice(0, 40)}\nCaracterísticas: ${(Array.isArray(p.specs) ? p.specs : String(p.specs || "").split("\n")).slice(0, 12).join("; ").slice(0, 800)}\nDescripción actual: ${String(p.desc || "").slice(0, 600)}` }];
  }
  try {
    const client = new Anthropic({ apiKey: KEY });
    const r = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 1500,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema } },
      messages: [{ role: "user", content }],
    });
    if (r.stop_reason === "refusal") return send(res, 422, { mensaje: "La IA no pudo con esta foto. Probá con otra." });
    const texto = r.content.filter((x) => x.type === "text").map((x) => x.text).join("");
    send(res, 200, { datos: JSON.parse(texto) });
  } catch (e) {
    console.error(e);
    send(res, e instanceof Anthropic.RateLimitError ? 429 : 502, { mensaje: "La IA no respondió. Probá de nuevo en un momento." });
  }
});
