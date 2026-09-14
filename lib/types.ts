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

export type Category = string;

export type AnalyticsEventType = "VIEW" | "WHATSAPP_CLICK" | "CUSTOMIZER_OPEN";
export type HomeProductSort = "price-asc" | "price-desc" | "popular" | "recent" | "manual";

export interface HomeSectionOrder {
  sort: HomeProductSort;
  productIds: string[];
}

export const ADMIN_PERMISSIONS = [
  "products.read", "products.write", "products.delete",
  "brands.manage", "categories.manage", "settings.manage", "users.manage",
] as const;
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

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

export interface MattressFeatures {
  model: string;
  pillow: string;
  warrantyYears: number;
  composition: string;
}

export interface ProductMetrics {
  viewsCount: number;
  whatsappClicksCount: number;
}

export interface ProductVariant {
  name: string;
  price: number;
  sku?: string;
  isDefault?: boolean;
  mattressFeatures?: MattressFeatures;
}

export interface ProductDTO {
  _id: string;
  title: string;
  slug: string;
  description: string;
  brand: string;
  brandId?: string;
  categoryId?: string;
  collection: string;
  variantName: string;
  sku: string;
  category: Category;
  basePrice: number;
  variants?: ProductVariant[];
  images: string[];
  dimensions: Dimensions;
  customizationOptions: CustomizationOptions;
  /** Compatibilidad con productos antiguos; los nuevos guardan esto por variante. */
  mattressFeatures?: MattressFeatures;
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
  brand: string;
  brandId?: string;
  categoryId?: string;
  collection: string;
  variantName: string;
  sku: string;
  category: Category;
  basePrice: number;
  variants?: ProductVariant[];
  images: string[];
  dimensions: Dimensions;
  customizationOptions: CustomizationOptions;
  mattressFeatures?: MattressFeatures;
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
