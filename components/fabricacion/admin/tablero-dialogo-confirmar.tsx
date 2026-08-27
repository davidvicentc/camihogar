"use client";

/**
 * El diálogo de confirmación del módulo (§7).
 *
 * Reglas que hace cumplir siempre:
 *  · Nombra EXACTAMENTE lo que se va a tocar y explica qué se conserva y qué
 *    se pierde.
 *  · Dos botones enormes con texto explícito: "SÍ, ELIMINAR" / "NO, VOLVER".
 *  · Si la acción falla porque hay dependencias, **el mensaje se queda dentro
 *    del propio diálogo**, no en un aviso que se esfuma; y debajo cabe la
 *    salida sugerida (un selector, un enlace…) a través de `children`.
 *  · Cuando la operación necesita un motivo, lo exige antes de dejar seguir.
 */

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { avisoOk } from "@/components/fabricacion/admin/tablero-avisos";
import { PieConfirmacion } from "@/components/fabricacion/admin/config-compartido";
import type { ActionResult } from "@/lib/types/fabricacion";

interface DialogoConfirmarProps<T> {
  abierto: boolean;
  /** Se llama al cerrar por cualquier vía (botón, Escape, éxito). */
  alCerrar: () => void;
  /** Pregunta grande. Ejemplo: "¿Eliminar el pedido PED-100248?". */
  titulo: string;
  /** Qué se conserva y qué se pierde, en frases cortas. */
  descripcion: ReactNode;
  /** Texto del botón rojo. Siempre en imperativo y en mayúsculas. */
  textoConfirmar: string;
  /** Rojo (borrar, cancelar) o naranja (acciones normales). */
  tono?: "peligro" | "normal";
  /** Exige escribir el porqué antes de dejar continuar. */
  pideMotivo?: boolean;
  etiquetaMotivo?: string;
  ayudaMotivo?: string;
  /** Contenido extra: el selector de "reasignar a…", una lista de avisos… */
  children?: ReactNode;
  /** La acción del servidor. Recibe el motivo ya recortado. */
  alConfirmar: (motivo: string) => Promise<ActionResult<T>>;
  /** Texto del aviso verde cuando todo sale bien. */
  exito?: (data: T | undefined) => string;
}

export function DialogoConfirmar<T>({
  abierto,
  alCerrar,
  titulo,
  descripcion,
  textoConfirmar,
  tono = "peligro",
  pideMotivo = false,
  etiquetaMotivo = "¿Por qué?",
  ayudaMotivo = "Escríbelo en una frase. Queda guardado en el historial.",
  children,
  alConfirmar,
  exito,
}: DialogoConfirmarProps<T>) {
  const router = useRouter();
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Cada vez que se abre, empieza limpio: sin motivo escrito ni error anterior.
  useEffect(() => {
    if (abierto) {
      setMotivo("");
      setError(null);
      setEnviando(false);
    }
  }, [abierto]);

  async function confirmar() {
    const limpio = motivo.trim();
    if (pideMotivo && limpio.length < 3) {
      setError("Escribe el motivo antes de continuar. Con una frase corta basta.");
      return;
    }

    setEnviando(true);
    setError(null);
    try {
      const resultado = await alConfirmar(limpio);
      if (!resultado.ok) {
        setError(resultado.error ?? "Algo salió mal. Vuelve a intentarlo.");
        return;
      }
      const texto = exito?.(resultado.data);
      if (texto) avisoOk(texto);
      alCerrar();
      router.refresh();
    } catch {
      setError("No pudimos conectar con el servidor. Revisa la conexión y reintenta.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog
      open={abierto}
      onOpenChange={(estado) => {
        if (!estado && !enviando) alCerrar();
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl leading-snug">{titulo}</DialogTitle>
          <DialogDescription className="pt-1 text-base text-brand-taupe">
            {descripcion}
          </DialogDescription>
        </DialogHeader>

        {children && <div className="space-y-3">{children}</div>}

        {pideMotivo && (
          <div className="space-y-1.5">
            <Label htmlFor="motivo-confirmacion" className="text-base">
              {etiquetaMotivo}
            </Label>
            <Textarea
              id="motivo-confirmacion"
              value={motivo}
              onChange={(evento) => setMotivo(evento.target.value)}
              placeholder="Por ejemplo: el cliente cambió de opinión"
              className="min-h-[90px] text-base"
            />
            <p className="text-sm text-brand-taupe">{ayudaMotivo}</p>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-base text-red-800"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* Mismo pie que todos los diálogos: el botón seguro siempre primero. */}
        <PieConfirmacion
          onCancelar={alCerrar}
          onConfirmar={confirmar}
          textoConfirmar={textoConfirmar}
          icono={AlertTriangle}
          peligroso={tono === "peligro"}
          cargando={enviando}
          textoCargando="UN MOMENTO…"
        />
      </DialogContent>
    </Dialog>
  );
}
