"use client";

import { useEffect, useRef } from "react";
import { trackOrderLookup } from "@/lib/gtag";

export function SeguimientoTracker({ codigo }: { codigo: string }) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    trackOrderLookup(codigo);
  }, [codigo]);

  return null;
}
