"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/track";

/**
 * Registra una vista del producto al montar la ficha (una sola vez por visita).
 * No renderiza nada: es un sensor invisible de receptividad.
 */
export function ViewTracker({ productId }: { productId: string }) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    trackEvent(productId, "VIEW");
  }, [productId]);

  return null;
}
