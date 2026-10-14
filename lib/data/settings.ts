import SiteSettingsModel from "@/lib/models/SiteSettings";
import { connectDB } from "@/lib/mongodb";
import type { HomeProductSort } from "@/lib/types";
import { CARD_PROFILE_OPTIONS, DEFAULT_CARD_STYLE, PRODUCT_CARD_IMAGE_HEIGHT, type CardProfileKey, type CardStyle } from "@/lib/card-style";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS, PUBLIC_CACHE_SECONDS } from "@/lib/cache-tags";

function validSort(value: unknown): HomeProductSort {
  return ["price-asc", "price-desc", "popular", "recent", "manual"].includes(String(value)) ? value as HomeProductSort : "price-asc";
}

export function fallbackWhatsAppNumber() {
  return process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "584120000000";
}

export async function getWhatsAppNumber() {
  return (await getSiteSettings()).whatsappNumber;
}

const getSiteSettingsCached = unstable_cache(async () => {
    await connectDB();
    const settings = await SiteSettingsModel.findOne({ key: "main" }).lean();
    const legacyStyle = { ...DEFAULT_CARD_STYLE, ...(settings?.homeCardStyle ?? {}) } as CardStyle;
    const savedProfiles = (settings?.categoryCardStyles ?? {}) as Partial<Record<CardProfileKey, Partial<CardStyle>>>;
    const categoryCardStyles = Object.fromEntries(CARD_PROFILE_OPTIONS.map(({ key }) => [key, { ...legacyStyle, ...(savedProfiles[key] ?? {}) }])) as Record<CardProfileKey, CardStyle>;
    return {
      whatsappNumber: settings?.whatsappNumber || fallbackWhatsAppNumber(),
      instagramUrl: settings?.instagramUrl || "https://instagram.com/camihogar",
      facebookUrl: settings?.facebookUrl || "",
      tagline: settings?.tagline || "Muebles que abrazan tu hogar",
      faqIntro: settings?.faqIntro || "Respuestas claras sobre nuestros muebles, pedidos, entregas y garantías.",
      warrantyText: !settings?.warrantyText || settings.warrantyText === "Garantía CamiHogar de 2 años" ? "Calidad garantizada" : settings.warrantyText,
      deliveryText: settings?.deliveryText || "Entrega e instalación en toda Venezuela",
      heroTitleRanges: settings?.heroTitleRanges?.map((range) => ({ start: range.start ?? 0, end: range.end ?? 0, color: range.color ?? "#E8511A", endColor: range.endColor ?? "#FFB782", mode: range.mode === "solid" ? "solid" as const : "gradient" as const, bold: range.bold ?? false })),
      heroTitleColor: settings?.heroTitleColor ?? "#FBF8F4",
      heroHighlightText: settings?.heroHighlightText ?? "SOLUCIÓN",
      heroHighlightMode: settings?.heroHighlightMode ?? "gradient",
      heroHighlightColor: settings?.heroHighlightColor ?? "#E8511A",
      heroHighlightEndColor: settings?.heroHighlightEndColor ?? "#FFB782",
      heroTitle: settings?.heroTitle || "SOMOS LA SOLUCIÓN PARA TU HOGAR",
      heroSubtitle: settings?.heroSubtitle || "Explora nuestro catálogo de piezas cálidas para cada rincón de tu casa. Elige tu producto, revisa sus variantes y consúltanos directamente.",
      heroEyebrow: settings?.heroEyebrow || "Hecho en Venezuela · Envíos a todo el país",
      heroButtonText: settings?.heroButtonText || "Ver catálogo",
      heroPrimaryStat: settings?.heroPrimaryStat || "+5000",
      heroPrimaryStatLabel: settings?.heroPrimaryStatLabel || "hogares amoblados",
      heroQualityStat: settings?.heroQualityStat || "Calidad",
      heroQualityStatLabel: settings?.heroQualityStatLabel || "garantizada",
      heroCountryStat: settings?.heroCountryStat || "100%",
      heroCountryStatLabel: settings?.heroCountryStatLabel || "hecho en Venezuela",
      taxNoteText: settings?.taxNoteText || "Precio no incluye IVA",
      email: settings?.email || "hola@camihogar.com",
      homeCardStyle: {
        showBrand: settings?.homeCardStyle?.showBrand ?? true,
        showCategory: settings?.homeCardStyle?.showCategory ?? true,
        showDescription: settings?.homeCardStyle?.showDescription ?? true,
        showRating: settings?.homeCardStyle?.showRating ?? true,
        showVariants: settings?.homeCardStyle?.showVariants ?? true,
        showWhatsapp: settings?.homeCardStyle?.showWhatsapp ?? true,
        showTaxNote: settings?.homeCardStyle?.showTaxNote ?? true,
        scale: settings?.homeCardStyle?.scale ?? "standard",
        accentColor: settings?.homeCardStyle?.accentColor ?? "#B45338",
        imageRatio: settings?.homeCardStyle?.imageRatio ?? "square",
        titleSize: settings?.homeCardStyle?.titleSize ?? "medium",
        priceSize: settings?.homeCardStyle?.priceSize ?? "medium",
        cardBackground: settings?.homeCardStyle?.cardBackground ?? "#FFFFFF",
        textColor: settings?.homeCardStyle?.textColor ?? "#2B211B",
        mutedColor: settings?.homeCardStyle?.mutedColor ?? "#88796D",
        borderColor: settings?.homeCardStyle?.borderColor ?? "#E9E1D9",
        radius: settings?.homeCardStyle?.radius ?? "large",
        imageHeight: PRODUCT_CARD_IMAGE_HEIGHT,
        cardPadding: settings?.homeCardStyle?.cardPadding ?? 16,
        titleFontSize: settings?.homeCardStyle?.titleFontSize ?? 16,
        priceFontSize: settings?.homeCardStyle?.priceFontSize ?? 18,
        bodyFontSize: settings?.homeCardStyle?.bodyFontSize ?? 12,
        variantsHeight: settings?.homeCardStyle?.variantsHeight ?? 128,
        variantsFontSize: settings?.homeCardStyle?.variantsFontSize ?? 12,
        variantsGap: settings?.homeCardStyle?.variantsGap ?? 8,
        buttonHeight: settings?.homeCardStyle?.buttonHeight ?? 36,
        brandFontSize: settings?.homeCardStyle?.brandFontSize ?? 20,
        categoryFontSize: settings?.homeCardStyle?.categoryFontSize ?? 10,
        ratingFontSize: settings?.homeCardStyle?.ratingFontSize ?? 12,
        buttonFontSize: settings?.homeCardStyle?.buttonFontSize ?? 12,
        brandText: settings?.homeCardStyle?.brandText ?? "CamiHogar",
        buttonText: settings?.homeCardStyle?.buttonText ?? "Consultar por WhatsApp",
      },
      categoryCardStyles,
      homeProductOrder: {
        bestsellers: { sort: validSort(settings?.homeProductOrder?.bestsellers?.sort), productIds: settings?.homeProductOrder?.bestsellers?.productIds?.map(String) ?? [] },
        featured: { sort: validSort(settings?.homeProductOrder?.featured?.sort), productIds: settings?.homeProductOrder?.featured?.productIds?.map(String) ?? [] },
      },
    };
}, ["site-settings"], { revalidate: PUBLIC_CACHE_SECONDS, tags: [CACHE_TAGS.settings] });

