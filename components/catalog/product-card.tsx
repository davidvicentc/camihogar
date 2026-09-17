"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, Star } from "lucide-react";
import { SiWhatsapp } from "@icons-pack/react-simple-icons";
import { useState } from "react";
import type { CSSProperties } from "react";
import { Badge } from "@/components/ui/badge";
import { LogoMark } from "@/components/brand/logo";
import { useFavoritesStore } from "@/store/favorites-store";
import { cn, formatPrice } from "@/lib/utils";
import { productInquiryLink } from "@/lib/whatsapp";
import { trackEvent } from "@/lib/track";
import type { ProductDTO } from "@/lib/types";
import { useWhatsAppNumber } from "@/components/layout/whatsapp-settings-provider";
import { cardProfileForCategory, DEFAULT_CARD_STYLE, type CardProfileKey, type CardStyle } from "@/lib/card-style";

interface ProductCardProps {
  product: ProductDTO;
  /** Prioriza la carga de la imagen (para las primeras tarjetas above-the-fold). */
  priority?: boolean;
  className?: string;
  cardStyle?: { showBrand?: boolean; showCategory?: boolean; showDescription?: boolean; showRating?: boolean; showVariants?: boolean; showWhatsapp?: boolean; scale?: "compact" | "standard" | "large"; accentColor?: string; imageRatio?: "portrait" | "square" | "landscape"; titleSize?: "small" | "medium" | "large"; priceSize?: "small" | "medium" | "large"; cardBackground?: string; textColor?: string; mutedColor?: string; borderColor?: string; radius?: "small" | "medium" | "large"; imageHeight?: number; cardPadding?: number; titleFontSize?: number; priceFontSize?: number; bodyFontSize?: number; variantsHeight?: number; variantsFontSize?: number; variantsGap?: number; buttonHeight?: number };
  cardStyles?: Partial<Record<CardProfileKey, CardStyle>>;
}

