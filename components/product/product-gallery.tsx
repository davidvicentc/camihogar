"use client";

import * as React from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductGalleryProps {
  images: string[];
  title: string;
}

/**
 * Galería interactiva de la ficha de producto:
 * - Crossfade suave entre imágenes (AnimatePresence mode="wait").
 * - Zoom tipo lupa en desktop (sigue el cursor) y toque para acercar en móvil.
 * - Tira de miniaturas y flechas de navegación.
 */
export function ProductGallery({ images, title }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [zoomed, setZoomed] = React.useState(false);
  const [origin, setOrigin] = React.useState({ x: 50, y: 50 });
  const lastPointerType = React.useRef<string>("mouse");

  const total = images.length;
  const hasImages = total > 0;

  const goTo = (index: number) => {
    setZoomed(false);
    setActiveIndex((index + total) % total);
  };

  const updateOrigin = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin({
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y)),
    });
  };

  if (!hasImages) {
    return (
      <div className="warm-glow flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-3xl border border-brand-dark/5 bg-secondary text-brand-taupe/60">
        <ImageOff className="h-10 w-10" aria-hidden="true" />
        <p className="text-sm font-medium">Pronto tendremos fotos de este mueble</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Imagen principal */}
      <div
        className={cn(
          "warm-glow group relative aspect-[4/3] w-full touch-manipulation select-none overflow-hidden rounded-3xl border border-brand-dark/5 bg-secondary shadow-warm-sm",
          zoomed ? "cursor-zoom-out" : "cursor-zoom-in"
        )}
        onPointerDown={(e) => {
          lastPointerType.current = e.pointerType;
        }}
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") {
            updateOrigin(e);
            setZoomed(true);
          }
        }}
        onPointerMove={updateOrigin}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") setZoomed(false);
        }}
        onClick={() => {
          // En móvil el toque alterna el zoom; en desktop lo maneja el hover.
          if (lastPointerType.current === "touch") setZoomed((z) => !z);
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <div
              className="relative h-full w-full transition-transform duration-300 ease-out"
              style={{
                transformOrigin: `${origin.x}% ${origin.y}%`,
                transform: zoomed ? "scale(1.8)" : "scale(1)",
              }}
            >
              <Image
                src={images[activeIndex]}
                alt={`${title} — imagen ${activeIndex + 1} de ${total}`}
                fill
                priority={activeIndex === 0}
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Flechas de navegación */}
        {total > 1 && (
          <>
            <motion.button
              type="button"
              aria-label="Imagen anterior"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              onClick={(e) => {
                e.stopPropagation();
                goTo(activeIndex - 1);
              }}
              className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 text-brand-dark shadow-warm-sm backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </motion.button>
            <motion.button
              type="button"
              aria-label="Imagen siguiente"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              onClick={(e) => {
                e.stopPropagation();
                goTo(activeIndex + 1);
              }}
              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 text-brand-dark shadow-warm-sm backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </motion.button>

            <span className="absolute bottom-3 right-3 z-10 rounded-full bg-brand-dark/70 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
              {activeIndex + 1} / {total}
            </span>
          </>
        )}
      </div>

      {/* Tira de miniaturas */}
      {total > 1 && (
        <div className="scrollbar-hide flex gap-2.5 overflow-x-auto pb-1">
          {images.map((src, index) => (
            <motion.button
              key={`${src}-${index}`}
              type="button"
              aria-label={`Ver imagen ${index + 1} de ${title}`}
              aria-current={index === activeIndex}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              onClick={() => goTo(index)}
              className={cn(
                "relative aspect-square w-16 shrink-0 overflow-hidden rounded-xl border bg-secondary transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-20",
                index === activeIndex
                  ? "border-transparent ring-2 ring-brand-accent ring-offset-2 ring-offset-brand-bg"
                  : "border-brand-dark/10 opacity-70 hover:opacity-100"
              )}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
              />
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
