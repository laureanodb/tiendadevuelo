// Configuración de la tienda: cambiá estos datos y se actualiza todo el sitio.
const CONFIG = {
  whatsapp: "5491100000000", // número con código de país, sin + ni espacios
  envioGratisDesde: 150000,
  descuentoTransferencia: 0.10,
};

const CATEGORIES = ["Comunicaciones", "Navegación", "Uniforme", "Accesorios", "Libros y regalos"];

// Dibujos de los productos (línea simple, se pintan con el color de la categoría)
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
  shirt: '<path d="M22 10 10 18l6 10 6-4v30h20V24l6 4 6-10-12-8c-2 4-6 6-10 6s-8-2-10-6z"/><path d="M14 16l6 4M50 16l-6 4M32 16v38"/>',
  cap: '<path d="M12 40a20 19 0 0 1 40 0z"/><path d="M6 40h52c0 5-8 7-18 7"/><path d="M32 21v19M24 34l3-5 5 3 5-3 3 5"/>',
  epaulettes: '<rect x="8" y="12" width="20" height="42" rx="3"/><rect x="36" y="12" width="20" height="42" rx="3"/><path d="M8 34h20M8 40h20M8 46h20M36 34h20M36 40h20M36 46h20"/><circle cx="18" cy="20" r="2"/><circle cx="46" cy="20" r="2"/>',
  fuel: '<path d="M26 6h12M28 6v34a4 4 0 0 0 8 0V6"/><path d="M28 28h8"/><path d="M48 34c4 6 4 10 0 12s-8-2-6-6l6-6z"/><path d="M20 52h24"/>',
  book: '<path d="M32 16c-6-4-16-5-24-3v38c8-2 18-1 24 3 6-4 16-5 24-3V13c-8-2-18-1-24 3z"/><path d="M32 16v38"/>',
  mug: '<rect x="12" y="22" width="30" height="32" rx="4"/><path d="M42 30h5a6 6 0 0 1 0 12h-5"/><path d="M20 14c0-3 3-3 3-6M28 14c0-3 3-3 3-6M36 14c0-3 3-3 3-6"/>',
  watch: '<circle cx="32" cy="32" r="15"/><path d="M26 17l2-11h8l2 11M26 47l2 11h8l2-11"/><path d="M32 24v8l5 4"/><path d="M47 30h3"/>',
  plug: '<path d="M22 6v10M34 6v10"/><rect x="16" y="16" width="24" height="14" rx="3"/><path d="M28 30v8c0 8 8 10 16 10h6"/><circle cx="52" cy="48" r="4"/>',
  tablet: '<rect x="14" y="7" width="36" height="50" rx="5"/><rect x="19" y="12" width="26" height="36" rx="1"/><path d="M6 32h52"/><circle cx="32" cy="52" r="1.5"/>',
  case: '<rect x="8" y="16" width="48" height="36" rx="10"/><path d="M8 30h48M26 16v-4h12v4"/><path d="M30 38h4"/>',
};

const CAT_COLORS = {
  "Comunicaciones": ["#1d4ed8", "#38bdf8"],
  "Navegación": ["#0f766e", "#2dd4bf"],
  "Uniforme": ["#1e3a8a", "#a78bfa"],
  "Accesorios": ["#9a3412", "#fb923c"],
  "Libros y regalos": ["#7c2d12", "#fbbf24"],
};

