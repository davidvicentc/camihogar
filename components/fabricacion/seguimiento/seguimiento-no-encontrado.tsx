/**
 * Lo que ve el cliente cuando el código del enlace no corresponde a ningún
 * mueble: una página amable con salida, nunca un error del servidor.
 *
 * No se dice si el código "existe pero no es tuyo" ni nada parecido: para
 * quien mira desde fuera, un código desconocido es simplemente desconocido.
 */

import Link from "next/link";
import { SiWhatsapp } from "@icons-pack/react-simple-icons";
import { PackageSearch } from "lucide-react";

import { LogoLockup } from "@/components/brand/logo";
import { BRAND } from "@/lib/constants";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export function SeguimientoNoEncontrado({ codigo }: { codigo: string }) {
  const mensaje = `¡Hola ${BRAND.name}! Estoy buscando el seguimiento de mi mueble y el código ${codigo} no me funciona.`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center gap-8 px-5 py-12 text-center">
      <LogoLockup className="w-40" priority />

      <div className="w-full rounded-4xl border border-brand-dark/5 bg-brand-card p-8 shadow-warm">
        <PackageSearch
          className="mx-auto h-14 w-14 text-brand-accent"
          aria-hidden="true"
        />
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tighter text-brand-dark">
          No encontramos ese mueble
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-brand-taupe">
          Puede que el código esté incompleto o que el enlace se haya cortado al
          copiarlo. Revísalo y vuelve a intentarlo; si sigue sin funcionar,
          escríbenos y lo buscamos nosotros.
        </p>

        {codigo.trim() !== "" && (
          <p className="mt-4 font-mono text-lg font-semibold tabular text-brand-dark">
            {codigo}
          </p>
        )}

        <a
          href={buildWhatsAppLink(mensaje)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex h-16 w-full items-center justify-center gap-3 rounded-3xl bg-[#25D366] text-lg font-bold text-white shadow-warm-sm transition-colors hover:bg-[#1fb958] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/40"
        >
          <SiWhatsapp className="h-7 w-7" aria-hidden="true" />
          Escríbenos por WhatsApp
        </a>

        <Link
          href="/"
          className="mt-4 inline-flex h-12 items-center justify-center text-base font-semibold text-brand-taupe underline-offset-4 hover:underline"
        >
          Ir a la tienda de {BRAND.name}
        </Link>
      </div>
    </main>
  );
}
