"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/track";

interface ViewTrackerProps {
  productId: string;
  title?: string;
  category?: string;
  price?: number;
  brand?: string;
}

/**
 * Registra una vista del producto al montar la ficha (una sola vez por visita):
 * Envía el evento estándar view_item a Google Analytics 4 y actualiza el contador en la BD.
 */
export function ViewTracker({
  productId,
  title,
  category,
  price,
  brand,
}: ViewTrackerProps) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    trackEvent(productId, "VIEW", {
      title,
      category,
      price,
      brand,
    });
  }, [productId, title, category, price, brand]);

  return null;
}
