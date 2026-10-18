// Datos de la tienda: cambiá esto y se actualiza todo el sitio.
const CONFIG = {
  whatsapp: "5491133586360",            // número con código de país, sin + ni espacios
  whatsappVisible: "11 3358-6360",      // cómo se muestra escrito
  email: "info@tiendadevuelo.com.ar",
  ciudad: "CABA, Buenos Aires",
  ventas: "+2.500",                      // ventas realizadas
  dolarRespaldo: 1500,                   // si no se puede leer el dólar del día
  sitio: "https://www.tiendadevuelo.com.ar",
  horario: { desde: 9, hasta: 21 },      // fuera de este horario la web avisa cuándo respondemos
  instagram: "tiendadevueloar",
  googleResenas: "",                     // link para dejar reseña en Google (de tu perfil de empresa)
  dataFiscal: "",                        // link del QR de Data Fiscal de ARCA (si tenés CUIT activo)
  // Fechas de eventos de ofertas: mientras dure, la web muestra el aviso y destaca las ofertas cargadas en el panel.
  eventos: [
    { nombre: "Cyber Monday", desde: "2026-11-02", hasta: "2026-11-04" },
    { nombre: "Hot Sale", desde: "2027-05-10", hasta: "2027-05-12" },
  ],
};

// Texto de cada categoría para su página (/categoria/...): lo lee Google.
const CAT_INFO = {
  "Comunicaciones": "Auriculares de aviación ANR y pasivos, adaptadores y accesorios para tus comunicaciones en cabina.",
  "Navegación": "Kneeboards, computadoras de vuelo E6B, plotters, cartas VFR y libros de vuelo para planificar y volar.",
  "Aviónica": "GPS portátiles, relojes de piloto y equipos electrónicos para la cabina.",
  "Uniforme": "Alas, charreteras y porta credenciales para pilotos y tripulantes de cabina.",
  "Accesorios": "Flight bags, linternas, anteojos, testers de combustible y todo lo que llevás en cada vuelo.",
  "Libros y regalos": "Manuales de estudio y regalos para pilotos.",
  "Cursos y experiencias": "Material de estudio digital, simuladores y experiencias de vuelo.",
};

const CATEGORIES = ["Comunicaciones", "Navegación", "Aviónica", "Uniforme", "Accesorios", "Libros y regalos", "Cursos y experiencias"];

// Para qué etapa sirve cada producto
const ETAPAS = { alumno: "Alumno", privado: "Piloto privado", comercial: "Comercial y línea", tcp: "Tripulante de cabina" };

