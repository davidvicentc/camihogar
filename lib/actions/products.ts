"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import ProductModel from "@/lib/models/Product";
import { serializeProduct } from "@/lib/data/products";
import { ADMIN_COOKIE, getAdminSessionUserId, verifySessionToken } from "@/lib/auth";
import AdminUserModel from "@/lib/models/AdminUser";
import type { AdminPermission } from "@/lib/types";
import type { ProductDTO, ProductInput } from "@/lib/types";
import BrandModel from "@/lib/models/Brand";
import CategoryModel from "@/lib/models/Category";
import { normalizeImageUrl } from "@/lib/utils";

export interface ActionResult<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

async function requireAdmin(permission: AdminPermission = "products.write"): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!(await verifySessionToken(token))) {
    throw new Error("No autorizado");
  }
  const userId = await getAdminSessionUserId(token);
  if (userId) {
    const user = await AdminUserModel.findById(userId).lean();
    if (!user?.active || !user.permissions.includes(permission)) throw new Error("No autorizado");
  }
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
    if (input.variants?.some((variant) => !variant.name.trim() || variant.price <= 0)) {
      return { ok: false, error: "Cada variante debe tener nombre y precio mayor a cero." };
    }
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
    const [brand, category] = await Promise.all([
      BrandModel.findById(input.brandId),
      CategoryModel.findById(input.categoryId),
    ]);
    if (!brand || !category) return { ok: false, error: "Selecciona una marca y categoría válidas." };
    input = { ...input, brand: brand.name, category: category.name, images: (input.images ?? []).map(normalizeImageUrl).filter(Boolean) };
    Object.assign(doc, input);
    await doc.save();
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
    revalidatePublicPages(doc?.slug ?? undefined);
    return { ok: true };
  } catch (error) {
    console.error("[actions/products] deleteProduct:", error);
    return { ok: false, error: "Error al eliminar" };
  }
}
