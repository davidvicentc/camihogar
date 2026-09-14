"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPermission as requireAdmin } from "@/lib/admin-session";
import { connectDB } from "@/lib/mongodb";
import ProductModel from "@/lib/models/Product";
import { serializeProduct } from "@/lib/data/products";
import type { ProductDTO, ProductInput } from "@/lib/types";
import BrandModel from "@/lib/models/Brand";
import CategoryModel from "@/lib/models/Category";
import { normalizeImageUrl } from "@/lib/utils";
import { deleteProductImage, productImageKeyFromUrl } from "@/lib/r2";

export interface ActionResult<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

function validateVariants(input: Pick<ProductInput, "variants">): string | null {
  const variants = input.variants ?? [];
  if (!variants.length) return "Agrega al menos una variante con nombre y precio.";
  if (variants.some((variant) => !variant.name.trim() || !Number.isFinite(variant.price) || variant.price <= 0)) {
    return "Cada variante debe tener nombre y precio mayor a cero.";
  }
  if (variants.filter((variant) => variant.isDefault).length !== 1) {
    return "Marca exactamente una variante como principal.";
  }
  const skus = variants.map((variant) => variant.sku?.trim()).filter(Boolean);
  if (new Set(skus).size !== skus.length) return "Los códigos SKU no pueden repetirse.";
  const combinations = variants.map((variant) => {
    const features = variant.mattressFeatures;
    return [variant.name, features?.model, features?.pillow, features?.composition, features?.warrantyYears]
      .filter((value) => value !== undefined)
      .join("|")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  });
  if (new Set(combinations).size !== combinations.length) {
    return "Hay dos variantes con la misma medida y características. Cambia la configuración o elimina la repetida.";
  }
  for (const variant of variants) {
    const features = variant.mattressFeatures;
    if (!features) continue;
    if (!features.model.trim() || !features.pillow.trim() || !features.composition.trim() || !Number.isInteger(features.warrantyYears) || features.warrantyYears < 2 || features.warrantyYears > 12) {
      return `Revisa las características de la variante ${variant.name}.`;
    }
  }
  return null;
}

function validateMattressFeatures(input: Pick<ProductInput, "mattressFeatures">): string | null {
  const features = input.mattressFeatures;
  if (!features) return null;
  if (!features.model.trim() || !features.pillow.trim() || !features.composition.trim()) return "Completa tipo, pillow y composición del colchón.";
  if (!Number.isInteger(features.warrantyYears) || features.warrantyYears < 2 || features.warrantyYears > 12) return "La garantía debe estar entre 2 y 12 años.";
  return null;
}

function revalidatePublicPages(slug?: string) {
  revalidatePath("/");
  revalidatePath("/catalogo");
  revalidatePath("/admin/productos");
  if (slug) {
    revalidatePath(`/producto/${slug}`);
    revalidatePath(`/personalizar/${slug}`);
  }
}

export async function createProduct(
  input: ProductInput
): Promise<ActionResult<ProductDTO>> {
  try {
    await requireAdmin("products.write");
    if (!input.title.trim()) return { ok: false, error: "El producto necesita un nombre." };
    const variantsError = validateVariants(input);
    if (variantsError) return { ok: false, error: variantsError };
    const mattressError = validateMattressFeatures(input);
    if (mattressError) return { ok: false, error: mattressError };
    await connectDB();
    const [brand, category] = await Promise.all([
      input.brandId ? BrandModel.findById(input.brandId) : null,
      input.categoryId ? CategoryModel.findById(input.categoryId) : null,
    ]);
    if (!brand || !category) return { ok: false, error: "Selecciona una marca y categoría válidas." };
    const doc = await ProductModel.create({
      ...input,
      images: (input.images ?? []).map(normalizeImageUrl).filter(Boolean),
      brand: brand.name,
      category: category.name,
      metrics: { viewsCount: 0, whatsappClicksCount: 0 },
    });
    revalidatePublicPages(doc.slug ?? undefined);
    return { ok: true, data: serializeProduct(doc.toObject()) };
  } catch (error) {
    console.error("[actions/products] createProduct:", error);
    return { ok: false, error: error instanceof Error ? error.message : "Error al crear" };
  }
}

