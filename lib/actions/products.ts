"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import ProductModel from "@/lib/models/Product";
import { serializeProduct } from "@/lib/data/products";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/auth";
import type { ProductDTO, ProductInput } from "@/lib/types";

export interface ActionResult<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

async function requireAdmin(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!(await verifySessionToken(token))) {
    throw new Error("No autorizado");
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
    await requireAdmin();
    await connectDB();
    const doc = await ProductModel.create({
      ...input,
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
    await requireAdmin();
    await connectDB();
    const doc = await ProductModel.findById(id);
    if (!doc) return { ok: false, error: "Producto no encontrado" };
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
    await requireAdmin();
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
    await requireAdmin();
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
    await requireAdmin();
    if (!Number.isFinite(basePrice) || basePrice < 0) {
      return { ok: false, error: "Precio inválido" };
    }
    await connectDB();
    const doc = await ProductModel.findByIdAndUpdate(id, { basePrice }, { new: true });
    revalidatePublicPages(doc?.slug ?? undefined);
    return { ok: true };
  } catch (error) {
    console.error("[actions/products] updatePrice:", error);
    return { ok: false, error: "Error al actualizar precio" };
  }
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await connectDB();
    const doc = await ProductModel.findByIdAndDelete(id);
    revalidatePublicPages(doc?.slug ?? undefined);
    return { ok: true };
  } catch (error) {
    console.error("[actions/products] deleteProduct:", error);
    return { ok: false, error: "Error al eliminar" };
  }
}
