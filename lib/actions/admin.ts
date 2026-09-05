"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import { getAdminSessionUserId, ADMIN_COOKIE } from "@/lib/auth";
import AdminUserModel from "@/lib/models/AdminUser";
import SiteSettingsModel from "@/lib/models/SiteSettings";
import { hashAdminPassword } from "@/lib/admin-users";
import { ADMIN_PERMISSIONS, type AdminPermission } from "@/lib/types";

export interface AdminActionResult<T = undefined> { ok: boolean; error?: string; data?: T }

async function requirePermission(permission: AdminPermission) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  const userId = await getAdminSessionUserId(token);
  if (!userId) return { id: null, master: true };
  await connectDB();
  const user = await AdminUserModel.findById(userId).lean();
  if (!user?.active || !user.permissions.includes(permission)) throw new Error("No autorizado");
  return { id: String(user._id), master: false };
}

export async function saveWhatsAppNumber(number: string): Promise<AdminActionResult> {
  try {
    await requirePermission("settings.manage");
    const clean = number.replace(/\D/g, "");
    if (clean.length < 10 || clean.length > 15) return { ok: false, error: "Usa el formato internacional, por ejemplo 584120000000." };
    await connectDB();
    await SiteSettingsModel.findOneAndUpdate({ key: "main" }, { whatsappNumber: clean }, { upsert: true, new: true });
    revalidatePath("/"); revalidatePath("/catalogo"); revalidatePath("/admin/configuracion");
    return { ok: true };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "No se pudo guardar." }; }
}

export async function saveSiteSettings(input: { whatsappNumber: string; instagramUrl: string; facebookUrl: string; tagline: string; warrantyText: string; deliveryText: string; email: string }): Promise<AdminActionResult> {
  try {
    await requirePermission("settings.manage");
    const whatsappNumber = input.whatsappNumber.replace(/\D/g, "");
    if (whatsappNumber.length < 10 || whatsappNumber.length > 15) return { ok: false, error: "El WhatsApp debe estar en formato internacional." };
    await connectDB();
    await SiteSettingsModel.findOneAndUpdate({ key: "main" }, { ...input, whatsappNumber }, { upsert: true });
    revalidatePath("/"); revalidatePath("/catalogo"); revalidatePath("/admin/configuracion");
    return { ok: true };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "No se pudo guardar." }; }
}

export async function createAdminUser(input: { name: string; email: string; password: string; permissions: string[] }): Promise<AdminActionResult> {
  try {
    await requirePermission("users.manage");
    const name = input.name.trim(); const email = input.email.trim().toLowerCase();
    if (!name || !email || input.password.length < 8) return { ok: false, error: "Nombre, correo y una clave de al menos 8 caracteres son obligatorios." };
    const permissions = input.permissions.filter((permission): permission is AdminPermission => (ADMIN_PERMISSIONS as readonly string[]).includes(permission));
    await connectDB();
    const credentials = await hashAdminPassword(input.password);
    await AdminUserModel.create({ name, email, permissions, passwordHash: credentials.hash, passwordSalt: credentials.salt });
    revalidatePath("/admin/usuarios"); return { ok: true };
  } catch (error) { return { ok: false, error: error instanceof Error && error.message.includes("E11000") ? "Ese correo ya está registrado." : "No se pudo crear el usuario." }; }
}

export async function updateAdminUser(id: string, input: { name: string; email: string; password?: string; permissions: string[]; active: boolean }): Promise<AdminActionResult> {
  try {
    await requirePermission("users.manage");
    const update: Record<string, unknown> = { name: input.name.trim(), email: input.email.trim().toLowerCase(), active: input.active, permissions: input.permissions.filter((permission): permission is AdminPermission => (ADMIN_PERMISSIONS as readonly string[]).includes(permission)) };
    if (input.password) { if (input.password.length < 8) return { ok: false, error: "La clave debe tener al menos 8 caracteres." }; const credentials = await hashAdminPassword(input.password); update.passwordHash = credentials.hash; update.passwordSalt = credentials.salt; }
    await connectDB(); await AdminUserModel.findByIdAndUpdate(id, update); revalidatePath("/admin/usuarios"); return { ok: true };
  } catch (error) { return { ok: false, error: error instanceof Error && error.message.includes("E11000") ? "Ese correo ya está registrado." : "No se pudo actualizar." }; }
}

export async function deleteAdminUser(id: string): Promise<AdminActionResult> {
  try { const current = await requirePermission("users.manage"); if (current.id === id) return { ok: false, error: "No puedes eliminar tu propio usuario." }; await connectDB(); await AdminUserModel.findByIdAndDelete(id); revalidatePath("/admin/usuarios"); return { ok: true }; }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : "No se pudo eliminar." }; }
}