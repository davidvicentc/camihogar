/**
 * Asigna las fotos reales descargadas (public/products/*.jpg) a los productos
 * existentes en la base de datos, emparejadas por título. Idempotente.
 *
 * Uso: node scripts/assign-images.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import mongoose from "mongoose";

const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^\s*([\w.]+)\s*=\s*"?([^"#]*)"?\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
}

const MAPPING = {
  "Sofá Capri Terracota": ["/products/sofa-modular-1.jpg", "/products/sofa-lino-2.jpg"],
  "Sofá Roma Lino Natural": ["/products/sofa-lino-1.jpg", "/products/sofa-terracota-2.jpg"],
  "Modular Óslo L-Shape": ["/products/sofa-terracota-1.jpg", "/products/sofa-modular-2.jpg"],
  "Comedor Nórdico 6 Puestos": ["/products/comedor-nogal-1.jpg", "/products/comedor-nogal-2.jpg"],
  "Mesa de Centro Alba": ["/products/mesa-centro-1.jpg"],
  "Cama Verona Tapizada Queen": ["/products/cama-tapizada-1.jpg", "/products/cama-tapizada-2.jpg"],
  "Escritorio Turín Roble": ["/products/escritorio-roble-1.jpg"],
  "Silla Ejecutiva Ergonómica": ["/products/silla-oficina-1.jpg"],
  "Repisa Flotante Kioto": ["/products/repisa-flotante-1.jpg"],
  "Espejo Arco Dorado": ["/products/espejo-arco-1.jpg"],
};

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("✖ Falta MONGODB_URI");
  process.exit(1);
}

await mongoose.connect(uri);
const products = mongoose.connection.collection("products");

for (const [title, images] of Object.entries(MAPPING)) {
  // Verifica que los archivos existan antes de asignar.
  const missing = images.filter((p) => !existsSync(resolve("public", p.slice(1))));
  if (missing.length) {
    console.log(`✖ ${title}: faltan ${missing.join(", ")}`);
    continue;
  }
  const res = await products.updateOne({ title }, { $set: { images } });
  console.log(
    res.matchedCount
      ? `✔ ${title} → ${images.length} foto(s)`
      : `↺ ${title}: no está en la BD (corre npm run seed)`
  );
}

await mongoose.disconnect();
console.log("Listo");
