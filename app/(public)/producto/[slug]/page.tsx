import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getProductBySlug, getRelatedProducts } from "@/lib/data/products";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductInfo } from "@/components/product/product-info";
import { DimensionsCard } from "@/components/product/dimensions-card";
import { ViewTracker } from "@/components/product/view-tracker";
import { ProductCard } from "@/components/catalog/product-card";
import { getSiteSettings } from "@/lib/data/settings";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

function shortDescription(text: string): string {
  if (text.length <= 160) return text;
  return `${text.slice(0, 157).trimEnd()}…`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return { title: "Producto no encontrado" };
  }

  const description = shortDescription(
    product.description ||
      `Descubre ${product.title} en CamiHogar. Muebles que abrazan tu hogar.`
  );

  return {
    title: product.title,
    description,
    openGraph: {
      title: product.title,
      description,
      images: product.images[0] ? [{ url: product.images[0] }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  const [related, settings] = await Promise.all([getRelatedProducts(product, 4), getSiteSettings()]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 md:py-10 lg:px-8">
      <ViewTracker productId={product._id} />

      {/* Breadcrumb */}
      <nav aria-label="Ruta de navegación" className="mb-6">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-brand-taupe">
          <li>
            <Link href="/" className="transition-colors hover:text-brand-accent">
              Inicio
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="h-3.5 w-3.5" />
          </li>
          <li>
            <Link href="/catalogo" className="transition-colors hover:text-brand-accent">
              Catálogo
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="h-3.5 w-3.5" />
          </li>
          <li aria-current="page" className="line-clamp-1 font-medium text-brand-dark">
            {product.title}
          </li>
        </ol>
      </nav>

      {/* Galería + Información */}
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductGallery images={product.images} title={product.title} />
        <ProductInfo product={product} />
      </div>

      {/* Dimensiones */}
      <div className="mt-10 md:mt-14">
        <DimensionsCard dimensions={product.dimensions} title={product.title} />
      </div>

      {/* Relacionados */}
      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="mt-12 md:mt-16">
          <h2
            id="related-heading"
            className="mb-6 font-display text-2xl font-semibold text-brand-dark md:text-3xl"
          >
            También te puede gustar
          </h2>
          <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item._id} product={item} cardStyles={settings.categoryCardStyles} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
