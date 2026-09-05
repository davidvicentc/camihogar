import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { slugify } from "@/lib/utils";

const FabricSchema = new Schema(
  {
    name: { type: String, required: true },
    hex: { type: String, required: true },
    priceExtra: { type: Number, default: 0 },
    textureUrl: { type: String },
  },
  { _id: false }
);

const FinishSchema = new Schema(
  {
    name: { type: String, required: true },
    hex: { type: String, required: true },
    priceExtra: { type: Number, default: 0 },
    textureUrl: { type: String },
  },
  { _id: false }
);

const ConfigurationSchema = new Schema(
  {
    label: { type: String, required: true },
    priceMultiplier: { type: Number, default: 1 },
  },
  { _id: false }
);

const VariantSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    sku: { type: String, default: "", trim: true, uppercase: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
);

const ProductSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, index: true },
    description: { type: String, default: "" },
    brand: { type: String, default: "", trim: true },
    brandId: { type: Schema.Types.ObjectId, ref: "Brand", index: true },
    collection: { type: String, default: "", trim: true },
    variantName: { type: String, default: "", trim: true },
    sku: { type: String, default: "", trim: true, uppercase: true },
    category: {
      type: String,
      required: true,
      index: true,
    },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", index: true },
    basePrice: { type: Number, required: true, min: 0 },
    variants: { type: [VariantSchema], default: [] },
    images: { type: [String], default: [] },
    dimensions: {
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 },
      depth: { type: Number, default: 0 },
      unit: { type: String, default: "cm" },
    },
    customizationOptions: {
      fabrics: { type: [FabricSchema], default: [] },
      finishes: { type: [FinishSchema], default: [] },
      configurations: { type: [ConfigurationSchema], default: [] },
    },
    metrics: {
      viewsCount: { type: Number, default: 0 },
      whatsappClicksCount: { type: Number, default: 0 },
    },
    rating: { type: Number, default: 5.0, min: 0, max: 5 },
    reviewsCount: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false, index: true },
    inStock: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, suppressReservedKeysWarning: true }
);

// Autogenera el slug a partir del título y garantiza unicidad con sufijo corto.
ProductSchema.pre("validate", async function (next) {
  if (!this.slug || this.isModified("title")) {
    const base = slugify(this.title);
    let candidate = base;
    const ProductModel = this.constructor as Model<Product>;
    let attempt = 0;
    while (
      await ProductModel.exists({ slug: candidate, _id: { $ne: this._id } })
    ) {
      attempt += 1;
      candidate = `${base}-${attempt + 1}`;
    }
    this.slug = candidate;
  }
  next();
});

export type Product = InferSchemaType<typeof ProductSchema>;

const ProductModel: Model<Product> =
  (mongoose.models.Product as Model<Product>) ??
  mongoose.model<Product>("Product", ProductSchema);

export default ProductModel;
