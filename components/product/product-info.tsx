"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Star, Truck } from "lucide-react";
import { SiWhatsapp } from "@icons-pack/react-simple-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/constants";
import { productInquiryLink } from "@/lib/whatsapp";
import { trackEvent } from "@/lib/track";
import { cn, formatPrice } from "@/lib/utils";
import type { ProductDTO } from "@/lib/types";
import { useWhatsAppNumber } from "@/components/layout/whatsapp-settings-provider";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

/**
 * Columna de información de la ficha de producto: título, rating, precio,
 * vista previa de variaciones y CTAs de WhatsApp / personalizador.
 */
export function ProductInfo({ product }: { product: ProductDTO }) {
  const whatsappNumber = useWhatsAppNumber();
  const initialVariantIndex =
    product.variants && product.variants.length > 0
      ? product.variants.findIndex((variant) => variant.isDefault) >= 0
        ? product.variants.findIndex((variant) => variant.isDefault)
        : 0
      : -1;

  const [selectedVariantIndex, setSelectedVariantIndex] = React.useState<number>(
    initialVariantIndex >= 0 ? initialVariantIndex : 0
  );

  const reviewsLabel =
    product.reviewsCount === 1
      ? "(1 reseña)"
      : `(${product.reviewsCount} reseñas)`;

  const activeVariantPrice =
    product.variants && product.variants.length > 0
      ? product.variants[selectedVariantIndex]?.price ??
        product.variants[0]?.price ??
        product.basePrice
      : product.basePrice;

  const activeVariant =
    product.variants && product.variants.length > 0
      ? product.variants[selectedVariantIndex] ?? product.variants[0]
      : null;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
      className="flex flex-col gap-5"
    >
      {/* Badges */}
      <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-2">
        <Badge variant="soft">{product.category}</Badge>
        {product.isFeatured && <Badge variant="accent">Destacado</Badge>}
        {!product.inStock && <Badge variant="muted">Agotado</Badge>}
      </motion.div>

      {/* Título */}
      <motion.h1
        variants={fadeUp}
        className="text-balance font-display text-3xl font-semibold leading-tight text-brand-dark lg:text-4xl"
      >
        {product.title}
      </motion.h1>

      {product.variants && product.variants.length > 0 && (
        <motion.div variants={fadeUp} className="space-y-3">
          <div>
            <p className="text-base font-semibold text-brand-dark">Elige una variante</p>
            <p className="text-sm text-brand-taupe">Cada opción tiene su propio precio.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {product.variants.map((variant, index) => (
              <button
                key={`${variant.name}-${index}`}
                type="button"
                onClick={() => setSelectedVariantIndex(index)}
                className={cn(
                  "min-h-[76px] rounded-2xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent",
                  selectedVariantIndex === index
                    ? "border-brand-accent bg-brand-accent/10 text-brand-dark shadow-warm-sm"
                    : "border-brand-dark/15 bg-brand-card text-brand-dark hover:border-brand-accent/50"
                )}
              >
                <span className="block text-sm font-semibold">{variant.name}</span>
                <span className="mt-1 block text-lg font-bold tabular-nums text-brand-accent">
                  {formatPrice(variant.price)}
                </span>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Rating */}
      <motion.div
        variants={fadeUp}
        className="flex items-center gap-2"
        aria-label={`Calificación: ${product.rating.toFixed(1)} de 5 estrellas`}
      >
        <span className="flex items-center gap-0.5" aria-hidden="true">
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              className={cn(
                "h-4 w-4",
                i < Math.round(product.rating)
                  ? "fill-brand-accent text-brand-accent"
                  : "fill-brand-taupe/20 text-brand-taupe/20"
              )}
            />
          ))}
        </span>
        <span className="text-sm font-semibold text-brand-dark">
          {product.rating.toFixed(1)}
        </span>
        <span className="text-sm text-brand-taupe">{reviewsLabel}</span>
      </motion.div>

      {/* Precio */}
      <motion.div variants={fadeUp} className="space-y-1">
        <p className="text-3xl font-bold text-brand-dark lg:text-4xl">
          {formatPrice(activeVariantPrice)}
        </p>
        {activeVariant && (
          <p className="text-sm text-brand-taupe">
            {activeVariant.name} · {activeVariant.sku || "SKU sin definir"}
          </p>
        )}
        {!activeVariant && (
          <p className="text-sm text-brand-taupe">
            Precio del producto
          </p>
        )}
      </motion.div>

      {/* Descripción */}
      {product.description && (
        <motion.p
          variants={fadeUp}
          className="leading-relaxed text-brand-taupe"
        >
          {product.description}
        </motion.p>
      )}

      {/* CTAs */}
      <motion.div variants={fadeUp} className="space-y-3 pt-1">
        <Button asChild variant="whatsapp" size="lg" className="w-full">
          <a
            href={productInquiryLink(product, activeVariant ?? undefined, whatsappNumber)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent(product._id, "WHATSAPP_CLICK")}
          >
            <SiWhatsapp aria-hidden="true" />
            Consultar / Comprar por WhatsApp
          </a>
        </Button>

      </motion.div>

      {/* Fila de confianza */}
      <motion.div
        variants={fadeUp}
        className="flex flex-col gap-2 rounded-2xl bg-secondary/60 p-4 text-sm text-brand-taupe sm:flex-row sm:items-center sm:justify-center sm:gap-6"
      >
        <span className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-brand-accent" aria-hidden="true" />
          {BRAND.warranty}
        </span>
        <span className="flex items-center gap-2">
          <Truck className="h-4 w-4 shrink-0 text-brand-accent" aria-hidden="true" />
          {BRAND.delivery}
        </span>
      </motion.div>
    </motion.div>
  );
}
