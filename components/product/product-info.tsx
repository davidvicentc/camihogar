"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldCheck, Star, Truck, Wand2 } from "lucide-react";
import { SiWhatsapp } from "@icons-pack/react-simple-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BRAND } from "@/lib/constants";
import { productInquiryLink } from "@/lib/whatsapp";
import { trackEvent } from "@/lib/track";
import { cn, formatPrice } from "@/lib/utils";
import type { ProductDTO } from "@/lib/types";

const spring = { type: "spring", stiffness: 300, damping: 24 } as const;

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

/**
 * Columna de información de la ficha de producto: título, rating, precio,
 * vista previa de variaciones y CTAs de WhatsApp / personalizador.
 */
export function ProductInfo({ product }: { product: ProductDTO }) {
  const { fabrics, finishes, configurations } = product.customizationOptions;
  const isCustomizable =
    fabrics.length > 0 || finishes.length > 0 || configurations.length > 0;

  const [fabricIndex, setFabricIndex] = React.useState<number | null>(null);
  const [finishIndex, setFinishIndex] = React.useState<number | null>(null);
  const [configIndex, setConfigIndex] = React.useState<number | null>(null);

  const reviewsLabel =
    product.reviewsCount === 1
      ? "(1 reseña)"
      : `(${product.reviewsCount} reseñas)`;

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
          {formatPrice(product.basePrice)}
        </p>
        {isCustomizable && (
          <p className="text-sm text-brand-taupe">
            Precio base — personalízalo a tu gusto
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

      {/* Selección rápida (vista previa) */}
      {isCustomizable && (
        <motion.div variants={fadeUp} className="space-y-5">
          <Separator className="bg-brand-dark/5" />

          {fabrics.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-sm font-semibold text-brand-dark">
                Tapizado
                {fabricIndex !== null && (
                  <span className="ml-2 font-normal text-brand-taupe">
                    {fabrics[fabricIndex].name}
                  </span>
                )}
              </p>
              <div className="flex flex-wrap gap-2.5">
                {fabrics.map((fabric, index) => (
                  <motion.button
                    key={fabric.name}
                    type="button"
                    title={fabric.name}
                    aria-label={`Tapizado ${fabric.name}`}
                    aria-pressed={fabricIndex === index}
                    whileHover={{ scale: 1.12 }}
                    whileTap={{ scale: 0.9 }}
                    transition={spring}
                    onClick={() =>
                      setFabricIndex(fabricIndex === index ? null : index)
                    }
                    style={{ backgroundColor: fabric.hex }}
                    className={cn(
                      "h-9 w-9 rounded-full border border-brand-dark/10 shadow-warm-sm transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      fabricIndex === index &&
                        "ring-2 ring-brand-accent ring-offset-2 ring-offset-brand-bg"
                    )}
                  />
                ))}
              </div>
            </div>
          )}

          {finishes.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-sm font-semibold text-brand-dark">
                Acabado
                {finishIndex !== null && (
                  <span className="ml-2 font-normal text-brand-taupe">
                    {finishes[finishIndex].name}
                  </span>
                )}
              </p>
              <div className="flex flex-wrap gap-2.5">
                {finishes.map((finish, index) => (
                  <motion.button
                    key={finish.name}
                    type="button"
                    title={finish.name}
                    aria-label={`Acabado ${finish.name}`}
                    aria-pressed={finishIndex === index}
                    whileHover={{ scale: 1.12 }}
                    whileTap={{ scale: 0.9 }}
                    transition={spring}
                    onClick={() =>
                      setFinishIndex(finishIndex === index ? null : index)
                    }
                    style={{ backgroundColor: finish.hex }}
                    className={cn(
                      "h-9 w-9 rounded-full border border-brand-dark/10 shadow-warm-sm transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      finishIndex === index &&
                        "ring-2 ring-brand-accent ring-offset-2 ring-offset-brand-bg"
                    )}
                  />
                ))}
              </div>
            </div>
          )}

          {configurations.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-sm font-semibold text-brand-dark">Configuración</p>
              <div className="flex flex-wrap gap-2">
                {configurations.map((config, index) => (
                  <motion.button
                    key={config.label}
                    type="button"
                    aria-pressed={configIndex === index}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    transition={spring}
                    onClick={() =>
                      setConfigIndex(configIndex === index ? null : index)
                    }
                    className={cn(
                      "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      configIndex === index
                        ? "border-transparent bg-brand-accent text-white shadow-warm-sm"
                        : "border-brand-dark/15 bg-brand-card text-brand-dark hover:border-brand-accent/50"
                    )}
                  >
                    {config.label}
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* CTAs */}
      <motion.div variants={fadeUp} className="space-y-3 pt-1">
        <Button asChild variant="whatsapp" size="lg" className="w-full">
          <a
            href={productInquiryLink(product)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent(product._id, "WHATSAPP_CLICK")}
          >
            <SiWhatsapp aria-hidden="true" />
            Consultar / Comprar por WhatsApp
          </a>
        </Button>

        {isCustomizable && (
          <Button asChild variant="accent" size="lg" className="w-full">
            <Link href={`/personalizar/${product.slug}`}>
              <Wand2 aria-hidden="true" />
              Personalizar este mueble
            </Link>
          </Button>
        )}
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
