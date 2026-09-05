import { formatPrice, getSiteUrl } from "@/lib/utils";
import type { ProductDTO, ProductVariant } from "@/lib/types";

function getWhatsAppNumber(): string {
  return process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "584120000000";
}

export function buildWhatsAppLink(message: string): string {
  return `https://wa.me/${getWhatsAppNumber()}?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppLinkForNumber(message: string, number: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/** CTA principal del catálogo, con la variante y precio que eligió el cliente. */
export function productInquiryLink(
  product: ProductDTO,
  variant?: ProductVariant,
  whatsappNumber?: string | null
): string {
  const url = `${getSiteUrl()}/producto/${product.slug}`;
  const price = variant?.price ?? product.basePrice;
  const variantLine = variant ? `\n- Variante: ${variant.name}` : "";
  const message = `¡Hola CamiHogar! Estoy interesado en *${product.title}*.${variantLine}\n- Precio: ${formatPrice(
    price
  )}\nVer producto: ${url}`;
  return whatsappNumber ? buildWhatsAppLinkForNumber(message, whatsappNumber) : buildWhatsAppLink(message);
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
