"use client";

import { create } from "zustand";
import type {
  ConfigurationOption,
  FabricOption,
  FinishOption,
  ProductDTO,
} from "@/lib/types";

interface CustomizerState {
  product: ProductDTO | null;
  selectedFabric: FabricOption | null;
  selectedFinish: FinishOption | null;
  selectedConfiguration: ConfigurationOption | null;
  activeImageIndex: number;

  /** Inicializa el personalizador con el producto y preselecciona la primera opción. */
  init: (product: ProductDTO) => void;
  setFabric: (fabric: FabricOption) => void;
  setFinish: (finish: FinishOption) => void;
  setConfiguration: (configuration: ConfigurationOption) => void;
  setActiveImageIndex: (index: number) => void;
  reset: () => void;

  /** Precio total = (base × multiplicador de configuración) + extras de tela y acabado. */
  totalPrice: () => number;
  priceBreakdown: () => {
    base: number;
    configurationDelta: number;
    fabricExtra: number;
    finishExtra: number;
    total: number;
  };
}

export const useCustomizerStore = create<CustomizerState>((set, get) => ({
  product: null,
  selectedFabric: null,
  selectedFinish: null,
  selectedConfiguration: null,
  activeImageIndex: 0,

  init: (product) => {
    const { fabrics, finishes, configurations } = product.customizationOptions;
    set({
      product,
      selectedFabric: fabrics[0] ?? null,
      selectedFinish: finishes[0] ?? null,
      selectedConfiguration:
        configurations.find((c) => c.priceMultiplier === 1) ?? configurations[0] ?? null,
      activeImageIndex: 0,
    });
  },

  setFabric: (fabric) => set({ selectedFabric: fabric }),
  setFinish: (finish) => set({ selectedFinish: finish }),
  setConfiguration: (configuration) => set({ selectedConfiguration: configuration }),
  setActiveImageIndex: (index) => set({ activeImageIndex: index }),

  reset: () =>
    set({
      product: null,
      selectedFabric: null,
      selectedFinish: null,
      selectedConfiguration: null,
      activeImageIndex: 0,
    }),

  totalPrice: () => get().priceBreakdown().total,

  priceBreakdown: () => {
    const { product, selectedFabric, selectedFinish, selectedConfiguration } = get();
    const base = product?.basePrice ?? 0;
    const multiplier = selectedConfiguration?.priceMultiplier ?? 1;
    const configurationDelta = Math.round(base * multiplier - base);
    const fabricExtra = selectedFabric?.priceExtra ?? 0;
    const finishExtra = selectedFinish?.priceExtra ?? 0;
    const total = Math.round(base * multiplier + fabricExtra + finishExtra);
    return { base, configurationDelta, fabricExtra, finishExtra, total };
  },
}));
