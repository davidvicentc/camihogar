import type { Category, ConfigurationOption, FabricOption, FinishOption } from "@/lib/types";

/**
 * Configuración central de marca y categorías del e-commerce.
 * Aquí puedes ajustar el nombre de la marca, la categoría principal y la
 * información visible en la tienda sin tocar cada vista individual.
 */
export const PRODUCT_CATEGORY_OPTIONS = [
  {
    label: "Salas",
    slug: "salas",
    description: "Sofás y juegos de sala para reunir a los tuyos",
    image: "/categories/salas.jpg",
  },
  {
    label: "Comedores",
    slug: "comedores",
    description: "Mesas y sillas que celebran cada comida",
    image: "/categories/comedores.jpg",
  },
  {
    label: "Dormitorios",
    slug: "dormitorios",
    description: "Camas y descanso con diseño cálido",
    image: "/categories/dormitorios.jpg",
  },
  {
    label: "Muebles Auxiliares",
    slug: "muebles-auxiliares",
    description: "Mesas de centro, repisas y complementos",
    image: "/categories/muebles-auxiliares.jpg",
  },
  {
    label: "Oficina",
    slug: "oficina",
    description: "Escritorios y sillas para trabajar en casa",
    image: "/categories/oficina.jpg",
  },
  {
    label: "Decoración",
    slug: "decoracion",
    description: "Detalles que convierten tu casa en hogar",
    image: "/categories/decoracion.jpg",
  },
] as const;

/** Categorías mínimas que necesita el formulario de productos. Sus slugs son estables. */
export const PRODUCT_FORM_CATEGORIES = [
  { name: "Muebles, sofás cama y comedores", slug: "muebles-sofas-cama-comedores", description: "Muebles, sofás cama y comedores" },
  { name: "Camas", slug: "camas", description: "Camas y bases para dormitorio" },
  { name: "Closets, centros de TV, zapateras y gaveteros", slug: "closets-centros-tv-zapateras-gaveteros", description: "Muebles auxiliares de almacenamiento" },
  { name: "Colchones", slug: "colchones", description: "Colchones y opciones de descanso" },
] as const;

export const CATEGORY_META: {
  label: Category;
  slug: string;
  description: string;
  image: string;
}[] = PRODUCT_CATEGORY_OPTIONS.map((category) => ({
  ...category,
  label: category.label,
}));

export function categoryFromSlug(slug: string): Category | undefined {
  return CATEGORY_META.find((c) => c.slug === slug)?.label;
}

/** Presets de tapizados sugeridos en el wizard del admin. */
export const FABRIC_PRESETS: FabricOption[] = [
  { name: "Lino Natural", hex: "#D9CDBA", priceExtra: 0 },
  { name: "Terciopelo Óxido", hex: "#B45338", priceExtra: 45 },
  { name: "Terciopelo Verde Oliva", hex: "#5C6247", priceExtra: 45 },
  { name: "Cuero Sintético Camel", hex: "#A9713C", priceExtra: 60 },
  { name: "Cuero Sintético Negro", hex: "#26211E", priceExtra: 60 },
  { name: "Microfibra Gris Piedra", hex: "#8D857C", priceExtra: 25 },
  { name: "Microfibra Arena", hex: "#C9B99F", priceExtra: 25 },
];

/** Presets de acabados de madera/metal sugeridos en el wizard del admin. */
export const FINISH_PRESETS: FinishOption[] = [
  { name: "Nogal Oscuro", hex: "#4A2F1F", priceExtra: 0 },
  { name: "Roble Natural", hex: "#B98A5A", priceExtra: 20 },
  { name: "Encino", hex: "#C9A876", priceExtra: 20 },
  { name: "Blanco Mate", hex: "#F5F2ED", priceExtra: 30 },
  { name: "Negro Industrial", hex: "#1C1A18", priceExtra: 30 },
];

/** Presets de distribución/medidas sugeridos en el wizard del admin. */
export const CONFIGURATION_PRESETS: ConfigurationOption[] = [
  { label: "2 Puestos", priceMultiplier: 0.8 },
  { label: "3 Puestos", priceMultiplier: 1 },
  { label: "Modular L-Shape", priceMultiplier: 1.35 },
  { label: "Reversible", priceMultiplier: 1.15 },
];

export const BRAND = {
  name: "CamiHogar",
  legalName: "CamiHogar Muebles",
  tagline: "Muebles que abrazan tu hogar",
  instagram: "https://instagram.com/camihogar",
  warranty: "Garantía CamiHogar de 2 años",
  delivery: "Entrega e instalación en toda Venezuela",
  email: "hola@camihogar.com",
  phone: "+58 412-000-0000",
  location: "Valencia, Venezuela",
} as const;

export const BRAND_CONFIG = BRAND;
