import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Palette, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/logo";
import { getCustomizableProducts } from "@/lib/data/products";
import { cn, formatPrice } from "@/lib/utils";
import type { ProductDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Personalizador CamiHogar",
  description:
    "Elige telas, acabados y medidas en tiempo real. Diseña un mueble único que abrace tu hogar y pídelo por WhatsApp.",
};

function optionsSummary(product: ProductDTO): string {
  const { fabrics, finishes, configurations } = product.customizationOptions;
  const parts: string[] = [];
  if (fabrics.length > 0) {
    parts.push(`${fabrics.length} ${fabrics.length === 1 ? "tela" : "telas"}`);
  }
  if (finishes.length > 0) {
    parts.push(`${finishes.length} ${finishes.length === 1 ? "acabado" : "acabados"}`);
  }
  if (configurations.length > 0) {
    parts.push(
      `${configurations.length} ${
        configurations.length === 1 ? "configuración" : "configuraciones"
      }`
    );
  }
  return parts.join(" · ");
}

function CustomizableCard({
  product,
  priority = false,
}: {
  product: ProductDTO;
  priority?: boolean;
}) {
  return (
    <Link
      href={`/personalizar/${product.slug}`}
      className="group block overflow-hidden rounded-3xl border border-brand-dark/5 bg-brand-card shadow-warm-sm transition-shadow hover:shadow-warm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="warm-glow relative aspect-[4/3] overflow-hidden bg-secondary">
        {product.images[0] ? (
          <Image
            src={product.images[0]}
            alt={product.title}
            fill
            priority={priority}
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 300px"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.07]"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <LogoMark className="h-10 opacity-25" />
          </div>
        )}
        <div className="absolute left-3 top-3">
          <Badge variant="glass">
            <Wand2 className="h-3 w-3" aria-hidden="true" />
            Personalizable
          </Badge>
        </div>
      </div>

      <div className="space-y-2 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-taupe">
          {product.category}
        </p>
        <h3 className="line-clamp-2 font-display text-base font-semibold leading-snug text-brand-dark">
          {product.title}
        </h3>
        <p className="text-sm text-brand-taupe">
          Desde{" "}
          <span className="text-lg font-bold text-brand-dark">
            {formatPrice(product.basePrice)}
          </span>
        </p>
        {optionsSummary(product) && (
          <p className="text-xs text-brand-taupe">{optionsSummary(product)}</p>
        )}
        <span
          className={cn(
            buttonVariants({ variant: "accent", size: "sm" }),
            "mt-1 w-full transition-all group-hover:brightness-[1.06] group-hover:shadow-glow-sm"
          )}
        >
          <Wand2 className="h-4 w-4" aria-hidden="true" />
          Personalizar
        </span>
      </div>
    </Link>
  );
}

export default async function PersonalizarPage() {
  const products = await getCustomizableProducts(24);

  return (
    <div>
      {/* Mini-hero */}
      <section className="relative overflow-hidden bg-hero-gradient">
        <div className="absolute inset-0 bg-warm-radial" aria-hidden="true" />
        <div
          className="pointer-events-none absolute inset-0 logo-grid opacity-40 [mask-image:radial-gradient(ellipse_60%_70%_at_50%_40%,black,transparent)]"
          aria-hidden="true"
        />
        <div
          className="absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-brand-accent/25 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-16 text-center md:py-24">
          <LogoMark className="mx-auto mb-5 h-12 drop-shadow-[0_0_22px_rgba(232,81,26,0.45)] md:h-14" />
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-4 py-1.5 text-xs font-semibold tracking-tight text-brand-bg/90 backdrop-blur">
            <Wand2 className="h-3.5 w-3.5 text-brand-accent" aria-hidden="true" />
            Hecho a tu medida
          </span>
          <h1 className="mt-4 font-display text-[2.1rem] font-semibold leading-[1.05] tracking-tightest text-brand-bg md:text-6xl">
            Personalizador <span className="text-gradient-ember">CamiHogar</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-balance text-sm leading-relaxed tracking-tight text-brand-bg/70 md:text-base">
            Elige telas, acabados y medidas en tiempo real, y mira cómo tu mueble
            cobra vida antes de pedirlo.
          </p>
        </div>
        {/* Transición al fondo crema */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-brand-bg"
        />
      </section>

      {/* Grid de productos personalizables */}
      <section className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        {products.length > 0 ? (
          <>
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-semibold text-brand-dark md:text-2xl">
                  Muebles listos para personalizar
                </h2>
                <p className="mt-1 text-sm text-brand-taupe">
                  Toca uno y hazlo tuyo: cada tela y acabado cambia al instante.
                </p>
              </div>
              <p className="hidden shrink-0 text-sm text-brand-taupe sm:block">
                {products.length}{" "}
                {products.length === 1 ? "mueble" : "muebles"}
              </p>
            </div>
            <div className="grid animate-fade-up grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
              {products.map((product, index) => (
                <CustomizableCard
                  key={product._id}
                  product={product}
                  priority={index < 4}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="mx-auto max-w-md animate-fade-up rounded-3xl border border-dashed border-brand-dark/15 bg-brand-card px-6 py-14 text-center shadow-warm-sm">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-accent/10 text-brand-accent">
              <Palette className="h-7 w-7" aria-hidden="true" />
            </div>
            <h2 className="mt-4 font-display text-xl font-semibold text-brand-dark">
              Pronto podrás personalizar
            </h2>
            <p className="mt-2 text-sm text-brand-taupe">
              Estamos preparando muebles con telas, acabados y medidas a tu gusto.
              Mientras tanto, explora el catálogo y enamórate de tu próximo mueble.
            </p>
            <Button asChild variant="accent" className="mt-6">
              <Link href="/catalogo">Explorar el catálogo</Link>
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
