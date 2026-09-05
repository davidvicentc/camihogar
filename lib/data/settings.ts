import SiteSettingsModel from "@/lib/models/SiteSettings";
import { connectDB } from "@/lib/mongodb";

export function fallbackWhatsAppNumber() {
  return process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "584120000000";
}

export async function getWhatsAppNumber() {
  try {
    await connectDB();
    const settings = await SiteSettingsModel.findOne({ key: "main" }).lean();
    return settings?.whatsappNumber || fallbackWhatsAppNumber();
  } catch {
    return fallbackWhatsAppNumber();
  }
}