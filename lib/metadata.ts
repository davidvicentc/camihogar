import type { Metadata } from "next";
import { BRAND } from "@/lib/constants";

export const CATALOG_TITLE = "Catálogo de CamiHogar | Muebles, camas y colchones";
export const CATALOG_DESCRIPTION =
  "Explora muebles, sofás cama, comedores, camas, colchones, clósets y centros de TV. Visítanos en Guatire y Caracas. Entregas en Guarenas, Higuerote y toda Venezuela. Consulta precios y disponibilidad por WhatsApp.";
export const CATALOG_IMAGE = {
  url: "/og/catalogo-camihogar-v3.jpg",
  width: 1200,
  height: 630,
  type: "image/jpeg",
  alt: "Lo esencial para tu hogar en un solo sitio. Abre el catálogo de CamiHogar: camas, salas y comedores. Tiendas en Guatire y Caracas, envíos a toda Venezuela.",
};

/** Each catalog route emits its own social tags instead of inheriting the home card. */
export function catalogMetadata(
  path: string,
  title = "Catálogo de muebles",
  description = CATALOG_DESCRIPTION,
): Metadata {
  const socialTitle = title === "Catálogo de muebles" ? CATALOG_TITLE : `${title} | CamiHogar`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: socialTitle,
      description,
      url: path,
      type: "website",
      locale: "es_VE",
      siteName: BRAND.name,
      images: [CATALOG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [CATALOG_IMAGE],
    },
  };
}
