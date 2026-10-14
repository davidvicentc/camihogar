import { Suspense } from "react";
import type { Metadata } from "next";
import { CatalogFilters } from "@/components/catalog/catalog-filters";
import { CatalogGrid } from "@/components/catalog/catalog-grid";
import { categoryFromSlug } from "@/lib/constants";
import { getPriceRange, getProducts } from "@/lib/data/products";
import { getCategories } from "@/lib/data/catalog";
import { getSiteSettings } from "@/lib/data/settings";
import type { CatalogFilters as Filters } from "@/lib/types";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";

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

  const categories = await getCategories();
  const selectedCategory = categories.find((category) => category.slug === sp.categoria);
  const filters: Filters = {
    category: selectedCategory?.name ?? (sp.categoria ? categoryFromSlug(sp.categoria) : undefined),
    categoryId: selectedCategory?._id,
    minPrice: parsePrice(sp.precioMin),
    maxPrice: parsePrice(sp.precioMax),
    inStock: sp.disponibles === "1" ? true : undefined,
    sort: SORT_VALUES.find((value) => value === sp.orden),
    search: sp.q?.trim() || undefined,
    color: sp.color?.trim() || undefined,
    size: sp.medida?.trim() || undefined,
  };

  const [products, allProducts, priceRange, settings] = await Promise.all([
    getProducts(filters),
    getProducts(),
    getPriceRange(),
    getSiteSettings(),
  ]);
  const categoryCounts = allProducts.reduce<Record<string, number>>((counts, product) => { if (product.categoryId) counts[product.categoryId] = (counts[product.categoryId] ?? 0) + 1; return counts; }, {});
  const catalogCategories = categories.map((category) => ({ ...category, productCount: categoryCounts[category._id] ?? 0 }));
  const colors = [...new Set(allProducts.flatMap((product) => (product.colorOptions ?? []).map((color) => color.name)).filter(Boolean))].sort();
  const sizes = [...new Set(allProducts.flatMap((product) => (product.variants ?? []).map((variant) => variant.name)).filter(Boolean))].sort();

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 sm:px-6 md:pt-12 lg:px-8">
      <nav aria-label="Ruta de navegación" className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-brand-taupe"><Link href="/" className="hover:text-brand-accent">Inicio</Link><ChevronRight className="h-3.5 w-3.5"/><Link href="/catalogo" className="hover:text-brand-accent">Catálogo</Link>{selectedCategory && <><ChevronRight className="h-3.5 w-3.5"/><span className="font-medium text-brand-dark">{selectedCategory.name}</span></>}</nav>
      <header className="mb-6 space-y-1 md:mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tighter text-brand-dark md:text-4xl">
          {selectedCategory?.name ?? "Catálogo de muebles"}
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

      {selectedCategory && <section className="relative mb-6 min-h-52 overflow-hidden rounded-3xl bg-brand-dark shadow-warm md:min-h-64"><Image src={selectedCategory.image || "/hero/living-warm.jpg"} alt={selectedCategory.name} fill priority className="object-cover opacity-55" sizes="(max-width: 1280px) 100vw, 1200px"/><div className="absolute inset-0 bg-gradient-to-r from-brand-dark via-brand-dark/80 to-transparent"/><div className="relative flex min-h-52 max-w-2xl flex-col justify-end p-6 text-white md:min-h-64 md:p-9"><p className="text-sm font-semibold text-brand-accent">Ambiente seleccionado</p><h2 className="mt-2 font-display text-3xl font-semibold">{selectedCategory.name}</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75 md:text-base">{selectedCategory.description || `Explora todos los muebles disponibles en ${selectedCategory.name}.`}</p><p className="mt-4 text-sm font-semibold">{categoryCounts[selectedCategory._id] ?? 0} {(categoryCounts[selectedCategory._id] ?? 0) === 1 ? "producto disponible" : "productos disponibles"}</p></div></section>}

      <div className="mb-6 md:mb-8">
        <Suspense fallback={<div className="h-12" aria-hidden="true" />}>
          <CatalogFilters priceRange={priceRange} total={products.length} categories={catalogCategories} colors={colors} sizes={sizes} />
        </Suspense>
      </div>

      <CatalogGrid products={products} cardStyles={settings.categoryCardStyles} taxNoteText={settings.taxNoteText} />
    </section>
  );
}
