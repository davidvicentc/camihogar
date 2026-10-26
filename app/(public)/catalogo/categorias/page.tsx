import { catalogMetadata } from "@/lib/metadata";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { getCategories } from "@/lib/data/catalog";
import { getProducts } from "@/lib/data/products";

export const metadata = catalogMetadata("/catalogo/categorias");

export default async function CategoriesPage() {
  const [categories, products] = await Promise.all([getCategories(), getProducts()]);
  const counts = products.reduce<Record<string, number>>((all, product) => { if (product.categoryId) all[product.categoryId] = (all[product.categoryId] ?? 0) + 1; return all; }, {});
  return <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
    <nav aria-label="Ruta de navegación" className="mb-8 flex items-center gap-2 text-sm text-brand-taupe"><Link href="/">Inicio</Link><ChevronRight className="h-3 w-3"/><span aria-current="page">Categorías</span></nav>
    <header className="mb-9 grid gap-5 border-b border-brand-dark/10 pb-8 md:grid-cols-[1.2fr_1fr] md:items-end">
      <div><p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">El catálogo CamiHogar</p><h1 className="max-w-xl text-balance font-display text-4xl font-semibold leading-[1.05] tracking-tight text-brand-dark sm:text-5xl lg:text-6xl">Lo esencial para tu hogar en un solo sitio.</h1></div>
      <p className="max-w-md text-pretty text-base leading-relaxed text-brand-taupe">Un buen descanso, una sala para compartir, un espacio más organizado. Elige una categoría y descubre sus piezas.</p>
    </header>
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
      {categories.map((category, index) => <Link key={category._id} href={`/catalogo/${category.slug}`} className="group row-span-4 grid min-w-0 grid-rows-subgrid gap-y-0 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-4">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-brand-sand sm:aspect-[5/4]">
          <Image src={category.image || "/hero/living-warm.jpg"} alt={category.name} fill priority={index < 2} sizes="(max-width: 768px) 50vw, 33vw" className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"/>
          <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/65 via-transparent to-transparent"/>
          <span className="absolute left-4 top-4 text-xs font-medium tabular-nums text-white/80">{String(index + 1).padStart(2, "0")}</span>
          <span className="absolute bottom-4 right-4 grid h-10 w-10 place-items-center rounded-full border border-white/40 text-white transition-colors group-hover:bg-brand-accent"><ArrowUpRight className="h-5 w-5"/></span>
        </div>
        <h2 className="pt-4 font-display text-lg font-semibold leading-6 tracking-tight text-brand-dark sm:text-xl">{category.name}</h2><p className="mt-2 min-h-10 text-sm leading-5 text-brand-taupe">{category.description || `Descubre nuestra selección de ${category.name.toLocaleLowerCase("es")}.`}</p><p className="mb-2 mt-3 text-xs font-semibold text-brand-accent">{counts[category._id] ?? 0} {(counts[category._id] ?? 0) === 1 ? "producto" : "productos"}<span className="sr-only"> · Ver categoría</span></p>
      </Link>)}
    </div>
    {!categories.length && <p className="py-16 text-center text-brand-taupe">Pronto encontrarás aquí nuestras categorías.</p>}
  </main>;
}
