"use server";

import { randomBytes, createHash } from "node:crypto";
import { validEmail, validPassword } from "@/lib/admin-validation";
import { revalidatePath } from "next/cache";
import { requireAdminPermission as requirePermission } from "@/lib/admin-session";
import { connectDB } from "@/lib/mongodb";
import AdminUserModel from "@/lib/models/AdminUser";
import SiteSettingsModel from "@/lib/models/SiteSettings";
import { hashAdminPassword } from "@/lib/admin-users";
import { ADMIN_PERMISSIONS, type AdminPermission, type HomeProductSort } from "@/lib/types";
import { CARD_PROFILE_OPTIONS, type CardProfileKey, type CardStyle } from "@/lib/card-style";

export interface AdminActionResult<T = undefined> { ok: boolean; error?: string; data?: T }

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

export async function saveHomeProductOrder(input: { bestsellers: { sort: HomeProductSort; productIds: string[] }; featured: { sort: HomeProductSort; productIds: string[] } }): Promise<AdminActionResult> {
  try {
    await requirePermission("settings.manage");
    const allowed: HomeProductSort[] = ["price-asc", "price-desc", "popular", "recent", "manual"];
    if (!allowed.includes(input.bestsellers.sort) || !allowed.includes(input.featured.sort)) return { ok: false, error: "Selecciona un tipo de orden válido." };
    const clean = {
      bestsellers: { sort: input.bestsellers.sort, productIds: [...new Set(input.bestsellers.productIds.map(String))] },
      featured: { sort: input.featured.sort, productIds: [...new Set(input.featured.productIds.map(String))] },
    };
    await connectDB();
    await SiteSettingsModel.findOneAndUpdate({ key: "main" }, { $set: { homeProductOrder: clean } }, { upsert: true, runValidators: true });
    revalidatePath("/"); revalidatePath("/catalogo"); revalidatePath("/admin/configuracion");
    return { ok: true };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "No se pudo guardar el orden del home." }; }
}

export async function saveHomeCardStyle(profile: CardProfileKey, input: CardStyle): Promise<AdminActionResult> {
  try {
    await requirePermission("settings.manage");
    if (!CARD_PROFILE_OPTIONS.some((item) => item.key === profile)) return { ok: false, error: "Selecciona una familia válida." };
    for (const key of ["accentColor", "cardBackground", "textColor", "mutedColor", "borderColor"] as const) if (typeof input[key] !== "string" || !/^#[0-9a-f]{6}$/i.test(input[key])) return { ok: false, error: "Revisa los colores de la tarjeta." };
    await connectDB();
    const settings = await SiteSettingsModel.findOne({ key: "main" });
    if (settings) {
      const current = (settings.categoryCardStyles ?? {}) as Record<string, CardStyle>;
      settings.categoryCardStyles = { ...current, [profile]: input };
      settings.markModified("categoryCardStyles");
      await settings.save();
    } else {
      await SiteSettingsModel.create({ key: "main", categoryCardStyles: { [profile]: input } });
    }
    revalidatePath("/"); revalidatePath("/catalogo"); revalidatePath("/admin/configuracion");
    return { ok: true };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "No se pudo guardar el diseño." }; }
}

export async function createAdminUser(input: { name: string; email: string; password: string; permissions: string[] }): Promise<AdminActionResult> {
  try {
    await requirePermission("users.manage");
    const name = input.name.trim(); const email = input.email.trim().toLowerCase();
    if (!name || !validEmail(email) || !validPassword(input.password)) return { ok: false, error: "Nombre, correo y una clave de 12 a 128 caracteres son obligatorios." };
    const permissions = input.permissions.filter((permission): permission is AdminPermission => (ADMIN_PERMISSIONS as readonly string[]).includes(permission));
    await connectDB();
    const credentials = await hashAdminPassword(input.password);
    await AdminUserModel.create({ name, email, permissions, passwordHash: credentials.hash, passwordSalt: credentials.salt });
    revalidatePath("/admin/usuarios"); return { ok: true };
  } catch (error) { return { ok: false, error: error instanceof Error && error.message.includes("E11000") ? "Ese correo ya está registrado." : "No se pudo crear el usuario." }; }
}

