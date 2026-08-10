/**
 * Seed de productos de demostración.
 *
 * Uso:  npm run seed
 * Requiere MONGODB_URI en .env.local (o exportada en el entorno).
 *
 * Las imágenes apuntan a placeholders SVG locales (/products/*.svg) para que
 * el sitio funcione sin Cloudinary configurado; al cargar productos reales
 * desde el admin, las URLs serán de Cloudinary.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import mongoose from "mongoose";

// Carga .env.local manualmente (sin depender de dotenv).
const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^\s*([\w.]+)\s*=\s*"?([^"#]*)"?\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  }
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("✖ Falta MONGODB_URI. Copia .env.example a .env.local y configúrala.");
    process.exit(1);
  }

  const { default: ProductModel } = await import("../lib/models/Product");
  const { FABRIC_PRESETS, FINISH_PRESETS, CONFIGURATION_PRESETS } = await import(
    "../lib/constants"
  );

  await mongoose.connect(uri);
  console.log("✔ Conectado a MongoDB");

  const sofaFabrics = FABRIC_PRESETS;
  const woodFinishes = FINISH_PRESETS;
  const sofaConfigs = CONFIGURATION_PRESETS;

  const products = [
    {
      title: "Sofá Capri Terracota",
      description:
        "El protagonista de tu sala: sofá de líneas curvas con tapizado suave al tacto, espuma de alta densidad y estructura de madera de pino curada. Diseñado para abrazarte al final del día.",
      category: "Salas",
      basePrice: 780,
      images: ["/products/sofa-modular-1.jpg", "/products/sofa-lino-2.jpg"],
      dimensions: { width: 220, height: 85, depth: 95, unit: "cm" },
      customizationOptions: {
        fabrics: sofaFabrics,
        finishes: woodFinishes.slice(0, 3),
        configurations: sofaConfigs,
      },
      rating: 4.9,
      reviewsCount: 32,
      isFeatured: true,
      metrics: { viewsCount: 420, whatsappClicksCount: 38 },
    },
    {
      title: "Sofá Roma Lino Natural",
      description:
        "Elegancia atemporal en lino natural con cojines de plumón sintético. Perfecto para espacios luminosos que respiran calma.",
      category: "Salas",
      basePrice: 650,
      images: ["/products/sofa-lino-1.jpg", "/products/sofa-terracota-2.jpg"],
      dimensions: { width: 200, height: 82, depth: 90, unit: "cm" },
      customizationOptions: {
        fabrics: sofaFabrics,
        finishes: [],
        configurations: sofaConfigs,
      },
      rating: 4.8,
      reviewsCount: 21,
      isFeatured: true,
      metrics: { viewsCount: 310, whatsappClicksCount: 24 },
    },
    {
      title: "Modular Óslo L-Shape",
      description:
        "Sistema modular reconfigurable: hoy en L, mañana frente al televisor. Módulos independientes con fundas removibles y lavables.",
      category: "Salas",
      basePrice: 1150,
      images: ["/products/sofa-terracota-1.jpg", "/products/sofa-modular-2.jpg"],
      dimensions: { width: 280, height: 80, depth: 160, unit: "cm" },
      customizationOptions: {
        fabrics: sofaFabrics,
        finishes: [],
        configurations: sofaConfigs,
      },
      rating: 5,
      reviewsCount: 14,
      isFeatured: true,
      metrics: { viewsCount: 505, whatsappClicksCount: 51 },
    },
    {
      title: "Comedor Nórdico 6 Puestos",
      description:
        "Mesa de comedor en madera maciza con sillas tapizadas. El punto de encuentro de la familia, con acabados que resisten el uso diario.",
      category: "Comedores",
      basePrice: 890,
      images: ["/products/comedor-nogal-1.jpg", "/products/comedor-nogal-2.jpg"],
      dimensions: { width: 180, height: 76, depth: 90, unit: "cm" },
      customizationOptions: {
        fabrics: sofaFabrics.slice(0, 4),
        finishes: woodFinishes,
        configurations: [
          { label: "4 Puestos", priceMultiplier: 0.75 },
          { label: "6 Puestos", priceMultiplier: 1 },
          { label: "8 Puestos", priceMultiplier: 1.3 },
        ],
      },
      rating: 4.9,
      reviewsCount: 27,
      isFeatured: true,
      metrics: { viewsCount: 380, whatsappClicksCount: 33 },
    },
    {
      title: "Mesa de Centro Alba",
      description:
        "Mesa de centro con sobre flotante y base escultural. Un detalle auxiliar que eleva toda la sala.",
      category: "Muebles Auxiliares",
      basePrice: 240,
      images: ["/products/mesa-centro-1.jpg"],
      dimensions: { width: 110, height: 45, depth: 60, unit: "cm" },
      customizationOptions: {
        fabrics: [],
        finishes: woodFinishes,
        configurations: [],
      },
      rating: 4.7,
      reviewsCount: 11,
      metrics: { viewsCount: 190, whatsappClicksCount: 12 },
    },
    {
      title: "Cama Verona Tapizada Queen",
      description:
        "Cabecero alto tapizado con costuras verticales y base con esquinas redondeadas. Tu dormitorio merece este abrazo.",
      category: "Dormitorios",
      basePrice: 720,
      images: ["/products/cama-tapizada-1.jpg", "/products/cama-tapizada-2.jpg"],
      dimensions: { width: 165, height: 130, depth: 215, unit: "cm" },
      customizationOptions: {
        fabrics: sofaFabrics,
        finishes: woodFinishes.slice(0, 3),
        configurations: [
          { label: "Individual", priceMultiplier: 0.7 },
          { label: "Matrimonial", priceMultiplier: 0.85 },
          { label: "Queen", priceMultiplier: 1 },
          { label: "King", priceMultiplier: 1.25 },
        ],
      },
      rating: 5,
      reviewsCount: 19,
      isFeatured: true,
      metrics: { viewsCount: 350, whatsappClicksCount: 29 },
    },
    {
      title: "Escritorio Turín Roble",
      description:
        "Escritorio con cajonera integrada y pasacables oculto. Trabaja desde casa con estilo y orden.",
      category: "Oficina",
      basePrice: 340,
      images: ["/products/escritorio-roble-1.jpg"],
      dimensions: { width: 140, height: 75, depth: 60, unit: "cm" },
      customizationOptions: {
        fabrics: [],
        finishes: woodFinishes,
        configurations: [
          { label: "120 cm", priceMultiplier: 0.85 },
          { label: "140 cm", priceMultiplier: 1 },
          { label: "160 cm", priceMultiplier: 1.15 },
        ],
      },
      rating: 4.8,
      reviewsCount: 9,
      metrics: { viewsCount: 160, whatsappClicksCount: 10 },
    },
    {
      title: "Silla Ejecutiva Ergonómica",
      description:
        "Soporte lumbar, malla transpirable y reclinación sincronizada. Diseñada para jornadas largas sin dolor de espalda.",
      category: "Oficina",
      basePrice: 210,
      images: ["/products/silla-oficina-1.jpg"],
      dimensions: { width: 65, height: 118, depth: 65, unit: "cm" },
      customizationOptions: { fabrics: [], finishes: [], configurations: [] },
      rating: 4.6,
      reviewsCount: 15,
      metrics: { viewsCount: 140, whatsappClicksCount: 8 },
    },
    {
      title: "Repisa Flotante Kioto",
      description:
        "Set de 3 repisas flotantes con herrajes ocultos. Exhibe plantas, libros y recuerdos con ligereza visual.",
      category: "Muebles Auxiliares",
      basePrice: 95,
      images: ["/products/repisa-flotante-1.jpg"],
      dimensions: { width: 80, height: 4, depth: 20, unit: "cm" },
      customizationOptions: {
        fabrics: [],
        finishes: woodFinishes,
        configurations: [],
      },
      rating: 4.9,
      reviewsCount: 23,
      metrics: { viewsCount: 120, whatsappClicksCount: 9 },
    },
    {
      title: "Espejo Arco Dorado",
      description:
        "Espejo de piso con marco en arco y acabado metálico cálido. Amplía y llena de luz cualquier ambiente.",
      category: "Decoración",
      basePrice: 180,
      images: ["/products/espejo-arco-1.jpg"],
      dimensions: { width: 70, height: 170, depth: 3, unit: "cm" },
      customizationOptions: { fabrics: [], finishes: [], configurations: [] },
      rating: 5,
      reviewsCount: 17,
      metrics: { viewsCount: 210, whatsappClicksCount: 16 },
    },
  ];

  for (const product of products) {
    const existing = await ProductModel.findOne({ title: product.title });
    if (existing) {
      console.log(`↺ Ya existe: ${product.title}`);
      continue;
    }
    const doc = await ProductModel.create(product);
    console.log(`✔ Creado: ${doc.title} → /producto/${doc.slug}`);
  }

  await mongoose.disconnect();
  console.log("✔ Seed completado");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
