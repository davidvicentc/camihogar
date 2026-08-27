"use client";

/**
 * La tarjeta que se le entrega en mano a la persona con su PIN de entrada.
 *
 * Aparece justo después de crear a alguien o de reiniciarle el PIN, porque es
 * el único momento en el que el PIN se puede leer: en la base sólo queda
 * cifrado y no hay forma de recuperarlo después.
 *
 * Al imprimir, el `@media print` de aquí abajo esconde todo lo demás de la
 * página y deja sólo la tarjeta.
 */

import * as React from "react";
import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BRAND } from "@/lib/constants";
import { AvisoCuidado, Avatar } from "./config-compartido";

const ESTILOS_IMPRESION = `
@media print {
  body * { visibility: hidden !important; }
  #tarjeta-entrega-pin, #tarjeta-entrega-pin * { visibility: visible !important; }
  #tarjeta-entrega-pin {
    position: fixed !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 24mm 18mm !important;
    border: none !important;
    box-shadow: none !important;
    background: #ffffff !important;
    color: #000000 !important;
  }
  #tarjeta-entrega-pin .solo-pantalla { display: none !important; }
}
`;

export interface PropsTarjetaPin {
  abierto: boolean;
  onCerrar: () => void;
  nombre: string;
  rolNombre: string;
  codigoEmpleado: string;
  colorAvatar: string;
  pin: string;
}

export function TarjetaPinImprimible({
  abierto,
  onCerrar,
  nombre,
  rolNombre,
  codigoEmpleado,
  colorAvatar,
  pin,
}: PropsTarjetaPin) {
  return (
    <Dialog open={abierto} onOpenChange={(valor) => (valor ? undefined : onCerrar())}>
      <DialogContent className="max-w-xl">
        <style dangerouslySetInnerHTML={{ __html: ESTILOS_IMPRESION }} />

        <DialogHeader>
          <DialogTitle className="pr-8 font-display text-2xl font-bold">
            Entrégale esta tarjeta a {nombre.split(" ")[0]}
          </DialogTitle>
          <DialogDescription className="text-base">
            Es la única vez que se puede ver este PIN. Imprímelo o anótalo antes de cerrar.
          </DialogDescription>
        </DialogHeader>

        <div
          id="tarjeta-entrega-pin"
          className="rounded-3xl border-2 border-brand-dark/15 bg-white p-6"
        >
          <p className="text-center text-base font-bold uppercase tracking-widest text-brand-taupe">
            {BRAND.name} · Taller
          </p>

          <div className="mt-5 flex items-center gap-4">
            <Avatar nombre={nombre} color={colorAvatar} className="h-16 w-16 text-2xl" />
            <div className="min-w-0">
              <p className="font-display text-2xl font-bold leading-tight text-brand-dark">
                {nombre}
              </p>
              <p className="text-lg text-brand-taupe">{rolNombre}</p>
              {codigoEmpleado !== "" ? (
                <p className="text-base text-brand-taupe">Código: {codigoEmpleado}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border-2 border-dashed border-brand-dark/25 p-5 text-center">
            <p className="text-lg font-bold text-brand-dark">Tu PIN para entrar</p>
            <p className="mt-2 font-mono text-6xl font-bold tracking-[0.35em] text-brand-dark">
              {pin}
            </p>
          </div>

          <ol className="mt-6 space-y-2 text-lg leading-snug text-brand-dark">
            <li>1. Abre la app del taller en el teléfono o la tableta.</li>
            <li>2. Toca tu foto o tu nombre en la lista.</li>
            <li>3. Escribe estos {pin.length} números y ya estás dentro.</li>
          </ol>

          <p className="mt-5 text-base text-brand-taupe">
            No le prestes el PIN a nadie: todo lo que se hace en el sistema queda anotado
            con tu nombre. Si se te olvida, pídele a quien administra que te ponga uno nuevo.
          </p>
        </div>

        <AvisoCuidado mensaje="Cuando cierres esta ventana, el PIN ya no se puede volver a ver. Si se pierde, hay que reiniciarlo." />

        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Button
            type="button"
            variant="accent"
            onClick={() => window.print()}
            className="h-16 flex-1 gap-3 rounded-2xl text-lg font-bold [&_svg]:size-6"
          >
            <Printer className="h-6 w-6" aria-hidden="true" />
            IMPRIMIR LA TARJETA
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCerrar}
            className="h-16 flex-1 gap-3 rounded-2xl text-lg font-bold [&_svg]:size-6"
          >
            <X className="h-6 w-6" aria-hidden="true" />
            YA LA ANOTÉ, CERRAR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
