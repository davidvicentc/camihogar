"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, X } from "lucide-react";
import { SiWhatsapp } from "@icons-pack/react-simple-icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFavoritesStore } from "@/store/favorites-store";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { formatPrice } from "@/lib/utils";

const spring = { type: "spring", stiffness: 300, damping: 24 } as const;

export default function FavoritosPage() {
  const items = useFavoritesStore((s) => s.items);
  const remove = useFavoritesStore((s) => s.remove);

  // El store usa persist (localStorage): renderizamos el contenido real solo
  // tras montar en cliente para evitar un mismatch de hidratación.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const whatsappHref = React.useMemo(() => {
    const lines = [
      "¡Hola CamiHogar! Me enamoré de estos muebles de su catálogo:",
      ...items.map((item) => `- ${item.title} (${formatPrice(item.basePrice)})`),
      "¿Me pueden dar más información?",
    ];
    return buildWhatsAppLink(lines.join("\n"));
  }, [items]);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 sm:px-6 md:pt-12 lg:px-8">
      <header className="mb-6 space-y-1 md:mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tighter text-brand-dark md:text-4xl">
          Tus favoritos
        </h1>
        {mounted && items.length > 0 && (
          <p className="text-sm text-brand-taupe md:text-base">
            {items.length === 1
              ? "1 mueble guardado con cariño"
              : `${items.length} muebles guardados con cariño`}
          </p>
        )}
      </header>

      {!mounted ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/5] rounded-3xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-brand-dark/15 bg-brand-card/60 px-6 py-20 text-center"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-accent/10 text-brand-accent">
            <Heart className="h-8 w-8" aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <h2 className="font-display text-xl font-semibold text-brand-dark">
              Aún no guardas favoritos
            </h2>
            <p className="mx-auto max-w-sm text-sm text-brand-taupe">
              Toca el corazón de cualquier mueble y lo guardamos aquí, listo
              para abrazar tu hogar cuando tú decidas.
            </p>
          </div>
          <Button asChild variant="accent" className="mt-2">
            <Link href="/catalogo">Explorar el catálogo</Link>
          </Button>
        </motion.div>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <motion.li
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={spring}
                  className="group relative overflow-hidden rounded-3xl border border-brand-dark/5 bg-brand-card shadow-warm-sm transition-shadow hover:shadow-warm"
                >
                  <Link
                    href={`/producto/${item.slug}`}
                    className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="warm-glow relative aspect-square overflow-hidden bg-secondary">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 280px"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-brand-taupe/50">
                          Sin imagen
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-brand-taupe">
                        {item.category}
                      </p>
                      <h3 className="line-clamp-2 font-display text-base font-semibold leading-snug text-brand-dark">
                        {item.title}
                      </h3>
                      <p className="pt-1 text-lg font-bold text-brand-dark">
                        {formatPrice(item.basePrice)}
                      </p>
                    </div>
                  </Link>

                  <button
                    type="button"
                    aria-label={`Quitar ${item.title} de favoritos`}
                    onClick={() => remove(item.id)}
                    className="absolute right-3 top-3 rounded-full bg-white/90 p-2 shadow-warm-sm backdrop-blur transition-transform hover:scale-110 active:scale-95"
                  >
                    <X className="h-4 w-4 text-brand-taupe" aria-hidden="true" />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          <div className="mt-8 flex justify-center">
            <Button asChild variant="whatsapp" size="lg" className="w-full sm:w-auto">
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                <SiWhatsapp aria-hidden="true" />
                Consultar todos por WhatsApp
              </a>
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
