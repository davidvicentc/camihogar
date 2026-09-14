"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { requireAdminPermission } from "@/lib/admin-session";
import { connectDB } from "@/lib/mongodb";
import MattressOptionModel, { MATTRESS_OPTION_KINDS, type MattressOptionKind } from "@/lib/models/MattressOption";
import ProductModel from "@/lib/models/Product";
import type { ActionResult } from "@/lib/actions/products";

function normalized(name: string) { return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase(); }
function refresh() { revalidatePath("/"); revalidatePath("/catalogo"); revalidatePath("/admin/productos/nuevo"); revalidatePath("/admin/opciones-colchones"); }

export async function saveMattressOption(kind: MattressOptionKind, name: string, id?: string): Promise<ActionResult<{ _id: string; name: string }>> {
  try {
    await requireAdminPermission("categories.manage");
    if (!MATTRESS_OPTION_KINDS.includes(kind)) return { ok: false, error: "Tipo de opción inválido." };
    const clean = name.trim(); if (!clean) return { ok: false, error: "El nombre es obligatorio." };
    await connectDB();
    let previousName = "";
    if (id) previousName = (await MattressOptionModel.findById(id).lean())?.name ?? "";
    const saved = id ? await MattressOptionModel.findByIdAndUpdate(id, { name: clean, normalizedName: normalized(clean) }, { new: true, runValidators: true }) : await MattressOptionModel.create({ kind, name: clean, normalizedName: normalized(clean) });
    if (!saved) return { ok: false, error: "Opción no encontrada." };
    if (previousName && previousName !== clean) {
      if (kind === "size") await ProductModel.updateMany({ "variants.name": previousName }, { $set: { "variants.$[variant].name": clean } }, { arrayFilters: [{ "variant.name": previousName }] });
      const path = kind === "pillow" ? "mattressFeatures.pillow" : kind === "model" ? "mattressFeatures.model" : kind === "composition" ? "mattressFeatures.composition" : null;
      if (path) await ProductModel.updateMany({ [path]: previousName }, { $set: { [path]: clean } });
    }
    refresh(); return { ok: true, data: { _id: String(saved._id), name: clean } };
  } catch (error) { return { ok: false, error: error instanceof Error && error.message.includes("E11000") ? "Ya existe una opción con ese nombre." : "No se pudo guardar la opción." }; }
}

export async function deleteMattressOption(id: string): Promise<ActionResult> {
  try {
    await requireAdminPermission("categories.manage");
    if (!mongoose.isValidObjectId(id)) return { ok: false, error: "Opción inválida." };
    await connectDB(); const option = await MattressOptionModel.findById(id); if (!option) return { ok: true };
    const inUse = option.kind === "size" ? await ProductModel.exists({ "variants.name": option.name }) : await ProductModel.exists({ [`mattressFeatures.${option.kind === "model" ? "model" : option.kind}`]: option.name });
    if (inUse) return { ok: false, error: "No puedes eliminar esta opción porque está siendo usada por un producto." };
    await option.deleteOne(); refresh(); return { ok: true };
  } catch { return { ok: false, error: "No se pudo eliminar la opción." }; }
}
