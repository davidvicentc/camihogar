/**
 * Descarga fotos de muebles (Unsplash) a public/ con validación:
 * por cada slot prueba candidatos en orden y guarda el primero que
 * responda 200 con content-type image/* y peso razonable.
 *
 * Uso: node scripts/download-images.mjs
 */
import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const U = (id, w) =>
  `https://images.unsplash.com/photo-${id}?q=80&w=${w}&auto=format&fit=crop`;

// slot → [candidatos]. Ancho 1600 productos, 1200 categorías, 2000 hero.
const SLOTS = {
  // Productos (pueden tener varias fotos: sufijo -1, -2)
  "products/sofa-terracota-1.jpg": ["1555041469-a586c61ea9bc", "1493809842364-78817add7ffb", "1616486338812-3dadae4b4ace"],
  "products/sofa-terracota-2.jpg": ["1586023492125-27b2c045efd7", "1592078615290-033ee584e267"],
  "products/sofa-lino-1.jpg": ["1616486338812-3dadae4b4ace", "1592078615290-033ee584e267", "1493663284031-b7e3aefcae8e"],
  "products/sofa-lino-2.jpg": ["1493809842364-78817add7ffb", "1540574163026-643ea20ade25"],
  "products/sofa-modular-1.jpg": ["1540574163026-643ea20ade25", "1611269154421-4e27233ac5c7", "1550254478-ead40cc54513"],
  "products/sofa-modular-2.jpg": ["1586023492125-27b2c045efd7", "1522708323590-d24dbb6b0267"],
  "products/comedor-nogal-1.jpg": ["1617806118233-18e1de247200", "1449247709967-d4461a6a6103", "1519710164239-da123dc03ef4"],
  "products/comedor-nogal-2.jpg": ["1519710164239-da123dc03ef4", "1449247709967-d4461a6a6103"],
  "products/mesa-centro-1.jpg": ["1532372320572-cda25653a26d", "1522708323590-d24dbb6b0267", "1499933374294-4584851497cc"],
  "products/cama-tapizada-1.jpg": ["1505693416388-ac5ce068fe85", "1595526114035-0d45ed16cfbf", "1522771739844-6a9f6d5f14af"],
  "products/cama-tapizada-2.jpg": ["1560185893-a55cbc8c57e8", "1567016432779-094069958ea5", "1522771739844-6a9f6d5f14af"],
  "products/escritorio-roble-1.jpg": ["1518455027359-f3f8164ba6bd", "1524758631624-e2822e304c36", "1593062096033-9a26b09da705"],
  "products/silla-oficina-1.jpg": ["1524758631624-e2822e304c36", "1497366216548-37526070297c", "1503602642458-232111445657"],
  "products/repisa-flotante-1.jpg": ["1594620302200-9a762244a156", "1513694203232-719a280e022f", "1493934558415-9d19f0b2b4d2"],
  "products/espejo-arco-1.jpg": ["1618220179428-22790b461013", "1615874959474-d609969a20ed", "1513694203232-719a280e022f"],
  // Categorías
  "categories/salas.jpg": ["1616486338812-3dadae4b4ace", "1555041469-a586c61ea9bc"],
  "categories/comedores.jpg": ["1449247709967-d4461a6a6103", "1519710164239-da123dc03ef4"],
  "categories/dormitorios.jpg": ["1522771739844-6a9f6d5f14af", "1505693416388-ac5ce068fe85"],
  "categories/muebles-auxiliares.jpg": ["1532372320572-cda25653a26d", "1513694203232-719a280e022f"],
  "categories/oficina.jpg": ["1497215728101-856f4ea42174", "1524758631624-e2822e304c36"],
  "categories/decoracion.jpg": ["1618220179428-22790b461013", "1513694203232-719a280e022f"],
  // Hero
  "hero/living-warm.jpg": ["1618221195710-dd6b41faaea6", "1600210492486-724fe5c67fb0", "1600585154340-be6161a56a0c", "1600607687939-ce8a6c25118c"],
};

const widthFor = (slot) =>
  slot.startsWith("hero/") ? 2000 : slot.startsWith("categories/") ? 1200 : 1600;

const used = new Map(); // id → primer slot que lo usó (evita repetir la misma foto)
let ok = 0, fail = 0;

for (const [slot, candidates] of Object.entries(SLOTS)) {
  const dest = resolve("public", slot);
  await mkdir(resolve("public", slot.split("/")[0]), { recursive: true });
  let saved = false;
  for (const id of candidates) {
    // No repetir foto salvo que sea el último candidato disponible.
    if (used.has(id) && candidates.some((c) => !used.has(c) && c !== id)) continue;
    try {
      const res = await fetch(U(id, widthFor(slot)), { redirect: "follow" });
      const type = res.headers.get("content-type") ?? "";
      if (!res.ok || !type.startsWith("image/")) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 30_000) continue; // descarta placeholders/errores
      await writeFile(dest, buf);
      used.set(id, slot);
      console.log(`✔ ${slot}  ←  ${id}  (${Math.round(buf.length / 1024)} KB)`);
      saved = true;
      ok++;
      break;
    } catch {
      // siguiente candidato
    }
  }
  if (!saved) {
    console.log(`✖ ${slot}: ningún candidato válido`);
    fail++;
  }
}

console.log(`\n${ok} descargadas, ${fail} fallidas`);
process.exit(fail > 0 ? 2 : 0);
