# CamiHogar — E-commerce de Muebles (MVP)

Tienda web de muebles con **personalizador interactivo en tiempo real**, catálogo con filtros sin recarga, ventas por WhatsApp y dashboard administrativo autogestionable con métricas de receptividad.

**Stack**: Next.js 15 (App Router, TypeScript) · Tailwind CSS · Framer Motion · Zustand · MongoDB Atlas (Mongoose) · Cloudinary · Vercel.

---

## Puesta en marcha

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# … y edita .env.local con tus credenciales (ver tabla abajo)

# 3. (Opcional) Cargar productos de demostración
npm run seed

# 4. Arrancar en desarrollo
npm run dev
```

Abre <http://localhost:3000> (tienda) y <http://localhost:3000/admin> (panel, protegido por clave).

### Variables de entorno

| Variable | Descripción |
|---|---|
| `MONGODB_URI` | Cadena de conexión de MongoDB Atlas (incluye el nombre de BD, ej. `/camihogar`) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Credenciales del dashboard de Cloudinary (para firmar cargas del widget) |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | El mismo cloud name, expuesto al cliente para el Upload Widget |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Número WhatsApp Business en formato internacional sin `+` (ej. `58412…`) |
| `ADMIN_PASSWORD` | Clave de acceso al panel `/admin` |
| `AUTH_SECRET` | Secreto largo aleatorio para firmar la cookie de sesión (`openssl rand -hex 32`) |
| `NEXT_PUBLIC_SITE_URL` | URL pública del sitio (en Vercel: `https://tudominio.com`). Si se omite, se usa el dominio del deploy de Vercel; en local, `http://localhost:3000` |

> Sin `MONGODB_URI` el sitio arranca igualmente con estados vacíos elegantes; sin Cloudinary, el wizard del admin acepta URLs de imagen manuales.

---

## Estructura del proyecto

```
app/
  (public)/            # Tienda: layout con Navbar + Bottom App Bar + Footer
    page.tsx           # Home: hero, categorías, bestsellers, badges
    catalogo/          # Catálogo con filtros sin recarga (searchParams)
    producto/[slug]/   # PDP: galería con zoom, dimensiones, CTA WhatsApp
    personalizar/      # Personalizador interactivo (Zustand + Framer Motion)
    favoritos/         # Favoritos persistidos en el dispositivo
  admin/
    login/             # Acceso por clave
    (panel)/           # Dashboard de métricas, inventario y wizard 4 pasos
  api/
    analytics/         # Registro de eventos VIEW / WHATSAPP_CLICK / CUSTOMIZER_OPEN
    cloudinary/sign/   # Firma del Upload Widget (solo admin)
    admin/login|logout # Sesión del panel
components/
  ui/                  # Primitivas shadcn adaptadas al branding
  layout/ home/ catalog/ product/ customizer/ admin/
lib/
  mongodb.ts           # Conexión cacheada a Atlas
  cloudinary.ts        # SDK + firma + URLs optimizadas (f_auto,q_auto)
  models/              # Product.ts, AnalyticsLog.ts (Mongoose + TS)
  data/                # Consultas de lectura (devuelven DTOs planos)
  actions/             # Server Actions del admin (CRUD protegido)
  whatsapp.ts          # Plantillas de mensajes y enlaces wa.me
store/                 # Zustand: personalizador y favoritos
scripts/seed.ts        # Productos de demostración
middleware.ts          # Protección de /admin con cookie firmada
```

## Cómo funciona la venta por WhatsApp

- **PDP** → botón *"Consultar / Comprar por WhatsApp"* con el mensaje:
  `¡Hola CamiHogar! Estoy interesado en el mueble *[Título]* (Precio: $[Precio]). Ver producto: [Link]`
- **Personalizador** → *"Pedir este Mueble Personalizado"* envía mueble, tela, acabado, configuración, precio estimado y el link del diseño.
- Cada clic se registra como `WHATSAPP_CLICK` y alimenta el dashboard de receptividad.

## Panel administrativo (`/admin`)

- **Resumen**: productos, vistas, clics a WhatsApp, % de conversión, gráfico de 14 días (vistas vs. conversiones) y rankings de muebles más vistos / más consultados.
- **Inventario**: switch de stock, destacado, edición rápida de precio y eliminación.
- **Wizard de publicación (4 pasos)**: datos básicos → fotos (Cloudinary Upload Widget firmado) → dimensiones y opciones de personalización (presets de telas/acabados/configuraciones) → vista previa real de la tarjeta y publicar.

---

## Despliegue en Vercel

1. Sube el repositorio a GitHub y haz **Import Project** en Vercel (framework autodetectado: Next.js; no requiere configuración extra — `vercel.json` incluido solo fija la región).
2. En **Settings → Environment Variables** agrega todas las variables de la tabla anterior, marcadas para *Production*, *Preview* y *Development*. Genera secretos nuevos para producción (no reutilices los de desarrollo):

   ```bash
   openssl rand -hex 32     # AUTH_SECRET
   ```

3. En MongoDB Atlas: crea el cluster y en **Network Access** agrega `0.0.0.0/0` (Vercel usa IPs dinámicas, no hay un rango fijo que puedas restringir en el plan gratuito).
4. Deploy.
5. Siembra los productos **una única vez** apuntando al Atlas de producción. El seed prioriza la variable del entorno sobre `.env.local`, así que pásala en línea — si ejecutas `npm run seed` a secas escribirás en tu Mongo local, no en Atlas:

   ```bash
   MONGODB_URI="mongodb+srv://usuario:password@cluster.mongodb.net/camihogar" npm run seed
   ```

   Es idempotente: salta los productos cuyo título ya existe, así que volver a correrlo no duplica nada.

6. Al conectar un dominio propio, actualiza `NEXT_PUBLIC_SITE_URL` y vuelve a desplegar: ese valor se hornea en el build y es el que viaja en los enlaces de WhatsApp, `robots.txt` y `sitemap.xml`. Si no la configuras, el sitio cae al dominio `*.vercel.app` del deploy.

## Scripts

| Comando | Acción |
|---|---|
| `npm run dev` | Desarrollo con HMR |
| `npm run build` / `npm start` | Build y arranque de producción |
| `npm run lint` | ESLint |
| `npm run seed` | Carga 10 productos de demostración (idempotente) |

## Próximos pasos sugeridos

- Edición completa de productos reutilizando el wizard (`?edit=<id>`).
- Texturas reales (`textureUrl`) en las muestras del personalizador.
- Autenticación multi-usuario (NextAuth) si el equipo crece.
- Pasarela de pago local como complemento al canal WhatsApp.
