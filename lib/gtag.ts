"use client";

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-BPJBSHQ20M";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

/**
 * Registra una vista de página en Google Analytics 4 (SPA route change).
 */
export function pageview(url: string, title?: string): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", "page_view", {
    page_location: window.location.href,
    page_path: url,
    page_title: title || (typeof document !== "undefined" ? document.title : ""),
  });
}

/**
 * Envío genérico seguro de eventos a GA4.
 */
export function event(eventName: string, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", eventName, params);
}

/**
 * GA4 Standard Event: view_item (Ficha de producto vista)
 */
export function trackProductView(
  product: {
    id: string;
    title: string;
    category?: string;
    price?: number;
    brand?: string;
  },
  variantName?: string
): void {
  event("view_item", {
    currency: "USD",
    value: product.price ?? 0,
    items: [
      {
        item_id: product.id,
        item_name: product.title,
        item_category: product.category,
        item_brand: product.brand || "CamiHogar",
        item_variant: variantName,
        price: product.price ?? 0,
        quantity: 1,
      },
    ],
  });
}

/**
 * GA4 Standard & Conversion Event: generate_lead / whatsapp_click
 * (El canal principal de compra y cotización de CamiHogar es WhatsApp)
 */
export function trackWhatsAppLead(
  product?: {
    id?: string;
    title?: string;
    category?: string;
    price?: number;
    brand?: string;
  } | null,
  context?: {
    placement?: string; // "catalog_card" | "product_detail" | "customizer_cta" | "customizer_mobile_summary" | "favorites_page" | "navbar" | "footer"
    variant?: string;
    color?: string;
    total?: number;
    count?: number;
  }
): void {
  const value = context?.total ?? product?.price ?? 0;
  const items = product?.id
    ? [
        {
          item_id: product.id,
          item_name: product.title,
          item_category: product.category,
          item_brand: product.brand || "CamiHogar",
          item_variant: context?.variant,
          price: product.price ?? 0,
          quantity: 1,
        },
      ]
    : undefined;

  // Evento estándar de conversión de Google Analytics para leads / consultas de compra
  event("generate_lead", {
    currency: "USD",
    value,
    lead_source: "WhatsApp",
    placement: context?.placement ?? "unknown",
    items,
  });

  // Evento específico para análisis granular de WhatsApp en el panel de CamiHogar
  event("whatsapp_click", {
    placement: context?.placement ?? "unknown",
    product_id: product?.id,
    product_name: product?.title,
    category: product?.category,
    variant: context?.variant,
    color: context?.color,
    value,
    item_count: context?.count,
  });
}

/**
 * GA4 Standard Event: search (Búsqueda en catálogo)
 */
export function trackSearch(searchTerm: string, resultsCount?: number): void {
  if (!searchTerm.trim()) return;
  event("search", {
    search_term: searchTerm.trim(),
    results_count: resultsCount,
  });
}

/**
 * GA4 Standard Event: view_item_list (Ver categoría o vitrina del catálogo)
 */
export function trackViewItemList(listName: string, categoryId?: string): void {
  event("view_item_list", {
    item_list_name: listName,
    item_list_id: categoryId,
  });
}

/**
 * GA4 Standard Event: add_to_wishlist / remove_from_wishlist (Favoritos)
 */
export function trackWishlistToggle(
  action: "add" | "remove",
  product: {
    id: string;
    title: string;
    category?: string;
    price?: number;
  }
): void {
  const eventName = action === "add" ? "add_to_wishlist" : "remove_from_wishlist";
  event(eventName, {
    currency: "USD",
    value: product.price ?? 0,
    items: [
      {
        item_id: product.id,
        item_name: product.title,
        item_category: product.category,
        price: product.price ?? 0,
        quantity: 1,
      },
    ],
  });
}

/**
 * GA4 Event: Personalizador de muebles
 */
export function trackCustomizerAction(
  action: "open" | "select_option" | "request_quote",
  product: { id: string; title: string; price?: number },
  details?: Record<string, unknown>
): void {
  event("customizer_action", {
    action,
    product_id: product.id,
    product_name: product.title,
    ...details,
  });
}

/**
 * GA4 Event: Seguimiento de pedido
 */
export function trackOrderLookup(orderCode: string): void {
  event("track_order", {
    order_code: orderCode,
  });
}
