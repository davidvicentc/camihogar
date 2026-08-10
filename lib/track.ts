"use client";

import type { AnalyticsEventType } from "@/lib/types";

/**
 * Registro de eventos de receptividad (fire-and-forget desde el cliente).
 * Usa sendBeacon cuando está disponible para no bloquear la navegación
 * (crítico en los clics hacia WhatsApp, que abren otra app).
 */
export function trackEvent(productId: string, eventType: AnalyticsEventType): void {
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
