# Cloudflare R2 para imágenes de CamiHogar

## Qué hace la integración

- El administrador selecciona hasta 8 fotografías por producto.
- El navegador reduce cada foto a un máximo de 2000 px y la convierte a WebP con calidad 82%.
- El archivo optimizado se sube directamente a R2 mediante una URL firmada que vence en 5 minutos.
- La primera imagen del listado es la portada del catálogo.
- Las flechas cambian el orden; eliminar quita el archivo de R2 cuando pertenece al bucket de productos.
- `/admin/imagenes` muestra cantidad de archivos, bytes utilizados, capacidad restante y porcentaje.

## Configuración en Cloudflare

1. Inicia sesión en Cloudflare y abre **R2 Object Storage**.
2. Pulsa **Create bucket** y utiliza `camihogar-imagenes` como nombre.
3. En el bucket, abre **Settings > CORS Policy** y agrega:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://TU-DOMINIO-DE-PRODUCCION.com"
    ],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

4. En **Settings > Public access**, conecta un dominio personalizado, por ejemplo `imagenes.tudominio.com`. Para producción no se recomienda depender de la URL temporal `r2.dev`.
5. En la página principal de R2 abre **Manage R2 API Tokens**.
6. Crea un token con permiso **Object Read & Write**, limitado únicamente al bucket `camihogar-imagenes`.
7. Copia una sola vez el Access Key ID y Secret Access Key. Nunca publiques el secreto ni lo escribas en el navegador.

## Variables locales

Copia estas variables a `.env.local` y reemplaza los valores. No subas ese archivo a Git.

```env
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="camihogar-imagenes"
R2_PUBLIC_URL="https://imagenes.tudominio.com"
NEXT_PUBLIC_R2_PUBLIC_URL="https://imagenes.tudominio.com"
R2_STORAGE_LIMIT_GB="10"
```

Reinicia `npm run dev` después de cambiar las variables.

## Configuración en Vercel

1. Abre el proyecto en Vercel.
2. Entra a **Settings > Environment Variables**.
3. Crea las siete variables anteriores para **Production**, **Preview** y **Development**.
4. Verifica que `NEXT_PUBLIC_R2_PUBLIC_URL` sea el dominio público de las imágenes.
5. Ejecuta un nuevo deployment; las variables públicas se incorporan durante el build.
6. Añade el dominio final de Vercel a `AllowedOrigins` en el CORS del bucket.

## Prueba de aceptación

1. Abre `/admin/imagenes`: debe indicar que R2 está conectado.
2. Abre `/admin/productos/nuevo` y selecciona una fotografía JPG grande.
3. Confirma que aparece progreso y luego la miniatura.
4. Agrega una segunda foto y muévela a la primera posición; debe mostrar “Portada”.
5. Completa el producto y guárdalo.
6. Abre el catálogo y la ficha pública. La portada y la galería deben cargar.
7. Regresa a `/admin/imagenes`; el conteo y el espacio utilizado deben aumentar.

## Operación y costos

El monitor usa `R2_STORAGE_LIMIT_GB` como límite visual, no como bloqueo de facturación. Configúralo según el presupuesto real. El bucket sólo cuenta objetos bajo `productos/`, de modo que archivos de otros módulos no alteran las métricas del catálogo.
