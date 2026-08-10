import { Suspense } from "react";
import type { Metadata } from "next";
import { CatalogFilters } from "@/components/catalog/catalog-filters";
import { CatalogGrid } from "@/components/catalog/catalog-grid";
import { categoryFromSlug } from "@/lib/constants";
import { getPriceRange, getProducts } from "@/lib/data/products";
import type { CatalogFilters as Filters } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Catálogo",
    description:
      "Explora el catálogo completo de CamiHogar: salas, comedores, dormitorios y más muebles que abrazan tu hogar.",
  };
}

const SORT_VALUES = ["recent", "price-asc", "price-desc", "popular"] as const;

function parsePrice(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;

  const filters: Filters = {
    category: sp.categoria ? categoryFromSlug(sp.categoria) : undefined,
    minPrice: parsePrice(sp.precioMin),
    maxPrice: parsePrice(sp.precioMax),
    inStock: sp.disponibles === "1" ? true : undefined,
    sort: SORT_VALUES.find((value) => value === sp.orden),
    search: sp.q?.trim() || undefined,
  };

  const [products, priceRange] = await Promise.all([
    getProducts(filters),
    getPriceRange(),
  ]);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 sm:px-6 md:pt-12 lg:px-8">
      <header className="mb-6 space-y-1 md:mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tighter text-brand-dark md:text-4xl">
          Catálogo
        </h1>
        <p className="text-sm text-brand-taupe md:text-base">
          {products.length === 0
            ? "0 resultados con estos filtros"
            : products.length === 1
              ? "1 resultado esperando abrazar tu hogar"
              : `${products.length} resultados esperando abrazar tu hogar`}
          {filters.search ? ` para “${filters.search}”` : ""}
        </p>
      </header>

      <div className="mb-6 md:mb-8">
        <Suspense fallback={<div className="h-12" aria-hidden="true" />}>
          <CatalogFilters priceRange={priceRange} total={products.length} />
        </Suspense>
      </div>

      <CatalogGrid products={products} />
    </section>
  );
}
