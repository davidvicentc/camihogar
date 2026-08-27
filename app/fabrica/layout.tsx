import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";

import { getSesionOperario } from "@/lib/fabricacion/auth";
import { BarraInferior } from "@/components/fabricacion/operario/barra-inferior";
import { BotonSalir } from "@/components/fabricacion/operario/boton-salir";
import { inicialDe } from "@/components/fabricacion/operario/formato";

/**
 * Marco de la app del taller.
 *
 * NO es el layout del panel de administración: aquí manda el pulgar. Letra
 * grande de base (`text-lg`), cabecera fija con quién eres y una barra de abajo
 * con tres destinos enormes.
 *
 * La pantalla de entrada (`/fabrica/login`) comparte este layout pero se pinta
 * sin cabecera ni barra: quien no ha entrado todavía no tiene a dónde ir.
 */

export const metadata: Metadata = {
  title: "Taller — CamiHogar",
  description: "La app del taller: qué mueble te toca y en qué paso va.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#25160F",
};

/** La sesión vive en una cookie: nada de esto se puede cachear. */
export const dynamic = "force-dynamic";

/** Toasts grandes y legibles desde lejos, arriba del todo para no tapar el pulgar. */
function AvisosTaller() {
  return (
    <Toaster
      richColors
      position="top-center"
      expand
      duration={6000}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-3xl !border-2 !p-5 !text-lg !font-semibold !shadow-warm-lg !gap-3",
          title: "!text-lg !font-bold !leading-snug",
          description: "!text-base !leading-relaxed",
          icon: "!h-7 !w-7",
        },
      }}
    />
  );
}

export default async function LayoutTaller({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const sesion = await getSesionOperario();

  if (!sesion) {
    return (
      <div className="min-h-screen bg-brand-bg text-lg text-brand-dark">
        {children}
        <AvisosTaller />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg text-lg text-brand-dark">
      <header className="sticky top-0 z-40 border-b-4 border-brand-accent/30 bg-brand-dark text-brand-bg">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-4 px-4 py-3">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-accent text-2xl font-bold text-white"
            aria-hidden="true"
          >
            {inicialDe(sesion.nombre)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-2xl font-bold leading-tight">{sesion.nombre}</p>
            <p className="truncate text-base text-brand-bg/70">{sesion.rolNombre}</p>
          </div>
          <BotonSalir nombre={sesion.nombre} />
        </div>
      </header>

      {/* El hueco de abajo deja sitio a la barra fija y al botón pegado. */}
      <main className="mx-auto w-full max-w-2xl px-4 pb-56 pt-5">{children}</main>

      <BarraInferior />
      <AvisosTaller />
    </div>
  );
}
