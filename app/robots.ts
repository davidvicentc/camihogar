import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/utils";

/**
 * Permite indexar toda la tienda pública y bloquea el panel y las rutas de API,
 * que no aportan nada en buscadores.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/api/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
