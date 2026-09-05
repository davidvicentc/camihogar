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
  },
  { timestamps: true }
);

export type SiteSettings = InferSchemaType<typeof SiteSettingsSchema>;
const SiteSettingsModel: Model<SiteSettings> =
  (mongoose.models.SiteSettings as Model<SiteSettings>) ??
  mongoose.model<SiteSettings>("SiteSettings", SiteSettingsSchema);

export default SiteSettingsModel;