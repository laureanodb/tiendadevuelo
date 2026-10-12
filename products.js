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
};

const CATEGORIES = ["Comunicaciones", "Navegación", "Aviónica", "Uniforme", "Accesorios", "Libros y regalos"];

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
};

// Precio: `usd` (se muestra en dólares y en pesos al dólar del día), `ars` (solo pesos) o ninguno (a consultar).
// Marcas: `nuevo` (nuevo ingreso), `top` (más vendido), `encargo` (llega en 15 a 30 días), `reacond` (reacondicionado),
// `destacado` (orden en la portada), `regalo`, `tcp` (para tripulantes), `variantes`, `fotos` (rutas de imágenes cuando estén).
const PRODUCTS = [
  { id: "auricular-anr-premium", name: "Auricular ANR premium", brand: "Bose", model: "A30", cat: "Comunicaciones", icon: "headset", usd: 1299, top: true, destacado: 1, oficial: true,
    etapas: ["privado", "comercial"],
    desc: "Cancelación activa de ruido, el más liviano y cómodo para vuelos largos.",
    specs: ["Tipo: Cancelación activa de ruido (ANR)", "Bluetooth: Sí", "Fichas: GA dual", "Garantía: Oficial del fabricante"],
    variantes: ["Fichas GA dual", "Ficha LEMO", "Ficha helicóptero U-174"] },
  { id: "auricular-anr-zulu", name: "Auricular ANR Zulu 3", brand: "Lightspeed", model: "Zulu 3", cat: "Comunicaciones", icon: "headset", usd: 999, destacado: 2,
    etapas: ["privado", "comercial"],
    desc: "ANR robusto con Bluetooth y gran atenuación. Favorito de instructores.",
    specs: ["Tipo: ANR con volumen por oído", "Bluetooth: Sí", "Fichas: GA dual"],
    variantes: ["Fichas GA dual", "Ficha LEMO"] },
  { id: "auricular-pnr-clasico", name: "Auricular pasivo clásico", brand: "David Clark", model: "H10-13.4", cat: "Comunicaciones", icon: "headset", usd: 399, top: true, destacado: 3,
    etapas: ["alumno", "privado"],
    desc: "El clásico verde que dura toda la vida. Ideal para el curso.",
    specs: ["Tipo: Pasivo", "Atenuación: 23 dB", "Micrófono: M-4 con cancelación de ruido", "Bluetooth: No", "Fichas: GA dual"] },
  { id: "auricular-pnr-reacond", name: "Auricular pasivo reacondicionado", brand: "David Clark", model: "H10-13.4", cat: "Comunicaciones", icon: "headset", usd: 249, reacond: true,
    etapas: ["alumno"],
    desc: "Revisado y con almohadillas nuevas. La forma más económica de tener un David Clark.",
    specs: ["Tipo: Pasivo reacondicionado", "Fichas: GA dual", "Revisado y probado", "Almohadillas y cubre micrófono nuevos"] },
  { id: "adaptador-helicoptero", name: "Adaptador GA a helicóptero", brand: "", model: "", cat: "Comunicaciones", icon: "plug", ars: 45000,
    etapas: ["comercial"], desc: "Para usar tu auricular de fichas GA en helicóptero (U-174).", specs: ["GA dual a U-174/U", "Cable de 15 cm"] },
  { id: "funda-auricular", name: "Funda rígida para auricular", brand: "", model: "", cat: "Comunicaciones", icon: "case", ars: 35000,
    etapas: ["alumno", "privado", "comercial"], desc: "Protegé tu auricular dentro de la flight bag.", specs: ["Exterior rígido", "Interior acolchado", "Bolsillo para cables"] },
  { id: "transceptor-vhf", name: "Transceptor VHF portátil", brand: "Icom", model: "IC-A25", cat: "Comunicaciones", icon: "radio", usd: 690, encargo: true,
    etapas: ["privado", "comercial"], desc: "Radio portátil de banda aeronáutica con GPS incorporado.", specs: ["VHF aeronáutico", "GPS integrado", "Batería de litio"] },

  { id: "gps-portatil", name: "GPS portátil de aviación", brand: "Garmin", model: "aera 760", cat: "Aviónica", icon: "gps", usd: 1890, nuevo: true, destacado: 4,
    etapas: ["privado", "comercial"], desc: "Pantalla táctil de 7 pulgadas con cartas y espacio aéreo.", specs: ["Pantalla de 7\"", "Base de datos aeronáutica", "Soporte para panel o yugo"] },
  { id: "reloj-piloto", name: "Reloj de piloto con GPS", brand: "Garmin", model: "D2", cat: "Aviónica", icon: "watch", encargo: true,
    etapas: ["privado", "comercial"], desc: "Reloj con funciones de vuelo, hora UTC y navegación directa a aeródromos.", specs: ["Hora UTC", "Directo a aeródromo más cercano", "Barómetro y altímetro"] },

  { id: "kneeboard-plegable", name: "Kneeboard plegable 3 paneles", brand: "ASA", model: "", cat: "Navegación", icon: "kneeboard", ars: 68000, top: true,
    etapas: ["alumno", "privado"], desc: "Tablero de pierna con clip, portalápices y bolsillos para cartas.", specs: ["3 paneles plegables", "Clip metálico", "Correa elástica ajustable"] },
  { id: "kneeboard-tablet", name: "Kneeboard para tablet", brand: "", model: "", cat: "Navegación", icon: "tablet", ars: 79000,
    etapas: ["privado", "comercial"], desc: "Fijá la tablet en la pierna para usar apps de navegación.", specs: ["Tablets de 8 a 11 pulgadas", "Giro de 360°", "Correa con velcro"] },
  { id: "computadora-e6b", name: "Computadora de vuelo E6B", brand: "ASA", model: "E6B", cat: "Navegación", icon: "e6b", ars: 54000, top: true,
    etapas: ["alumno"], desc: "La clásica regla de cálculo de aluminio: viento, rumbo y combustible.", specs: ["Aluminio", "Manual en español", "Funda de vinilo"] },
  { id: "computadora-electronica", name: "Computadora de vuelo electrónica", brand: "ASA", model: "CX-3", cat: "Navegación", icon: "calc", ars: 129000,
    etapas: ["alumno", "comercial"], desc: "Más de 40 funciones de vuelo. Aceptada en exámenes.", specs: ["40+ funciones", "Pantalla retroiluminada", "Pila incluida"] },
  { id: "plotter", name: "Plotter de navegación", brand: "", model: "", cat: "Navegación", icon: "plotter", ars: 22000,
    etapas: ["alumno"], desc: "Transportador y regla para trazar rutas en cartas VFR.", specs: ["Escalas 1:500.000 y 1:1.000.000", "Policarbonato transparente"] },
  { id: "cartas-vfr", name: "Cartas aeronáuticas VFR", brand: "", model: "", cat: "Navegación", icon: "map", nuevo: true,
    etapas: ["alumno", "privado"], desc: "Cartas de navegación visual de Argentina. Consultá por la zona que necesitás.", specs: ["Escala 1:500.000", "Edición vigente"] },
  { id: "logbook", name: "Libro de vuelo tapa dura", brand: "", model: "", cat: "Navegación", icon: "logbook", ars: 38000, top: true,
    etapas: ["alumno", "privado", "comercial"], regalo: true, desc: "Registrá cada hora de vuelo en un logbook que dura toda la carrera.", specs: ["Formato ANAC", "Tapa dura", "Capacidad para 3.000 horas"] },

  { id: "alas-piloto", name: "Alas de piloto metálicas", brand: "", model: "", cat: "Uniforme", icon: "wings", ars: 25000,
    etapas: ["privado", "comercial"], regalo: true, desc: "Alas de metal plateado con traba de seguridad.", specs: ["Plateado", "Doble traba"] },
  { id: "alas-tcp", name: "Alas de tripulante de cabina", brand: "", model: "", cat: "Uniforme", icon: "wings", ars: 25000, tcp: true,
    etapas: ["tcp"], regalo: true, desc: "Alas metálicas para tripulantes de cabina.", specs: ["Plateado", "Doble traba"] },
  { id: "charreteras", name: "Charreteras plateadas", brand: "", model: "", cat: "Uniforme", icon: "epaulettes", ars: 32000,
    etapas: ["comercial"], desc: "Par de charreteras con galón plateado.", specs: ["El par", "Galón plateado"], variantes: ["1 barra", "2 barras", "3 barras", "4 barras"] },
  { id: "porta-credencial", name: "Porta credencial con cinta", brand: "", model: "", cat: "Uniforme", icon: "badge", ars: 15000, tcp: true,
    etapas: ["tcp", "comercial"], desc: "Porta credencial rígido con cinta y enganche retráctil.", specs: ["Rígido transparente", "Cinta con enganche"] },

  { id: "anteojos-aviador", name: "Anteojos aviador polarizados", brand: "", model: "", cat: "Accesorios", icon: "sunglasses", ars: 119000,
    etapas: ["privado", "comercial"], desc: "Lentes que no distorsionan las pantallas de la cabina.", specs: ["Protección UV400", "Marco de metal liviano", "Estuche rígido"] },
  { id: "linterna", name: "Linterna luz roja y blanca", brand: "", model: "", cat: "Accesorios", icon: "flashlight", ars: 36000, tcp: true,
    etapas: ["alumno", "privado", "tcp"], desc: "Luz roja para cuidar la visión nocturna, blanca para la prevuelo.", specs: ["LED rojo y blanco", "Clip para bolsillo", "Recargable USB-C"] },
  { id: "flight-bag", name: "Flight bag", brand: "", model: "", cat: "Accesorios", icon: "bag", ars: 159000, nuevo: true,
    etapas: ["privado", "comercial", "tcp"], desc: "Bolso de vuelo con compartimento acolchado para el auricular.", specs: ["Compartimento para auricular", "Bolsillo para tablet", "Tela impermeable"] },
  { id: "llaveros-rbf", name: "Llaveros Remove Before Flight x3", brand: "", model: "", cat: "Accesorios", icon: "keychain", ars: 12000, tcp: true,
    etapas: ["alumno", "privado", "tcp"], regalo: true, desc: "El clásico rojo \"Remove Before Flight\". Pack de 3.", specs: ["Tela bordada", "Argolla metálica"] },
  { id: "tester-combustible", name: "Tester de combustible", brand: "", model: "", cat: "Accesorios", icon: "fuel", ars: 18000,
    etapas: ["alumno", "privado"], desc: "Para drenar y revisar el combustible en la prevuelo.", specs: ["Policarbonato transparente", "Destornillador incorporado"] },

  { id: "manual-ppl", name: "Manual de Piloto Privado", brand: "", model: "", cat: "Libros y regalos", icon: "book", ars: 42000,
    etapas: ["alumno"], desc: "El contenido teórico del curso PPL en español.", specs: ["Más de 400 páginas", "Preguntas de práctica"] },
];