// Dibujos de los productos (se reemplazan por fotos cuando estén: campo `fotos`)
const ICONS = {
  headset: '<path d="M14 36v-6a18 18 0 0 1 36 0v6"/><rect x="9" y="33" width="10" height="17" rx="4"/><rect x="45" y="33" width="10" height="17" rx="4"/><path d="M14 50c0 6 8 8 16 8"/><circle cx="32" cy="58" r="2.5"/>',
  kneeboard: '<rect x="16" y="9" width="32" height="48" rx="3"/><rect x="25" y="5" width="14" height="7" rx="2"/><path d="M22 22h20M22 30h20M22 38h14M22 46h9"/>',
  e6b: '<circle cx="32" cy="32" r="23"/><circle cx="32" cy="32" r="14"/><path d="M32 9v6M32 49v6M9 32h6M49 32h6M32 18v14l8 6"/>',
  calc: '<rect x="14" y="7" width="36" height="50" rx="5"/><rect x="20" y="13" width="24" height="11" rx="2"/><path d="M21 33h4M30 33h4M39 33h4M21 41h4M30 41h4M39 41h4M21 49h4M30 49h4M39 49h4"/>',
  plotter: '<path d="M12 40a20 20 0 0 1 40 0z"/><rect x="6" y="40" width="52" height="10" rx="2"/><path d="M12 45h2M20 45h2M28 45h2M36 45h2M44 45h2M52 45h2M32 40V26"/>',
  logbook: '<rect x="14" y="7" width="36" height="50" rx="3"/><path d="M21 7v50"/><path d="M28 26c4-3 8-3 9-3 1 0 5 0 9 3M37 23v7"/><path d="M28 40h16M28 46h12"/>',
  wings: '<circle cx="32" cy="30" r="6"/><path d="M26 30C18 24 10 23 3 23c3 4 9 7 17 8M25 33c-6 1-11 1-16 0 4 3 10 4 16 3"/><path d="M38 30c8-6 16-7 23-7-3 4-9 7-17 8M39 33c6 1 11 1 16 0-4 3-10 4-16 3"/>',
  sunglasses: '<path d="M6 24h52"/><path d="M8 24c0 10 4 16 11 16s10-5 10-12v-4"/><path d="M56 24c0 10-4 16-11 16s-10-5-10-12v-4"/><path d="M29 27c2-2 4-2 6 0"/>',
  flashlight: '<path d="M14 44l18-18 8 8-18 18a3 3 0 0 1-4 0l-4-4a3 3 0 0 1 0-4z"/><path d="M36 22l6-6 8 8-6 6"/><path d="M50 10l4-4M56 18l4-1M46 6l1-4"/>',
  bag: '<rect x="8" y="22" width="48" height="32" rx="5"/><path d="M24 22v-6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6M8 34h48M28 34v5h8v-5"/>',
  tag: '<path d="M10 20h34l10 10-10 10H10z"/><circle cx="46" cy="30" r="2.5"/><path d="M15 27h22M15 33h16"/><path d="M48 30c6 4 8 12 6 22"/>',
  epaulettes: '<rect x="8" y="12" width="20" height="42" rx="3"/><rect x="36" y="12" width="20" height="42" rx="3"/><path d="M8 34h20M8 40h20M8 46h20M36 34h20M36 40h20M36 46h20"/><circle cx="18" cy="20" r="2"/><circle cx="46" cy="20" r="2"/>',
  fuel: '<path d="M26 6h12M28 6v34a4 4 0 0 0 8 0V6"/><path d="M28 28h8"/><path d="M48 34c4 6 4 10 0 12s-8-2-6-6l6-6z"/><path d="M20 52h24"/>',
  book: '<path d="M32 16c-6-4-16-5-24-3v38c8-2 18-1 24 3 6-4 16-5 24-3V13c-8-2-18-1-24 3z"/><path d="M32 16v38"/>',
  watch: '<circle cx="32" cy="32" r="15"/><path d="M26 17l2-11h8l2 11M26 47l2 11h8l2-11"/><path d="M32 24v8l5 4"/><path d="M47 30h3"/>',
  plug: '<path d="M22 6v10M34 6v10"/><rect x="16" y="16" width="24" height="14" rx="3"/><path d="M28 30v8c0 8 8 10 16 10h6"/><circle cx="52" cy="48" r="4"/>',
  tablet: '<rect x="14" y="7" width="36" height="50" rx="5"/><rect x="19" y="12" width="26" height="36" rx="1"/><path d="M6 32h52"/><circle cx="32" cy="52" r="1.5"/>',
  case: '<rect x="8" y="16" width="48" height="36" rx="10"/><path d="M8 30h48M26 16v-4h12v4"/><path d="M30 38h4"/>',
  gps: '<rect x="8" y="12" width="48" height="36" rx="5"/><rect x="13" y="17" width="38" height="26" rx="2"/><path d="M20 36l8-8 6 4 9-10"/><circle cx="43" cy="22" r="2"/><path d="M24 48v6h16v-6"/>',
  map: '<path d="M8 14l16-6 16 6 16-6v42l-16 6-16-6-16 6z"/><path d="M24 8v42M40 14v42"/><path d="M14 30c4-4 8 4 12 0s8-6 12-2 8 2 10 0"/>',
  radio: '<rect x="20" y="16" width="24" height="42" rx="4"/><path d="M26 16V6"/><rect x="25" y="22" width="14" height="10" rx="1"/><path d="M26 40h12M26 46h12M26 52h12"/>',
  badge: '<rect x="14" y="10" width="36" height="46" rx="5"/><path d="M26 10V6h12v4"/><circle cx="32" cy="28" r="7"/><path d="M22 46c2-6 6-8 10-8s8 2 10 8"/>',
  keychain: '<circle cx="18" cy="18" r="8"/><path d="M24 24l6 6"/><path d="M28 28h26l4 6-4 6H28z"/><path d="M33 34h16"/>',
};

const CAT_COLORS = {
  "Comunicaciones": ["#0e8be0", "#d6ebfc"],
  "Navegación": ["#0f8f7e", "#d5f1ec"],
  "Aviónica": ["#3b55c4", "#e1e7fb"],
  "Uniforme": ["#5b6b82", "#e7edf4"],
  "Accesorios": ["#e0742c", "#fde6d6"],
  "Libros y regalos": ["#b7791f", "#f9ecd2"],
  "Cursos y experiencias": ["#7a4fc4", "#ece4fb"],
};

