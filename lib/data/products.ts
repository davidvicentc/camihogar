import { connectDB } from "@/lib/mongodb";
import ProductModel from "@/lib/models/Product";
import BrandModel from "@/lib/models/Brand";
import CategoryModel from "@/lib/models/Category";
import type { CatalogFilters, HomeSectionOrder, ProductDTO } from "@/lib/types";
import type { FilterQuery } from "mongoose";
import type { Product } from "@/lib/models/Product";
import { normalizeImageUrl } from "@/lib/utils";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS, PUBLIC_CACHE_SECONDS } from "@/lib/cache-tags";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function serializeProduct(doc: any): ProductDTO {
  return {
    _id: String(doc._id),
    title: doc.title,
    slug: doc.slug,
    description: doc.description ?? "",
    brand: typeof doc.brandId === "object" && doc.brandId?.name ? doc.brandId.name : doc.brand ?? "",
    brandId: doc.brandId ? String(doc.brandId) : undefined,
    categoryId: doc.categoryId ? String(doc.categoryId) : undefined,
    collection: doc.collection ?? "",
    variantName: doc.variantName ?? "",
    sku: doc.sku ?? "",
    category: doc.category,
    basePrice: doc.basePrice,
    warrantyYears: doc.warrantyYears ?? 0,
    variants: Array.isArray(doc.variants)
      ? [...doc.variants]
          .sort((a: any, b: any) => Number(a.price ?? 0) - Number(b.price ?? 0))
          .map((variant: any) => ({
          name: variant.name ?? "",
          price: Number(variant.price ?? 0),
          sku: variant.sku ?? "",
          isDefault: Boolean(variant.isDefault),
          mattressFeatures: variant.mattressFeatures
            ? { model: variant.mattressFeatures.model, pillow: variant.mattressFeatures.pillow, warrantyYears: Number(variant.mattressFeatures.warrantyYears), composition: variant.mattressFeatures.composition }
            : undefined,
          }))
      : [],
    colorOptions: Array.isArray(doc.colorOptions)
      ? doc.colorOptions.map((option: any) => ({
          name: option.name ?? "",
          colors: Array.isArray(option.colors) && option.colors.length ? option.colors : [option.hex || "#8c7a6b"],
          image: option.image ? normalizeImageUrl(option.image) : undefined,
        }))
      : [],
    images: (doc.images ?? []).map((image: string) => normalizeImageUrl(image)).filter(Boolean),
    dimensions: {
      width: doc.dimensions?.width ?? 0,
      height: doc.dimensions?.height ?? 0,
      depth: doc.dimensions?.depth ?? 0,
      unit: doc.dimensions?.unit ?? "cm",
    },
    customizationOptions: {
      fabrics: (doc.customizationOptions?.fabrics ?? []).map((f: any) => ({
        name: f.name,
        hex: f.hex,
        priceExtra: f.priceExtra ?? 0,
        textureUrl: f.textureUrl ?? undefined,
      })),
      finishes: (doc.customizationOptions?.finishes ?? []).map((f: any) => ({
        name: f.name,
        hex: f.hex,
        priceExtra: f.priceExtra ?? 0,
        textureUrl: f.textureUrl ?? undefined,
      })),
      configurations: (doc.customizationOptions?.configurations ?? []).map(
        (c: any) => ({
          label: c.label,
          priceMultiplier: c.priceMultiplier ?? 1,
        })
      ),
    },
    mattressFeatures: doc.mattressFeatures
      ? {
          model: doc.mattressFeatures.model,
          pillow: doc.mattressFeatures.pillow,
          warrantyYears: doc.mattressFeatures.warrantyYears,
          composition: doc.mattressFeatures.composition,
        }
      : undefined,
    metrics: {
      viewsCount: doc.metrics?.viewsCount ?? 0,
      whatsappClicksCount: doc.metrics?.whatsappClicksCount ?? 0,
    },
    rating: doc.rating ?? 5,
    reviewsCount: doc.reviewsCount ?? 0,
    isFeatured: doc.isFeatured ?? false,
    inStock: doc.inStock ?? true,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : "",
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : "",
  };
}

