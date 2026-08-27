"use client";

import { useRef, useState } from "react";
import { AlertTriangle, Camera, ImagePlus, Loader2, RotateCcw, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { clasesBotonGrande } from "./boton-grande";

/**
 * Las fotos del taller: se toman con la cámara del móvil y se guardan en
 * Cloudinary.
 *
 * El servidor NUNCA recibe la foto: firma la subida (`POST /api/fabrica/subir`)
 * y el teléfono manda el archivo directo a Cloudinary. Así una foto de 4 MB no
 * pasa por la función de Next.
 *
 * Regla de oro cuando algo falla: **no se pierde ninguna foto ya subida**. Las
 * que fallaron quedan apartadas y se reintentan solas al tocar "Reintentar".
 */

/** Lo que devuelve `POST /api/fabrica/subir` para poder subir a Cloudinary. */
interface FirmaSubida {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
}

const ERROR_RED =
  "No pudimos guardar la foto. Revisa que el teléfono tenga internet y vuelve a intentarlo.";

function esFirmaValida(valor: unknown): valor is FirmaSubida {
  if (typeof valor !== "object" || valor === null) return false;
  const dato = valor as Record<string, unknown>;
  return (
    typeof dato.signature === "string" &&
    typeof dato.apiKey === "string" &&
    typeof dato.cloudName === "string" &&
    typeof dato.folder === "string" &&
    (typeof dato.timestamp === "number" || typeof dato.timestamp === "string")
  );
}

/** Si el servidor explicó qué pasó, se le hace caso: sabe más que nosotros. */
function mensajeDelServidor(datos: unknown): string {
  if (typeof datos === "object" && datos !== null) {
    const texto = (datos as Record<string, unknown>).error;
    if (typeof texto === "string" && texto.trim() !== "") return texto;
  }
  return ERROR_RED;
}

async function pedirFirma(): Promise<FirmaSubida> {
  const respuesta = await fetch("/api/fabrica/subir", { method: "POST" });

  let datos: unknown = null;
  try {
    datos = await respuesta.json();
  } catch {
    throw new Error(ERROR_RED);
  }

  if (!respuesta.ok) throw new Error(mensajeDelServidor(datos));
  if (!esFirmaValida(datos)) throw new Error(ERROR_RED);

  return { ...datos, timestamp: Number(datos.timestamp) };
}

/**
 * Sube un archivo a Cloudinary con barra de progreso.
 *
 * Se usa `XMLHttpRequest` y no `fetch` porque es la única forma de saber cuánto
 * lleva subido: con una conexión lenta, ver la barra avanzar es lo que evita
 * que el operario toque el botón cinco veces.
 */
export async function subirArchivo(
  archivo: Blob,
  nombre: string,
  onProgreso?: (porcentaje: number) => void
): Promise<string> {
  const firma = await pedirFirma();

  const formulario = new FormData();
  formulario.append("file", archivo, nombre);
  formulario.append("api_key", firma.apiKey);
  formulario.append("timestamp", String(firma.timestamp));
  formulario.append("signature", firma.signature);
  formulario.append("folder", firma.folder);

  return new Promise<string>((resolver, rechazar) => {
    const peticion = new XMLHttpRequest();
    peticion.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${firma.cloudName}/image/upload`
    );

    peticion.upload.onprogress = (evento) => {
      if (evento.lengthComputable && onProgreso) {
        onProgreso(Math.round((evento.loaded * 100) / evento.total));
      }
    };

    peticion.onerror = () => rechazar(new Error(ERROR_RED));
    peticion.ontimeout = () => rechazar(new Error(ERROR_RED));

    peticion.onload = () => {
      if (peticion.status < 200 || peticion.status >= 300) {
        rechazar(new Error(ERROR_RED));
        return;
      }
      try {
        const cuerpo: unknown = JSON.parse(peticion.responseText);
        const url =
          typeof cuerpo === "object" && cuerpo !== null
            ? (cuerpo as Record<string, unknown>).secure_url
            : undefined;
        if (typeof url !== "string" || url === "") {
          rechazar(new Error(ERROR_RED));
          return;
        }
        resolver(url);
      } catch {
        rechazar(new Error(ERROR_RED));
      }
    };

    peticion.send(formulario);
  });
}

interface SubirFotosProps {
  fotos: string[];
  onCambio: (fotos: string[]) => void;
  /** Cuántas hacen falta como mínimo. Se enseña en el contador. */
  minimo?: number;
  /** Tope: cuando se llega, el botón de la cámara desaparece. */
  maximo?: number;
  deshabilitado?: boolean;
  /** Frase que se lee encima del botón. */
  etiqueta?: string;
}

export function SubirFotos({
  fotos,
  onCambio,
  minimo = 1,
  maximo = 6,
  deshabilitado = false,
  etiqueta = "Toma una foto de cómo va el mueble",
}: SubirFotosProps) {
  const camara = useRef<HTMLInputElement | null>(null);
  const galeria = useRef<HTMLInputElement | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [error, setError] = useState("");
  const [fallidos, setFallidos] = useState<File[]>([]);
  /** Índice de la foto que se está a punto de borrar. `null` = ninguna. */
  const [porBorrar, setPorBorrar] = useState<number | null>(null);

  const completas = fotos.length >= minimo;
  const lleno = fotos.length >= maximo;

  async function subirLista(archivos: File[]) {
    if (archivos.length === 0) return;

    setSubiendo(true);
    setError("");
    setProgreso(0);

    const subidas: string[] = [];
    const noSubidos: File[] = [];
    let fallo = "";

    for (const archivo of archivos) {
      if (fotos.length + subidas.length >= maximo) break;
      try {
        const url = await subirArchivo(archivo, archivo.name || "foto.jpg", setProgreso);
        subidas.push(url);
      } catch (problema) {
        noSubidos.push(archivo);
        fallo = problema instanceof Error ? problema.message : ERROR_RED;
      }
    }

    // Lo que sí subió se guarda igual: nadie repite una foto que ya está.
    if (subidas.length > 0) onCambio([...fotos, ...subidas]);
    setFallidos(noSubidos);
    setError(fallo);
    setSubiendo(false);
    setProgreso(0);
  }

  function elegirArchivos(lista: FileList | null) {
    if (!lista || lista.length === 0) return;
    void subirLista(Array.from(lista));
  }

  /**
   * Borrar una foto nunca es inmediato: volver a fotografiar el mueble cuesta
   * un viaje al taller. Primero se pregunta, con dos botones grandes.
   */
  function quitar(indice: number) {
    onCambio(fotos.filter((_, posicion) => posicion !== indice));
    setPorBorrar(null);
  }

  return (
    <div>
      <p className="text-xl font-bold leading-tight text-brand-dark">{etiqueta}</p>
      <p
        className={cn(
          "mt-1 text-lg font-semibold",
          completas ? "text-green-700" : "text-brand-taupe"
        )}
        role="status"
      >
        {fotos.length} de {minimo} {minimo === 1 ? "foto" : "fotos"}
        {completas ? " — ya está" : ""}
      </p>

      {fotos.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-4">
          {fotos.map((foto, indice) => (
            <li key={`${foto}-${indice}`}>
              <span className="block h-32 w-32 overflow-hidden rounded-3xl border-2 border-brand-dark/10 bg-brand-sand">
                {/* eslint-disable-next-line @next/next/no-img-element -- foto recién subida por el operario */}
                <img
                  src={foto}
                  alt={`Foto ${indice + 1}`}
                  className="h-full w-full object-cover"
                />
              </span>
              {/*
                El botón de borrar va DEBAJO de la miniatura, con su palabra. Si
                se monta en la esquina de la foto, se toca sin querer al intentar
                mirarla y el operario pierde el trabajo hecho.
              */}
              <button
                type="button"
                onClick={() => setPorBorrar(indice)}
                disabled={deshabilitado || subiendo}
                aria-label={`Borrar la foto ${indice + 1}`}
                className="mt-2 flex h-12 w-32 items-center justify-center gap-2 rounded-2xl border-2 border-red-300 bg-red-50 text-base font-bold text-red-700 transition-transform active:scale-95 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-300"
              >
                <Trash2 className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>BORRAR</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {porBorrar !== null && fotos[porBorrar] !== undefined ? (
        <div
          role="alertdialog"
          aria-labelledby="titulo-borrar-foto"
          className="mt-4 rounded-3xl border-4 border-red-400 bg-red-50 p-5"
        >
          <p
            id="titulo-borrar-foto"
            className="text-xl font-bold leading-snug text-red-800"
          >
            ¿Borrar la foto {porBorrar + 1}?
          </p>
          <p className="mt-1 text-lg leading-relaxed text-red-800">
            Si la borras tendrás que volver a tomarla con la cámara.
          </p>
          {/* El botón seguro SIEMPRE arriba y el destructivo abajo, en toda la app. */}
          <div className="mt-5 space-y-3">
            <button
              type="button"
              onClick={() => setPorBorrar(null)}
              className={clasesBotonGrande("oscuro")}
            >
              <RotateCcw className="h-9 w-9 shrink-0" aria-hidden="true" />
              <span>NO, DEJARLA</span>
            </button>
            <button
              type="button"
              onClick={() => quitar(porBorrar)}
              className={clasesBotonGrande("rojo")}
            >
              <Trash2 className="h-9 w-9 shrink-0" aria-hidden="true" />
              <span>SÍ, BORRAR</span>
            </button>
          </div>
        </div>
      ) : null}

      {subiendo ? (
        <div className="mt-4 rounded-3xl border-2 border-sky-200 bg-sky-50 p-4">
          <p className="flex items-center gap-3 text-lg font-bold text-sky-900">
            <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />
            Guardando la foto… {progreso}%
          </p>
          <div
            className="mt-3 h-5 w-full overflow-hidden rounded-full bg-sky-200"
            role="progressbar"
            aria-valuenow={progreso}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Cuánto lleva subido"
          >
            <span
              className="block h-full rounded-full bg-sky-600 transition-all duration-200"
              style={{ width: `${progreso}%` }}
            />
          </div>
          <p className="mt-2 text-base text-sky-900">No cierres la pantalla todavía.</p>
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-3xl border-2 border-red-300 bg-red-50 p-4">
          <p className="flex items-start gap-3 text-lg font-semibold leading-snug text-red-800">
            <AlertTriangle className="mt-0.5 h-7 w-7 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
          {fallidos.length > 0 ? (
            <button
              type="button"
              onClick={() => void subirLista(fallidos)}
              disabled={deshabilitado || subiendo}
              className={cn(clasesBotonGrande("rojo"), "mt-4")}
            >
              <RotateCcw className="h-9 w-9 shrink-0" aria-hidden="true" />
              <span>REINTENTAR</span>
            </button>
          ) : null}
        </div>
      ) : null}

      {lleno ? (
        <p className="mt-4 rounded-2xl bg-brand-sand p-4 text-base leading-relaxed text-brand-taupe">
          Ya tienes {maximo} fotos, que son suficientes. Si quieres cambiar alguna, bórrala
          con el botón rojo.
        </p>
      ) : (
        <>
          <input
            ref={camara}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(evento) => {
              elegirArchivos(evento.target.files);
              evento.target.value = "";
            }}
          />
          <input
            ref={galeria}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(evento) => {
              elegirArchivos(evento.target.files);
              evento.target.value = "";
            }}
          />

          <button
            type="button"
            onClick={() => camara.current?.click()}
            disabled={deshabilitado || subiendo}
            aria-label="Abrir la cámara y tomar una foto"
            className="mt-5 flex h-32 w-full flex-col items-center justify-center gap-2 rounded-3xl border-4 border-dashed border-brand-accent/50 bg-brand-accent/5 text-brand-accent transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-accent/60 disabled:opacity-60"
          >
            <Camera className="h-14 w-14" aria-hidden="true" />
            <span className="text-xl font-bold uppercase tracking-tight">Tomar foto</span>
          </button>

          <button
            type="button"
            onClick={() => galeria.current?.click()}
            disabled={deshabilitado || subiendo}
            aria-label="Elegir una foto que ya está en el teléfono"
            className="mt-3 flex min-h-[56px] w-full items-center justify-center gap-3 rounded-3xl border-2 border-brand-dark/15 px-4 text-lg font-semibold text-brand-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-accent/60 disabled:opacity-60"
          >
            <ImagePlus className="h-7 w-7" aria-hidden="true" />
            <span>Elegir una foto del teléfono</span>
          </button>
        </>
      )}
    </div>
  );
}