// Kits armables: el cliente puede sacar productos y el descuento se mantiene.
const KITS = [
  { id: "kit-alumno", name: "Kit Alumno", emoji: "🎓", tagline: "Lo justo para arrancar el curso de piloto.", items: ["logbook", "computadora-e6b", "plotter", "kneeboard-plegable"], off: 0.10 },
  { id: "kit-primer-solo", name: "Kit Primer Solo", emoji: "🛩️", tagline: "Para tu primer vuelo solo.", items: ["kneeboard-plegable", "linterna", "tester-combustible"], off: 0.10, highlight: true },
  { id: "kit-tcp", name: "Kit Tripulante de Cabina", emoji: "🧳", tagline: "Lo esencial para tus primeros vuelos de línea.", items: ["alas-tcp", "porta-credencial", "linterna", "llaveros-rbf"], off: 0.10 },
  { id: "kit-recibido", name: "Regalo para recibidos", emoji: "🎁", tagline: "El regalo para quien acaba de recibir su licencia.", items: ["alas-piloto", "logbook", "llaveros-rbf"], off: 0.10 },
];

// Banners de la portada (se rotan solos)
const BANNERS = [
  { kicker: "Envíos", title: "Envío en el día en CABA", text: "Y despacho en 48 h hábiles a todo el país.", cta: "Ver envíos", href: "/envios" },
  { kicker: "Por encargo", title: "¿No está lo que buscás?", text: "Lo traemos en 15 a 30 días. Pedilo y te pasamos precio.", cta: "Pedir un producto", href: "/contacto#pedido" },
  { kicker: "Kits", title: "Armá tu kit con descuento", text: "Elegí qué llevar de cada kit y mantené el 10% off.", cta: "Ver kits", href: "/#kits" },
];