export async function updateProduct(
  id: string,
  input: Partial<ProductInput>
): Promise<ActionResult<ProductDTO>> {
  try {
    await requireAdmin("products.write");
    await connectDB();
    const doc = await ProductModel.findById(id);
    if (!doc) return { ok: false, error: "Producto no encontrado" };
    if (!input.brandId || !input.categoryId) {
      return { ok: false, error: "Selecciona una marca y categoría válidas." };
    }
    if (input.variants) {
      const variantsError = validateVariants({ variants: input.variants });
      if (variantsError) return { ok: false, error: variantsError };
    }
    if (input.mattressFeatures) {
      const mattressError = validateMattressFeatures({ mattressFeatures: input.mattressFeatures });
      if (mattressError) return { ok: false, error: mattressError };
    }
    const [brand, category] = await Promise.all([
      BrandModel.findById(input.brandId),
      CategoryModel.findById(input.categoryId),
    ]);
    if (!brand || !category) return { ok: false, error: "Selecciona una marca y categoría válidas." };
    const previousImages = [...doc.images];
    input = { ...input, brand: brand.name, category: category.name, images: (input.images ?? []).map(normalizeImageUrl).filter(Boolean) };
    Object.assign(doc, input);
    await doc.save();
    const currentImages = new Set(doc.images);
    await Promise.allSettled(previousImages.filter((url) => !currentImages.has(url)).map((url) => productImageKeyFromUrl(url)).filter((key): key is string => Boolean(key)).map(deleteProductImage));
    revalidatePublicPages(doc.slug ?? undefined);
    return { ok: true, data: serializeProduct(doc.toObject()) };
  } catch (error) {
    console.error("[actions/products] updateProduct:", error);
    return { ok: false, error: error instanceof Error ? error.message : "Error al actualizar" };
  }
}

export async function toggleStock(id: string, inStock: boolean): Promise<ActionResult> {
  try {
    await requireAdmin("products.write");
    await connectDB();
    const doc = await ProductModel.findByIdAndUpdate(id, { inStock }, { new: true });
    revalidatePublicPages(doc?.slug ?? undefined);
    return { ok: true };
  } catch (error) {
    console.error("[actions/products] toggleStock:", error);
    return { ok: false, error: "Error al cambiar disponibilidad" };
  }
}

export async function toggleFeatured(
  id: string,
  isFeatured: boolean
): Promise<ActionResult> {
  try {
    await requireAdmin("products.write");
    await connectDB();
    const doc = await ProductModel.findByIdAndUpdate(id, { isFeatured }, { new: true });
    revalidatePublicPages(doc?.slug ?? undefined);
    return { ok: true };
  } catch (error) {
    console.error("[actions/products] toggleFeatured:", error);
    return { ok: false, error: "Error al destacar" };
  }
}

export async function updatePrice(id: string, basePrice: number): Promise<ActionResult> {
  try {
    await requireAdmin("products.write");
    if (!Number.isFinite(basePrice) || basePrice < 0) {
      return { ok: false, error: "Precio inválido" };
    }
    await connectDB();
    const doc = await ProductModel.findById(id);
    if (!doc) return { ok: false, error: "Producto no encontrado" };
    doc.basePrice = basePrice;
    const defaultVariant = doc.variants.find((variant) => variant.isDefault);
    if (defaultVariant) defaultVariant.price = basePrice;
    await doc.save();
    revalidatePublicPages(doc?.slug ?? undefined);
    return { ok: true };
  } catch (error) {
    console.error("[actions/products] updatePrice:", error);
    return { ok: false, error: "Error al actualizar precio" };
  }
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  try {
    await requireAdmin("products.delete");
    await connectDB();
    const doc = await ProductModel.findByIdAndDelete(id);
    if (doc) await Promise.allSettled(doc.images.map((url) => productImageKeyFromUrl(url)).filter((key): key is string => Boolean(key)).map(deleteProductImage));
    revalidatePublicPages(doc?.slug ?? undefined);
    return { ok: true };
  } catch (error) {
    console.error("[actions/products] deleteProduct:", error);
    return { ok: false, error: "Error al eliminar" };
  }
}
