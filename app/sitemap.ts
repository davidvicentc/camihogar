import type { MetadataRoute } from "next";
import { CATEGORY_META } from "@/lib/constants";
import { getProducts } from "@/lib/data/products";
import { getSiteUrl } from "@/lib/utils";

/**
 * Sitemap dinámico: páginas fijas + una entrada por producto y, cuando el
 * producto es personalizable, su ruta del personalizador.
 *
 * `getProducts` ya devuelve [] si la base de datos no responde, así que el
 * sitemap nunca rompe el build: en el peor caso queda solo con las rutas fijas.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const products = await getProducts();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/catalogo`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/personalizar`, changeFrequency: "weekly", priority: 0.8 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = CATEGORY_META.map((category) => ({
    url: `${siteUrl}/catalogo?categoria=${category.slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${siteUrl}/producto/${product.slug}`,
    lastModified: product.updatedAt ? new Date(product.updatedAt) : undefined,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const customizerRoutes: MetadataRoute.Sitemap = products
    .filter((product) => {
      const { fabrics, finishes, configurations } = product.customizationOptions;
      return fabrics.length > 0 || finishes.length > 0 || configurations.length > 0;
    })
    .map((product) => ({
      url: `${siteUrl}/personalizar/${product.slug}`,
      lastModified: product.updatedAt ? new Date(product.updatedAt) : undefined,
      changeFrequency: "weekly",
      priority: 0.6,
    }));

  return [
    ...staticRoutes,
    ...categoryRoutes,
    ...productRoutes,
    ...customizerRoutes,
  ];
}
