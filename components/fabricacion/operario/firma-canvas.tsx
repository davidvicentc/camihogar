"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Eraser, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { clasesBotonGrande } from "./boton-grande";
import { subirArchivo } from "./subir-fotos";

/**
 * La firma del cliente, hecha con el dedo sobre la pantalla.
 *
 * Se dibuja en un `<canvas>` con eventos de puntero (vale para dedo, lápiz y
 * ratón) y, al guardarla, se sube como imagen igual que las fotos: en la base
 * de datos queda una dirección corta, nunca la imagen entera.
 */
interface FirmaCanvasProps {
  firmaUrl: string;
  onCambio: (url: string) => void;
  deshabilitado?: boolean;
}

export function FirmaCanvas({
  firmaUrl,
  onCambio,
  deshabilitado = false,
}: FirmaCanvasProps) {
  const lienzo = useRef<HTMLCanvasElement | null>(null);
  const dibujando = useRef(false);
  const [hayTrazo, setHayTrazo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  /** Ajusta el lienzo a los píxeles reales de la pantalla para que no salga borroso. */
  const prepararLienzo = useCallback(() => {
    const elemento = lienzo.current;
    if (!elemento) return;
    const escala = window.devicePixelRatio || 1;
    const ancho = elemento.clientWidth;
    const alto = elemento.clientHeight;
    if (ancho === 0 || alto === 0) return;

    elemento.width = Math.round(ancho * escala);
    elemento.height = Math.round(alto * escala);

    const contexto = elemento.getContext("2d");
    if (!contexto) return;
    contexto.scale(escala, escala);
    contexto.lineWidth = 3.5;
    contexto.lineCap = "round";
    contexto.lineJoin = "round";
    contexto.strokeStyle = "#25160F";
  }, []);

  useEffect(() => {
    if (firmaUrl) return;
    prepararLienzo();
  }, [firmaUrl, prepararLienzo]);

  function posicion(evento: React.PointerEvent<HTMLCanvasElement>) {
    const elemento = lienzo.current;
    if (!elemento) return { x: 0, y: 0 };
    const caja = elemento.getBoundingClientRect();
    return { x: evento.clientX - caja.left, y: evento.clientY - caja.top };
  }

  function empezarTrazo(evento: React.PointerEvent<HTMLCanvasElement>) {
    if (deshabilitado || guardando) return;
    const contexto = lienzo.current?.getContext("2d");
    if (!contexto) return;
    evento.preventDefault();
    lienzo.current?.setPointerCapture(evento.pointerId);
    dibujando.current = true;
    const { x, y } = posicion(evento);
    contexto.beginPath();
    contexto.moveTo(x, y);
  }

  function seguirTrazo(evento: React.PointerEvent<HTMLCanvasElement>) {
    if (!dibujando.current) return;
    const contexto = lienzo.current?.getContext("2d");
    if (!contexto) return;
    evento.preventDefault();
    const { x, y } = posicion(evento);
    contexto.lineTo(x, y);
    contexto.stroke();
    if (!hayTrazo) setHayTrazo(true);
  }

  function terminarTrazo() {
    dibujando.current = false;
  }

  function borrar() {
    const elemento = lienzo.current;
    const contexto = elemento?.getContext("2d");
    if (elemento && contexto) {
      contexto.clearRect(0, 0, elemento.width, elemento.height);
    }
    setHayTrazo(false);
    setError("");
    if (firmaUrl) onCambio("");
    window.requestAnimationFrame(prepararLienzo);
  }

  function guardar() {
    const elemento = lienzo.current;
    if (!elemento || !hayTrazo || guardando) return;

    setGuardando(true);
    setError("");

    elemento.toBlob((imagen) => {
      if (!imagen) {
        setGuardando(false);
        setError("No pudimos guardar la firma. Bórrala y pide que firmen otra vez.");
        return;
      }
      subirArchivo(imagen, "firma.png")
        .then((url) => {
          onCambio(url);
          setGuardando(false);
        })
        .catch((problema: unknown) => {
          setGuardando(false);
          setError(
            problema instanceof Error
              ? problema.message
              : "No pudimos guardar la firma. Vuelve a intentarlo."
          );
        });
    }, "image/png");
  }

  /* Ya está firmado: se enseña la firma y sólo se ofrece rehacerla. */
  if (firmaUrl) {
    return (
      <div>
        <p className="flex items-center gap-3 text-xl font-bold leading-tight text-green-700">
          <Check className="h-8 w-8 shrink-0" aria-hidden="true" />
          Firma guardada
        </p>
        <div className="mt-4 rounded-3xl border-2 border-brand-dark/10 bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- firma recién subida por el operario */}
          <img
            src={firmaUrl}
            alt="Firma del cliente"
            className="mx-auto h-40 w-full object-contain"
          />
        </div>
        <button
          type="button"
          onClick={borrar}
          disabled={deshabilitado}
          className={cn(clasesBotonGrande("gris"), "mt-4")}
        >
          <Eraser className="h-9 w-9 shrink-0" aria-hidden="true" />
          <span>BORRAR Y FIRMAR OTRA VEZ</span>
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xl font-bold leading-tight text-brand-dark">
        Pide al cliente que firme aquí con el dedo
      </p>
      <p className="mt-1 text-lg text-brand-taupe">
        Se firma dentro del recuadro blanco. Si sale mal, se borra y se firma otra vez.
      </p>

      <canvas
        ref={lienzo}
        onPointerDown={empezarTrazo}
        onPointerMove={seguirTrazo}
        onPointerUp={terminarTrazo}
        onPointerLeave={terminarTrazo}
        onPointerCancel={terminarTrazo}
        aria-label="Recuadro para firmar con el dedo"
        role="img"
        className="mt-4 h-56 w-full touch-none rounded-3xl border-4 border-dashed border-brand-taupe/40 bg-white"
      />

      {error ? (
        <p
          role="alert"
          className="mt-4 flex items-start gap-3 rounded-3xl border-2 border-red-300 bg-red-50 p-4 text-lg font-semibold leading-snug text-red-800"
        >
          <AlertTriangle className="mt-0.5 h-7 w-7 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        <button
          type="button"
          onClick={guardar}
          disabled={deshabilitado || guardando || !hayTrazo}
          className={clasesBotonGrande("verde")}
        >
          {guardando ? (
            <Loader2 className="h-9 w-9 shrink-0 animate-spin" aria-hidden="true" />
          ) : (
            <Check className="h-9 w-9 shrink-0" aria-hidden="true" />
          )}
          <span>{guardando ? "GUARDANDO…" : "GUARDAR ESTA FIRMA"}</span>
        </button>

        <button
          type="button"
          onClick={borrar}
          disabled={deshabilitado || guardando}
          className={clasesBotonGrande("gris")}
        >
          <Eraser className="h-9 w-9 shrink-0" aria-hidden="true" />
          <span>BORRAR Y FIRMAR OTRA VEZ</span>
        </button>
      </div>
    </div>
  );
}
