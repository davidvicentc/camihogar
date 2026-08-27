"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { reportarIncidencia } from "@/lib/actions/fabricacion";
import { ETIQUETAS_SEVERIDAD } from "@/lib/fabricacion/constantes";
import type { Severidad } from "@/lib/types/fabricacion";
import { cn } from "@/lib/utils";
import { clasesBotonGrande } from "./boton-grande";
import { SubirFotos } from "./subir-fotos";

/**
 * "Reportar un problema": el botón rojo de la ficha del mueble.
 *
 * Se elige el motivo de una lista de frases que ya se han oído en el taller
 * (nada de escribir si no hace falta), se dice si el mueble puede seguir o no,
 * y se puede añadir una foto. Con eso el supervisor ya sabe qué pasó.
 */

const MOTIVOS = [
  "Falta material",
  "El mueble salió con un defecto",
  "La tela o el color no son los que pidieron",
  "La medida no coincide",
  "Falta una herramienta o está dañada",
  "Otro problema",
] as const;

const MOTIVO_LIBRE = "Otro problema";

const AYUDA_SEVERIDAD: Record<Severidad, string> = {
  BAJA: "Se puede seguir trabajando",
  MEDIA: "Hay que arreglarlo pronto",
  ALTA: "El mueble no puede seguir",
};

interface DialogoProblemaProps {
  codigo: string;
  pasoClave: string;
  pasoNombre: string;
}

