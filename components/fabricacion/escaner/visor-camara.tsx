"use client";

/**
 * El visor de la cámara del taller.
 *
 * Lee tanto el QR como el código de barras de la etiqueta. Usa el lector que
 * ya trae el navegador (`BarcodeDetector`) cuando existe, porque es el más
 * rápido y el que menos batería gasta; si no está, carga `@zxing/browser`
 * **de forma dinámica** para que ese código no engorde la descarga inicial de
 * quien nunca lo necesita.
 *
 * Reglas que se respetan aquí:
 *  - Nada de `window` ni `navigator` fuera de `useEffect`: la pantalla se
 *    dibuja igual en el servidor y en el móvil, sin errores de hidratación.
 *  - Al salir de la pantalla se apagan SIEMPRE la cámara, el temporizador y
 *    el lector. Una cámara encendida de más se come la batería del móvil.
 *  - Si la cámara falla, no se deja a nadie tirado: el aviso explica qué
 *    hacer y la pantalla siempre ofrece escribir el código a mano.
 */

import { useEffect, useRef } from "react";
import { CameraOff, Loader2, ScanLine, ShieldAlert } from "lucide-react";
import type {
  BarcodeFormat as TipoFormato,
  DecodeHintType as TipoPista,
} from "@zxing/library";

/** En qué anda la cámara ahora mismo. */
export type EstadoCamara =
  | "iniciando"
  | "leyendo"
  | "sin-permiso"
  | "sin-camara"
  | "no-soportada"
  | "error";

/* El lector nativo del navegador todavía no está en los tipos de TypeScript,
   así que se declara aquí lo poco que se usa de él. */
interface CodigoLeido {
  rawValue: string;
}

interface DetectorDeCodigos {
  detect(fuente: CanvasImageSource): Promise<CodigoLeido[]>;
}

type ConstructorDetector = new (opciones?: {
  formats?: string[];
}) => DetectorDeCodigos;

/** Cada cuánto se mira el fotograma. Más seguido no lee mejor y calienta el móvil. */
const MS_ENTRE_LECTURAS = 350;

interface VisorCamaraProps {
  /** Con `false` se apaga la cámara (por ejemplo, mientras se confirma el mueble). */
  activo: boolean;
  /** Se llama con el texto crudo leído: la pantalla lo normaliza después. */
  onCodigo: (texto: string) => void;
  /** Avisa a la pantalla del estado, para que enseñe el cartel adecuado. */
  onEstado: (estado: EstadoCamara) => void;
  /** Estado actual, que decide el cartel que se pinta encima del vídeo. */
  estado: EstadoCamara;
}

