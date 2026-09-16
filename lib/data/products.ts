import { connectDB } from "@/lib/mongodb";
import ProductModel from "@/lib/models/Product";
import BrandModel from "@/lib/models/Brand";
import CategoryModel from "@/lib/models/Category";
import type { CatalogFilters, HomeSectionOrder, ProductDTO } from "@/lib/types";
import type { FilterQuery } from "mongoose";
import type { Product } from "@/lib/models/Product";
import { normalizeImageUrl } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function serializeProduct(doc: any): ProductDTO {
  return {
    _id: String(doc._id),
    title: doc.title,
    slug: doc.slug,
    description: doc.description ?? "",
    brand: doc.brand ?? "",
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

export async function getProducts(
  filters: CatalogFilters = {}
): Promise<ProductDTO[]> {
  try {
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

    const docs = await ProductModel.find(query).sort(sort).limit(100).lean();
    return sortByStartingPrice(docs.map(serializeProduct));
  } catch (error) {
    console.error("[data/products] getProducts:", error);
    return [];
  }
}

export async function getProductBySlug(slug: string): Promise<ProductDTO | null> {
  try {
    await connectDB();
    const doc = await ProductModel.findOne({ slug }).lean();
    return doc ? serializeProduct(doc) : null;
  } catch (error) {
    console.error("[data/products] getProductBySlug:", error);
    return null;
  }
}

export async function getProductById(id: string): Promise<ProductDTO | null> {
  try {
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
  } catch (error) {
    console.error("[data/products] getProductById:", error);
    return null;
  }
}

export async function getFeaturedProducts(limit = 6): Promise<ProductDTO[]> {
  try {
    await connectDB();
    const docs = await ProductModel.find({ isFeatured: true, inStock: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return sortByStartingPrice(docs.map(serializeProduct));
  } catch (error) {
    console.error("[data/products] getFeaturedProducts:", error);
    return [];
  }
}

/** "Bestsellers": mayor interacción real (clics a WhatsApp, luego vistas). */
export async function getBestsellers(limit = 8): Promise<ProductDTO[]> {
  try {
    await connectDB();
    const docs = await ProductModel.find({ inStock: true })
      .sort({ "metrics.whatsappClicksCount": -1, "metrics.viewsCount": -1 })
      .limit(limit)
      .lean();
    return sortByStartingPrice(docs.map(serializeProduct));
  } catch (error) {
    console.error("[data/products] getBestsellers:", error);
    return [];
  }
}

/** Productos que tienen al menos una opción de personalización cargada. */
export async function getCustomizableProducts(limit = 24): Promise<ProductDTO[]> {
  try {
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
  } catch (error) {
    console.error("[data/products] getCustomizableProducts:", error);
    return [];
  }
}

export async function getRelatedProducts(
  product: ProductDTO,
  limit = 4
): Promise<ProductDTO[]> {
  try {
    await connectDB();
    const docs = await ProductModel.find({
      category: product.category,
      _id: { $ne: product._id },
      inStock: true,
    })
      .sort({ basePrice: 1 })
      .limit(limit)
      .lean();
    return sortByStartingPrice(docs.map(serializeProduct));
  } catch (error) {
    console.error("[data/products] getRelatedProducts:", error);
    return [];
  }
}

export async function getPriceRange(): Promise<{ min: number; max: number }> {
  try {
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
  } catch (error) {
    console.error("[data/products] getPriceRange:", error);
    return { min: 0, max: 5000 };
  }
}