export function DialogoProblema({
  codigo,
  pasoClave,
  pasoNombre,
}: DialogoProblemaProps) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [motivoLibre, setMotivoLibre] = useState("");
  const [severidad, setSeveridad] = useState<Severidad>("MEDIA");
  const [descripcion, setDescripcion] = useState("");
  const [fotos, setFotos] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [confirmandoSalida, setConfirmandoSalida] = useState(false);
  const [enviando, iniciar] = useTransition();

  /** ¿Hay trabajo escrito o fotografiado que se perdería al cerrar? */
  const hayTrabajo =
    motivo !== "" ||
    motivoLibre.trim() !== "" ||
    descripcion.trim() !== "" ||
    fotos.length > 0;

  /**
   * Cerrar el parte tira las fotos del defecto y, peor, deja al supervisor sin
   * enterarse. Si hay algo escrito o fotografiado, primero se pregunta.
   */
  function cerrar() {
    if (enviando) return;
    if (hayTrabajo) {
      setConfirmandoSalida(true);
      return;
    }
    setAbierto(false);
    setError("");
  }

  /** Salir de verdad: se descarta lo escrito y las fotos tomadas. */
  function salirSinAvisar() {
    setConfirmandoSalida(false);
    setAbierto(false);
    setMotivo("");
    setMotivoLibre("");
    setDescripcion("");
    setFotos([]);
    setError("");
  }

  function enviar() {
    const texto = motivo === MOTIVO_LIBRE ? motivoLibre.trim() : motivo;

    if (motivo === "") {
      setError("Toca uno de los motivos de la lista para decir qué pasó.");
      return;
    }
    if (texto === "") {
      setError("Escribe en pocas palabras qué problema hubo.");
      return;
    }

    iniciar(async () => {
      const resultado = await reportarIncidencia(codigo, {
        pasoClave,
        motivo: texto,
        descripcion: descripcion.trim(),
        severidad,
        fotos,
      });

      if (!resultado.ok) {
        setError(resultado.error ?? "No pudimos avisar del problema. Inténtalo otra vez.");
        return;
      }

      toast.success("Listo, ya avisamos", {
        description: "Tu supervisor verá el problema en su pantalla.",
      });
      setAbierto(false);
      setConfirmandoSalida(false);
      setMotivo("");
      setMotivoLibre("");
      setDescripcion("");
      setFotos([]);
      setError("");
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label={`Reportar un problema con el mueble ${codigo}`}
        className="flex min-h-[4.5rem] w-full items-center justify-center gap-3 rounded-3xl border-4 border-red-500 bg-red-50 px-4 text-xl font-bold text-red-700 transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-300"
      >
        <AlertTriangle className="h-8 w-8 shrink-0" aria-hidden="true" />
        <span>REPORTAR UN PROBLEMA</span>
      </button>

      {abierto ? (
        <div
          className="fixed inset-0 z-[75] overflow-y-auto bg-brand-bg"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-problema"
        >
          <div className="mx-auto w-full max-w-2xl px-4 pb-12 pt-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="titulo-problema"
                  className="text-3xl font-bold leading-tight text-brand-dark"
                >
                  ¿Qué pasó?
                </h2>
                <p className="mt-1 text-lg text-brand-taupe">
                  Mueble <span className="font-mono font-bold">{codigo}</span>
                  {pasoNombre ? ` — ${pasoNombre}` : ""}
                </p>
              </div>
              {/* Icono Y texto siempre juntos (§0.2): una «X» sola no dice qué hace. */}
              <button
                type="button"
                onClick={cerrar}
                aria-label="Cerrar sin avisar del problema"
                className="flex min-h-[52px] shrink-0 items-center justify-center gap-2 rounded-2xl border-2 border-brand-dark/15 px-4 text-lg font-bold text-brand-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-accent/60"
              >
                <X className="h-7 w-7 shrink-0" aria-hidden="true" />
                <span>CERRAR</span>
              </button>
            </div>

            <fieldset className="mt-7">
              <legend className="text-xl font-bold text-brand-dark">
                Toca el motivo
              </legend>
              <ul className="mt-3 space-y-3">
                {MOTIVOS.map((opcion) => {
                  const elegido = motivo === opcion;
                  return (
                    <li key={opcion}>
                      <button
                        type="button"
                        onClick={() => {
                          setMotivo(opcion);
                          setError("");
                        }}
                        aria-pressed={elegido}
                        className={cn(
                          "flex h-20 w-full items-center gap-4 rounded-3xl border-4 px-4 text-left text-lg font-semibold transition-all duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-300",
                          elegido
                            ? "border-red-500 bg-red-50 text-red-800"
                            : "border-brand-dark/10 bg-brand-card text-brand-dark"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-4",
                            elegido
                              ? "border-red-500 bg-red-500 text-white"
                              : "border-brand-dark/15 bg-transparent"
                          )}
                          aria-hidden="true"
                        >
                          {elegido ? <Check className="h-7 w-7" /> : null}
                        </span>
                        <span>{opcion}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </fieldset>

            {motivo === MOTIVO_LIBRE ? (
              <div className="mt-5">
                <label
                  htmlFor="motivo-libre"
                  className="text-xl font-bold text-brand-dark"
                >
                  Cuéntanos en pocas palabras
                </label>
                <input
                  id="motivo-libre"
                  type="text"
                  value={motivoLibre}
                  onChange={(evento) => setMotivoLibre(evento.target.value)}
                  placeholder="Por ejemplo: se partió una pata"
                  className="mt-2 h-16 w-full rounded-3xl border-2 border-brand-dark/15 bg-brand-card px-4 text-lg text-brand-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-accent/60"
                />
              </div>
            ) : null}

            <fieldset className="mt-8">
              <legend className="text-xl font-bold text-brand-dark">
                ¿Se puede seguir trabajando?
              </legend>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {(Object.keys(AYUDA_SEVERIDAD) as Severidad[]).map((clave) => {
                  const meta = ETIQUETAS_SEVERIDAD[clave];
                  const Icono = meta.icono;
                  const elegida = severidad === clave;
                  return (
                    <button
                      key={clave}
                      type="button"
                      onClick={() => setSeveridad(clave)}
                      aria-pressed={elegida}
                      className={cn(
                        "flex min-h-[5rem] items-center gap-3 rounded-3xl border-4 px-4 py-3 text-left transition-all duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-accent/60",
                        elegida
                          ? "border-brand-accent bg-brand-accent/10"
                          : "border-brand-dark/10 bg-brand-card"
                      )}
                    >
                      <Icono
                        className="h-8 w-8 shrink-0"
                        style={{ color: meta.color }}
                        aria-hidden="true"
                      />
                      <span>
                        <span className="block text-lg font-bold text-brand-dark">
                          {meta.label}
                        </span>
                        <span className="block text-base text-brand-taupe">
                          {AYUDA_SEVERIDAD[clave]}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="mt-8">
              <label htmlFor="detalle-problema" className="text-xl font-bold text-brand-dark">
                ¿Quieres explicar algo más? (no hace falta)
              </label>
              <textarea
                id="detalle-problema"
                value={descripcion}
                onChange={(evento) => setDescripcion(evento.target.value)}
                rows={4}
                placeholder="Escribe aquí si hay algo que tu supervisor deba saber"
                className="mt-2 w-full rounded-3xl border-2 border-brand-dark/15 bg-brand-card p-4 text-lg leading-relaxed text-brand-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-accent/60"
              />
            </div>

            <div className="mt-8">
              <SubirFotos
                fotos={fotos}
                onCambio={setFotos}
                minimo={0}
                maximo={3}
                deshabilitado={enviando}
                etiqueta="Toma una foto del problema (ayuda mucho)"
              />
            </div>

            {error ? (
              <p
                role="alert"
                className="mt-6 flex items-start gap-3 rounded-3xl border-2 border-red-300 bg-red-50 p-4 text-lg font-semibold leading-snug text-red-800"
              >
                <AlertTriangle className="mt-0.5 h-7 w-7 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </p>
            ) : null}

            <div className="mt-8 space-y-3">
              <button
                type="button"
                onClick={enviar}
                disabled={enviando}
                className={clasesBotonGrande("rojo")}
              >
                {enviando ? (
                  <Loader2 className="h-9 w-9 shrink-0 animate-spin" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="h-9 w-9 shrink-0" aria-hidden="true" />
                )}
                <span>{enviando ? "AVISANDO…" : "SÍ, AVISAR DEL PROBLEMA"}</span>
              </button>
              <button
                type="button"
                onClick={cerrar}
                disabled={enviando}
                className={clasesBotonGrande("gris")}
              >
                <X className="h-9 w-9 shrink-0" aria-hidden="true" />
                <span>NO, VOLVER</span>
              </button>
            </div>

            {confirmandoSalida ? (
              <div
                className="fixed inset-0 z-[80] flex items-center justify-center bg-brand-dark/70 p-4"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="titulo-salir-problema"
              >
                <div className="w-full max-w-lg rounded-3xl border-4 border-red-400 bg-brand-bg p-6">
                  <h3
                    id="titulo-salir-problema"
                    className="text-2xl font-bold leading-tight text-brand-dark"
                  >
                    ¿Salir sin avisar del problema?
                  </h3>
                  <p className="mt-3 text-lg leading-relaxed text-brand-taupe">
                    {fotos.length === 0
                      ? "Se pierde lo que escribiste y tu supervisor no se enterará de nada."
                      : `Se pierden ${fotos.length === 1 ? "la foto que tomaste" : `las ${fotos.length} fotos que tomaste`} y tu supervisor no se enterará de nada.`}
                  </p>
                  <div className="mt-6 space-y-3">
                    <button
                      type="button"
                      onClick={() => setConfirmandoSalida(false)}
                      className={clasesBotonGrande("oscuro")}
                    >
                      <Check className="h-9 w-9 shrink-0" aria-hidden="true" />
                      <span>NO, SEGUIR AQUÍ</span>
                    </button>
                    <button
                      type="button"
                      onClick={salirSinAvisar}
                      className={clasesBotonGrande("gris")}
                    >
                      <X className="h-9 w-9 shrink-0" aria-hidden="true" />
                      <span>SÍ, SALIR</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
