"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import { ADMIN_COOKIE, getAdminSessionUserId, verifySessionToken } from "@/lib/auth";
import BrandModel from "@/lib/models/Brand";
import CategoryModel from "@/lib/models/Category";
import ProductModel from "@/lib/models/Product";
import type { ActionResult } from "@/lib/actions/products";
import { slugify } from "@/lib/utils";
import type { Model } from "mongoose";

async function requireAdmin(permission: "brands.manage" | "categories.manage") {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!(await verifySessionToken(token))) throw new Error("No autorizado");
  const userId = await getAdminSessionUserId(token);
  if (userId) {
    await connectDB();
    const user = await (await import("@/lib/models/AdminUser")).default.findById(userId).lean();
    if (!user?.active || !user.permissions.includes(permission)) throw new Error("No autorizado");
  }
}

function refreshCatalog() {
  revalidatePath("/");
  revalidatePath("/catalogo");
  revalidatePath("/admin/productos");
  revalidatePath("/admin/categorias");
  revalidatePath("/admin/marcas");
}

// Brand and Category have different inferred schemas but share this CRUD shape.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function saveOption(Model: Model<any>, permission: "brands.manage" | "categories.manage", name: string, id?: string, details?: { description?: string; image?: string }): Promise<ActionResult<{ _id: string; name: string }>> {
  try {
    await requireAdmin(permission);
    const clean = name.trim();
    if (!clean) return { ok: false, error: "El nombre es obligatorio." };
    await connectDB();

    const saved = id
      ? await Model.findByIdAndUpdate(id, { name: clean, slug: slugify(clean), ...details }, { new: true })
      : await Model.create({ name: clean, slug: slugify(clean), ...details });

    if (!saved) return { ok: false, error: "Registro no encontrado." };
    refreshCatalog();
    return { ok: true, data: { _id: String(saved._id), name: clean } };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error && error.message.includes("E11000")
          ? "Ya existe un registro con ese nombre."
          : error instanceof Error && error.message === "No autorizado"
            ? "No autorizado."
            : "No se pudo guardar.",
    };
  }
}

export async function createBrand(name: string) { return saveOption(BrandModel, "brands.manage", name); }
export async function updateBrand(id: string, name: string) { return saveOption(BrandModel, "brands.manage", name, id); }
export async function createCategory(name: string, description = "", image = "") { return saveOption(CategoryModel, "categories.manage", name, undefined, { description, image }); }
export async function updateCategory(id: string, name: string, description = "", image = "") { return saveOption(CategoryModel, "categories.manage", name, id, { description, image }); }

export async function deleteBrand(id: string): Promise<ActionResult> {
  try {
    await requireAdmin("brands.manage");
    await connectDB();
    if (await ProductModel.exists({ brandId: id })) return { ok: false, error: "No puedes borrar una marca usada por productos." };
    await BrandModel.findByIdAndDelete(id);
    refreshCatalog();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error && error.message === "No autorizado"
          ? "No autorizado."
          : "No se pudo eliminar.",
    };
  }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  try {
    await requireAdmin("categories.manage");
    await connectDB();
    if (await ProductModel.exists({ categoryId: id })) return { ok: false, error: "No puedes borrar una categoría usada por productos." };
    await CategoryModel.findByIdAndDelete(id);
    refreshCatalog();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error && error.message === "No autorizado"
          ? "No autorizado."
          : "No se pudo eliminar.",
    };
  }
}