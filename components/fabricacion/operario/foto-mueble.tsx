import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * La foto de un mueble (o un hueco amable cuando no hay foto).
 *
 * Aquí se usa `<img>` a propósito y no `next/image`: las fotos vienen de la
 * copia congelada del producto y de lo que el operario sube desde el móvil, con
 * lo que su dominio no siempre está en `next.config.ts`. Un optimizador que
 * revienta por un dominio nuevo dejaría al carpintero sin ver el mueble, y eso
 * pesa más que unos kilobytes de más.
 */
interface FotoMuebleProps {
  src: string;
  alt: string;
  className?: string;
}

export function FotoMueble({ src, alt, className }: FotoMuebleProps) {
  const clases = cn(
    "flex items-center justify-center overflow-hidden rounded-2xl bg-brand-sand",
    className
  );

  if (!src || src.trim() === "") {
    return (
      <div className={clases} role="img" aria-label={`${alt} (sin foto todavía)`}>
        <Package className="h-1/2 w-1/2 text-brand-taupe/50" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className={clases}>
      {/* eslint-disable-next-line @next/next/no-img-element -- ver comentario de arriba */}
      <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
    </div>
  );
}
