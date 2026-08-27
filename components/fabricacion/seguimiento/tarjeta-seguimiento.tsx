/**
 * La tarjeta que ve el cliente cuando abre el enlace de seguimiento.
 *
 * Tono cálido y de marca, cero jerga de taller: "va por buen camino", no
 * "estado EN_PROCESO". Todo lo que se pinta viene de `SeguimientoPublicoDTO`,
 * que es deliberadamente pobre: no trae teléfono, ni cédula, ni dirección, ni
 * precio, ni notas internas, ni nombres de quienes trabajan el mueble. Si un
 * dato no está en ese tipo, no puede filtrarse por accidente desde aquí.
 */

import Image from "next/image";
import { SiWhatsapp } from "@icons-pack/react-simple-icons";
import { CalendarDays, PackageCheck } from "lucide-react";

import { LogoLockup } from "@/components/brand/logo";
import { LineaTiempoCliente } from "@/components/fabricacion/seguimiento/linea-tiempo-cliente";
import type { SeguimientoPublicoDTO } from "@/lib/data/fabricacion";
import { BRAND } from "@/lib/constants";
import { buildWhatsAppLink } from "@/lib/whatsapp";

/** "12 de marzo de 2026"; cadena vacía si no hay fecha. */
function fechaLarga(iso: string | null): string {
  if (!iso) return "";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";
  return new Intl.DateTimeFormat("es-VE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(fecha);
}

export function TarjetaSeguimiento({ datos }: { datos: SeguimientoPublicoDTO }) {
  const saludo =
    datos.clienteNombre.trim() !== ""
      ? `Hola ${datos.clienteNombre}, tu ${datos.mueble} va por buen camino`
      : `Tu ${datos.mueble} va por buen camino`;

  const entrega = fechaLarga(datos.fechaPrometida);

  const mensajeWhatsApp = `¡Hola ${BRAND.name}! Quiero preguntar por mi mueble ${datos.codigo}.`;

  return (
    <main className="mx-auto w-full max-w-xl space-y-8 px-5 py-10">
      <header className="text-center">
        <LogoLockup className="mx-auto w-40" priority />
      </header>

      <section className="overflow-hidden rounded-4xl border border-brand-dark/5 bg-brand-card shadow-warm">
        {datos.imagen !== "" && (
          <div className="relative h-56 w-full bg-brand-sand sm:h-72">
            <Image
              src={datos.imagen}
              alt={datos.mueble}
              fill
              sizes="(max-width: 640px) 100vw, 576px"
              className="object-cover"
              priority
            />
          </div>
        )}

        <div className="space-y-6 p-6 sm:p-8">
          <div>
            <h1 className="font-display text-3xl font-semibold leading-tight tracking-tighter text-brand-dark">
              {saludo}
            </h1>
            <p className="mt-2 text-lg leading-relaxed text-brand-taupe">
              {datos.estadoDescripcion}
            </p>
          </div>

          {/* Avance, grande y sin porcentajes escondidos. */}
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-semibold text-brand-dark">
                {datos.estado}
              </span>
              <span className="tabular text-2xl font-bold text-brand-accent">
                {datos.progreso}%
              </span>
            </div>
            <div
              className="mt-2 h-5 w-full overflow-hidden rounded-full bg-brand-sand"
              role="progressbar"
              aria-valuenow={datos.progreso}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Avance de tu mueble: ${datos.progreso} por ciento`}
            >
              <div
                className="h-full rounded-full bg-ember-gradient transition-all"
                style={{ width: `${datos.progreso}%` }}
              />
            </div>
          </div>

          {entrega !== "" && (
            <p className="flex items-center gap-3 rounded-3xl bg-brand-sand px-5 py-4 text-lg text-brand-dark">
              <CalendarDays
                className="h-6 w-6 shrink-0 text-brand-accent"
                aria-hidden="true"
              />
              <span>
                Fecha estimada de entrega:{" "}
                <strong className="font-semibold">{entrega}</strong>
              </span>
            </p>
          )}

          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-brand-dark">
              <PackageCheck
                className="h-6 w-6 text-brand-accent"
                aria-hidden="true"
              />
              Cómo va tu mueble
            </h2>
            <div className="mt-4">
              <LineaTiempoCliente hitos={datos.hitos} />
            </div>
          </div>

          <a
            href={buildWhatsAppLink(mensajeWhatsApp)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-16 w-full items-center justify-center gap-3 rounded-3xl bg-[#25D366] text-lg font-bold text-white shadow-warm-sm transition-colors hover:bg-[#1fb958] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/40"
          >
            <SiWhatsapp className="h-7 w-7" aria-hidden="true" />
            Escríbenos por WhatsApp
          </a>

          <p className="text-center text-sm text-brand-taupe">
            Código de tu mueble:{" "}
            <span className="font-mono font-semibold tabular text-brand-dark">
              {datos.codigo}
            </span>
          </p>
        </div>
      </section>

      <footer className="pb-6 text-center text-sm text-brand-taupe">
        {BRAND.name} — {BRAND.tagline}
      </footer>
    </main>
  );
}
