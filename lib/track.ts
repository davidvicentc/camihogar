"use client";

import type { AnalyticsEventType } from "@/lib/types";
import { event, trackProductView, trackWhatsAppLead } from "@/lib/gtag";

export interface TrackEventExtra {
  title?: string;
  category?: string;
  price?: number;
  brand?: string;
  variant?: string;
  placement?: string;
}

/**
 * Registro unificado de eventos de analítica:
 * 1. Envía el evento a Google Analytics 4 (conversión, vistas, clics).
 * 2. Guarda el registro en la base de datos interna (/api/analytics) para el panel de CamiHogar.
 * Usa sendBeacon cuando está disponible para no bloquear la navegación.
 */
export function trackEvent(
  productId: string,
  eventType: AnalyticsEventType,
  extra?: TrackEventExtra
): void {
  // 1. Google Analytics 4
  try {
    if (eventType === "VIEW") {
      trackProductView(
        {
          id: productId,
          title: extra?.title || "Producto",
          category: extra?.category,
          price: extra?.price,
          brand: extra?.brand,
        },
        extra?.variant
      );
    } else if (eventType === "WHATSAPP_CLICK") {
      trackWhatsAppLead(
        {
          id: productId,
          title: extra?.title,
          category: extra?.category,
          price: extra?.price,
          brand: extra?.brand,
        },
        {
          placement: extra?.placement || "product_card",
          variant: extra?.variant,
          total: extra?.price,
        }
      );
    } else if (eventType === "CUSTOMIZER_OPEN") {
      event("customizer_open", {
        product_id: productId,
        product_name: extra?.title,
        category: extra?.category,
      });
    }
  } catch {
    // La analítica nunca debe romper la experiencia del usuario.
  }

  // 2. Base de datos interna de CamiHogar
  try {
    const payload = JSON.stringify({ productId, eventType });
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/analytics",
        new Blob([payload], { type: "application/json" })
      );
      return;
    }
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    });
  } catch {
    // La analítica nunca debe romper la experiencia del usuario.
  }
}
