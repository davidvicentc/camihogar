import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Nunca persiste una URL generada por el optimizador de Next como imagen original. */
export function normalizeImageUrl(value: string): string {
  const clean = value.trim();
  if (!clean) return "";
  try {
    const parsed = new URL(clean, "http://localhost");
    if (parsed.pathname === "/_next/image") {
      const original = parsed.searchParams.get("url");
      return original || "";
    }
  } catch {
    return clean;
  }
  return clean;
}

/**
 * Formatea precios en USD con "$" literal (convención del mercado venezolano
 * de muebles y de la plantilla de WhatsApp: "Precio: $1.200").
 */
export function formatPrice(amount: number): string {
  const formatted = new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `$${formatted}`;
}

export function slugify(text: string): string {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * URL pública del sitio, usada en metadatos, sitemap y los enlaces que se
 * envían al cliente por WhatsApp.
 *
 * Prioriza `SITE_URL` (dominio propio). Si no está configurada,
 * cae al dominio que Vercel expone en el build para no filtrar `localhost`
 * dentro de los mensajes de WhatsApp en producción.
 */
export function getSiteUrl(): string {
  const explicit = process.env.SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercelHost =
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercelHost) return `https://${vercelHost.replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}
