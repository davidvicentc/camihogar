"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { CustomizerPreview } from "@/components/customizer/customizer-preview";
import { SwatchPicker } from "@/components/customizer/swatch-picker";
import { ConfigPicker } from "@/components/customizer/config-picker";
import { PriceBreakdown } from "@/components/customizer/price-breakdown";
import { CustomWhatsAppCta } from "@/components/customizer/custom-whatsapp-cta";
import { useCustomizerStore } from "@/store/customizer-store";
import { customOrderLink } from "@/lib/whatsapp";
import { trackEvent } from "@/lib/track";
import { formatPrice } from "@/lib/utils";
import type { ProductDTO } from "@/lib/types";

const spring = { type: "spring", stiffness: 300, damping: 24 } as const;

/**
 * Barra móvil pegajosa (queda por encima de la Bottom App Bar) con el total
 * en vivo y un acceso rápido a WhatsApp, para pedir sin volver a subir.
 */
function MobileSummaryBar() {
  const product = useCustomizerStore((s) => s.product);
  const selectedFabric = useCustomizerStore((s) => s.selectedFabric);
  const selectedFinish = useCustomizerStore((s) => s.selectedFinish);
  const selectedConfiguration = useCustomizerStore((s) => s.selectedConfiguration);
  const priceBreakdown = useCustomizerStore((s) => s.priceBreakdown);

  if (!product) return null;

  const { total } = priceBreakdown();
  const href = customOrderLink({
    productTitle: product.title,
    slug: product.slug,
    fabricName: selectedFabric?.name,
    finishName: selectedFinish?.name,
    configurationLabel: selectedConfiguration?.label,
    totalPrice: total,
  });

  return (
    <div className="pointer-events-none sticky bottom-20 z-30 mt-6 lg:hidden">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="pointer-events-auto flex items-center justify-between gap-3 rounded-2xl bg-brand-dark px-4 py-3 shadow-warm"
      >
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-brand-bg/60">
            Total estimado
          </p>
          <motion.p
            key={total}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="font-display text-xl font-semibold tracking-tighter text-brand-bg"
          >
            {formatPrice(total)}
          </motion.p>
        </div>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Pedir este mueble personalizado por WhatsApp"
          onClick={() => trackEvent(product._id, "WHATSAPP_CLICK")}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white shadow-warm-sm transition-transform hover:bg-[#1fb958] active:scale-95"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          Pedir
        </a>
      </motion.div>
    </div>
  );
}

export function Customizer({ product }: { product: ProductDTO }) {
  const init = useCustomizerStore((s) => s.init);
  const trackedRef = useRef(false);

  useEffect(() => {
    init(product);
    if (!trackedRef.current) {
      trackedRef.current = true;
      trackEvent(product._id, "CUSTOMIZER_OPEN");
    }
  }, [product, init]);

  const { fabrics, finishes, configurations } = product.customizationOptions;

  const sections: { key: string; title: string; content: ReactNode }[] = [];
  if (fabrics.length > 0) {
    sections.push({
      key: "fabrics",
      title: "Elige tu tapizado",
      content: <SwatchPicker kind="fabrics" />,
    });
  }
  if (finishes.length > 0) {
    sections.push({
      key: "finishes",
      title: "Acabado de madera",
      content: <SwatchPicker kind="finishes" />,
    });
  }
  if (configurations.length > 0) {
    sections.push({
      key: "configurations",
      title: "Configuración",
      content: <ConfigPicker />,
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
      {/* Encabezado */}
      <div className="mb-6 space-y-3 md:mb-8">
        <Link
          href={`/producto/${product.slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-taupe transition-colors hover:text-brand-dark"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver al producto
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-accent">
            Personalizador CamiHogar
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tighter text-brand-dark md:text-4xl">
            {product.title}
          </h1>
          <p className="mt-1.5 text-sm text-brand-taupe md:text-base">
            Elige cada detalle y mira tu mueble cobrar vida en tiempo real.
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        {/* Vista previa: pegajosa arriba en móvil, en su columna en desktop */}
        <div className="sticky top-16 z-0 self-start lg:top-24">
          <CustomizerPreview />
        </div>

        {/* Panel de controles */}
        <div className="relative z-10 rounded-t-3xl bg-brand-bg lg:sticky lg:top-24 lg:self-start lg:rounded-none lg:bg-transparent">
          <div className="space-y-8 pt-2 lg:pt-0">
            {sections.map((section, index) => (
              <section key={section.key} className="space-y-4">
                <h2 className="flex items-center gap-2.5 font-display text-lg font-semibold text-brand-dark">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-accent/10 text-sm font-bold text-brand-accent">
                    {index + 1}
                  </span>
                  {section.title}
                </h2>
                {section.content}
              </section>
            ))}

            <PriceBreakdown />
            <CustomWhatsAppCta />
          </div>
        </div>
      </div>

      <MobileSummaryBar />
    </div>
  );
}
