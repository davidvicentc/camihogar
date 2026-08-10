/**
 * Tipos planos (serializables) compartidos entre Server y Client Components.
 * Los documentos de Mongoose se convierten a estos DTOs antes de cruzar la
 * frontera servidor → cliente.
 */

export const CATEGORIES = [
  "Salas",
  "Comedores",
  "Dormitorios",
  "Muebles Auxiliares",
  "Oficina",
  "Decoración",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type AnalyticsEventType = "VIEW" | "WHATSAPP_CLICK" | "CUSTOMIZER_OPEN";

export interface FabricOption {
  name: string;
  hex: string;
  priceExtra: number;
  textureUrl?: string;
}

export interface FinishOption {
  name: string;
  hex: string;
  priceExtra: number;
  textureUrl?: string;
}

export interface ConfigurationOption {
  label: string;
  priceMultiplier: number;
}

export interface Dimensions {
  width: number;
  height: number;
  depth: number;
  unit: string;
}

export interface CustomizationOptions {
  fabrics: FabricOption[];
  finishes: FinishOption[];
  configurations: ConfigurationOption[];
}

export interface ProductMetrics {
  viewsCount: number;
  whatsappClicksCount: number;
}

export interface ProductDTO {
  _id: string;
  title: string;
  slug: string;
  description: string;
  category: Category;
  basePrice: number;
  images: string[];
  dimensions: Dimensions;
  customizationOptions: CustomizationOptions;
  metrics: ProductMetrics;
  rating: number;
  reviewsCount: number;
  isFeatured: boolean;
  inStock: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Payload del wizard de publicación / edición de productos en el admin. */
export interface ProductInput {
  title: string;
  description: string;
  category: Category;
  basePrice: number;
  images: string[];
  dimensions: Dimensions;
  customizationOptions: CustomizationOptions;
  isFeatured?: boolean;
  inStock?: boolean;
}

export interface CatalogFilters {
  category?: Category;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  search?: string;
  sort?: "recent" | "price-asc" | "price-desc" | "popular";
}
