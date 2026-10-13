import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/constants";

/** Instalable en móvil con los colores e iconos del logo oficial. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.name} — ${BRAND.tagline}`,
    short_name: BRAND.name,
    description:
      "Muebles con diseño cálido, personalizables y hechos en Venezuela.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#FFFFFF",
    lang: "es-VE",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
