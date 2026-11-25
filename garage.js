// Venta de garage aeronáutica (/garage): lo que se carga acá es lo único que muestra la página.
//
// Para publicar algo, copiá el modelo de abajo dentro de `articulos`, sacale las // y completalo.
// Las fotos van en la carpeta img/garage/ (la primera es la portada de la tarjeta).
//
//   {
//     nombre: "Auricular David Clark H10-13.4",
//     precio: 180000,                 // número, sin puntos
//     moneda: "ARS",                  // "ARS" o "USD"
//     detalle: "Funciona perfecto. Vincha despintada y almohadillas gastadas.",
//     fotos: ["/img/garage/dc-h10-1.jpg", "/img/garage/dc-h10-2.jpg"],
//     vendido: false,                 // en true queda en la página con el sello VENDIDO
//   },
//
// Si no hay ningún artículo, la página avisa que por ahora no hay nada y ofrece escribir por WhatsApp.
const GARAGE = {
  whatsapp: "5491133586360",       // número con código de país, sin + ni espacios
  whatsappVisible: "11 3358-6360",
  articulos: [
  ],
};
