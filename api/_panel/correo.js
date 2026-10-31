// Panel: revisa en vivo la configuración del mail del dominio (MX, SPF, DKIM y DMARC) y propone los registros correctos.
import { panel, send } from "../_lib.js";

const DOMINIO = "tiendadevuelo.com.ar";
async function txt(nombre, tipo = "TXT") {
  const r = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(nombre)}&type=${tipo}`);
  const d = await r.json();
  return (d.Answer || []).map((a) => String(a.data || "").replace(/^"|"$/g, "").replace(/" "/g, ""));
}

export default panel(async (req, res) => {
  try {
    const [mx, raiz, dmarc, dkimDef, dkimGoogle] = await Promise.all([txt(DOMINIO, "MX"), txt(DOMINIO), txt("_dmarc." + DOMINIO), txt("default._domainkey." + DOMINIO), txt("google._domainkey." + DOMINIO)]);
    const spf = raiz.filter((x) => /^v=spf1/i.test(x));
    // SPF: un solo registro y cada parte separada por espacios (un error común es "ip4:1.2.3.4include:...")
    const spfMal = spf.length === 1 && /(\d)(include:|a:|mx:|ip4:)/i.test(spf[0]);
    const ip = (spf[0] || "").match(/ip4:([\d.]+)/)?.[1];
    const spfSugerido = spf[0] ? spf[0].replace(/(\d)(include:|a:|mx:|ip4:)/gi, "$1 $2") : (mx.length ? "v=spf1 +a +mx ~all" : "");
    const items = [
      { clave: "mx", nombre: "Recepción de mails (MX)", ok: mx.length > 0, valor: mx.join(", ") || "Sin registro", ayuda: mx.length ? "" : "El dominio no tiene servidor de mail configurado." },
      { clave: "spf", nombre: "SPF (quién puede enviar mails con tu dominio)", ok: spf.length === 1 && !spfMal, valor: spf.join(" | ") || "Sin registro",
        ayuda: spf.length > 1 ? "Hay más de un registro SPF: tiene que haber uno solo." : spfMal ? "Le falta un espacio entre dos partes, y así los servidores lo dan por inválido." : spf.length ? "" : "Falta el registro SPF.",
        sugerido: spf.length === 1 && !spfMal ? "" : spfSugerido, tipo: "TXT", host: "@ (el dominio)" },
      { clave: "dkim", nombre: "DKIM (firma de los mails)", ok: dkimDef.length > 0 || dkimGoogle.length > 0, valor: dkimDef.length ? "Activo (selector default)" : dkimGoogle.length ? "Activo (selector google)" : "No encontrado",
        ayuda: dkimDef.length || dkimGoogle.length ? "" : "Activalo desde el panel de tu hosting (cPanel → Email Deliverability) y te crea el registro." },
      { clave: "dmarc", nombre: "DMARC (qué hacer con mails falsos)", ok: dmarc.some((x) => /^v=DMARC1/i.test(x)), valor: dmarc.join(" | ") || "Sin registro",
        ayuda: dmarc.length ? "" : "Falta. Empezá con «p=none» para solo recibir reportes; en un mes se puede pasar a «quarantine».",
        sugerido: dmarc.length ? "" : `v=DMARC1; p=none; rua=mailto:info@${DOMINIO}`, tipo: "TXT", host: "_dmarc" },
    ];
    send(res, 200, { dominio: DOMINIO, items, todoOk: items.every((x) => x.ok), ip });
  } catch (e) { send(res, 502, { mensaje: "No pude consultar el DNS ahora. Probá en un rato." }); }
});
