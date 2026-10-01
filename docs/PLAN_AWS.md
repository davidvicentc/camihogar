# Plan de migración y optimización en AWS

## Objetivo

Mover CamiHogar a una infraestructura económica y predecible en AWS, manteniendo separados el servidor web y la base de datos. La prioridad es reducir consultas a MongoDB, servir el catálogo desde caché y conservar una ruta de crecimiento sin pagar infraestructura sobredimensionada.

## Arquitectura recomendada

```text
Usuarios
   |
CloudFront (TLS, CDN y protección perimetral)
   |-- contenido estático e imágenes --> S3
   `-- páginas y API --> Lightsail web (2 GB RAM)
                              |
                              | red privada
                              v
                         Lightsail MongoDB (4 GB RAM)
```

### Servidor web

- Amazon Lightsail Linux de 2 GB RAM, 2 vCPU, 60 GB SSD.
- Next.js y Nginx ejecutados mediante contenedores o servicios `systemd`.
- Solo Nginx queda expuesto públicamente; la aplicación escucha en la interfaz local.
- Acceso administrativo mediante AWS Systems Manager o una IP restringida.

### Base de datos

- Amazon Lightsail Linux de 4 GB RAM, 2 vCPU, 80 GB SSD.
- MongoDB compatible con la implementación actual de Mongoose.
- Puerto de MongoDB disponible únicamente desde la IP privada del servidor web.
- Snapshots automáticos diarios y copia lógica periódica cifrada en S3.
- Alertas de disco, memoria, CPU y fallos de respaldo.

### Imágenes

- Migrar las imágenes de Cloudflare R2 a Amazon S3.
- Servirlas exclusivamente mediante CloudFront.
- Mantener WebP, dimensiones limitadas y metadatos `Cache-Control: public, max-age=31536000, immutable` para archivos versionados.

## Costos de referencia

Estimación en USD, antes de impuestos y sujeta a la región y a cambios de precio de AWS:

| Componente | Estimación mensual |
| --- | ---: |
| Lightsail web 2 GB | $12 |
| Lightsail MongoDB 4 GB | $24 |
| Snapshots incrementales | $1–3 |
| CloudFront Free, dentro de sus límites | $0 |
| S3, dentro del crédito incluido y uso inicial | $0 |
| **Total inicial esperado** | **$37–40** |

DocumentDB es la alternativa administrada compatible con MongoDB. Su costo inicial estimado eleva el total a aproximadamente $70–85 mensuales con un nodo y a más de $130 con redundancia. Debe validarse la compatibilidad real de consultas e índices antes de adoptarlo.

## Estrategia de caché

### Aplicación

- Productos, categorías, marcas, configuración, colores y opciones de colchones se guardan en Data Cache durante 5 minutos.
- Las mutaciones del panel invalidan las etiquetas correspondientes inmediatamente.
- Las páginas de inicio y producto utilizan revalidación incremental cada 5 minutos.
- Las rutas operativas —sesiones, administración, fábrica, seguimiento y analítica— permanecen dinámicas.
- Los errores de MongoDB no se guardan en caché: se conserva el estado degradado y se reintenta en la siguiente solicitud.

### CDN

- `/_next/static/*`: un año e inmutable.
- Imágenes versionadas: un año e inmutables.
- Inicio y fichas de producto: respetar la revalidación de Next.js.
- Catálogo con parámetros, panel, fábrica y API privadas: no almacenar HTML compartido.

### Base de datos

- Mantener índices para `slug`, categoría, existencia y consultas de producción.
- Revisar periódicamente índices sin uso y crecimiento de `AnalyticsLog`.
- Agregar retención o agregación a los eventos analíticos antes de que su volumen sea significativo.
- No invalidar el catálogo por cada vista; los contadores pueden tener consistencia eventual.

## Recuperación y crecimiento

La configuración inicial no es de alta disponibilidad. Ante una falla del servidor de base de datos se restaura el snapshot más reciente y habrá una ventana de indisponibilidad. Cuando el costo de esa ventana sea mayor que el ahorro, migrar a DocumentDB validado o a un clúster MongoDB con réplica.

Señales para ampliar capacidad:

- Memoria sostenida por encima de 75%.
- CPU sostenida por encima de 60% o agotamiento frecuente de créditos.
- Disco por encima de 70%.
- Latencia P95 del HTML dinámico por encima de 800 ms después de aplicar caché.
- Más de 1 millón de solicitudes o 100 GB mensuales a través de CloudFront.

## Orden de implementación

1. Aplicar y verificar el caché de datos y la revalidación en la aplicación.
2. Crear imágenes reproducibles para web y MongoDB.
3. Aprovisionar las dos instancias con red privada y almacenamiento cifrado.
4. Migrar la base de datos y validar conteos, índices y permisos.
5. Migrar imágenes a S3 y cambiar las URLs públicas.
6. Activar CloudFront, TLS, logs, alertas y presupuesto mensual.
7. Cambiar DNS y conservar temporalmente la infraestructura anterior para rollback.

