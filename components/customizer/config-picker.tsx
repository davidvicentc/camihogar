"use client";

import { motion } from "framer-motion";
import { useCustomizerStore } from "@/store/customizer-store";
import { cn, formatPrice } from "@/lib/utils";

const spring = { type: "spring", stiffness: 300, damping: 24 } as const;

export function ConfigPicker() {
  const product = useCustomizerStore((s) => s.product);
  const selectedConfiguration = useCustomizerStore((s) => s.selectedConfiguration);
  const setConfiguration = useCustomizerStore((s) => s.setConfiguration);

  const configurations = product?.customizationOptions.configurations ?? [];
  const base = product?.basePrice ?? 0;

  if (configurations.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {configurations.map((config) => {
        const isSelected = selectedConfiguration?.label === config.label;
        return (
          <motion.button
            key={config.label}
            type="button"
            aria-pressed={isSelected}
            onClick={() => setConfiguration(config)}
            whileTap={{ scale: 0.97 }}
            transition={spring}
            className={cn(
              "relative rounded-2xl border border-brand-dark/10 px-4 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2",
              !isSelected && "hover:bg-brand-dark/5"
            )}
          >
            {isSelected && (
              <motion.span
                layoutId="config-active-pill"
                transition={spring}
                className="absolute inset-0 rounded-2xl bg-brand-dark shadow-warm-sm"
                aria-hidden="true"
              />
            )}
            <span className="relative z-10 block">
              <span
                className={cn(
                  "block text-sm font-semibold transition-colors",
                  isSelected ? "text-brand-bg" : "text-brand-dark"
                )}
              >
                {config.label}
              </span>
              <span
                className={cn(
                  "block text-xs transition-colors",
                  isSelected ? "text-brand-bg/70" : "text-brand-taupe"
                )}
              >
                {formatPrice(Math.round(base * config.priceMultiplier))}
              </span>
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
