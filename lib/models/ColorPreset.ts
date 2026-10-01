import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { slugify } from "@/lib/utils";

const ColorPresetSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    colors: { type: [String], required: true, validate: [(value: string[]) => value.length >= 1 && value.length <= 4, "Usa entre 1 y 4 colores."] },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

ColorPresetSchema.pre("validate", function (next) {
  if (this.isModified("name") || !this.slug) this.slug = slugify(this.name);
  next();
});

export type ColorPreset = InferSchemaType<typeof ColorPresetSchema>;
const ColorPresetModel: Model<ColorPreset> =
  (mongoose.models.ColorPreset as Model<ColorPreset>) ?? mongoose.model<ColorPreset>("ColorPreset", ColorPresetSchema);

export default ColorPresetModel;
