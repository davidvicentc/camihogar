"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Armchair, Camera, Palette } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FurnitureRender } from "@/components/customizer/furniture-render";
import { useCustomizerStore } from "@/store/customizer-store";
import { cn } from "@/lib/utils";

const spring = { type: "spring", stiffness: 300, damping: 24 } as const;

type ViewMode = "render" | "photo";

export function CustomizerPreview() {
  const product = useCustomizerStore((s) => s.product);
  const fabric = useCustomizerStore((s) => s.selectedFabric);
  const finish = useCustomizerStore((s) => s.selectedFinish);
  const configuration = useCustomizerStore((s) => s.selectedConfiguration);
  const [view, setView] = useState<ViewMode>("render");

  if (!product) {
    return (
      <div className="space-y-4">
        <Skeleton className="aspect-[4/3] w-full rounded-3xl" />
        <Skeleton className="h-14 w-full rounded-2xl" />
      </div>
    );
  }

  const image = product.images[0];
  const showPhoto = view === "photo" && Boolean(image);

  return (
    <div className="space-y-4">
      {/* Escena del mueble */}
      <div className="warm-glow relative aspect-[4/3] overflow-hidden rounded-3xl bg-secondary shadow-warm">
        <AnimatePresence mode="wait" initial={false}>
          {showPhoto ? (
            <motion.div
              key="photo"
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {image ? (
                <Image
                  src={image}
                  alt={`Foto de ${product.title}`}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-brand-taupe/50">
                  <Armchair className="h-12 w-12" aria-hidden="true" />
                  <p className="text-sm">Sin imagen disponible</p>
                </div>
              )}
              {/* Tinte de la tela sobre la foto */}
              <AnimatePresence>
                {fabric && (
                  <motion.div
                    key={fabric.name}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                    style={{ backgroundColor: fabric.hex, mixBlendMode: "multiply" }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.45 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="render"
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Render vectorial en vivo: tela, acabado y silueta */}
              <FurnitureRender
                category={product.category}
                fabricHex={fabric?.hex}
                finishHex={finish?.hex}
                configurationLabel={configuration?.label}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle Render / Foto */}
        {image && (
          <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-white/90 p-1 shadow-warm-sm backdrop-blur">
            {(
              [
                { mode: "render" as const, label: "Diseño", icon: Palette },
                { mode: "photo" as const, label: "Foto", icon: Camera },
              ]
            ).map(({ mode, label, icon: Icon }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                aria-pressed={view === mode}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  view === mode ? "text-white" : "text-brand-taupe hover:text-brand-dark"
                )}
              >
                {view === mode && (
                  <motion.span
                    layoutId="preview-toggle-pill"
                    className="absolute inset-0 rounded-full bg-brand-dark"
                    transition={spring}
                  />
                )}
                <Icon className="relative z-10 h-3.5 w-3.5" aria-hidden="true" />
                <span className="relative z-10">{label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Chip flotante con la tela activa */}
        <div className="absolute left-4 top-4">
          <AnimatePresence mode="wait">
            {fabric && (
              <motion.div
                key={fabric.name}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={spring}
                className="flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 shadow-warm-sm backdrop-blur"
              >
                <span
                  aria-hidden="true"
                  className="h-3 w-3 rounded-full border border-brand-dark/10"
                  style={{ backgroundColor: fabric.hex }}
                />
                <span className="text-xs font-semibold text-brand-dark">{fabric.name}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Badge de la configuración activa */}
        <div className="absolute bottom-4 right-4">
          <AnimatePresence mode="wait">
            {configuration && (
              <motion.div
                key={configuration.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={spring}
              >
                <Badge className="shadow-warm-sm">{configuration.label}</Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Muestra del acabado activo */}
        <div className="absolute bottom-4 left-4">
          <AnimatePresence mode="wait">
            {finish && (
              <motion.div
                key={finish.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={spring}
                className="flex items-center gap-2 rounded-full bg-brand-dark/80 px-3 py-1.5 shadow-warm-sm backdrop-blur"
              >
                <span
                  aria-hidden="true"
                  className="h-3 w-3 rounded-full border border-white/30"
                  style={{ backgroundColor: finish.hex }}
                />
                <span className="text-xs font-semibold text-brand-bg">{finish.name}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Resumen de muestras activas */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-dark/5 bg-brand-card px-4 py-3 shadow-warm-sm">
        <div>
          <h2 className="font-display text-base font-semibold text-brand-dark">
            {product.title}
          </h2>
          <p className="text-xs text-brand-taupe">
            {view === "render"
              ? "Render en vivo de tu configuración"
              : "Así se ve en la vida real"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {fabric && (
            <span
              title={`Tela: ${fabric.name}`}
              className="h-6 w-6 rounded-full border-2 border-white shadow-warm-sm"
              style={{ backgroundColor: fabric.hex }}
            />
          )}
          {finish && (
            <span
              title={`Acabado: ${finish.name}`}
              className="h-6 w-6 rounded-full border-2 border-white shadow-warm-sm"
              style={{ backgroundColor: finish.hex }}
            />
          )}
          {configuration && (
            <span className="text-xs font-semibold text-brand-taupe">
              {configuration.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
