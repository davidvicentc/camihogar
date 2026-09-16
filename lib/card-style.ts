export const CARD_PROFILE_OPTIONS = [
  { key: "furniture", label: "Muebles, sofás cama y comedores" },
  { key: "beds", label: "Camas" },
  { key: "storage", label: "Closets, centros de TV, zapateras y gaveteros" },
  { key: "mattresses", label: "Colchones" },
] as const;

export type CardProfileKey = (typeof CARD_PROFILE_OPTIONS)[number]["key"];

export type CardStyle = {
  showBrand: boolean; showCategory: boolean; showDescription: boolean; showRating: boolean; showVariants: boolean; showWhatsapp: boolean;
  scale: "compact" | "standard" | "large"; accentColor: string; imageRatio: "portrait" | "square" | "landscape";
  titleSize: "small" | "medium" | "large"; priceSize: "small" | "medium" | "large"; cardBackground: string;
  textColor: string; mutedColor: string; borderColor: string; radius: "small" | "medium" | "large";
  imageHeight: number; cardPadding: number; titleFontSize: number; priceFontSize: number; bodyFontSize: number;
  variantsHeight: number; variantsFontSize: number; variantsGap: number; buttonHeight: number;
  brandFontSize: number; categoryFontSize: number; ratingFontSize: number; buttonFontSize: number;
  brandText: string; buttonText: string;
};

export const DEFAULT_CARD_STYLE: CardStyle = {
  showBrand: true, showCategory: true, showDescription: true, showRating: true, showVariants: true, showWhatsapp: true,
  scale: "standard", accentColor: "#B45338", imageRatio: "square", titleSize: "medium", priceSize: "medium",
  cardBackground: "#FFFFFF", textColor: "#2B211B", mutedColor: "#88796D", borderColor: "#E9E1D9", radius: "large",
  imageHeight: 280, cardPadding: 16, titleFontSize: 16, priceFontSize: 18, bodyFontSize: 12,
  variantsHeight: 128, variantsFontSize: 12, variantsGap: 8, buttonHeight: 36,
  brandFontSize: 20, categoryFontSize: 10, ratingFontSize: 12, buttonFontSize: 12,
  brandText: "CamiHogar", buttonText: "Consultar por WhatsApp",
};

export function cardProfileForCategory(category: string): CardProfileKey {
  const value = category.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (value.includes("colchon")) return "mattresses";
  if (value === "camas") return "beds";
  if (["closet", "centro de tv", "zapatera", "gaveter"].some((term) => value.includes(term))) return "storage";
  return "furniture";
}
