"use client";

/**
 * Ponerle un PIN nuevo a alguien que olvidó el suyo.
 *
 * El PIN viejo no se puede consultar: en la base sólo hay una versión cifrada.
 * Por eso aquí no se pide el anterior, se escribe uno nuevo dos veces y al
 * terminar se ofrece la tarjeta imprimible para entregársela en mano.
 */

import * as React from "react";
import { KeyRound, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { OperarioDTO } from "@/lib/types/fabricacion";
import { resetearPin } from "@/lib/actions/fabricacion";
import { AvisoBloqueo, AvisoInfo, avisoExito } from "./config-compartido";
import { EditorPin, revisarPin } from "./equipo-pin";

export interface PropsCambiarPin {
  /** `null` mientras el diálogo está cerrado. */
  operario: OperarioDTO | null;
  onCerrar: () => void;
  /** Se llama con el PIN nuevo para poder enseñar la tarjeta imprimible. */
  onCambiado: (pin: string) => void;
}

export function DialogoCambiarPin({ operario, onCerrar, onCambiado }: PropsCambiarPin) {
  const [pin, setPin] = React.useState("");
  const [confirmacion, setConfirmacion] = React.useState("");
  const [error, setError] = React.useState("");
  const [bloqueo, setBloqueo] = React.useState<string | null>(null);
  const [guardando, setGuardando] = React.useState(false);

  React.useEffect(() => {
    setPin("");
    setConfirmacion("");
    setError("");
    setBloqueo(null);
    setGuardando(false);
  }, [operario]);

  async function confirmar(): Promise<void> {
    if (!operario) return;

    const problema = revisarPin(pin, confirmacion);
    setError(problema);
    if (problema !== "") return;

    setGuardando(true);
    const resultado = await resetearPin(operario._id, pin);
    setGuardando(false);

    if (!resultado.ok) {
      setBloqueo(resultado.error ?? "No pudimos cambiar el PIN. Vuelve a intentarlo.");
      return;
    }

    avisoExito(`«${operario.nombre}» ya tiene un PIN nuevo. Entrégaselo.`);
    onCambiado(pin);
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
            PIN nuevo para {operario?.nombre}
          </DialogTitle>
          <DialogDescription className="text-base">
            Escribe el PIN nuevo dos veces. El anterior deja de funcionar en cuanto
            guardes.
          </DialogDescription>
        </DialogHeader>

        <AvisoInfo mensaje="El PIN anterior no se puede consultar: se guarda cifrado. Si alguien lo olvidó, lo único que se puede hacer es ponerle uno nuevo aquí." />

        <EditorPin
          pin={pin}
          confirmacion={confirmacion}
          onCambiar={(nuevoPin, nuevaConfirmacion) => {
            setPin(nuevoPin);
            setConfirmacion(nuevaConfirmacion);
            if (error !== "") setError("");
            if (bloqueo !== null) setBloqueo(null);
          }}
          error={error}
          etiquetaPin="PIN nuevo"
        />

        {bloqueo ? <AvisoBloqueo mensaje={bloqueo} /> : null}

        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Button
            type="button"
            variant="accent"
            onClick={() => void confirmar()}
            disabled={guardando}
            className="h-16 flex-1 gap-3 rounded-2xl text-lg font-bold [&_svg]:size-6"
          >
            {guardando ? (
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
            ) : (
              <KeyRound className="h-6 w-6" aria-hidden="true" />
            )}
            SÍ, PONERLE ESTE PIN
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
