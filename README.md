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
| `AUTH_SECRET` | Secreto largo aleatorio para firmar las cookies de sesión, tanto la del panel como la de los operarios del taller (`openssl rand -hex 32`) |
| `SITE_URL` | URL pública del sitio (en Vercel: `https://tudominio.com`). Si se omite, se usa el dominio del deploy de Vercel; en local, `http://localhost:3000` |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | ID de medición de Google Analytics 4 (`G-XXXXXXXXXX`). Si se omite, GA queda desactivado |
| `NEXT_PUBLIC_FABRICA_SEGUIMIENTO_PUBLICO` | `"true"` enciende el seguimiento público del mueble para clientes en `/seguimiento/COD-XXXXXX`. Apagado por defecto ([ver abajo](#seguimiento-para-el-cliente-apagado-por-defecto)) |

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
      fabricacion/     # Módulo de fabricación: tablero, pedidos, muebles, rutas, equipo…
  fabrica/             # App de taller (móvil): entrar con PIN, escanear, hacer pasos
  f/[codigo]/          # Destino del QR de la etiqueta
  seguimiento/[codigo] # Vista del cliente (apagada por defecto)
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
  models/              # Product.ts, AnalyticsLog.ts + las 11 del módulo de fabricación
  data/                # Consultas de lectura (devuelven DTOs planos)
  actions/             # Server Actions del admin (CRUD protegido)
  fabricacion/         # Núcleo del taller: códigos, PIN, permisos, sesión, auditoría, reglas
  whatsapp.ts          # Plantillas de mensajes y enlaces wa.me
store/                 # Zustand: personalizador y favoritos
scripts/seed.ts        # Productos de demostración
middleware.ts          # Protección de /admin y /fabrica con cookie firmada
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

6. Al conectar un dominio propio, actualiza `SITE_URL` y vuelve a desplegar: ese valor se usa en el servidor para metadatos, seguimiento y enlaces generados fuera del navegador. Los botones de WhatsApp del sitio usan automáticamente el dominio que está visitando el cliente. Si no configuras `SITE_URL`, el sitio cae al dominio `*.vercel.app` del deploy.

## Scripts

| Comando | Acción |
|---|---|
| `npm run dev` | Desarrollo con HMR |
| `npm run build` / `npm start` | Build y arranque de producción |
| `npm run lint` | ESLint |
| `npm run seed` | Carga 10 productos de demostración (idempotente) |
| `npm run seed:fabrica` | Siembra el módulo de fabricación: roles, áreas, pasos, rutas, equipo y pedidos de ejemplo (`-- --reset` para empezar de cero) |
| `npm run test:fabrica` | Batería de pruebas del módulo de fabricación (base `camihogar_test`) |

## Próximos pasos sugeridos

- Edición completa de productos reutilizando el wizard (`?edit=<id>`).
- Texturas reales (`textureUrl`) en las muestras del personalizador.
- Autenticación multi-usuario (NextAuth) si el equipo crece.
- Pasarela de pago local como complemento al canal WhatsApp.

---

## Módulo de Fabricación

Convierte cada pedido en **muebles con nombre y apellido**: cada uno recibe un código propio (`COD-949473`), una etiqueta con QR y una ruta de pasos que va recorriendo desde el corte de la madera hasta la casa del cliente. En cualquier momento se sabe **dónde está cada mueble, quién lo está trabajando y qué falta**, sin llamar a nadie por teléfono.

Pensado para gente que no vive pegada a una computadora: en el taller todo son botones grandes, fotos y frases cortas ("SÍ, YA TERMINÉ ESTE PASO"), y el escáner siempre ofrece escribir el código a mano.

### Las dos mitades

| Zona | URL | Quién entra | Con qué |
|---|---|---|---|
| **App de taller** (móvil) | `/fabrica` | Carpinteros, tapiceros, pintores, almacén, repartidores, tienda | Su nombre + PIN de 4–6 dígitos |
| **Panel de fabricación** | `/admin/fabricacion` | Dueño y supervisores | La clave del panel (`/admin/login`) o su PIN de operario |

Quien entra al panel con la clave de admin es tratado como **Administrador** y lo puede todo, sin necesidad de crearse un usuario de taller. Desde el panel hay un enlace destacado **"App de taller"** que lleva a `/fabrica`.

### Modelo de datos

Colecciones nuevas en MongoDB (`lib/models/`). No se tocó nada de la tienda: `products` y `analyticslogs` siguen igual.

| Colección | Qué guarda |
|---|---|
| `roles` | Los roles y sus permisos. **Editable**: no es una lista fija en el código |
| `operarios` | Las personas del taller: nombre, rol, PIN (hasheado), áreas, teléfono, foto |
| `estaciones` | Las áreas de trabajo: taller, almacén, transporte, tienda |
| `catalogo_pasos` | Los pasos reutilizables ("Corte de madera", "Tapizado", "Control de calidad"…) |
| `rutas_fabricacion` | Las recetas: qué pasos y en qué orden lleva un tipo de mueble |
| `pedidos` | El pedido del cliente: datos, canal, prioridad, fecha prometida, estado |
| `unidades_fabricacion` | **Un documento por mueble físico.** Copia congelada del producto y de los pasos de la ruta, con el avance de cada uno |
| `eventos_unidad` | Bitácora del taller, sólo se añade: quién empezó, quién terminó, quién escaneó |
| `registros_auditoria` | Historial de la configuración, sólo se añade, con el cambio campo por campo |
| `incidencias` | Los problemas reportados desde el taller y cómo se resolvieron |
| `counters` | Contador atómico de los códigos `PED-` y `COD-` (nunca se repite un número) |

Detalle importante: cuando se crea un mueble, **la ruta se copia dentro de él**. Si mañana se cambia la ruta, los muebles que ya estaban en proceso siguen con los pasos con los que empezaron. Nada cambia bajo los pies de quien está trabajando.

### Roles y permisos

Los roles **no son una lista fija en el código**: son datos que se editan desde el panel. Lo único fijo son las 18 **capacidades**, porque cada una corresponde a algo que el sistema sabe hacer:

| Capacidad | En castellano |
|---|---|
| `trabajar` | Trabajar en los muebles (empezar y terminar pasos) |
| `escanear` | Escanear muebles con la cámara |
| `reportar_incidencias` | Avisar de un problema |
| `resolver_incidencias` | Resolver problemas que otros avisaron |
| `ver_tablero` | Ver el tablero de fabricación y las fichas |
| `gestionar_pedidos` | Crear y editar pedidos de clientes |
| `eliminar_pedidos` | Eliminar pedidos |
| `gestionar_unidades` | Cambiar prioridad, asignar responsable, pausar muebles |
| `revertir_pasos` | Deshacer un paso ya terminado |
| `cancelar_unidades` | Cancelar un mueble |
| `gestionar_rutas` | Crear y editar las rutas de fabricación |
| `gestionar_catalogo` | Crear y editar los pasos reutilizables |
| `gestionar_estaciones` | Crear y editar las áreas de trabajo |
| `gestionar_usuarios` | Crear, editar y eliminar personas |
| `gestionar_roles` | Crear y editar los roles y sus permisos |
| `ver_auditoria` | Ver el historial de cambios |
| `ver_precios` | Ver los precios de los muebles |
| `imprimir_etiquetas` | Imprimir las etiquetas con el código QR |

Los 8 roles con los que arranca el sistema (`npm run seed:fabrica`), todos editables después:

| Rol | Qué puede |
|---|---|
| **Administrador** | Todo. Es el rol de sistema: no se puede eliminar ni desactivar |
| **Supervisor** | Todo menos crear personas y tocar los roles |
| **Carpintero · Tapicero · Pintor · Repartidor** | Trabajar, escanear y avisar de problemas |
| **Almacén** | Lo anterior + ver el tablero e imprimir etiquetas |
| **Tienda** | Lo anterior + ver el tablero y ver los precios |

#### Crear, editar y eliminar roles → `/admin/fabricacion/roles`

Un rol es un nombre, un color, un icono y una lista de **casillas marcables**, una por capacidad, agrupadas en Taller · Supervisión · Configuración · Administración. Las casillas peligrosas (crear personas, cambiar roles, deshacer pasos, eliminar pedidos, cancelar muebles) salen marcadas como tales.

- **Crear**: botón "Nuevo rol", se marcan las casillas y listo. También se puede **Duplicar** uno parecido y ajustarlo.
- **Editar**: se cambia todo menos la clave interna (`carpintero`), que es la que guardan las personas y los pasos. Quitar una casilla surte efecto **al instante**, sin que nadie tenga que volver a entrar.
- **Desactivar**: el rol deja de poder asignarse, pero quien ya lo tenía conserva su historial.
- **Eliminar**: sólo si **nadie** lo tiene. Si hay personas con ese rol, el diálogo lo dice con nombre y número y ofrece **reasignarlas a otro rol** ahí mismo. El rol `admin` nunca se puede eliminar ni desactivar.

#### Crear, editar y eliminar personas → `/admin/fabricacion/equipo`

- **Crear**: nombre, rol, áreas, teléfono y un **PIN de 4–6 dígitos**. Al guardar sale una **tarjeta imprimible** con el nombre y el PIN para entregársela a la persona: el PIN **sólo se ve esa vez** (se guarda cifrado, no se puede recuperar).
- **Editar** · **Cambiar de rol** · **Resetear el PIN** (vuelve a salir la tarjeta imprimible) · **Activar/Desactivar**.
- **Eliminar**: es un borrado **lógico**, para no perder el rastro de lo que esa persona hizo. Su nombre sigue apareciendo en la bitácora de los muebles que trabajó. Se puede **Restaurar** desde "Ver eliminados".
- **Seguros anti-bloqueo**: nadie puede eliminarse ni desactivarse a sí mismo, y el sistema **no deja quedarse sin nadie** que pueda gestionar usuarios (si es la última persona con ese permiso, lo rechaza y lo explica).

Lo mismo aplica al resto: áreas, pasos, rutas, pedidos, muebles e incidencias tienen sus cinco operaciones (crear, ver, listar, editar, eliminar). **Si algo está en uso no se borra: se archiva o se cancela**, y el diálogo explica siempre qué se conserva y qué se pierde, con dos botones grandes: "SÍ, ELIMINAR" / "NO, VOLVER".

### El viaje de un mueble, de principio a fin

1. **Se crea el pedido** — `/admin/fabricacion/pedidos/nuevo`. Datos del cliente, canal (WhatsApp, tienda, web), prioridad y fecha prometida. Se añade una línea por mueble: qué producto, cuántos y **con qué ruta** se va a fabricar. Al guardar, el sistema crea un **mueble por unidad** con su código `COD-XXXXXX` y le copia dentro los pasos de la ruta.
2. **Se imprime la etiqueta** — `/admin/fabricacion/etiquetas/COD-XXXXXX` (o `PED-XXXXXX` para imprimir las de todo el pedido de golpe, con `?copias=N`). Hoja de 10×15 cm con el QR grande, el código en letra enorme, el código de barras, el cliente, el mueble y la fecha prometida. Se pega en la madera y **esa etiqueta acompaña al mueble hasta el final**.
3. **El taller trabaja** — cada persona entra en `/fabrica` con su PIN y ve **sólo sus muebles**: los que tiene empezados y los que ya puede empezar. Escanea el QR con la cámara (o teclea el código) y el teléfono abre la ficha del mueble. Toca "EMPEZAR ESTE PASO", y al terminar el asistente le va pidiendo lo que ese paso exija: **foto** (botón de cámara enorme), **lista de comprobación**, **nota**, **firma**. Sin eso no deja terminar, y el mensaje dice **qué falta y qué hacer** ("Falta la foto. Toma 1 foto del mueble para poder continuar").
4. **Los pasos se desbloquean solos** — un paso está gris (bloqueado) hasta que termina el anterior; entonces se pone azul (listo), ámbar mientras se trabaja y verde al terminar. Si un paso lo tiene que hacer un rol concreto, a los demás se les dice quién es ("Este paso lo tiene que hacer un Tapicero. Avisa a tu supervisor").
5. **Si algo sale mal** — botón "AVISAR DE UN PROBLEMA": motivo, gravedad y fotos. El mueble se pone en rojo y **se bloquea** hasta que un supervisor lo resuelve desde `/admin/fabricacion/incidencias`.
6. **Almacén** — embala, guarda y despacha. Los pasos de traslado piden **escanear el código al recibir**, así se sabe con hora exacta cuándo cambió de manos.
7. **Delivery** — el repartidor escanea al cargar, marca "en camino" y al llegar toma la **firma del cliente** en la pantalla del teléfono. El mueble queda `ENTREGADA`.
8. **Tienda o casa del cliente** — si el mueble se recoge en tienda, el paso de recepción también se escanea. Cuando todos los muebles de un pedido terminan, el **pedido** pasa solo a `COMPLETADO`.

Mientras tanto, el tablero de `/admin/fabricacion` muestra los muebles en columnas por el paso en el que están, con los retrasos y los problemas destacados.

### Personalizar una ruta

Una **ruta** es la receta de un tipo de mueble: la lista ordenada de pasos por los que pasa. Se editan en `/admin/fabricacion/rutas`.

1. **Nueva ruta** desde cero o desde una de las tres plantillas que trae el sistema: *Sofá tapizado completo* (16 pasos), *Mueble de madera* (13) y *Comedor con sillas* (16).
2. Se **añaden pasos** desde el catálogo (el panel de la derecha) o se crea uno nuevo ahí mismo. Se ordenan con botones **▲ ▼** y se quitan con **✕** — nada de arrastrar, que en una tablet es un suplicio.
3. Cada paso se configura con casillas: qué **roles** lo pueden hacer, en qué **área** se hace, si pide **foto** (y cuántas), **escaneo**, **firma**, **nota** o **lista de comprobación**, cuántas **horas** lleva, si se puede **omitir**, si puede ir **en paralelo** con el anterior y si el cliente debe **enterarse** de ese paso.
4. La **vista previa** enseña cómo lo verá el operario en su teléfono antes de guardar.
5. Una ruta se puede **duplicar**, marcar como **predeterminada** y **archivar** cuando ya no se use. Si hay muebles fabricándose con ella, **no se borra: se archiva** (los muebles en curso conservan su copia).

Los **pasos reutilizables** viven aparte, en `/admin/fabricacion/catalogo`: se crean, editan, duplican y desactivan una vez y se usan en todas las rutas.

### Qué queda auditado y dónde verlo

**Todo movimiento deja constancia de quién lo hizo.** Hay dos bitácoras y ninguna de las dos se puede editar ni borrar:

| Bitácora | Qué anota | Dónde se ve |
|---|---|---|
| **Bitácora del mueble** (`eventos_unidad`) | Creación, cada paso empezado/terminado/omitido, escaneos, pausas, asignaciones, notas, problemas, entregas, cancelaciones y reversiones — con la persona, su rol, la hora y las fotos | Ficha del mueble → pestaña **"Bitácora"** (`/admin/fabricacion/unidades/COD-XXXXXX`) |
| **Historial de cambios** (`registros_auditoria`) | Toda la configuración: roles, personas, áreas, pasos, rutas, pedidos, muebles e incidencias — creados, editados, eliminados, restaurados, activados, duplicados, PIN reseteado, inicios de sesión e intentos fallidos | **`/admin/fabricacion/auditoria`**, y también en la pestaña "Cambios" de cada ficha |

El Historial guarda el **cambio campo por campo** ya traducido: "Cami editó la ruta «Sofá tapizado completo» — Nombre: «Sofá básico» → «Sofá tapizado completo»". Se filtra por texto, por tipo de cosa, por persona y por fechas. Hace falta la capacidad `ver_auditoria`.

### Quién puede crear usuarios

**Sólo quien tenga la capacidad `gestionar_usuarios`.** De fábrica la tienen el rol **Administrador** y quien entre al panel con la clave de admin. El Supervisor **no** la tiene: reparte trabajo, pero no da de alta gente ni cambia permisos.

No hay registro abierto ni autoservicio: nadie se crea una cuenta por su cuenta. Y el sistema no permite quedarse sin nadie que pueda hacerlo — el último con ese permiso no se puede eliminar, ni desactivar, ni quitarle la casilla.

### Seguimiento para el cliente (apagado por defecto)

Existe una página pública, `/seguimiento/COD-XXXXXX`, donde el cliente ve el avance de su mueble sin ver nada interno: ni precios, ni notas del taller, ni nombres de operarios, ni sus propios datos de contacto. Sólo los pasos marcados como "el cliente se entera".

Viene **apagada**, porque hoy el módulo es interno. Para encenderla:

```bash
# .env.local (y en Vercel: Settings → Environment Variables)
NEXT_PUBLIC_FABRICA_SEGUIMIENTO_PUBLICO="true"
```

Y volver a construir (`npm run build`), porque es una variable pública que se hornea en el build. Apagada, la página devuelve 404 antes de leer un solo dato y el panel muestra una nota discreta en vez del botón de compartir. Cualquier valor que no sea exactamente `"true"` la deja apagada.

### Sembrar y probar

```bash
# Datos de arranque: 8 roles, 5 áreas, el catálogo de pasos, 6 personas con PIN 1234,
# las 3 rutas y 2 pedidos de ejemplo con muebles en distintos grados de avance.
npm run seed:fabrica

# Empezar de cero (borra SÓLO las colecciones de fabricación; nunca los productos)
npm run seed:fabrica -- --reset

# Batería de pruebas contra la base camihogar_test (no toca tus datos)
npm run test:fabrica
```

Al terminar, el seed imprime los códigos y las URLs listas para abrir. El PIN de todas las personas de ejemplo es **1234**: cámbialo antes de usarlo de verdad.

### URLs clave

| URL | Qué es |
|---|---|
| `/fabrica` | App de taller: mis muebles |
| `/fabrica/login` | Entrar con nombre y PIN |
| `/fabrica/escanear` | Escáner de cámara + teclado numérico gigante |
| `/fabrica/u/COD-XXXXXX` | Ficha del mueble en el teléfono |
| `/f/COD-XXXXXX` | **Destino del QR de la etiqueta** (lleva a la ficha) |
| `/admin/fabricacion` | Tablero: columnas por paso, retrasos y problemas |
| `/admin/fabricacion/pedidos` · `/nuevo` | Pedidos de clientes |
| `/admin/fabricacion/unidades` | Todos los muebles, con filtros |
| `/admin/fabricacion/incidencias` | Problemas reportados |
| `/admin/fabricacion/rutas` · `/admin/fabricacion/catalogo` | Rutas y pasos reutilizables |
| `/admin/fabricacion/equipo` · `/roles` · `/estaciones` | Personas, permisos y áreas |
| `/admin/fabricacion/auditoria` | Historial de cambios |
| `/admin/fabricacion/etiquetas/COD-XXXXXX` | Etiqueta imprimible 10×15 (`?copias=N`) |
| `/seguimiento/COD-XXXXXX` | Vista del cliente (sólo si está encendida) |
