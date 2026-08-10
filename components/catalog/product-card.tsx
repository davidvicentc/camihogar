"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, Star, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LogoMark } from "@/components/brand/logo";
import { useFavoritesStore } from "@/store/favorites-store";
import { cn, formatPrice } from "@/lib/utils";
import type { ProductDTO } from "@/lib/types";

interface ProductCardProps {
  product: ProductDTO;
  /** Prioriza la carga de la imagen (para las primeras tarjetas above-the-fold). */
  priority?: boolean;
  className?: string;
}

export function ProductCard({ product, priority = false, className }: ProductCardProps) {
  const isFavorite = useFavoritesStore((s) => s.isFavorite(product._id));
  const toggleFavorite = useFavoritesStore((s) => s.toggle);

  const isCustomizable =
    product.customizationOptions.fabrics.length > 0 ||
    product.customizationOptions.finishes.length > 0 ||
    product.customizationOptions.configurations.length > 0;

  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={cn(
        "group relative overflow-hidden rounded-[1.5rem] border border-brand-dark/[0.06] bg-brand-card shadow-warm-sm transition-all duration-300 hover:border-brand-accent/20 hover:shadow-warm",
        className
      )}
    >
      <Link
        href={`/producto/${product.slug}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="warm-glow relative aspect-[4/3] overflow-hidden bg-brand-sand">
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
            /* Sin foto: la casa del logo hace de marcador de posición */
            <div className="flex h-full flex-col items-center justify-center gap-2 text-brand-taupe/50">
              <LogoMark className="h-10 opacity-25" />
              <span className="text-xs tracking-tight">Sin imagen</span>
            </div>
          )}

          <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {product.isFeatured && <Badge variant="accent">Destacado</Badge>}
            {!product.inStock && <Badge variant="muted">Agotado</Badge>}
            {isCustomizable && (
              <Badge variant="glass">
                <Wand2 className="h-3 w-3" />
                Personalizable
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-1.5 p-4">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-brand-accent">
            {product.category}
          </p>
          <h3 className="line-clamp-2 font-display text-[0.95rem] font-semibold leading-snug tracking-tight text-brand-dark">
            {product.title}
          </h3>
          <div className="flex items-center justify-between pt-1.5">
            <p className="tabular text-lg font-semibold tracking-tight text-brand-dark">
              {formatPrice(product.basePrice)}
            </p>
            <span className="flex items-center gap-1 text-xs tracking-tight text-brand-taupe">
              <Star className="h-3.5 w-3.5 fill-brand-accent text-brand-accent" />
              <span className="tabular">{product.rating.toFixed(1)}</span>
              {product.reviewsCount > 0 && (
                <span className="tabular">({product.reviewsCount})</span>
              )}
            </span>
          </div>
        </div>
      </Link>

      <button
        type="button"
        aria-label={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
        onClick={() =>
          toggleFavorite({
            id: product._id,
            slug: product.slug,
            title: product.title,
            image: product.images[0] ?? "",
            basePrice: product.basePrice,
            category: product.category,
          })
        }
        className="absolute right-3 top-3 rounded-full bg-white/90 p-2 shadow-warm-sm backdrop-blur transition-transform hover:scale-110 active:scale-95"
      >
        <Heart
          className={cn(
            "h-4 w-4 transition-colors",
            isFavorite ? "fill-brand-accent text-brand-accent" : "text-brand-taupe"
          )}
        />
      </button>
    </motion.article>
  );
}
