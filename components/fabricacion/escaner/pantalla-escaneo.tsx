"use client";

/**
 * La pantalla de escaneo completa: visor de cámara, aviso de lo que pasa y
 * teclado gigante para escribir el código a mano.
 *
 * Tres vistas y ni una más, porque quien la usa está de pie, con las manos
 * sucias y con prisa:
 *   1. `camara`    — el visor ocupando casi toda la pantalla.
 *   2. `teclado`   — el teclado numérico, siempre a un botón de distancia.
 *   3. `confirmar` — "¿es este el mueble?" antes de entrar a su ficha.
 *
 * La búsqueda del mueble la hace el servidor (`buscarMueble`, que llega como
 * propiedad desde la página): así el navegador nunca habla con la base de
 * datos y el código leído pasa por `normalizarCodigo` en el servidor, que es
 * donde vive esa regla.
 */

import { useCallback, useRef, useState } from "react";
import { AlertCircle, Camera, Keyboard, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/types/fabricacion";

import {
  ConfirmacionMueble,
  type MuebleEncontrado,
} from "@/components/fabricacion/escaner/confirmacion-mueble";
import { TecladoNumerico } from "@/components/fabricacion/escaner/teclado-numerico";
import {
  VisorCamara,
  type EstadoCamara,
} from "@/components/fabricacion/escaner/visor-camara";

type Vista = "camara" | "teclado" | "confirmar";

/** Tiempo antes de volver a aceptar el MISMO código que acaba de fallar. */
const MS_ANTES_DE_REINTENTAR = 3000;

interface PantallaEscaneoProps {
  /** Acción de servidor que busca el mueble por su código. */
  buscarMueble: (codigo: string) => Promise<ActionResult<MuebleEncontrado>>;
}

export function PantallaEscaneo({ buscarMueble }: PantallaEscaneoProps) {
  const [vista, setVista] = useState<Vista>("camara");
  const [estadoCamara, setEstadoCamara] = useState<EstadoCamara>("iniciando");
  const [mueble, setMueble] = useState<MuebleEncontrado | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [buscando, setBuscando] = useState(false);

  // Sin estas dos referencias la cámara buscaría el mismo código veinte veces
  // por segundo mientras la etiqueta siga delante del objetivo.
  const buscandoRef = useRef(false);
  const ultimoTextoRef = useRef("");

  const manejarCodigo = useCallback(
    async (texto: string) => {
      if (buscandoRef.current) return;
      if (texto === ultimoTextoRef.current) return;

      ultimoTextoRef.current = texto;
      buscandoRef.current = true;
      setBuscando(true);
      setMensaje("");

      // Un tirón corto confirma que se leyó algo, aunque no se mire la pantalla.
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(120);
      }

      try {
        const resultado = await buscarMueble(texto);

        if (resultado.ok && resultado.data) {
          setMueble(resultado.data);
          setVista("confirmar");
        } else {
          setMensaje(
            resultado.error ??
              "No encontramos ese código. Revísalo y prueba otra vez."
          );
          // Se deja volver a leer la misma etiqueta pasado un momento.
          window.setTimeout(() => {
            ultimoTextoRef.current = "";
          }, MS_ANTES_DE_REINTENTAR);
        }
      } catch (error) {
        console.error("[escaner] no se pudo buscar el mueble:", error);
        setMensaje(
          "No pudimos buscar el mueble ahora mismo. Espera un momento y vuelve a intentarlo."
        );
        ultimoTextoRef.current = "";
      } finally {
        buscandoRef.current = false;
        setBuscando(false);
      }
    },
    [buscarMueble]
  );

  const volverAEscanear = useCallback(() => {
    setMueble(null);
    setMensaje("");
    ultimoTextoRef.current = "";
    setVista("camara");
  }, []);

  const irAlTeclado = useCallback(() => {
    setMensaje("");
    ultimoTextoRef.current = "";
    setVista("teclado");
  }, []);

  return (
    <div className="space-y-5">
      {vista === "confirmar" && mueble !== null ? (
        <ConfirmacionMueble mueble={mueble} onVolver={volverAEscanear} />
      ) : (
        <>
          {vista === "camara" ? (
            <VisorCamara
              activo
              estado={estadoCamara}
              onEstado={setEstadoCamara}
              onCodigo={(texto) => {
                void manejarCodigo(texto);
              }}
            />
          ) : (
            <TecladoNumerico
              ocupado={buscando}
              onBuscar={(codigo) => {
                void manejarCodigo(codigo);
              }}
            />
          )}

          {buscando && (
            <p
              className="flex items-center justify-center gap-3 rounded-3xl bg-brand-sand px-4 py-4 text-xl font-bold text-brand-dark"
              aria-live="polite"
            >
              <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />
              Buscando el mueble…
            </p>
          )}

          {mensaje !== "" && !buscando && (
            <p
              className="flex items-start gap-3 rounded-3xl border-4 border-red-300 bg-red-50 px-4 py-4 text-lg font-semibold leading-relaxed text-red-800"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-7 w-7 shrink-0" aria-hidden="true" />
              {mensaje}
            </p>
          )}

          {/* Siempre visible: la salida para quien no puede o no quiere usar la cámara. */}
          {vista === "camara" ? (
            <Button
              type="button"
              variant="accent"
              onClick={irAlTeclado}
              className="h-20 w-full rounded-3xl text-xl font-bold"
            >
              <Keyboard className="!h-7 !w-7" aria-hidden="true" />
              ESCRIBIR EL CÓDIGO A MANO
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={volverAEscanear}
              className="h-16 w-full rounded-3xl text-lg font-bold"
            >
              <Camera className="!h-6 !w-6" aria-hidden="true" />
              VOLVER A LA CÁMARA
            </Button>
          )}
        </>
      )}
    </div>
  );
}
