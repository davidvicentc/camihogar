/** Export the approved catalog artwork for social crawlers. */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

await mkdir("public/og", { recursive: true });
await sharp("assets/social/catalogo-camihogar-v3.png")
  .resize(1200, 630, { fit: "cover", position: "centre" })
  .jpeg({ quality: 88, chromaSubsampling: "4:4:4", mozjpeg: true })
  .toFile("public/og/catalogo-camihogar-v3.jpg");

// Existing monochrome image URLs redirect to this opaque brand-color mark.
await sharp("public/logo-mark.png").flatten({ background: "#25160F" })
  .png().toFile("public/logo-mark-color.png");
