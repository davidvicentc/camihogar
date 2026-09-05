import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { slugify } from "@/lib/utils";

const CategorySchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

CategorySchema.pre("validate", function (next) {
  if (this.isModified("name") || !this.slug) this.slug = slugify(this.name);
  next();
});

export type Category = InferSchemaType<typeof CategorySchema>;
const CategoryModel: Model<Category> =
  (mongoose.models.Category as Model<Category>) ??
  mongoose.model<Category>("Category", CategorySchema);

export default CategoryModel;