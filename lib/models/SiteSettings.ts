import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const SiteSettingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "main" },
    whatsappNumber: { type: String, default: "" },
    instagramUrl: { type: String, default: "" },
    facebookUrl: { type: String, default: "" },
    tagline: { type: String, default: "" },
    warrantyText: { type: String, default: "" },
    deliveryText: { type: String, default: "" },
    email: { type: String, default: "" },
    homeCardStyle: {
      showBrand: { type: Boolean, default: true },
      showCategory: { type: Boolean, default: true },
      showDescription: { type: Boolean, default: true },
      showRating: { type: Boolean, default: true },
      showVariants: { type: Boolean, default: true },
      showWhatsapp: { type: Boolean, default: true },
      scale: { type: String, enum: ["compact", "standard", "large"], default: "standard" },
      accentColor: { type: String, default: "#B45338" },
      imageRatio: { type: String, enum: ["portrait", "square", "landscape"], default: "square" },
      titleSize: { type: String, enum: ["small", "medium", "large"], default: "medium" },
      priceSize: { type: String, enum: ["small", "medium", "large"], default: "medium" },
      cardBackground: { type: String, default: "#FFFFFF" },
      textColor: { type: String, default: "#2B211B" },
      mutedColor: { type: String, default: "#88796D" },
      borderColor: { type: String, default: "#E9E1D9" },
      radius: { type: String, enum: ["small", "medium", "large"], default: "large" },
      imageHeight: { type: Number, min: 160, max: 560, default: 280 },
      cardPadding: { type: Number, min: 8, max: 40, default: 16 },
      titleFontSize: { type: Number, min: 12, max: 36, default: 16 },
      priceFontSize: { type: Number, min: 12, max: 40, default: 18 },
      bodyFontSize: { type: Number, min: 10, max: 20, default: 12 },
      variantsHeight: { type: Number, min: 0, max: 260, default: 128 },
      variantsFontSize: { type: Number, min: 10, max: 20, default: 12 },
      variantsGap: { type: Number, min: 4, max: 24, default: 8 },
      buttonHeight: { type: Number, min: 28, max: 64, default: 36 },
      brandFontSize: { type: Number, min: 10, max: 40, default: 20 },
      categoryFontSize: { type: Number, min: 8, max: 24, default: 10 },
      ratingFontSize: { type: Number, min: 8, max: 24, default: 12 },
      buttonFontSize: { type: Number, min: 10, max: 24, default: 12 },
      brandText: { type: String, default: "CamiHogar" },
      buttonText: { type: String, default: "Consultar por WhatsApp" },
    },
    categoryCardStyles: { type: Schema.Types.Mixed, default: {} },
    homeProductOrder: {
      bestsellers: {
        sort: { type: String, enum: ["price-asc", "price-desc", "popular", "recent", "manual"], default: "price-asc" },
        productIds: { type: [String], default: [] },
      },
      featured: {
        sort: { type: String, enum: ["price-asc", "price-desc", "popular", "recent", "manual"], default: "price-asc" },
        productIds: { type: [String], default: [] },
      },
    },
  },
  { timestamps: true }
);

export type SiteSettings = InferSchemaType<typeof SiteSettingsSchema>;
const SiteSettingsModel: Model<SiteSettings> =
  (mongoose.models.SiteSettings as Model<SiteSettings>) ??
  mongoose.model<SiteSettings>("SiteSettings", SiteSettingsSchema);

export default SiteSettingsModel;
