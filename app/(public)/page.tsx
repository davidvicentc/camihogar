import { getProducts, orderHomeProducts } from "@/lib/data/products";
import { getSiteSettings } from "@/lib/data/settings";
import { getCategories } from "@/lib/data/catalog";
import { LogoMark } from "@/components/brand/logo";
import { Hero } from "@/components/home/hero";
import { CategoryCarousel } from "@/components/home/category-carousel";
import { Bestsellers } from "@/components/home/bestsellers";
import { FeaturedStrip } from "@/components/home/featured-strip";
import { TrustBadges } from "@/components/home/trust-badges";
import { getSiteUrl } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mueblería en Guatire, Guarenas y Caracas",
  description:
    "Compra muebles en Guatire y Guarenas con entregas en Caracas, Higuerote y toda Venezuela. Salas, comedores, camas, colchones y muebles a medida.",
  alternates: { canonical: "/" },
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${getSiteUrl()}/#business`,
  name: "CAMIHOGAR GUATIRE",
  url: getSiteUrl(),
  image: `${getSiteUrl()}/camihogarlogo.jpeg`,
  description: "Colchonería y mueblería en Guatire con entregas en Guarenas, Caracas, Higuerote y toda Venezuela.",
  telephone: "+584127322091",
  email: "hola@camihogar.com",
  address: {
    "@type": "PostalAddress",
    streetAddress: "C. Rivas",
    addressLocality: "Guatire",
    addressRegion: "Miranda",
    postalCode: "1221",
    addressCountry: "VE",
  },
  location: [
    {
      "@type": "FurnitureStore",
      name: "CAMIHOGAR GUATIRE",
      telephone: "+584127322091",
      address: {
        "@type": "PostalAddress",
        streetAddress: "C. Rivas",
        addressLocality: "Guatire",
        addressRegion: "Miranda",
        postalCode: "1221",
        addressCountry: "VE",
      },
    },
    {
      "@type": "FurnitureStore",
      name: "CAMIHOGAR CARACAS",
      telephone: "+584127322091",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Centro Empresarial Millennium Mall, Av. Rómulo Gallegos, Qta 10-27 C. La Venezolana",
        addressLocality: "Caracas",
        addressRegion: "Miranda",
        postalCode: "1071",
        addressCountry: "VE",
      },
    },
  ],
  areaServed: ["Guatire", "Guarenas", "Caracas", "Higuerote", "Miranda", "Venezuela"],
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.5",
    reviewCount: "39",
  },
  priceRange: "$$",
  sameAs: [
    "https://instagram.com/colchonescamihogarvzla_/",
    "https://instagram.com/colchonescamihogargyg/",
  ],
};

export const revalidate = 300;

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
  const [products, categories, settings] = await Promise.all([
    getProducts({ inStock: true }),
    getCategories(),
    getSiteSettings(),
  ]);
  const priceOrder = { sort: "price-asc" as const, productIds: [] };
  const bestsellers = orderHomeProducts(products, priceOrder).slice(0, 8);
  const featured = orderHomeProducts(products.filter((product) => product.isFeatured), priceOrder).slice(0, 6);

  const storeIsEmpty = featured.length === 0 && bestsellers.length === 0;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />
      <Hero />
      <div className="space-y-14 py-12 md:space-y-20 md:py-16">
        <CategoryCarousel categories={categories} />
        {storeIsEmpty ? (
          <EmptyCatalog />
        ) : (
          <>
            <Bestsellers products={bestsellers} cardStyles={settings.categoryCardStyles} />
            <FeaturedStrip products={featured} cardStyles={settings.categoryCardStyles} />
          </>
        )}
        <TrustBadges />
      </div>
    </>
  );
}
