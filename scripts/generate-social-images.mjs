/** Rebuild the share card from the official logo; no remote fonts or image service. */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

await mkdir("public/og", { recursive: true });
const logo = await sharp("public/logo-lockup.png").resize({ width: 290 }).toBuffer();
const background = Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#25160F"/>
  <path d="M0 0H1200V12H0Z" fill="#E8511A"/>
  <path d="M420 110V520" stroke="#704330" stroke-width="2"/>
  <g font-family="Helvetica, Arial, sans-serif">
    <text x="480" y="166" font-size="25" fill="#F2AB88">Muebles que abrazan tu hogar</text>
    <text x="477" y="250" font-size="65" font-weight="700" fill="#FBF8F4">Catálogo de</text>
    <text x="477" y="325" font-size="65" font-weight="700" fill="#E8511A">CamiHogar</text>
    <text x="480" y="385" font-size="25" fill="#FBF8F4">Muebles · Sofás cama · Comedores</text>
    <text x="480" y="425" font-size="25" fill="#FBF8F4">Camas · Colchones · Almacenamiento</text>
    <text x="480" y="491" font-size="22" fill="#DEC7B9">Visítanos en Guatire y Caracas</text>
    <text x="480" y="526" font-size="22" fill="#DEC7B9">Entregas en toda Venezuela</text>
    <text x="70" y="574" font-size="22" fill="#F2AB88">camihogar.com</text>
  </g>
</svg>`);
await sharp(background).composite([{ input: logo, left: 66, top: 182 }])
  .jpeg({ quality: 92, chromaSubsampling: "4:4:4" }).toFile("public/og/catalogo-camihogar-v1.jpg");
// Opaque color mark: search thumbnails cannot turn a transparent logo black/white.
await sharp("public/logo-mark.png").flatten({ background: "#25160F" })
  .png().toFile("public/logo-mark-color.png");
