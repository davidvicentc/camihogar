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
    },
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
