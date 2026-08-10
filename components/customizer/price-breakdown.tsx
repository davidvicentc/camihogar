"use client";

import { motion } from "framer-motion";
import { Separator } from "@/components/ui/separator";
import { useCustomizerStore } from "@/store/customizer-store";
import { formatPrice } from "@/lib/utils";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-brand-taupe">{label}</span>
      <span className="font-semibold text-brand-dark">{value}</span>
    </div>
  );
}

export function PriceBreakdown() {
  const product = useCustomizerStore((s) => s.product);
  const selectedFabric = useCustomizerStore((s) => s.selectedFabric);
  const selectedFinish = useCustomizerStore((s) => s.selectedFinish);
  const selectedConfiguration = useCustomizerStore((s) => s.selectedConfiguration);
  const priceBreakdown = useCustomizerStore((s) => s.priceBreakdown);

  if (!product) return null;

  const { base, configurationDelta, fabricExtra, finishExtra, total } =
    priceBreakdown();

  return (
    <div className="space-y-3 rounded-3xl border border-brand-dark/5 bg-brand-card p-5 shadow-warm-sm">
      <h3 className="font-display text-lg font-semibold text-brand-dark">
        Tu precio
      </h3>

      <div className="space-y-2">
        <Row label="Precio base" value={formatPrice(base)} />
        {configurationDelta !== 0 && selectedConfiguration && (
          <Row
            label={`Configuración · ${selectedConfiguration.label}`}
            value={`${configurationDelta > 0 ? "+" : "−"}${formatPrice(
              Math.abs(configurationDelta)
            )}`}
          />
        )}
        {fabricExtra !== 0 && selectedFabric && (
          <Row
            label={`Tela · ${selectedFabric.name}`}
            value={`+${formatPrice(fabricExtra)}`}
          />
        )}
        {finishExtra !== 0 && selectedFinish && (
          <Row
            label={`Acabado · ${selectedFinish.name}`}
            value={`+${formatPrice(finishExtra)}`}
          />
        )}
      </div>

      <Separator />

      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm font-semibold uppercase tracking-wide text-brand-taupe">
          Total estimado
        </span>
        <motion.span
          key={total}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="font-display text-3xl font-semibold tracking-tighter text-brand-dark"
        >
          {formatPrice(total)}
        </motion.span>
      </div>

      <p className="text-xs text-brand-taupe">
        Precio referencial en USD. Lo confirmamos contigo por WhatsApp.
      </p>
    </div>
  );
}
