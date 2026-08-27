"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Check, Loader2, UserPlus, Users } from "lucide-react";

import { iniciarSesionOperario } from "@/lib/actions/sesion-fabrica";
import type { OperarioLoginDTO } from "@/lib/data/fabricacion";
import { cn } from "@/lib/utils";
import { clasesBotonGrande } from "./boton-grande";
import { inicialDe } from "./formato";
import { TecladoNumerico } from "./teclado-numerico";

/**
 * La entrada al taller, en dos pantallas y ni una más:
 *
 *  1. **¿Quién eres?** — una tarjeta enorme por persona, con su inicial en un
 *     círculo de color. Se reconoce de un vistazo, sin leer.
 *  2. **Tu PIN** — teclado numérico gigante, puntos grandes de progreso y un
 *     botón verde para entrar.
 *
 * El error es siempre el mismo texto, venga de donde venga (§ de sesión), y se
 * pinta grande y en rojo, no en un aviso que se va solo.
 */

const LARGO_MINIMO = 4;
const LARGO_MAXIMO = 6;

interface EntradaTallerProps {
  personas: OperarioLoginDTO[];
  /** A dónde ir después de entrar. Ya viene comprobado por la página. */
  volver: string;
}

export function EntradaTaller({ personas, volver }: EntradaTallerProps) {
  const router = useRouter();
  const [elegida, setElegida] = useState<OperarioLoginDTO | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [fallos, setFallos] = useState(0);
  const [entrando, iniciar] = useTransition();
  const zonaPin = useRef<HTMLDivElement | null>(null);

  function elegirPersona(persona: OperarioLoginDTO) {
    setElegida(persona);
    setPin("");
    setError("");
    // Al cambiar de pantalla, el foco se va arriba del todo.
    window.requestAnimationFrame(() => zonaPin.current?.focus());
  }

  function volverALista() {
    setElegida(null);
    setPin("");
    setError("");
  }

  function escribir(digito: string) {
    setError("");
    setPin((actual) => (actual.length >= LARGO_MAXIMO ? actual : actual + digito));
  }

  function borrar() {
    setError("");
    setPin((actual) => actual.slice(0, -1));
  }

  function entrar() {
    if (!elegida || entrando) return;
    if (pin.length < LARGO_MINIMO) {
      setError(`Tu PIN tiene ${LARGO_MINIMO} números o más. Escríbelo completo.`);
      return;
    }

    iniciar(async () => {
      const resultado = await iniciarSesionOperario(elegida._id, pin);
      if (!resultado.ok) {
        setPin("");
        setFallos((n) => n + 1);
        setError(resultado.error ?? "Clave incorrecta. Inténtalo otra vez.");
        return;
      }
      router.replace(volver);
      router.refresh();
    });
  }

  /* ── Pantalla 2: el PIN ─────────────────────────────────────────────── */
  if (elegida) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-10 pt-6">
        <div
          ref={zonaPin}
          tabIndex={-1}
          className="flex items-center gap-4 focus-visible:outline-none"
        >
          <span
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-3xl font-bold text-white"
            style={{ backgroundColor: elegida.colorAvatar || "#E8511A" }}
            aria-hidden="true"
          >
            {inicialDe(elegida.nombre)}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-3xl font-bold leading-tight text-brand-dark">
              Hola, {elegida.nombre}
            </h1>
            <p className="text-lg text-brand-taupe">{elegida.rolNombre}</p>
          </div>
        </div>

        <p className="mt-6 text-xl font-semibold text-brand-dark">
          Escribe tu PIN para entrar
        </p>

        <div
          className="mt-4 flex justify-center gap-3"
          role="status"
          aria-label={`Llevas ${pin.length} números escritos`}
        >
          {Array.from({ length: LARGO_MAXIMO }, (_, indice) => {
            const escrito = indice < pin.length;
            const obligatorio = indice < LARGO_MINIMO;
            return (
              <span
                key={indice}
                aria-hidden="true"
                className={cn(
                  "h-6 w-6 rounded-full border-2 transition-colors",
                  escrito
                    ? "border-brand-accent bg-brand-accent"
                    : obligatorio
                      ? "border-brand-taupe/50 bg-transparent"
                      : "border-dashed border-brand-taupe/30 bg-transparent"
                )}
              />
            );
          })}
        </div>

        {error ? (
          <p
            role="alert"
            className="mt-5 flex items-start gap-3 rounded-3xl border-2 border-red-300 bg-red-50 p-4 text-lg font-semibold leading-snug text-red-800"
          >
            <AlertTriangle className="mt-0.5 h-7 w-7 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        ) : null}

        {entrando ? (
          <p
            role="status"
            className="mt-5 flex items-center justify-center gap-3 text-lg font-semibold text-brand-taupe"
          >
            <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />
            <span>Entrando…</span>
          </p>
        ) : null}

        <div className="mt-6">
          <TecladoNumerico
            onDigito={escribir}
            onBorrar={borrar}
            deshabilitado={entrando}
            accion={{
              icono: Check,
              etiqueta: "Entrar",
              onClick: entrar,
              deshabilitada: pin.length < LARGO_MINIMO,
            }}
          />
        </div>

        {fallos >= 3 ? (
          <p className="mt-5 rounded-2xl bg-brand-sand p-4 text-base leading-relaxed text-brand-taupe">
            ¿No te acuerdas del PIN? Pídele a tu supervisor que te lo vuelva a poner
            desde el panel. No pasa nada.
          </p>
        ) : null}

        <button
          type="button"
          onClick={volverALista}
          disabled={entrando}
          className="mt-6 flex min-h-[56px] w-full items-center justify-center gap-3 rounded-3xl border-2 border-brand-dark/15 px-4 text-lg font-bold text-brand-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-accent/60"
        >
          <ArrowLeft className="h-7 w-7" aria-hidden="true" />
          <span>CAMBIAR DE PERSONA</span>
        </button>
      </main>
    );
  }

  /* ── Pantalla 1: ¿quién eres? ───────────────────────────────────────── */
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-10 pt-8">
      <h1 className="text-4xl font-bold leading-tight tracking-tight text-brand-dark">
        ¿Quién eres?
      </h1>
      <p className="mt-2 text-lg text-brand-taupe">
        Toca tu nombre para entrar al taller.
      </p>

      {personas.length === 0 ? (
        <div className="mt-8 rounded-3xl border-2 border-dashed border-brand-taupe/30 bg-brand-card px-5 py-10 text-center">
          <span
            className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-brand-sand text-brand-taupe"
            aria-hidden="true"
          >
            <Users className="h-12 w-12" />
          </span>
          <h2 className="mt-6 text-2xl font-bold text-brand-dark">
            Todavía no hay nadie dado de alta
          </h2>
          <p className="mt-3 text-lg leading-relaxed text-brand-taupe">
            Quien administra el sistema tiene que crear las personas del equipo antes de
            poder entrar aquí.
          </p>
          <a href="/admin/fabricacion/equipo" className={cn(clasesBotonGrande("oscuro"), "mt-7")}>
            <UserPlus className="h-9 w-9 shrink-0" aria-hidden="true" />
            <span>IR AL PANEL</span>
          </a>
        </div>
      ) : (
        <ul className="mt-7 space-y-4">
          {personas.map((persona) => (
            <li key={persona._id}>
              <button
                type="button"
                onClick={() => elegirPersona(persona)}
                aria-label={`Entrar como ${persona.nombre}, ${persona.rolNombre}`}
                className="flex h-32 w-full items-center gap-5 rounded-3xl border-2 border-brand-dark/10 bg-brand-card px-5 text-left shadow-warm-sm transition-all duration-150 active:scale-[0.98] hover:border-brand-accent/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-accent/60"
              >
                <span
                  className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-4xl font-bold text-white"
                  style={{ backgroundColor: persona.colorAvatar || "#E8511A" }}
                  aria-hidden="true"
                >
                  {inicialDe(persona.nombre)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-2xl font-bold leading-tight text-brand-dark">
                    {persona.nombre}
                  </span>
                  <span className="mt-1 block truncate text-lg text-brand-taupe">
                    {persona.rolNombre}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