export function getProductStartingPrice(product: ProductDTO): number {
  const prices = (product.variants ?? []).map((variant) => variant.price).filter((price) => Number.isFinite(price) && price > 0);
  return prices.length ? Math.min(...prices) : product.basePrice;
}

function sortByStartingPrice(products: ProductDTO[]): ProductDTO[] {
  return [...products].sort((a, b) => getProductStartingPrice(a) - getProductStartingPrice(b));
}

export function orderHomeProducts(products: ProductDTO[], order: HomeSectionOrder): ProductDTO[] {
  const items = [...products];
  void order;
  return items.sort((a, b) => getProductStartingPrice(a) - getProductStartingPrice(b));
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Todas las funciones devuelven [] / null ante errores de conexión para que
 * las páginas públicas rendericen estados vacíos elegantes en lugar de un 500
 * (p. ej. durante el primer arranque sin MONGODB_URI configurado).
 */

async function queryProducts(
  filters: CatalogFilters = {}
): Promise<ProductDTO[]> {
  await connectDB();
  const query: FilterQuery<Product> = {};

    if (filters.category) query.category = filters.category;
    if (filters.inStock !== undefined) query.inStock = filters.inStock;
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      query.basePrice = {};
      if (filters.minPrice !== undefined) query.basePrice.$gte = filters.minPrice;
      if (filters.maxPrice !== undefined) query.basePrice.$lte = filters.maxPrice;
    }
    if (filters.search) {
      query.title = { $regex: filters.search, $options: "i" };
    }

    const sort: Record<string, 1 | -1> = { basePrice: 1 };

  const docs = await ProductModel.find(query).populate("brandId", "name").sort(sort).limit(100).lean();
  return sortByStartingPrice(docs.map(serializeProduct));
}

const getProductsCached = unstable_cache(queryProducts, ["products"], {
  revalidate: PUBLIC_CACHE_SECONDS,
  tags: [CACHE_TAGS.products],
});

export async function getProducts(filters: CatalogFilters = {}): Promise<ProductDTO[]> {
  try {
    return await getProductsCached(filters);
  } catch (error) {
    console.error("[data/products] getProducts:", error);
    return [];
  }
}

const getProductBySlugCached = unstable_cache(async (slug: string): Promise<ProductDTO | null> => {
  await connectDB();
  const doc = await ProductModel.findOne({ slug }).populate("brandId", "name").lean();
  return doc ? serializeProduct(doc) : null;
}, ["product-by-slug"], { revalidate: PUBLIC_CACHE_SECONDS, tags: [CACHE_TAGS.products] });

export async function getProductBySlug(slug: string): Promise<ProductDTO | null> {
  try {
    return await getProductBySlugCached(slug);
  } catch (error) {
    console.error("[data/products] getProductBySlug:", error);
    return null;
  }
}

const getProductByIdCached = unstable_cache(async (id: string): Promise<ProductDTO | null> => {
    await connectDB();
    const doc = await ProductModel.findById(id).lean();
    if (!doc) return null;
    const [brand, category] = await Promise.all([
      doc.brandId ? null : BrandModel.findOne({ name: doc.brand }).lean(),
      doc.categoryId ? null : CategoryModel.findOne({ name: doc.category }).lean(),
    ]);
    return serializeProduct({
      ...doc,
      brandId: doc.brandId ?? brand?._id,
      categoryId: doc.categoryId ?? category?._id,
    });
}, ["product-by-id"], { revalidate: PUBLIC_CACHE_SECONDS, tags: [CACHE_TAGS.products] });

export async function getProductById(id: string): Promise<ProductDTO | null> {
  try {
    return await getProductByIdCached(id);
  } catch (error) {
    console.error("[data/products] getProductById:", error);
    return null;
  }
}

