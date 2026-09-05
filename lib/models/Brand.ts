import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { slugify } from "@/lib/utils";

const BrandSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

BrandSchema.pre("validate", function (next) {
  if (this.isModified("name") || !this.slug) this.slug = slugify(this.name);
  next();
});

export type Brand = InferSchemaType<typeof BrandSchema>;
const BrandModel: Model<Brand> =
  (mongoose.models.Brand as Model<Brand>) ?? mongoose.model<Brand>("Brand", BrandSchema);

export default BrandModel;