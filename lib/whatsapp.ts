import { formatPrice, getSiteUrl } from "@/lib/utils";
import type { ProductDTO } from "@/lib/types";

function getWhatsAppNumber(): string {
  return process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "584120000000";
}

export function buildWhatsAppLink(message: string): string {
  return `https://wa.me/${getWhatsAppNumber()}?text=${encodeURIComponent(message)}`;
}

/** CTA principal de la ficha de producto (PDP). */
export function productInquiryLink(product: ProductDTO): string {
  const url = `${getSiteUrl()}/producto/${product.slug}`;
  const message = `¡Hola CamiHogar! Estoy interesado en el mueble *${product.title}* (Precio: ${formatPrice(
    product.basePrice
  )}). Ver producto: ${url}`;
  return buildWhatsAppLink(message);
}

export interface CustomizationSummary {
  productTitle: string;
  slug: string;
  fabricName?: string;
  finishName?: string;
  configurationLabel?: string;
  totalPrice: number;
}

/** CTA del personalizador con el desglose de la configuración elegida. */
export function customOrderLink(summary: CustomizationSummary): string {
  const url = `${getSiteUrl()}/personalizar/${summary.slug}`;
  const lines = [
    "¡Hola CamiHogar! Personalicé un mueble en su web:",
    `- Mueble: ${summary.productTitle}`,
    `- Tela/Tapizado: ${summary.fabricName ?? "Sin preferencia"}`,
    `- Acabado: ${summary.finishName ?? "Sin preferencia"}`,
    `- Configuración: ${summary.configurationLabel ?? "Estándar"}`,
    `- Precio Estimado: ${formatPrice(summary.totalPrice)}`,
    `Link de mi diseño: ${url}`,
  ];
  return buildWhatsAppLink(lines.join("\n"));
}
