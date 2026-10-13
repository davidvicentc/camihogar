"use server";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdminPermission } from "@/lib/admin-session";
import { connectDB } from "@/lib/mongodb";
import FaqModel from "@/lib/models/Faq";
import { CACHE_TAGS } from "@/lib/cache-tags";
import SiteSettingsModel from "@/lib/models/SiteSettings";

type Result = { ok: boolean; error?: string };
function refresh() { revalidateTag(CACHE_TAGS.faq); revalidatePath("/preguntas-frecuentes"); revalidatePath("/admin/preguntas-frecuentes"); }
export async function saveFaqIntro(value: string): Promise<Result> {
  try { await requireAdminPermission("settings.manage"); const intro = value.trim(); if (!intro) return { ok: false, error: "Escribe una introducción." }; await connectDB(); await SiteSettingsModel.findOneAndUpdate({ key: "main" }, { faqIntro: intro }, { upsert: true }); revalidatePath("/preguntas-frecuentes"); revalidatePath("/admin/preguntas-frecuentes"); return { ok: true }; } catch { return { ok: false, error: "No se pudo guardar la introducción." }; }
}
export async function saveFaq(input: { id?: string; question: string; answer: string; order?: number; isActive?: boolean }): Promise<Result> {
  try {
    await requireAdminPermission("settings.manage");
    const question = input.question.trim(); const answer = input.answer.trim();
    if (!question || !answer) return { ok: false, error: "La pregunta y la respuesta son obligatorias." };
    await connectDB();
    if (input.id) await FaqModel.findByIdAndUpdate(input.id, { question, answer, order: input.order ?? 0, isActive: input.isActive ?? true });
    else await FaqModel.create({ question, answer, order: input.order ?? 0, isActive: input.isActive ?? true });
    refresh(); return { ok: true };
  } catch { return { ok: false, error: "No se pudo guardar la pregunta." }; }
}
export async function deleteFaq(id: string): Promise<Result> {
  try { await requireAdminPermission("settings.manage"); await connectDB(); const deleted = await FaqModel.findByIdAndDelete(id); if (!deleted) return { ok: false, error: "La pregunta no existe." }; refresh(); return { ok: true }; }
  catch { return { ok: false, error: "No se pudo eliminar la pregunta." }; }
}
