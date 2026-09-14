import SiteSettingsModel from "@/lib/models/SiteSettings";
import { connectDB } from "@/lib/mongodb";
import type { HomeProductSort } from "@/lib/types";

function validSort(value: unknown): HomeProductSort {
  return ["price-asc", "price-desc", "popular", "recent", "manual"].includes(String(value)) ? value as HomeProductSort : "price-asc";
}

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

export async function getSiteSettings() {
  try {
    await connectDB();
    const settings = await SiteSettingsModel.findOne({ key: "main" }).lean();
    return {
      whatsappNumber: settings?.whatsappNumber || fallbackWhatsAppNumber(),
      instagramUrl: settings?.instagramUrl || "https://instagram.com/camihogar",
      facebookUrl: settings?.facebookUrl || "",
      tagline: settings?.tagline || "Muebles que abrazan tu hogar",
      warrantyText: settings?.warrantyText || "Garantía CamiHogar de 2 años",
      deliveryText: settings?.deliveryText || "Entrega e instalación en toda Venezuela",
      email: settings?.email || "hola@camihogar.com",
      homeProductOrder: {
        bestsellers: { sort: validSort(settings?.homeProductOrder?.bestsellers?.sort), productIds: settings?.homeProductOrder?.bestsellers?.productIds?.map(String) ?? [] },
        featured: { sort: validSort(settings?.homeProductOrder?.featured?.sort), productIds: settings?.homeProductOrder?.featured?.productIds?.map(String) ?? [] },
      },
    };
  } catch {
    return { whatsappNumber: fallbackWhatsAppNumber(), instagramUrl: "https://instagram.com/camihogar", facebookUrl: "", tagline: "Muebles que abrazan tu hogar", warrantyText: "Garantía CamiHogar de 2 años", deliveryText: "Entrega e instalación en toda Venezuela", email: "hola@camihogar.com", homeProductOrder: { bestsellers: { sort: "price-asc" as const, productIds: [] }, featured: { sort: "price-asc" as const, productIds: [] } } };
  }
}