export async function updateAdminUser(id: string, input: { name: string; email: string; password?: string; permissions: string[]; active: boolean }): Promise<AdminActionResult> {
  try {
    const current = await requirePermission("users.manage");
    if (!input.name.trim() || !validEmail(input.email.trim())) return { ok: false, error: "Nombre y correo válidos son obligatorios." };
    if (current.id === id && (!input.active || !input.permissions.includes("users.manage"))) return { ok: false, error: "No puedes desactivar tu cuenta ni quitarte la gestión de usuarios." };
    const update: Record<string, unknown> = { name: input.name.trim(), email: input.email.trim().toLowerCase(), active: input.active, permissions: input.permissions.filter((permission): permission is AdminPermission => (ADMIN_PERMISSIONS as readonly string[]).includes(permission)) };
    if (input.password) { if (!validPassword(input.password)) return { ok: false, error: "La clave debe tener 12 a 128 caracteres." }; const credentials = await hashAdminPassword(input.password); update.passwordHash = credentials.hash; update.passwordSalt = credentials.salt; update.invitationPending = false; update.invitationHash = null; update.invitationExpiresAt = null; }
    await connectDB(); const saved = await AdminUserModel.findByIdAndUpdate(id, { $set: update, $inc: { sessionVersion: 1 } }, { runValidators: true }); if (!saved) return { ok: false, error: "Usuario no encontrado." }; revalidatePath("/admin/usuarios"); return { ok: true };
  } catch (error) { return { ok: false, error: error instanceof Error && error.message.includes("E11000") ? "Ese correo ya está registrado." : "No se pudo actualizar." }; }
}

export async function deleteAdminUser(id: string): Promise<AdminActionResult> {
  try { const current = await requirePermission("users.manage"); if (current.id === id) return { ok: false, error: "No puedes eliminar tu propio usuario." }; await connectDB(); await AdminUserModel.findByIdAndDelete(id); revalidatePath("/admin/usuarios"); return { ok: true }; }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : "No se pudo eliminar." }; }
}

/** El enlace se entrega al responsable para compartirlo por su canal habitual. */
export async function inviteAdminUser(input: { name: string; email: string; permissions: string[] }, id?: string): Promise<AdminActionResult<{ path: string }>> {
  try {
    const current = await requirePermission("users.manage");
    if (id === current.id) return { ok: false, error: "No puedes reiniciar tu propio acceso desde aquí." };
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    if (!name || !validEmail(email)) return { ok: false, error: "Escribe un nombre y un correo válidos." };
    const permissions = [...new Set(input.permissions.filter((p) => (ADMIN_PERMISSIONS as readonly string[]).includes(p)))];
    if (!permissions.length) return { ok: false, error: "Selecciona al menos un permiso." };
    const token = randomBytes(32).toString("hex");
    const invitationHash = createHash("sha256").update(token).digest("hex");
    const invitationExpiresAt = new Date(Date.now() + 48 * 3600000);
    await connectDB();
    if (id) {
      const user = await AdminUserModel.findOneAndUpdate({ _id: id, active: true }, { $set: { invitationHash, invitationExpiresAt, invitationPending: true }, $inc: { sessionVersion: 1 } });
      if (!user) return { ok: false, error: "Usuario no encontrado." };
    } else {
      const credentials = await hashAdminPassword(randomBytes(32).toString("hex"));
      await AdminUserModel.create({ name, email, permissions, passwordHash: credentials.hash, passwordSalt: credentials.salt, invitationHash, invitationExpiresAt, invitationPending: true });
    }
    revalidatePath("/admin/usuarios");
    return { ok: true, data: { path: `/admin/activar#${token}` } };
  } catch (error) {
    return { ok: false, error: (error as { code?: number }).code === 11000 ? "Ese correo ya existe. Genera un nuevo enlace desde su cuenta." : "No se pudo generar la invitación." };
  }
}
