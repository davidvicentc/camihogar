import { getProducts, orderHomeProducts } from "@/lib/data/products";
import { getCategories } from "@/lib/data/catalog";
import { LogoMark } from "@/components/brand/logo";
import { Hero } from "@/components/home/hero";
import { CategoryCarousel } from "@/components/home/category-carousel";
import { Bestsellers } from "@/components/home/bestsellers";
import { FeaturedStrip } from "@/components/home/featured-strip";
import { TrustBadges } from "@/components/home/trust-badges";

export const dynamic = "force-dynamic";

function EmptyCatalog() {
  return (
    <section aria-label="Catálogo en preparación" className="mx-auto w-full max-w-6xl px-4 md:px-6">
      <div className="flex animate-fade-up flex-col items-center gap-4 rounded-[1.75rem] border border-dashed border-brand-taupe/25 bg-brand-card px-6 py-14 text-center shadow-warm-sm md:py-20">
        <LogoMark className="h-14 animate-float opacity-90" />
        <h2 className="font-display text-xl font-semibold tracking-tighter text-brand-dark md:text-2xl">
          Estamos acomodando los muebles
        </h2>
        <p className="max-w-md text-balance text-sm leading-relaxed tracking-tight text-brand-taupe md:text-base">
          Muy pronto verás aquí las piezas que abrazan tu hogar. Si eres quien
          administra la tienda, conecta la base de datos y publica tus primeros
          productos desde el panel para llenar esta vitrina.
        </p>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const [products, categories] = await Promise.all([
    getProducts({ inStock: true }),
    getCategories(),
  ]);
  const priceOrder = { sort: "price-asc" as const, productIds: [] };
  const bestsellers = orderHomeProducts(products, priceOrder).slice(0, 8);
  const featured = orderHomeProducts(products.filter((product) => product.isFeatured), priceOrder).slice(0, 6);

  const storeIsEmpty = featured.length === 0 && bestsellers.length === 0;

  return (
    <>
      <Hero />
      <div className="space-y-14 py-12 md:space-y-20 md:py-16">
        <CategoryCarousel categories={categories} />
        {storeIsEmpty ? (
          <EmptyCatalog />
        ) : (
          <>
            <Bestsellers products={bestsellers} />
            <FeaturedStrip products={featured} />
          </>
        )}
        <TrustBadges />
      </div>
    </>
  );
}
