"use client";

/**
 * Avisos del panel de fabricación.
 *
 * Un único sitio para: el contenedor de los mensajes (sonner), los atajos para
 * lanzarlos con letra grande, y el enganche `useAccion` que ejecuta una acción
 * del servidor, enseña el resultado y refresca la lista sola (§7).
 *
 * Cada página del módulo pinta `<AvisosFabricacion />` UNA sola vez.
 */

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Toaster, toast } from "sonner";
import type { ActionResult } from "@/lib/types/fabricacion";

/** Contenedor de los mensajes. Arriba y en el centro, para que no se pierdan. */
export function AvisosFabricacion() {
  return (
    <Toaster
      position="top-center"
      richColors
      closeButton
      duration={5000}
      toastOptions={{ className: "text-base font-medium" }}
    />
  );
}

/** Mensaje verde de "todo salió bien". */
export function avisoOk(mensaje: string): void {
  toast.success(mensaje);
}

/**
 * Mensaje rojo. Los textos ya vienen redactados desde las actions y dicen QUÉ
 * HACER, así que se pintan tal cual.
 */
export function avisoError(mensaje: string): void {
  toast.error(mensaje);
}

/** Aviso informativo, sin color de alarma. */
export function avisoInfo(mensaje: string): void {
  toast.info(mensaje);
}

export interface OpcionesAccion<T> {
  /** Texto del aviso verde. Puede depender del dato devuelto. */
  exito?: string | ((data: T | undefined) => string);
  /** Se ejecuta sólo si la acción salió bien, antes de refrescar. */
  alTerminar?: (data: T | undefined) => void;
  /** Por defecto sí: vuelve a pedir los datos para que la lista se actualice. */
  refrescar?: boolean;
}

/**
 * Ejecuta acciones del servidor cuidando siempre lo mismo: bloquear el botón,
 * enseñar el error en español si falla, felicitar si sale bien y refrescar.
 */
export function useAccion(): {
  ejecutando: boolean;
  ejecutar: <T>(
    accion: () => Promise<ActionResult<T>>,
    opciones?: OpcionesAccion<T>
  ) => void;
} {
  const router = useRouter();
  const [enTransicion, iniciarTransicion] = useTransition();
  const [esperando, setEsperando] = useState(false);

  const ejecutar = useCallback(
    <T,>(accion: () => Promise<ActionResult<T>>, opciones?: OpcionesAccion<T>) => {
      setEsperando(true);
      iniciarTransicion(async () => {
        try {
          const resultado = await accion();

          if (!resultado.ok) {
            avisoError(
              resultado.error ?? "Algo salió mal. Vuelve a intentarlo en un momento."
            );
            return;
          }

          const texto =
            typeof opciones?.exito === "function"
              ? opciones.exito(resultado.data)
              : opciones?.exito;
          if (texto) avisoOk(texto);

          opciones?.alTerminar?.(resultado.data);
          if (opciones?.refrescar !== false) router.refresh();
        } catch {
          avisoError(
            "No pudimos conectar con el servidor. Revisa la conexión y vuelve a intentarlo."
          );
        } finally {
          setEsperando(false);
        }
      });
    },
    [router]
  );

  return { ejecutando: enTransicion || esperando, ejecutar };
}
