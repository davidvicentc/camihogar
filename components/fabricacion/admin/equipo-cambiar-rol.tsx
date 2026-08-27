"use client";

/**
 * Atajo para cambiarle el rol a alguien sin abrir la ficha entera.
 *
 * Si la action rechaza el cambio por un seguro anti-bloqueo (por ejemplo,
 * "Eres la única persona que puede gestionar usuarios…"), el motivo se queda
 * DENTRO del diálogo, a la vista, y no en un aviso que se esfuma.
 */

import * as React from "react";
import { Check, Loader2, Shuffle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { OperarioDTO, RolDTO } from "@/lib/types/fabricacion";
import { iconoDeRol } from "@/lib/fabricacion/constantes";
import { cambiarRolOperario } from "@/lib/actions/fabricacion";
import { cn } from "@/lib/utils";
import { AvisoBloqueo, avisoExito, textoSobre } from "./config-compartido";
import { resumirCapacidades } from "./rol-tarjeta";

export interface PropsCambiarRol {
  /** `null` mientras el diálogo está cerrado. */
  operario: OperarioDTO | null;
  roles: RolDTO[];
  onCerrar: () => void;
  onCambiado: () => void;
}

export function DialogoCambiarRol({
  operario,
  roles,
  onCerrar,
  onCambiado,
}: PropsCambiarRol) {
  const [elegido, setElegido] = React.useState("");
  const [bloqueo, setBloqueo] = React.useState<string | null>(null);
  const [guardando, setGuardando] = React.useState(false);

  React.useEffect(() => {
    setElegido(operario?.rolClave ?? "");
    setBloqueo(null);
    setGuardando(false);
  }, [operario]);

  const elegibles = roles.filter((rol) => rol.activo || rol.clave === operario?.rolClave);

  async function confirmar(): Promise<void> {
    if (!operario || elegido === "") return;

    setGuardando(true);
    const resultado = await cambiarRolOperario(operario._id, elegido);
    setGuardando(false);

    if (!resultado.ok) {
      setBloqueo(resultado.error ?? "No pudimos cambiar el rol. Vuelve a intentarlo.");
      return;
    }

    const nombreRol = roles.find((rol) => rol.clave === elegido)?.nombre ?? elegido;
    avisoExito(`Ahora «${operario.nombre}» tiene el rol «${nombreRol}».`);
    onCambiado();
    onCerrar();
  }

  return (
    <Dialog
      open={operario !== null}
      onOpenChange={(valor) => (valor || guardando ? undefined : onCerrar())}
    >
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-8 font-display text-2xl font-bold">
            Cambiar el rol de {operario?.nombre}
          </DialogTitle>
          <DialogDescription className="text-base">
            Ahora mismo es «{operario?.rolNombre}». Elige el rol nuevo: el cambio se
            aplica de inmediato, sin que tenga que volver a entrar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {elegibles.map((rol) => {
            const Icono = iconoDeRol(rol.icono || rol.clave);
            const marcado = rol.clave === elegido;
            return (
              <button
                key={rol._id}
                type="button"
                role="radio"
                aria-checked={marcado}
                onClick={() => {
                  setElegido(rol.clave);
                  setBloqueo(null);
                }}
                className={cn(
                  "flex w-full min-h-[64px] items-start gap-4 rounded-2xl border-2 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2",
                  marcado
                    ? "border-brand-accent bg-brand-accent/[0.08]"
                    : "border-brand-dark/12 bg-brand-card hover:border-brand-accent/40"
                )}
              >
                <span
                  aria-hidden="true"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: rol.color, color: textoSobre(rol.color) }}
                >
                  <Icono className="h-6 w-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-bold text-brand-dark">{rol.nombre}</span>
                  <span className="mt-0.5 block text-base leading-snug text-brand-taupe">
                    {resumirCapacidades(rol)}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2",
                    marcado
                      ? "border-brand-accent bg-brand-accent text-white"
                      : "border-brand-dark/25 bg-white"
                  )}
                >
                  {marcado ? <Check className="h-4 w-4" strokeWidth={3} /> : null}
                </span>
              </button>
            );
          })}
        </div>

        {bloqueo ? <AvisoBloqueo mensaje={bloqueo} /> : null}

        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Button
            type="button"
            variant="accent"
            onClick={() => void confirmar()}
            disabled={guardando || elegido === "" || elegido === operario?.rolClave}
            className="h-16 flex-1 gap-3 rounded-2xl text-lg font-bold [&_svg]:size-6"
          >
            {guardando ? (
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
            ) : (
              <Shuffle className="h-6 w-6" aria-hidden="true" />
            )}
            SÍ, CAMBIARLE EL ROL
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCerrar}
            disabled={guardando}
            className="h-16 flex-1 gap-3 rounded-2xl text-lg font-bold [&_svg]:size-6"
          >
            <X className="h-6 w-6" aria-hidden="true" />
            NO, VOLVER
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