const getFeaturedProductsCached = unstable_cache(async (limit: number): Promise<ProductDTO[]> => {
    await connectDB();
    const docs = await ProductModel.find({ isFeatured: true, inStock: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return sortByStartingPrice(docs.map(serializeProduct));
}, ["featured-products"], { revalidate: PUBLIC_CACHE_SECONDS, tags: [CACHE_TAGS.products] });

export async function getFeaturedProducts(limit = 6): Promise<ProductDTO[]> {
  try {
    return await getFeaturedProductsCached(limit);
  } catch (error) {
    console.error("[data/products] getFeaturedProducts:", error);
    return [];
  }
}

/** "Bestsellers": mayor interacción real (clics a WhatsApp, luego vistas). */
const getBestsellersCached = unstable_cache(async (limit: number): Promise<ProductDTO[]> => {
    await connectDB();
    const docs = await ProductModel.find({ inStock: true })
      .sort({ "metrics.whatsappClicksCount": -1, "metrics.viewsCount": -1 })
      .limit(limit)
      .lean();
    return sortByStartingPrice(docs.map(serializeProduct));
}, ["bestseller-products"], { revalidate: PUBLIC_CACHE_SECONDS, tags: [CACHE_TAGS.products] });

export async function getBestsellers(limit = 8): Promise<ProductDTO[]> {
  try {
    return await getBestsellersCached(limit);
  } catch (error) {
    console.error("[data/products] getBestsellers:", error);
    return [];
  }
}

/** Productos que tienen al menos una opción de personalización cargada. */
const getCustomizableProductsCached = unstable_cache(async (limit: number): Promise<ProductDTO[]> => {
    await connectDB();
    const docs = await ProductModel.find({
      inStock: true,
      $or: [
        { "customizationOptions.fabrics.0": { $exists: true } },
        { "customizationOptions.finishes.0": { $exists: true } },
        { "customizationOptions.configurations.0": { $exists: true } },
      ],
    })
      .sort({ basePrice: 1 })
      .limit(limit)
      .lean();
    return sortByStartingPrice(docs.map(serializeProduct));
}, ["customizable-products"], { revalidate: PUBLIC_CACHE_SECONDS, tags: [CACHE_TAGS.products] });

export async function getCustomizableProducts(limit = 24): Promise<ProductDTO[]> {
  try {
    return await getCustomizableProductsCached(limit);
  } catch (error) {
    console.error("[data/products] getCustomizableProducts:", error);
    return [];
  }
}

const getRelatedProductsCached = unstable_cache(async (productId: string, category: string, limit: number): Promise<ProductDTO[]> => {
    await connectDB();
    const docs = await ProductModel.find({
      category,
      _id: { $ne: productId },
      inStock: true,
    })
      .sort({ basePrice: 1 })
      .limit(limit)
      .lean();
    return sortByStartingPrice(docs.map(serializeProduct));
}, ["related-products"], { revalidate: PUBLIC_CACHE_SECONDS, tags: [CACHE_TAGS.products] });

export async function getRelatedProducts(product: ProductDTO, limit = 4): Promise<ProductDTO[]> {
  try {
    return await getRelatedProductsCached(product._id, product.category, limit);
  } catch (error) {
    console.error("[data/products] getRelatedProducts:", error);
    return [];
  }
}

const getPriceRangeCached = unstable_cache(async (): Promise<{ min: number; max: number }> => {
    await connectDB();
    const [result] = await ProductModel.aggregate([
      {
        $group: {
          _id: null,
          min: { $min: "$basePrice" },
          max: { $max: "$basePrice" },
        },
      },
    ]);
    return { min: result?.min ?? 0, max: result?.max ?? 5000 };
}, ["product-price-range"], { revalidate: PUBLIC_CACHE_SECONDS, tags: [CACHE_TAGS.products] });

export async function getPriceRange(): Promise<{ min: number; max: number }> {
  try {
    return await getPriceRangeCached();
  } catch (error) {
    console.error("[data/products] getPriceRange:", error);
    return { min: 0, max: 5000 };
  }
}
