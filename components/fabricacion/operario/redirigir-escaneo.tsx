"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, Loader2 } from "lucide-react";

import { registrarEscaneo } from "@/lib/actions/fabricacion";

/**
 * Lo que se ve un segundo después de leer el QR con la cámara.
 *
 * Anota que este mueble pasó por las manos de quien escaneó (si tiene permiso
 * para escanear) y lleva a su ficha. El registro se hace desde aquí y no en el
 * servidor al pintar la página: apuntar algo mientras se dibuja una pantalla
 * deja la aplicación en un estado raro, y además así el operario ve una
 * confirmación en vez de un salto seco.
 *
 * Si el apunte falla (sin cobertura, sin permiso) igualmente se abre la ficha:
 * lo importante es que el operario vea su mueble.
 */
interface RedirigirEscaneoProps {
  codigo: string;
  puedeEscanear: boolean;
}

export function RedirigirEscaneo({ codigo, puedeEscanear }: RedirigirEscaneoProps) {
  const router = useRouter();
  const yaCorrio = useRef(false);

  useEffect(() => {
    if (yaCorrio.current) return;
    yaCorrio.current = true;

    const destino = `/fabrica/u/${codigo}`;

    async function anotarYSeguir() {
      if (puedeEscanear) {
        try {
          await registrarEscaneo(codigo);
        } catch (error) {
          console.error("[fabrica/f] registrarEscaneo:", error);
        }
      }
      router.replace(destino);
    }

    void anotarYSeguir();
  }, [codigo, puedeEscanear, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-brand-bg px-6 text-center">
      <span
        className="flex h-24 w-24 items-center justify-center rounded-full bg-green-100 text-green-700"
        aria-hidden="true"
      >
        <CircleCheck className="h-14 w-14" />
      </span>
      <p className="mt-6 text-lg font-bold uppercase tracking-wide text-brand-taupe">
        Código leído
      </p>
      <p className="mt-1 font-mono text-4xl font-bold leading-none text-brand-dark">
        {codigo}
      </p>
      <p
        className="mt-8 flex items-center justify-center gap-3 text-xl font-semibold text-brand-taupe"
        role="status"
      >
        <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />
        <span>Abriendo el mueble…</span>
      </p>
    </main>
  );
}