export async function getSiteSettings() {
  try {
    return await getSiteSettingsCached();
  } catch {
    return { whatsappNumber: fallbackWhatsAppNumber(), instagramUrl: "https://instagram.com/camihogar", facebookUrl: "", tagline: "SOMOS LA SOLUCIÓN PARA TU HOGAR", faqIntro: "Respuestas claras sobre nuestros muebles, pedidos, entregas y garantías.", warrantyText: "Calidad garantizada", deliveryText: "Entrega e instalación en toda Venezuela", email: "hola@camihogar.com", heroTitle: "SOMOS LA SOLUCIÓN PARA TU HOGAR", heroSubtitle: "Explora nuestro catálogo de piezas cálidas para cada rincón de tu casa. Elige tu producto, revisa sus variantes y consúltanos directamente.", heroEyebrow: "Hecho en Venezuela · Envíos a todo el país", heroButtonText: "Ver catálogo", heroPrimaryStat: "+5000", heroPrimaryStatLabel: "hogares amoblados", heroQualityStat: "Calidad", heroQualityStatLabel: "garantizada", heroCountryStat: "100%", heroCountryStatLabel: "hecho en Venezuela", taxNoteText: "Precio no incluye IVA", homeCardStyle: DEFAULT_CARD_STYLE, categoryCardStyles: Object.fromEntries(CARD_PROFILE_OPTIONS.map(({ key }) => [key, DEFAULT_CARD_STYLE])) as Record<CardProfileKey, CardStyle>, homeProductOrder: { bestsellers: { sort: "price-asc" as const, productIds: [] }, featured: { sort: "price-asc" as const, productIds: [] } } };
  }
}
