# Tienda de Vuelo

Web pública del pilot shop: https://tiendadevuelo.com.ar

Sitio estático (HTML, CSS y JavaScript, sin compilar). Cada cambio que se sube a `main` se publica solo en Vercel.

## Archivos

- `index.html`: estructura y textos de la página.
- `styles.css`: diseño.
- `products.js`: **datos de la tienda**: número de WhatsApp, envío gratis, productos, precios y kits.
- `app.js`: catálogo, carrito, vista rápida y animaciones.
- `logo.svg` / `favicon.svg`: logo.

Los pedidos se envían por WhatsApp al número de `CONFIG.whatsapp` en `products.js`.
