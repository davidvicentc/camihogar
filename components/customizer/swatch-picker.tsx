"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useCustomizerStore } from "@/store/customizer-store";
import { cn, formatPrice } from "@/lib/utils";
import type { FabricOption, FinishOption } from "@/lib/types";

const spring = { type: "spring", stiffness: 300, damping: 24 } as const;

/** Luminancia percibida: decide si el check se ve mejor oscuro o blanco. */
function isLightColor(hex: string): boolean {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return false;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

export function SwatchPicker({ kind }: { kind: "fabrics" | "finishes" }) {
  const product = useCustomizerStore((s) => s.product);
  const selectedFabric = useCustomizerStore((s) => s.selectedFabric);
  const selectedFinish = useCustomizerStore((s) => s.selectedFinish);
  const setFabric = useCustomizerStore((s) => s.setFabric);
  const setFinish = useCustomizerStore((s) => s.setFinish);

  const options: (FabricOption | FinishOption)[] =
    product?.customizationOptions[kind] ?? [];
  const selected = kind === "fabrics" ? selectedFabric : selectedFinish;

  if (options.length === 0) return null;

  const handleSelect = (option: FabricOption | FinishOption) => {
    if (kind === "fabrics") {
      setFabric(option);
    } else {
      setFinish(option);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {options.map((option) => {
          const isSelected = selected?.name === option.name;
          const lightSwatch = isLightColor(option.hex);
          return (
            <motion.button
              key={option.name}
              type="button"
              aria-label={`${kind === "fabrics" ? "Tela" : "Acabado"} ${option.name}${
                option.priceExtra > 0
                  ? `, ${formatPrice(option.priceExtra)} adicionales`
                  : ", incluido"
              }`}
              aria-pressed={isSelected}
              onClick={() => handleSelect(option)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              transition={spring}
              style={{ backgroundColor: option.hex }}
              className={cn(
                "grid h-12 w-12 place-items-center rounded-full border border-brand-dark/15 shadow-warm-sm ring-offset-brand-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2",
                isSelected && "ring-2 ring-brand-accent ring-offset-2"
              )}
            >
              {isSelected && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={spring}
                >
                  <Check
                    aria-hidden="true"
                    strokeWidth={3}
                    className={cn(
                      "h-5 w-5",
                      lightSwatch ? "text-brand-dark" : "text-white"
                    )}
                  />
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>

      {selected && (
        <p className="text-sm text-brand-taupe">
          <span className="font-semibold text-brand-dark">{selected.name}</span>{" "}
          {selected.priceExtra > 0 ? (
            <span className="font-semibold text-brand-accent">
              +{formatPrice(selected.priceExtra)}
            </span>
          ) : (
            <span>· Incluido</span>
          )}
        </p>
      )}
    </div>
  );
}