export function VisorCamara({
  activo,
  onCodigo,
  onEstado,
  estado,
}: VisorCamaraProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Las funciones van por referencia para que la cámara no se reinicie cada
  // vez que la pantalla se vuelve a dibujar.
  const onCodigoRef = useRef(onCodigo);
  const onEstadoRef = useRef(onEstado);
  onCodigoRef.current = onCodigo;
  onEstadoRef.current = onEstado;

  useEffect(() => {
    if (!activo) return;

    const video = videoRef.current;
    if (!video) return;

    let cancelado = false;
    let stream: MediaStream | null = null;
    let intervalo: ReturnType<typeof setInterval> | null = null;
    let controles: { stop: () => void } | null = null;

    const avisar = (nuevo: EstadoCamara) => {
      if (!cancelado) onEstadoRef.current(nuevo);
    };

    const entregar = (texto: string) => {
      if (cancelado) return;
      const limpio = typeof texto === "string" ? texto.trim() : "";
      if (limpio !== "") onCodigoRef.current(limpio);
    };

    /** Lector nativo del navegador. Devuelve `true` si pudo ponerse en marcha. */
    const arrancarLectorNativo = (): boolean => {
      const Detector = (
        window as unknown as { BarcodeDetector?: ConstructorDetector }
      ).BarcodeDetector;
      if (!Detector) return false;

      let detector: DetectorDeCodigos;
      try {
        detector = new Detector({ formats: ["qr_code", "code_128"] });
      } catch (error) {
        console.error("[escaner] el lector del navegador no aceptó los formatos:", error);
        return false;
      }

      let ocupado = false;
      intervalo = setInterval(() => {
        if (cancelado || ocupado || video.readyState < 2) return;
        ocupado = true;
        detector
          .detect(video)
          .then((encontrados) => {
            const primero = encontrados.find(
              (codigo) => typeof codigo.rawValue === "string" && codigo.rawValue.trim() !== ""
            );
            if (primero) entregar(primero.rawValue);
          })
          .catch(() => {
            // Un fotograma borroso no es un fallo que haya que contarle a nadie.
          })
          .finally(() => {
            ocupado = false;
          });
      }, MS_ENTRE_LECTURAS);

      return true;
    };

    /** Respaldo: la biblioteca ZXing, cargada sólo si de verdad hace falta. */
    const arrancarLectorDeRespaldo = async (): Promise<boolean> => {
      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] =
          await Promise.all([import("@zxing/browser"), import("@zxing/library")]);

        if (cancelado) return false;

        const pistas = new Map<TipoPista, TipoFormato[]>([
          [
            DecodeHintType.POSSIBLE_FORMATS,
            [BarcodeFormat.QR_CODE, BarcodeFormat.CODE_128],
          ],
        ]);

        const lector = new BrowserMultiFormatReader(pistas, {
          delayBetweenScanAttempts: MS_ENTRE_LECTURAS,
          delayBetweenScanSuccess: 1200,
        });

        // Se lee del vídeo que YA está reproduciendo: así la cámara sigue
        // siendo nuestra y la apagamos nosotros al salir.
        controles = await lector.decodeFromVideoElement(video, (resultado) => {
          if (!resultado) return;
          entregar(resultado.getText());
        });

        return !cancelado;
      } catch (error) {
        console.error("[escaner] no se pudo cargar el lector de respaldo:", error);
        return false;
      }
    };

    const arrancar = async () => {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== "function"
      ) {
        avisar("no-soportada");
        return;
      }

      avisar("iniciando");

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 1280 },
          },
          audio: false,
        });
      } catch (error) {
        const nombre = error instanceof Error ? error.name : "";
        if (nombre === "NotAllowedError" || nombre === "SecurityError") {
          avisar("sin-permiso");
        } else if (nombre === "NotFoundError" || nombre === "OverconstrainedError") {
          avisar("sin-camara");
        } else {
          console.error("[escaner] no se pudo abrir la cámara:", error);
          avisar("error");
        }
        return;
      }

      if (cancelado) return;

      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      video.muted = true;

      try {
        await video.play();
      } catch {
        // Algunos navegadores exigen un toque para reproducir. La persona ya
        // tocó para llegar aquí, así que se sigue: el lector espera al vídeo.
      }

      if (cancelado) return;

      if (arrancarLectorNativo()) {
        avisar("leyendo");
        return;
      }

      const listo = await arrancarLectorDeRespaldo();
      avisar(listo ? "leyendo" : "error");
    };

    void arrancar();

    return () => {
      cancelado = true;
      if (intervalo !== null) clearInterval(intervalo);
      try {
        controles?.stop();
      } catch {
        // Si el lector ya estaba parado, no hay nada que hacer.
      }
      if (stream) {
        for (const pista of stream.getTracks()) pista.stop();
      }
      video.pause();
      video.srcObject = null;
    };
  }, [activo]);

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-brand-dark shadow-warm">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        playsInline
        muted
        aria-label="Vista de la cámara para leer el código del mueble"
      />

      {/* Marco de guía: le dice a la persona dónde poner la etiqueta. */}
      {estado === "leyendo" && (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute inset-[12%] rounded-3xl border-4 border-white/70 shadow-[0_0_0_9999px_rgba(37,22,15,0.35)]">
            <span className="absolute -left-1 -top-1 h-10 w-10 rounded-tl-3xl border-l-8 border-t-8 border-brand-accent" />
            <span className="absolute -right-1 -top-1 h-10 w-10 rounded-tr-3xl border-r-8 border-t-8 border-brand-accent" />
            <span className="absolute -bottom-1 -left-1 h-10 w-10 rounded-bl-3xl border-b-8 border-l-8 border-brand-accent" />
            <span className="absolute -bottom-1 -right-1 h-10 w-10 rounded-br-3xl border-b-8 border-r-8 border-brand-accent" />
            <span className="absolute inset-x-6 top-1/2 h-1 animate-pulse rounded-full bg-brand-accent/90" />
          </div>
        </div>
      )}

      {estado === "leyendo" && (
        <p className="absolute inset-x-0 bottom-0 bg-brand-dark/80 px-4 py-4 text-center text-xl font-bold text-brand-bg">
          <ScanLine className="mr-2 inline h-6 w-6" aria-hidden="true" />
          Apunta al código del mueble
        </p>
      )}

      {estado === "iniciando" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-brand-dark px-6 text-center text-brand-bg">
          <Loader2 className="h-14 w-14 animate-spin" aria-hidden="true" />
          <p className="text-xl font-bold">Encendiendo la cámara…</p>
          <p className="text-lg text-brand-bg/80">
            Si te pregunta, toca <strong>Permitir</strong>.
          </p>
        </div>
      )}

      {estado === "sin-permiso" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-brand-dark px-6 text-center text-brand-bg">
          <ShieldAlert className="h-14 w-14 text-brand-flame" aria-hidden="true" />
          <p className="text-2xl font-bold">No pudimos usar la cámara</p>
          <p className="text-lg leading-relaxed text-brand-bg/85">
            El teléfono no nos dejó encenderla. Toca el candado que aparece
            arriba, junto a la dirección de la página, y activa la cámara.
            Después vuelve a entrar a esta pantalla.
          </p>
          <p className="text-lg font-semibold text-brand-flame">
            Mientras tanto, escribe el código a mano con el botón de abajo.
          </p>
        </div>
      )}

      {estado === "sin-camara" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-brand-dark px-6 text-center text-brand-bg">
          <CameraOff className="h-14 w-14 text-brand-flame" aria-hidden="true" />
          <p className="text-2xl font-bold">Este equipo no tiene cámara</p>
          <p className="text-lg text-brand-bg/85">
            Escribe el código a mano con el botón de abajo.
          </p>
        </div>
      )}

      {estado === "no-soportada" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-brand-dark px-6 text-center text-brand-bg">
          <CameraOff className="h-14 w-14 text-brand-flame" aria-hidden="true" />
          <p className="text-2xl font-bold">Este navegador no abre la cámara</p>
          <p className="text-lg text-brand-bg/85">
            Prueba a abrir la página en Chrome o en Safari. Mientras tanto,
            escribe el código a mano con el botón de abajo.
          </p>
        </div>
      )}

      {estado === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-brand-dark px-6 text-center text-brand-bg">
          <CameraOff className="h-14 w-14 text-brand-flame" aria-hidden="true" />
          <p className="text-2xl font-bold">La cámara se quedó a medias</p>
          <p className="text-lg text-brand-bg/85">
            Sal de esta pantalla y vuelve a entrar. Si sigue igual, escribe el
            código a mano con el botón de abajo.
          </p>
        </div>
      )}
    </div>
  );
}