// Precio: `usd` (se muestra en dólares y en pesos al dólar del día), `ars` (solo pesos) o ninguno (a consultar).
// Marcas: `nuevo` (nuevo ingreso), `top` (más vendido), `encargo` (llega en 15 a 30 días), `reacond` (reacondicionado),
// `destacado` (orden en la portada), `regalo`, `tcp` (para tripulantes), `variantes`, `fotos` (rutas de imágenes cuando estén).
const PRODUCTS = [
  { id: "bose-a30", name: "Auricular Bose A30", brand: "Bose", model: "A30", cat: "Comunicaciones", icon: "headset", top: true, destacado: 1, oficial: true,
    etapas: ["privado", "comercial"],
    nota: "Con ficha Dual plug, LEMO o XLR",
    desc: "Auricular de aviación con cancelación activa de ruido de tres niveles, Bluetooth y control por toque para escuchar la cabina sin sacártelo. Muy liviano y con poca presión sobre la cabeza, pensado para vuelos largos. Lo tenemos con ficha Dual plug, LEMO y XLR.",
    specs: ["Fichas disponibles: Dual plug (GA), LEMO y XLR", "Tipo: Cancelación activa de ruido (ANR), 3 niveles", "Bluetooth: Sí", "Peso: 404 g", "Pilas: 2 AA, más de 45 h de uso", "Certificación: FAA / EASA TSO-C139a", "Garantía: Oficial Bose"],
    variantes: ["Ficha Dual plug (GA)", "Ficha LEMO (alimentada por el panel)", "Ficha XLR (5 pines)"],
    fotos: ["/img/productos/bose-a30-1.jpg", "/img/productos/bose-a30-2.jpg", "/img/productos/bose-a30-3.jpg"] },
  { id: "david-clark-dc-pro-x2", name: "Auricular David Clark DC PRO-X2", brand: "David Clark", model: "DC PRO-X2", cat: "Comunicaciones", icon: "headset", destacado: 2,
    etapas: ["privado", "comercial"],
    desc: "Auricular ultraliviano sobre la oreja, con cancelación electrónica de ruido híbrida, control automático de ganancia y apagado automático para cuidar las pilas. Ideal para muchas horas de vuelo.",
    specs: ["Tipo: Cancelación electrónica de ruido (ENC) híbrida", "Formato: Sobre la oreja (on-ear)", "Peso: 213 g", "Bluetooth: Según versión", "Garantía: Oficial David Clark"],
    fotos: ["/img/productos/dc-pro-x2-1.jpg"] },
  { id: "david-clark-dc-one-x", name: "Auricular David Clark DC ONE-X", brand: "David Clark", model: "DC ONE-X", cat: "Comunicaciones", icon: "headset", destacado: 3,
    etapas: ["alumno", "privado"],
    desc: "El clásico verde de David Clark con cancelación electrónica de ruido híbrida y Bluetooth. Si se quedan sin pilas, las comunicaciones siguen funcionando.",
    specs: ["Tipo: Cancelación electrónica de ruido (ENC) híbrida", "Formato: Envolvente (over-ear)", "Bluetooth: Sí", "Peso: 349 g", "Pilas: 2 AA, hasta 50 h de uso", "Certificación: TSO-C139a", "Fichas: GA dual"],
    fotos: ["/img/productos/dc-one-x-1.jpg", "/img/productos/dc-one-x-2.jpg"] },
  { id: "icom-ic-a16", name: "Transceptor portátil Icom IC-A16", brand: "Icom", model: "IC-A16", cat: "Comunicaciones", icon: "radio", destacado: 4,
    etapas: ["privado", "comercial"],
    desc: "Radio VHF de banda aeronáutica, compacta y resistente al agua, con 6 W de potencia y audio fuerte para escucharse bien en ambientes ruidosos.",
    specs: ["Potencia: 6 W (PEP)", "Audio: 1500 mW", "Canales: 200 memorias, separación 8,33 / 25 kHz", "Batería: Litio 2400 mAh, aprox. 17 h", "Protección: IP67", "Incluye: Batería, cargador, antena y clip"],
    fotos: ["/img/productos/icom-a16-1.jpg", "/img/productos/icom-a16-2.jpg"] },
  { id: "jeppesen-cr-3", name: "Computadora de vuelo Jeppesen CR-3", brand: "Jeppesen", model: "CR-3", cat: "Navegación", icon: "calc", top: true,
    etapas: ["alumno", "privado"],
    desc: "Computadora de vuelo circular para resolver viento, rumbo, velocidad, tiempo y combustible. Compacta para usar en cabina y en los exámenes.",
    specs: ["Tipo: Circular, 6 pulgadas", "Resuelve: Triángulo de vientos, velocidad verdadera, tiempo, distancia y combustible", "Incluye: Manual de instrucciones y funda"],
    fotos: ["/img/productos/jeppesen-cr3-1.jpg"] },
  { id: "jeppesen-pj-1", name: "Plotter Jeppesen PJ-1", brand: "Jeppesen", model: "PJ-1", cat: "Navegación", icon: "plotter",
    etapas: ["alumno"],
    desc: "Plotter con transportador giratorio para medir rumbos verdaderos o magnéticos sobre la carta, con escalas en millas náuticas y terrestres.",
    specs: ["Transportador: Giratorio (azimut)", "Escalas: 1:500.000 y 1:1.000.000", "Unidades: Millas náuticas y terrestres", "Material: Plástico transparente"],
    fotos: ["/img/productos/jeppesen-pj1-1.jpg"] },
  { id: "asa-flight-timer-3", name: "Cronómetro de vuelo ASA Flight Timer 3", brand: "ASA", model: "Flight Timer 3", cat: "Aviónica", icon: "watch",
    etapas: ["alumno", "privado", "comercial"],
    desc: "Cronómetro de vuelo de mano con tres timers simultáneos, timer de combustible y memoria para tiempos de aproximación. Pantalla retroiluminada y alarmas sonoras y visuales.",
    specs: ["Timers: 3 simultáneos, más combustible y cronómetro", "Reloj: Hora local o UTC (Zulu)", "Aproximaciones: Memoria para 12 tiempos", "Bloc de notas: Squawk y frecuencias", "Pantalla: LCD retroiluminada", "Pilas: 2 AAA"],
    fotos: ["/img/productos/asa-flight-timer-3-1.jpg"] },
  { id: "icom-ic-a220", name: "Transceptor de panel Icom IC-A220", brand: "Icom", model: "IC-A220", cat: "Aviónica", icon: "radio",
    etapas: ["privado", "comercial"],
    desc: "Transceptor VHF aeronáutico para montar en el panel, con pantalla OLED, intercomunicador incorporado y doble escucha. Hay versión TSO para aviones certificados y versión sin TSO para experimentales y deportivos livianos.",
    specs: ["Separación: 8,33 / 25 kHz", "Pantalla: OLED", "Intercomunicador: Incorporado, activado por voz", "Funciones: Doble escucha, squelch automático y memorias", "Alimentación: 12 / 24 V", "Peso: 1 kg"],
    variantes: ["Versión TSO (aviones certificados)", "Versión sin TSO (experimentales y LSA)"],
    fotos: ["/img/productos/icom-a220-1.jpg"] },
  { id: "qyt-kt-a16", name: "Transceptor portátil QYT KT-A16", brand: "QYT", model: "KT-A16", cat: "Comunicaciones", icon: "radio",
    etapas: ["alumno", "privado"],
    desc: "Radio portátil de banda aeronáutica económica, con pantalla color, 6 W de potencia y 200 canales. Una buena opción como equipo de respaldo.",
    specs: ["Potencia: 6 W", "Transmisión: 118 a 136,975 MHz", "Separación: 8,33 / 25 kHz", "Canales: 200 memorias", "Batería: 2000 mAh", "Pantalla: Color"],
    fotos: ["/img/productos/qyt-kt-a16-1.jpg"] },
];

// Kits armables: el cliente puede sacar productos y el descuento se mantiene.
const KITS = [];

// Banners de la portada (se rotan solos)
const BANNERS = [
  { kicker: "Distribuidor oficial Bose", title: "Bose A30", text: "Liviano y cómodo, con 3 niveles de cancelación de ruido y Bluetooth. Lo tenemos con ficha Dual plug, LEMO y XLR.", cta: "Ver Bose A30", href: "/producto/bose-a30", img: "/img/productos/bose-a30-1-t.webp" },
  { kicker: "Envíos", title: "Envío en el día en CABA", text: "Y despacho en 48 h hábiles a todo el país.", cta: "Ver envíos", href: "/envios" },
  { kicker: "Por encargo", title: "¿No está lo que buscás?", text: "Lo traemos en 15 a 30 días. Pedilo y te pasamos precio.", cta: "Pedir un producto", href: "/contacto#pedido" },
  { kicker: "Kits", title: "Armá tu kit con descuento", text: "Elegí qué llevar de cada kit y mantené el 10% off.", cta: "Ver kits", href: "/#kits" },
];
