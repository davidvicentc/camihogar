import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import mongoose from "mongoose";

const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^\s*([\w.]+)\s*=\s*"?([^"#]*)"?\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("Falta MONGODB_URI en .env.local");
  const [{ default: ProductModel }, { default: BrandModel }, { default: CategoryModel }, { default: ColorPresetModel }] = await Promise.all([
    import("../lib/models/Product"),
    import("../lib/models/Brand"),
    import("../lib/models/Category"),
    import("../lib/models/ColorPreset"),
  ]);

  await mongoose.connect(process.env.MONGODB_URI);
  const brand = await BrandModel.findOneAndUpdate(
    { name: "CamiHogar Demo" },
    { $setOnInsert: { name: "CamiHogar Demo", slug: "camihogar-demo", isActive: true } },
    { new: true, upsert: true }
  );
  const category = await CategoryModel.findOneAndUpdate(
    { name: "Salas" },
    { $setOnInsert: { name: "Salas", slug: "salas", description: "Sofás, modulares y muebles para compartir.", isActive: true } },
    { new: true, upsert: true }
  );

  const data = {
    title: "Producto demo completo — Sofá Ámbar",
    description: "Producto de control para revisar todo el flujo: galería, colores con fotografía, variantes, dimensiones, personalización, inventario, destacados y consulta por WhatsApp.",
    brand: brand.name,
    brandId: brand._id,
    collection: "Colección Ámbar",
    variantName: "3 puestos",
    sku: "DEMO-AMBAR-3P",
    category: category.name,
    categoryId: category._id,
    basePrice: 890,
    warrantyYears: 5,
    variants: [
      { name: "2 puestos", price: 760, sku: "DEMO-AMBAR-2P", isDefault: false },
      { name: "3 puestos", price: 890, sku: "DEMO-AMBAR-3P", isDefault: true },
      { name: "Seccional", price: 1190, sku: "DEMO-AMBAR-SEC", isDefault: false },
    ],
    colorOptions: [
      { name: "Terracota", colors: ["#B85C3C"], image: "/products/sofa-terracota-1.jpg" },
      { name: "Canela / Off White", colors: ["#9B6A45", "#F4F0E6"], image: "/products/sofa-lino-1.jpg" },
      { name: "Oliva / Natural / Carbón", colors: ["#68705A", "#D8CBB8", "#3D4145"], image: "/products/sofa-modular-1.jpg" },
      { name: "Combinación de cuatro", colors: ["#B85C3C", "#315C8A", "#D8CBB8", "#3D4145"], image: "" },
    ],
    images: [
      "/products/sofa-terracota-1.jpg",
      "/products/sofa-lino-1.jpg",
      "/products/sofa-modular-1.jpg",
      "/products/sofa-terracota-2.jpg",
    ],
    dimensions: { width: 225, height: 86, depth: 94, unit: "cm" },
    customizationOptions: {
      fabrics: [
        { name: "Lino premium", hex: "#D8CBB8", priceExtra: 0 },
        { name: "Bouclé", hex: "#EEE7DC", priceExtra: 85 },
        { name: "Terciopelo", hex: "#536154", priceExtra: 120 },
      ],
      finishes: [
        { name: "Nogal", hex: "#6B4632", priceExtra: 45 },
        { name: "Roble natural", hex: "#B88A5A", priceExtra: 0 },
      ],
      configurations: [
        { label: "Brazos estándar", priceMultiplier: 1 },
        { label: "Chaise longue", priceMultiplier: 1.28 },
        { label: "Modular reversible", priceMultiplier: 1.42 },
      ],
    },
    metrics: { viewsCount: 128, whatsappClicksCount: 17 },
    rating: 4.9,
    reviewsCount: 24,
    isFeatured: true,
    inStock: true,
  };

  let product = await ProductModel.findOne({ sku: data.sku });
  if (product) Object.assign(product, data);
  else product = new ProductModel(data);
  await product.save();
  await Promise.all(data.colorOptions.map((option) => ColorPresetModel.findOneAndUpdate(
    { name: option.name },
    { $set: { colors: option.colors, isActive: true }, $setOnInsert: { slug: option.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") } },
    { upsert: true }
  )));
  console.log(`/producto/${product.slug}`);
  console.log(`/admin/productos/${product._id}/editar`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