const PRODUCTS = [
  { id: "anr-pro", name: "Auricular ANR Cirrus Pro", cat: "Comunicaciones", icon: "headset", price: 890000, old: 990000, badge: "Más vendido", featured: 1,
    desc: "Cancelación activa de ruido, Bluetooth para música y llamadas, y almohadillas de gel. Para los que vuelan muchas horas.",
    specs: ["Cancelación activa de ruido (ANR)", "Bluetooth 5.0", "Fichas GA dual (PJ-055 / PJ-068)", "Hasta 40 h con 2 pilas AA"] },
  { id: "pnr-alpha", name: "Auricular PNR Alpha", cat: "Comunicaciones", icon: "headset", price: 289000, badge: "Ideal alumno", featured: 2,
    desc: "Auricular pasivo liviano y cómodo, perfecto para el curso de piloto privado.",
    specs: ["Atenuación pasiva de 24 dB", "Micrófono con cancelación de ruido", "Fichas GA dual", "Garantía de 2 años"] },
  { id: "adaptador", name: "Adaptador GA a helicóptero", cat: "Comunicaciones", icon: "plug", price: 45000,
    desc: "Convertí tu auricular de fichas GA a ficha de helicóptero (U-174).", specs: ["GA dual → U-174/U", "Cable de 15 cm"] },
  { id: "funda-headset", name: "Funda rígida para auricular", cat: "Comunicaciones", icon: "case", price: 35000,
    desc: "Protegé tu auricular dentro de la flight bag.", specs: ["Exterior rígido", "Interior acolchado", "Bolsillo para cables"] },

  { id: "kneeboard-tri", name: "Kneeboard plegable 3 paneles", cat: "Navegación", icon: "kneeboard", price: 68000, badge: "Nuevo", featured: 4,
    desc: "Tablero de pierna con clip, portalápices y bolsillos para cartas.",
    specs: ["3 paneles plegables", "Clip metálico", "Correa elástica ajustable", "Checklist de emergencia impresa"] },
  { id: "kneeboard-tablet", name: "Kneeboard para tablet", cat: "Navegación", icon: "tablet", price: 79000,
    desc: "Fijá tu tablet en la pierna para usar apps de navegación.", specs: ["Para tablets de 8 a 11 pulgadas", "Giro de 360°", "Correa con velcro"] },
  { id: "e6b-alu", name: "Computadora de vuelo E6B", cat: "Navegación", icon: "e6b", price: 54000, featured: 5,
    desc: "La clásica regla de cálculo de aluminio. Viento, rumbo, combustible y más.", specs: ["Aluminio", "Incluye manual en español", "Funda de vinilo"] },
  { id: "e6b-digital", name: "Computadora de vuelo electrónica", cat: "Navegación", icon: "calc", price: 129000,
    desc: "Más de 40 funciones de vuelo y conversiones. Aprobada para exámenes.", specs: ["40+ funciones", "Pantalla retroiluminada", "Pila incluida"] },
  { id: "plotter", name: "Plotter de navegación", cat: "Navegación", icon: "plotter", price: 22000,
    desc: "Transportador y regla para trazar rutas en cartas VFR.", specs: ["Escalas 1:500.000 y 1:1.000.000", "Policarbonato transparente"] },
  { id: "logbook", name: "Libro de vuelo tapa dura", cat: "Navegación", icon: "logbook", price: 38000, badge: "Más vendido", featured: 3,
    desc: "Registrá cada hora de vuelo en un logbook que dura toda la carrera.", specs: ["Formato ANAC", "Tapa dura", "Capacidad para 3.000 horas"] },

  { id: "alas", name: "Alas de piloto metálicas", cat: "Uniforme", icon: "wings", price: 25000,
    desc: "Alas de metal con baño dorado y traba de seguridad.", specs: ["Baño dorado o plateado", "Doble traba"] },
  { id: "charreteras", name: "Charreteras de 1 a 4 barras", cat: "Uniforme", icon: "epaulettes", price: 32000, featured: 7,
    desc: "Par de charreteras con galón dorado o plateado.", specs: ["1, 2, 3 o 4 barras", "Dorado o plateado", "El par"] },
  { id: "camisa", name: "Camisa de piloto manga corta", cat: "Uniforme", icon: "shirt", price: 59000,
    desc: "Camisa blanca con presillas para charreteras y bolsillos con tapa.", specs: ["Talles S a XXL", "Antiarrugas", "Presillas para charreteras"] },
  { id: "gorra", name: "Gorra Tienda de Vuelo", cat: "Uniforme", icon: "cap", price: 29000,
    desc: "Gorra con las alas de Tienda de Vuelo bordadas.", specs: ["Gabardina", "Ajuste trasero", "Bordado frontal"] },

  { id: "anteojos", name: "Anteojos aviador polarizados", cat: "Accesorios", icon: "sunglasses", price: 119000, featured: 6,
    desc: "Lentes polarizados que no distorsionan las pantallas de la cabina.", specs: ["Protección UV400", "Marco de metal liviano", "Estuche rígido"] },
  { id: "linterna", name: "Linterna luz roja y blanca", cat: "Accesorios", icon: "flashlight", price: 36000,
    desc: "Luz roja para cuidar la visión nocturna en cabina, blanca para la inspección prevuelo.", specs: ["LED rojo y blanco", "Clip para bolsillo", "Recargable USB-C"] },
  { id: "flight-bag", name: "Flight bag Navigator", cat: "Accesorios", icon: "bag", price: 159000, badge: "Nuevo",
    desc: "Bolso de vuelo con compartimento acolchado para el auricular y bolsillos para todo.", specs: ["Compartimento para auricular", "Bolsillo para tablet", "Tela impermeable"] },
  { id: "rbf", name: "Llaveros Remove Before Flight x3", cat: "Accesorios", icon: "tag", price: 12000,
    desc: "El clásico rojo de \"Remove Before Flight\". Pack de 3.", specs: ["Tela bordada", "Argolla metálica"] },
  { id: "tester", name: "Tester de combustible", cat: "Accesorios", icon: "fuel", price: 18000,
    desc: "Para drenar y revisar el combustible en la prevuelo.", specs: ["Policarbonato transparente", "Destornillador incorporado"] },
  { id: "reloj", name: "Reloj piloto cronógrafo", cat: "Accesorios", icon: "watch", price: 210000,
    desc: "Cronógrafo con bisel giratorio y segundo huso horario (UTC).", specs: ["Hora UTC", "Cronómetro", "Resistente al agua 100 m"] },

  { id: "manual-ppl", name: "Manual de Piloto Privado", cat: "Libros y regalos", icon: "book", price: 42000,
    desc: "Todo el contenido teórico del curso PPL en un solo libro, en español.", specs: ["Más de 400 páginas", "Preguntas de práctica"] },
  { id: "taza", name: "Taza \"Cleared for takeoff\"", cat: "Libros y regalos", icon: "mug", price: 16000,
    desc: "Para el café de antes del vuelo. Regalo ideal.", specs: ["Cerámica", "350 ml"] },
];

const KITS = [
  { id: "kit-alumno", name: "Kit Alumno PPL", emoji: "🎓", tagline: "Todo para empezar el curso de piloto privado.",
    items: ["logbook", "e6b-alu", "plotter", "kneeboard-tri", "manual-ppl"], off: 0.15 },
  { id: "kit-solo", name: "Kit Primer Solo", emoji: "🛩️", tagline: "Para que tu primer vuelo solo sea perfecto.",
    items: ["pnr-alpha", "kneeboard-tri", "linterna", "rbf"], off: 0.12, highlight: true },
  { id: "kit-linea", name: "Kit Piloto de Línea", emoji: "👨‍✈️", tagline: "Uniforme y equipaje para tu primer día en la aerolínea.",
    items: ["charreteras", "alas", "camisa", "flight-bag"], off: 0.10 },
];
