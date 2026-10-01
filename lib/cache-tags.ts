/** Etiquetas compartidas por las lecturas cacheadas y las mutaciones. */
export const CACHE_TAGS = {
  products: "products",
  catalog: "catalog",
  settings: "site-settings",
  colors: "color-presets",
  mattressOptions: "mattress-options",
} as const;

/** Cinco minutos mantiene fresca la tienda sin consultar MongoDB en cada visita. */
export const PUBLIC_CACHE_SECONDS = 300;