export function ProductCard({ product, priority = false, className, cardStyle, cardStyles }: ProductCardProps) {
  const categoryStyle = cardStyles?.[cardProfileForCategory(product.category)];
  const style = { ...DEFAULT_CARD_STYLE, ...categoryStyle, ...cardStyle };
  const isFavorite = useFavoritesStore((s) => s.isFavorite(product._id));
  const toggleFavorite = useFavoritesStore((s) => s.toggle);
  const whatsappNumber = useWhatsAppNumber();

  const [selectedVariantIndex, setSelectedVariantIndex] = useState(() => {
    const index = product.variants?.findIndex((variant) => variant.isDefault) ?? -1;
    return index >= 0 ? index : 0;
  });

  const activeVariant = product.variants?.[selectedVariantIndex];

  const visiblePrice =
    activeVariant?.price ?? product.basePrice;

  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      style={{ "--card-accent": style.accentColor, backgroundColor: style.cardBackground, color: style.textColor, borderColor: style.borderColor } as CSSProperties}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden border shadow-warm-sm transition-all duration-300 hover:shadow-warm",
        style.radius === "small" ? "rounded-lg" : style.radius === "medium" ? "rounded-2xl" : "rounded-[1.5rem]",
        className
      )}
    >
      <Link
        href={`/producto/${product.slug}`}
        className="block flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="warm-glow relative overflow-hidden bg-brand-sand" style={{ height: style.imageHeight }}>
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
            {product.variants && product.variants.length > 1 && (
              <Badge variant="glass">{product.variants.length} opciones</Badge>
            )}
          </div>
        </div>

        <div className="space-y-1.5" style={{ padding: style.cardPadding }}>
          {style.showBrand && <p style={{ color: "var(--card-accent)", fontSize: style.brandFontSize }} className="truncate font-bold leading-tight tracking-tight">
            {product.brand || style.brandText || "CamiHogar"}
          </p>}
          {style.showCategory && <p className="truncate font-semibold uppercase tracking-[0.16em]" style={{ color: style.mutedColor, fontSize: style.categoryFontSize }}>
            {product.category}
          </p>}
          <h3 className="line-clamp-2 font-display font-semibold leading-snug tracking-tight" style={{ color: style.textColor, fontSize: style.titleFontSize }}>
            {product.title}
          </h3>
          {style.showDescription && <p className="line-clamp-2 min-h-8 leading-relaxed" style={{ color: style.mutedColor, fontSize: style.bodyFontSize }}>
            {product.description || "Producto disponible para consultar por WhatsApp."}
          </p>}
          <div className="flex items-center justify-between pt-1.5">
            <div className="flex min-w-0 flex-col">
              <p className="tabular font-semibold tracking-tight" style={{ color: style.textColor, fontSize: style.priceFontSize }}>
                {formatPrice(visiblePrice)}
              </p>
              {(product.mattressFeatures ?? activeVariant?.mattressFeatures) && <span className="max-w-[150px] truncate text-[0.65rem] text-brand-taupe">{(product.mattressFeatures ?? activeVariant?.mattressFeatures)!.model} · {(product.mattressFeatures ?? activeVariant?.mattressFeatures)!.pillow}</span>}
              {product.variants && product.variants.length > 1 && (
                <span className="text-[0.6rem] uppercase tracking-[0.12em] text-brand-taupe">
                  desde
                </span>
              )}
            </div>
            {style.showRating && <span className="flex items-center gap-1 tracking-tight" style={{ color: style.mutedColor, fontSize: style.ratingFontSize }}>
              <Star className="h-3.5 w-3.5 fill-brand-accent text-brand-accent" />
              <span className="tabular">{product.rating.toFixed(1)}</span>
              {product.reviewsCount > 0 && (
                <span className="tabular">({product.reviewsCount})</span>
              )}
            </span>}
          </div>
        </div>
      </Link>

      {style.showVariants && <div className="shrink-0 space-y-2 overflow-hidden px-4 pb-3 pt-1" style={{ height: style.variantsHeight }}>
        {product.variants && product.variants.length > 1 ? (
          <>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-brand-taupe">
            Elige tu opción
          </p>
          <div
            className="scrollbar-hide flex overflow-x-auto overscroll-x-contain pb-1"
            style={{ gap: style.variantsGap, fontSize: style.variantsFontSize }}
            aria-label={`Variantes de ${product.title}`}
          >
            {product.variants.map((variant, index) => (
              <button
                key={`${variant.name}-${index}`}
                type="button"
                onClick={() => setSelectedVariantIndex(index)}
                aria-pressed={selectedVariantIndex === index}
                className={cn(
                  "min-h-16 w-[132px] shrink-0 snap-start rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent",
                  selectedVariantIndex === index
                    ? "border-brand-accent bg-brand-accent/10 text-brand-dark"
                    : "border-brand-dark/10 bg-brand-bg text-brand-dark hover:border-brand-accent/50"
                )}
              >
                <span className="block truncate font-semibold" style={{ fontSize: style.variantsFontSize }}>{variant.name}</span>
                {!product.mattressFeatures && variant.mattressFeatures && <span className="block truncate text-brand-taupe" style={{ fontSize: Math.max(9, style.variantsFontSize - 2) }}>{variant.mattressFeatures.pillow}</span>}
                <span className="mt-0.5 block font-bold tabular-nums text-brand-accent" style={{ fontSize: style.variantsFontSize }}>
                  {formatPrice(variant.price)}
                </span>
              </button>
            ))}
          </div>
          </>
        ) : (
          <div className="flex h-[86px] items-center rounded-xl border border-dashed border-brand-dark/10 bg-brand-bg/60 px-3">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-brand-taupe">Precio único</p>
              <p className="mt-1 text-xs text-brand-taupe">Disponible para consultar</p>
            </div>
          </div>
        )}
      </div>}

      {style.showWhatsapp && <a
        href={productInquiryLink(product, activeVariant, whatsappNumber)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent(product._id, "WHATSAPP_CLICK")}
        className="mx-4 mb-4 flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-3 font-semibold text-white transition-colors hover:bg-[#1fb958]"
        style={{ height: style.buttonHeight, fontSize: style.buttonFontSize }}
      >
        <SiWhatsapp className="h-4 w-4" aria-hidden="true" />
        {style.buttonText || "Consultar por WhatsApp"}
      </a>}

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
