"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CircleSlash,
  ClipboardCheck,
  Clock,
  Loader2,
  MapPin,
  PartyPopper,
  PenLine,
  Play,
  Signature,
  X,
} from "lucide-react";

import { completarPaso, iniciarPaso, omitirPaso } from "@/lib/actions/fabricacion";
import { iconoDePaso } from "@/lib/fabricacion/constantes";
import { etiquetaRol, puedeCompletarPaso } from "@/lib/fabricacion/reglas";
import type {
  ChecklistRespuestaDTO,
  EvidenciaPaso,
  PasoUnidadDTO,
  SesionOperario,
  UnidadDTO,
} from "@/lib/types/fabricacion";
import { cn } from "@/lib/utils";
import { clasesBotonGrande } from "./boton-grande";
import { FirmaCanvas } from "./firma-canvas";
import { FotoMueble } from "./foto-mueble";
import { SubirFotos } from "./subir-fotos";

/**
 * EL ASISTENTE DEL PASO — una cosa por pantalla.
 *
 * Nunca se le enseñan al operario dos peticiones a la vez. Primero se explica
 * qué hay que hacer, luego se pide la foto, luego la lista, luego la nota,
 * luego la firma y al final un resumen con un solo botón verde. Arriba, siempre
 * "3 de 5" y un botón "ATRÁS" grande: se puede volver sin miedo.
 *
 * Las pantallas que no hacen falta ni se muestran: si el paso no pide foto, no
 * hay pantalla de foto.
 */

type Pantalla = "intro" | "foto" | "checklist" | "nota" | "firma" | "resumen";

interface ResultadoFinal {
  /** Nombre del paso que viene después. Vacío si el mueble ya está terminado. */
  siguienteNombre: string;
  /** Quién lo hará, en frase. */
  siguienteQuien: string;
  /** `true` si el paso se saltó en vez de terminarse: la pantalla lo dice. */
  saltado: boolean;
}

export interface AsistentePasoProps {
  codigo: string;
  tituloMueble: string;
  clienteNombre: string;
  imagenMueble: string;
  paso: PasoUnidadDTO;
  /** 1..totalPasos */
  numeroPaso: number;
  totalPasos: number;
  sesion: SesionOperario;
  /** clave de rol → nombre bonito, para decir "un Tapicero" y no "tapicero". */
  nombresRoles: Record<string, string>;
}

/** Parte las instrucciones en frases cortas: se leen mejor una debajo de otra. */
function frasesDe(texto: string): string[] {
  const limpio = (texto ?? "").trim();
  if (limpio === "") return [];
  const porLineas = limpio
    .split(/\r?\n+/)
    .map((linea) => linea.trim())
    .filter((linea) => linea !== "");
  if (porLineas.length > 1) return porLineas;
  return limpio
    .split(/(?:\.|;)\s+/)
    .map((frase) => frase.trim().replace(/\.$/, ""))
    .filter((frase) => frase !== "");
}

/** "un Tapicero o un Pintor" · "cualquiera del equipo". */
function quienPuedeHacerlo(
  roles: string[],
  nombres: Record<string, string>
): string {
  if (!Array.isArray(roles) || roles.length === 0) return "cualquiera del equipo";
  const etiquetas = roles.map((rol) => etiquetaRol(rol, nombres));
  if (etiquetas.length === 1) return `un ${etiquetas[0]}`;
  const ultima = etiquetas[etiquetas.length - 1];
  return `un ${etiquetas.slice(0, -1).join(", un ")} o un ${ultima}`;
}

/** El primer paso que queda por hacer después del que se acaba de terminar. */
function siguienteDe(unidad: UnidadDTO, claveActual: string): PasoUnidadDTO | null {
  const indice = unidad.pasos.findIndex((paso) => paso.clave === claveActual);
  const resto = indice < 0 ? unidad.pasos : unidad.pasos.slice(indice + 1);
  return (
    resto.find(
      (paso) => paso.estado !== "COMPLETADO" && paso.estado !== "OMITIDO"
    ) ?? null
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * EL BORRADOR: que una llamada de teléfono no cueste cuatro fotos
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Lo que el operario lleva hecho en el paso y todavía no ha mandado al
 * servidor. Se guarda en el propio teléfono a cada cambio, así que si se apaga,
 * si entra una llamada o si el paso se lo terminó otra persona, al volver está
 * todo donde lo dejó y no hay que volver a fotografiar el mueble.
 */
interface BorradorPaso {
  fotos: string[];
  nota: string;
  firmaUrl: string;
  respuestas: ChecklistRespuestaDTO[];
}

function claveBorrador(codigo: string, clavePaso: string): string {
  return `camihogar:borrador-paso:${codigo}:${clavePaso}`;
}

function esListaDeTextos(valor: unknown): valor is string[] {
  return Array.isArray(valor) && valor.every((item) => typeof item === "string");
}

function esBorrador(valor: unknown): valor is BorradorPaso {
  if (typeof valor !== "object" || valor === null) return false;
  const dato = valor as Record<string, unknown>;
  return (
    esListaDeTextos(dato.fotos) &&
    typeof dato.nota === "string" &&
    typeof dato.firmaUrl === "string" &&
    Array.isArray(dato.respuestas) &&
    dato.respuestas.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Record<string, unknown>).texto === "string" &&
        typeof (item as Record<string, unknown>).ok === "boolean"
    )
  );
}

/** Lee el borrador del teléfono. Nunca lanza: si no se puede, no hay borrador. */
function leerBorrador(codigo: string, clavePaso: string): BorradorPaso | null {
  if (typeof window === "undefined") return null;
  try {
    const crudo = window.localStorage.getItem(claveBorrador(codigo, clavePaso));
    if (crudo === null) return null;
    const dato: unknown = JSON.parse(crudo);
    return esBorrador(dato) ? dato : null;
  } catch {
    return null;
  }
}

function guardarBorrador(codigo: string, clavePaso: string, borrador: BorradorPaso) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      claveBorrador(codigo, clavePaso),
      JSON.stringify(borrador)
    );
  } catch {
    // Modo privado o memoria llena: se sigue trabajando sin red de seguridad.
  }
}

function olvidarBorrador(codigo: string, clavePaso: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(claveBorrador(codigo, clavePaso));
  } catch {
    // Da igual: el borrador viejo no estorba.
  }
}

export function AsistentePaso({
  codigo,
  tituloMueble,
  clienteNombre,
  imagenMueble,
  paso,
  numeroPaso,
  totalPasos,
  sesion,
  nombresRoles,
}: AsistentePasoProps) {
  const router = useRouter();

  const pantallas = useMemo<Pantalla[]>(() => {
    const lista: Pantalla[] = ["intro"];
    if (paso.requiereFoto) lista.push("foto");
    if (paso.checklist.length > 0) lista.push("checklist");
    if (paso.requiereNota) lista.push("nota");
    if (paso.requiereFirma) lista.push("firma");
    lista.push("resumen");
    return lista;
  }, [paso]);

  const [indice, setIndice] = useState(0);
  const [empezado, setEmpezado] = useState(paso.estado === "EN_CURSO");
  const [fotos, setFotos] = useState<string[]>(paso.fotos ?? []);
  const [nota, setNota] = useState(paso.nota ?? "");
  const [firmaUrl, setFirmaUrl] = useState(paso.firmaUrl ?? "");
  /*
   * Una casilla por línea de la lista, EN EL MISMO ORDEN que la lista del paso.
   * La identidad de una casilla es su POSICIÓN, no su texto: una lista puede
   * repetir la misma frase a propósito («Revisar costuras», una por cada lado)
   * y son dos comprobaciones distintas. Por eso lo guardado sólo se restaura si
   * viene de esa misma posición y con ese mismo texto.
   */
  const [respuestas, setRespuestas] = useState<ChecklistRespuestaDTO[]>(() =>
    paso.checklist.map((item, posicion) => {
      const previa = paso.checklistRespuestas[posicion];
      return { texto: item.texto, ok: previa?.texto === item.texto && previa.ok === true };
    })
  );
  const [error, setError] = useState("");
  const [final, setFinal] = useState<ResultadoFinal | null>(null);
  const [confirmandoSalida, setConfirmandoSalida] = useState(false);
  const [saltoAbierto, setSaltoAbierto] = useState(false);
  const [motivoSalto, setMotivoSalto] = useState("");
  const [errorSalto, setErrorSalto] = useState("");
  const [trabajando, iniciarTransicion] = useTransition();

  /** Lo que el servidor ya tiene guardado de este paso, para saber qué es nuevo. */
  const guardado = useRef({
    fotos: (paso.fotos ?? []).length,
    nota: (paso.nota ?? "").trim(),
    firmaUrl: paso.firmaUrl ?? "",
    marcadas: paso.checklistRespuestas.filter((respuesta) => respuesta.ok).length,
  });

  /* ── Rehidratar el borrador del teléfono al entrar ─────────────────── */
  useEffect(() => {
    const borrador = leerBorrador(codigo, paso.clave);
    if (!borrador) return;

    if (borrador.fotos.length > 0) setFotos(borrador.fotos);
    if (borrador.nota.trim() !== "") setNota(borrador.nota);
    if (borrador.firmaUrl !== "") setFirmaUrl(borrador.firmaUrl);
    if (borrador.respuestas.length > 0) {
      setRespuestas((actuales) =>
        actuales.map((respuesta, posicion) => {
          const previa = borrador.respuestas[posicion];
          return previa && previa.texto === respuesta.texto
            ? { ...respuesta, ok: previa.ok }
            : respuesta;
        })
      );
    }
  }, [codigo, paso.clave]);

  /* ── Guardar el borrador a cada cambio ─────────────────────────────── */
  useEffect(() => {
    guardarBorrador(codigo, paso.clave, { fotos, nota, firmaUrl, respuestas });
  }, [codigo, paso.clave, fotos, nota, firmaUrl, respuestas]);

  const pantalla = pantallas[indice];
  const minFotos = paso.minFotos > 0 ? paso.minFotos : 1;
  const IconoPaso = iconoDePaso(paso.icono || paso.clave);
  const instrucciones = frasesDe(paso.instrucciones);

  /*
   * "Se puede saltar" es la casilla que el dueño marca en el catálogo. Sólo se
   * ofrece mientras el paso sigue vivo: uno ya terminado no se salta, se
   * revierte (y eso es cosa del supervisor, desde el panel).
   */
  const puedeSaltar =
    paso.permiteOmitir && (paso.estado === "LISTO" || paso.estado === "EN_CURSO");
  const obligatoriosPendientes = paso.checklist.filter(
    (item, posicion) => item.obligatorio && respuestas[posicion]?.ok !== true
  ).length;

  const evidencia: EvidenciaPaso = {
    fotos,
    nota,
    firmaUrl,
    checklistRespuestas: respuestas,
    escaneoValidado: paso.escaneadoAt !== null,
  };

  /** ¿Hay evidencia que el servidor todavía no conoce? */
  const hayTrabajoSinGuardar =
    fotos.length > guardado.current.fotos ||
    nota.trim() !== guardado.current.nota ||
    firmaUrl !== guardado.current.firmaUrl ||
    respuestas.filter((respuesta) => respuesta.ok).length > guardado.current.marcadas;

  function atras() {
    setError("");
    if (indice === 0) {
      // Salir del asistente con fotos o notas sin mandar es la forma más fácil
      // de perder media mañana de trabajo: primero se pregunta.
      if (hayTrabajoSinGuardar) {
        setConfirmandoSalida(true);
        return;
      }
      router.push(`/fabrica/u/${codigo}`);
      return;
    }
    setIndice((actual) => actual - 1);
  }

  const salirDelPaso = useCallback(() => {
    setConfirmandoSalida(false);
    router.push(`/fabrica/u/${codigo}`);
  }, [codigo, router]);

  function adelante() {
    setError("");
    setIndice((actual) => Math.min(actual + 1, pantallas.length - 1));
  }

  function empezarYAvanzar() {
    setError("");
    if (empezado) {
      adelante();
      return;
    }
    iniciarTransicion(async () => {
      const resultado = await iniciarPaso(codigo, paso.clave);
      if (!resultado.ok) {
        setError(resultado.error ?? "No pudimos empezar el paso. Inténtalo otra vez.");
        return;
      }
      setEmpezado(true);
      setIndice((actual) => Math.min(actual + 1, pantallas.length - 1));
    });
  }

  function alternarCasilla(posicion: number) {
    setError("");
    setRespuestas((actuales) =>
      actuales.map((respuesta, indiceCasilla) =>
        indiceCasilla === posicion ? { ...respuesta, ok: !respuesta.ok } : respuesta
      )
    );
  }

  function terminar() {
    setError("");

    // Se comprueba aquí antes de molestar al servidor: el aviso sale al
    // instante y con las mismas palabras que usaría el servidor.
    const comprobacion = puedeCompletarPaso(
      { ...paso, estado: "EN_CURSO" },
      evidencia,
      sesion,
      nombresRoles
    );
    if (!comprobacion.ok) {
      setError(comprobacion.motivo ?? "Falta algo para poder terminar este paso.");
      return;
    }

    iniciarTransicion(async () => {
      const resultado = await completarPaso(codigo, paso.clave, evidencia);
      if (!resultado.ok || !resultado.data) {
        setError(
          resultado.error ?? "No pudimos guardar el paso. Vuelve a intentarlo."
        );
        return;
      }
      // Ya está en el servidor: el borrador del teléfono deja de hacer falta.
      olvidarBorrador(codigo, paso.clave);
      const siguiente = siguienteDe(resultado.data, paso.clave);
      setFinal({
        siguienteNombre: siguiente?.nombre ?? "",
        siguienteQuien: siguiente
          ? quienPuedeHacerlo(siguiente.rolesPermitidos, nombresRoles)
          : "",
        saltado: false,
      });
      router.refresh();
    });
  }

  /**
   * Saltar el paso. Sólo se ofrece cuando la ruta lo permite (`permiteOmitir`,
   * la casilla "Se puede saltar" del catálogo): un mueble sin barnizar no debe
   * quedarse atascado esperando un paso que no le toca.
   *
   * El motivo es obligatorio y queda para siempre en la bitácora del mueble,
   * así que se pide dentro del diálogo y el error del servidor se enseña ahí
   * mismo — no en un aviso que se esfuma antes de leerlo.
   */
  function confirmarSalto() {
    const razon = motivoSalto.trim();
    if (razon === "") {
      setErrorSalto("Escribe por qué se salta este paso. Queda anotado en el historial.");
      return;
    }

    iniciarTransicion(async () => {
      const resultado = await omitirPaso(codigo, paso.clave, razon);
      if (!resultado.ok || !resultado.data) {
        setErrorSalto(
          resultado.error ?? "No pudimos saltar el paso. Vuelve a intentarlo."
        );
        return;
      }
      olvidarBorrador(codigo, paso.clave);
      const siguiente = siguienteDe(resultado.data, paso.clave);
      setSaltoAbierto(false);
      setFinal({
        siguienteNombre: siguiente?.nombre ?? "",
        siguienteQuien: siguiente
          ? quienPuedeHacerlo(siguiente.rolesPermitidos, nombresRoles)
          : "",
        saltado: true,
      });
      router.refresh();
    });
  }

  /* ── Pantalla de éxito ──────────────────────────────────────────────── */
  if (final) {
    return (
      <section className="text-center">
        <span
          className={cn(
            "mx-auto flex h-28 w-28 items-center justify-center rounded-full",
            final.saltado
              ? "bg-slate-200 text-slate-600"
              : "bg-green-100 text-green-700"
          )}
          aria-hidden="true"
        >
          {final.saltado ? (
            <CircleSlash className="h-16 w-16" />
          ) : (
            <PartyPopper className="h-16 w-16" />
          )}
        </span>
        <h1 className="mt-6 text-4xl font-bold leading-tight text-brand-dark">
          {final.saltado ? "Listo, paso saltado." : "¡Muy bien! Paso terminado."}
        </h1>
        <p className="mt-3 text-xl leading-relaxed text-brand-taupe">
          {final.saltado ? (
            <>
              Quedó anotado que se saltó «{paso.nombre}» en el mueble{" "}
              <span className="font-mono font-bold text-brand-dark">{codigo}</span>, con
              tu nombre y el motivo que escribiste.
            </>
          ) : (
            <>
              Ya quedó guardado que terminaste «{paso.nombre}» en el mueble{" "}
              <span className="font-mono font-bold text-brand-dark">{codigo}</span>.
            </>
          )}
        </p>

        <div className="mt-7 rounded-3xl border-2 border-sky-200 bg-sky-50 p-5 text-left">
          {final.siguienteNombre === "" ? (
            <>
              <p className="text-xl font-bold text-sky-900">
                ¡Este mueble ya está terminado!
              </p>
              <p className="mt-2 text-lg leading-relaxed text-sky-900">
                No quedan más pasos. Ahora toca entregarlo al cliente.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold uppercase tracking-wide text-sky-700">
                Lo que sigue
              </p>
              <p className="mt-1 text-2xl font-bold leading-tight text-sky-900">
                {final.siguienteNombre}
              </p>
              <p className="mt-2 text-lg leading-relaxed text-sky-900">
                Lo hará {final.siguienteQuien}.
              </p>
            </>
          )}
        </div>

        <div className="mt-8 space-y-3">
          <Link href={`/fabrica/u/${codigo}`} className={clasesBotonGrande("verde")}>
            <Check className="h-9 w-9 shrink-0" aria-hidden="true" />
            <span>VER EL MUEBLE</span>
          </Link>
          <Link href="/fabrica" className={clasesBotonGrande("gris")}>
            <ArrowLeft className="h-9 w-9 shrink-0" aria-hidden="true" />
            <span>IR A MI TRABAJO</span>
          </Link>
        </div>
      </section>
    );
  }

  /* ── Cabecera común del asistente ───────────────────────────────────── */
  const porcentaje = Math.round(((numeroPaso - 1) * 100) / Math.max(totalPasos, 1));

  return (
    <section>
      <button
        type="button"
        onClick={atras}
        disabled={trabajando}
        aria-label={indice === 0 ? "Volver al mueble" : "Volver a la pantalla anterior"}
        className="flex min-h-[56px] items-center gap-3 rounded-3xl border-2 border-brand-dark/15 px-5 text-lg font-bold text-brand-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-accent/60 disabled:opacity-60"
      >
        <ArrowLeft className="h-7 w-7" aria-hidden="true" />
        <span>ATRÁS</span>
      </button>

      <div className="mt-5">
        <p className="text-lg font-bold uppercase tracking-wide text-brand-accent">
          Paso {numeroPaso} de {totalPasos}
        </p>
        <div
          className="mt-2 h-4 w-full overflow-hidden rounded-full bg-brand-sand"
          role="progressbar"
          aria-valuenow={porcentaje}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Cuánto lleva hecho este mueble"
        >
          <span
            className="block h-full rounded-full bg-brand-accent transition-all duration-500"
            style={{ width: `${porcentaje}%` }}
          />
        </div>
        <p className="mt-3 text-base font-semibold text-brand-taupe" role="status">
          Pantalla {indice + 1} de {pantallas.length}
        </p>
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

      {/* ── 1. Qué hay que hacer ─────────────────────────────────────── */}
      {pantalla === "intro" ? (
        <div className="mt-6">
          <div className="flex items-start gap-4">
            <span
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-brand-accent/10 text-brand-accent"
              aria-hidden="true"
            >
              <IconoPaso className="h-9 w-9" />
            </span>
            <div className="min-w-0">
              <h1 className="text-3xl font-bold leading-tight text-brand-dark">
                {paso.nombre}
              </h1>
              <p className="mt-1 text-lg text-brand-taupe">
                {tituloMueble} — para {clienteNombre}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {paso.estacionNombre ? (
              <span className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-brand-sand px-4 text-base font-semibold text-brand-taupe">
                <MapPin className="h-5 w-5" aria-hidden="true" />
                {paso.estacionNombre}
              </span>
            ) : null}
            {paso.horasEstimadas > 0 ? (
              <span className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-brand-sand px-4 text-base font-semibold text-brand-taupe">
                <Clock className="h-5 w-5" aria-hidden="true" />
                Suele llevar {paso.horasEstimadas} h
              </span>
            ) : null}
          </div>

          {instrucciones.length > 0 ? (
            <ul className="mt-6 space-y-3">
              {instrucciones.map((frase, posicion) => (
                <li
                  key={posicion}
                  className="flex items-start gap-3 rounded-3xl border-2 border-brand-dark/5 bg-brand-card p-4 text-lg leading-relaxed text-brand-dark"
                >
                  <span
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-accent/10 text-base font-bold text-brand-accent"
                    aria-hidden="true"
                  >
                    {posicion + 1}
                  </span>
                  <span>{frase}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 rounded-3xl bg-brand-sand p-4 text-lg leading-relaxed text-brand-taupe">
              Este paso no tiene instrucciones escritas. Hazlo como siempre y, si tienes
              dudas, pregunta a tu supervisor antes de empezar.
            </p>
          )}

          <QueSePide paso={paso} minFotos={minFotos} />

          <div className="mt-8">
            <button
              type="button"
              onClick={empezarYAvanzar}
              disabled={trabajando}
              className={clasesBotonGrande(empezado ? "ambar" : "azul")}
            >
              {trabajando ? (
                <Loader2 className="h-9 w-9 shrink-0 animate-spin" aria-hidden="true" />
              ) : (
                <Play className="h-9 w-9 shrink-0" aria-hidden="true" />
              )}
              <span>
                {trabajando
                  ? "UN MOMENTO…"
                  : empezado
                    ? "SEGUIR CON EL PASO"
                    : "EMPEZAR"}
              </span>
            </button>

            {puedeSaltar ? (
              <>
                <p className="mt-6 text-center text-lg leading-snug text-brand-taupe">
                  ¿Este mueble no necesita este paso?
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setErrorSalto("");
                    setSaltoAbierto(true);
                  }}
                  disabled={trabajando}
                  aria-label={`Saltar el paso ${paso.nombre} del mueble ${codigo}`}
                  className="mt-2 flex min-h-[4.5rem] w-full items-center justify-center gap-3 rounded-3xl border-4 border-slate-400 bg-slate-50 px-4 text-xl font-bold text-slate-700 transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <CircleSlash className="h-8 w-8 shrink-0" aria-hidden="true" />
                  <span>SALTAR ESTE PASO</span>
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* ── 2. La foto ───────────────────────────────────────────────── */}
      {pantalla === "foto" ? (
        <div className="mt-6">
          <SubirFotos
            fotos={fotos}
            onCambio={setFotos}
            minimo={minFotos}
            maximo={Math.max(minFotos, 6)}
            deshabilitado={trabajando}
          />
          <div className="mt-8">
            <button
              type="button"
              onClick={adelante}
              disabled={fotos.length < minFotos || trabajando}
              className={clasesBotonGrande("azul")}
            >
              <ArrowRight className="h-9 w-9 shrink-0" aria-hidden="true" />
              <span>SIGUIENTE</span>
            </button>
            {fotos.length < minFotos ? (
              <p className="mt-3 text-center text-lg font-semibold text-brand-taupe">
                {minFotos === 1
                  ? "Toma la foto para poder seguir."
                  : `Faltan ${minFotos - fotos.length} fotos para poder seguir.`}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* ── 3. La lista ──────────────────────────────────────────────── */}
      {pantalla === "checklist" ? (
        <div className="mt-6">
          <h2 className="text-2xl font-bold leading-tight text-brand-dark">
            Repasa y toca cada línea
          </h2>
          <p className="mt-1 text-lg text-brand-taupe">
            Toca la línea entera cuando lo hayas comprobado.
          </p>

          <ul className="mt-5 space-y-3">
            {paso.checklist.map((item, posicion) => {
              const marcada = respuestas[posicion]?.ok === true;
              return (
                <li key={`${posicion}-${item.texto}`}>
                  <button
                    type="button"
                    onClick={() => alternarCasilla(posicion)}
                    aria-pressed={marcada}
                    className={cn(
                      "flex min-h-[5rem] w-full items-center gap-4 rounded-3xl border-4 px-4 py-3 text-left text-lg font-semibold transition-all duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-300",
                      marcada
                        ? "border-green-500 bg-green-50 text-green-900"
                        : "border-brand-dark/10 bg-brand-card text-brand-dark"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-4",
                        marcada
                          ? "border-green-500 bg-green-500 text-white"
                          : "border-brand-dark/15 bg-transparent"
                      )}
                      aria-hidden="true"
                    >
                      {marcada ? <Check className="h-9 w-9" strokeWidth={3} /> : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block">{item.texto}</span>
                      {item.obligatorio ? null : (
                        <span className="mt-1 block text-base font-normal text-brand-taupe">
                          No hace falta marcarla
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-8">
            <button
              type="button"
              onClick={adelante}
              disabled={obligatoriosPendientes > 0 || trabajando}
              className={clasesBotonGrande("azul")}
            >
              <ArrowRight className="h-9 w-9 shrink-0" aria-hidden="true" />
              <span>SIGUIENTE</span>
            </button>
            {obligatoriosPendientes > 0 ? (
              <p className="mt-3 text-center text-lg font-semibold text-brand-taupe">
                {obligatoriosPendientes === 1
                  ? "Falta 1 línea por marcar."
                  : `Faltan ${obligatoriosPendientes} líneas por marcar.`}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* ── 4. La nota ───────────────────────────────────────────────── */}
      {pantalla === "nota" ? (
        <div className="mt-6">
          <label htmlFor="nota-paso" className="text-2xl font-bold leading-tight text-brand-dark">
            Escribe cómo quedó
          </label>
          <p className="mt-1 text-lg text-brand-taupe">
            Una o dos frases bastan. Lo leerá quien haga el paso siguiente.
          </p>
          <textarea
            id="nota-paso"
            value={nota}
            onChange={(evento) => setNota(evento.target.value)}
            rows={6}
            placeholder="Por ejemplo: quedó bien lijado, la pata izquierda llevaba un poco más de masilla."
            className="mt-4 w-full rounded-3xl border-2 border-brand-dark/15 bg-brand-card p-4 text-lg leading-relaxed text-brand-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-accent/60"
          />
          <div className="mt-8">
            <button
              type="button"
              onClick={adelante}
              disabled={nota.trim() === "" || trabajando}
              className={clasesBotonGrande("azul")}
            >
              <ArrowRight className="h-9 w-9 shrink-0" aria-hidden="true" />
              <span>SIGUIENTE</span>
            </button>
            {nota.trim() === "" ? (
              <p className="mt-3 text-center text-lg font-semibold text-brand-taupe">
                Escribe una nota corta para poder seguir.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* ── 5. La firma ──────────────────────────────────────────────── */}
      {pantalla === "firma" ? (
        <div className="mt-6">
          <FirmaCanvas
            firmaUrl={firmaUrl}
            onCambio={setFirmaUrl}
            deshabilitado={trabajando}
          />
          <div className="mt-8">
            <button
              type="button"
              onClick={adelante}
              disabled={firmaUrl === "" || trabajando}
              className={clasesBotonGrande("azul")}
            >
              <ArrowRight className="h-9 w-9 shrink-0" aria-hidden="true" />
              <span>SIGUIENTE</span>
            </button>
            {firmaUrl === "" ? (
              <p className="mt-3 text-center text-lg font-semibold text-brand-taupe">
                Guarda la firma para poder seguir.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* ── 6. ¿Todo listo? ──────────────────────────────────────────── */}
      {pantalla === "resumen" ? (
        <div className="mt-6">
          <h2 className="text-3xl font-bold leading-tight text-brand-dark">
            ¿Todo listo?
          </h2>
          <p className="mt-2 text-lg leading-relaxed text-brand-taupe">
            Mira que esté todo bien. Al tocar el botón verde, el paso queda terminado y
            se anota tu nombre.
          </p>

          <div className="mt-6 flex items-center gap-4 rounded-3xl border-2 border-brand-dark/5 bg-brand-card p-4">
            <FotoMueble
              src={imagenMueble}
              alt={tituloMueble}
              className="h-20 w-20 shrink-0"
            />
            <div className="min-w-0">
              <p className="font-mono text-2xl font-bold leading-none text-brand-dark">
                {codigo}
              </p>
              <p className="mt-1 truncate text-lg text-brand-taupe">{paso.nombre}</p>
            </div>
          </div>

          <ul className="mt-5 space-y-3">
            {paso.requiereFoto ? (
              <ResumenItem
                icono={Camera}
                titulo={`${fotos.length} ${fotos.length === 1 ? "foto tomada" : "fotos tomadas"}`}
              >
                {fotos.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {fotos.map((foto, posicion) => (
                      <span
                        key={`${foto}-${posicion}`}
                        className="h-20 w-20 overflow-hidden rounded-2xl border-2 border-brand-dark/10 bg-brand-sand"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- foto recién subida por el operario */}
                        <img
                          src={foto}
                          alt={`Foto ${posicion + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </span>
                    ))}
                  </div>
                ) : null}
              </ResumenItem>
            ) : null}

            {paso.checklist.length > 0 ? (
              <ResumenItem
                icono={ClipboardCheck}
                titulo={`${respuestas.filter((r) => r.ok).length} de ${paso.checklist.length} líneas marcadas`}
              />
            ) : null}

            {paso.requiereNota ? (
              <ResumenItem icono={PenLine} titulo="Tu nota">
                <p className="mt-2 text-lg leading-relaxed text-brand-dark">{nota}</p>
              </ResumenItem>
            ) : null}

            {paso.requiereFirma ? (
              <ResumenItem icono={Signature} titulo="Firma del cliente">
                {firmaUrl ? (
                  <span className="mt-2 block h-24 w-full overflow-hidden rounded-2xl border-2 border-brand-dark/10 bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element -- firma recién subida por el operario */}
                    <img
                      src={firmaUrl}
                      alt="Firma del cliente"
                      className="h-full w-full object-contain"
                    />
                  </span>
                ) : null}
              </ResumenItem>
            ) : null}
          </ul>

          <div className="mt-8 space-y-3">
            <button
              type="button"
              onClick={terminar}
              disabled={trabajando}
              className={clasesBotonGrande("verde", "min-h-[6rem] text-2xl")}
            >
              {trabajando ? (
                <Loader2 className="h-10 w-10 shrink-0 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="h-10 w-10 shrink-0" strokeWidth={3} aria-hidden="true" />
              )}
              <span>{trabajando ? "GUARDANDO…" : "SÍ, YA TERMINÉ ESTE PASO"}</span>
            </button>
            <button
              type="button"
              onClick={atras}
              disabled={trabajando}
              className={clasesBotonGrande("gris")}
            >
              <ArrowLeft className="h-9 w-9 shrink-0" aria-hidden="true" />
              <span>NO, REVISAR OTRA VEZ</span>
            </button>
          </div>
        </div>
      ) : null}

      {/* ── Confirmación al salir con trabajo sin mandar ─────────────── */}
      {confirmandoSalida ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-brand-dark/70 p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="titulo-salir-paso"
        >
          <div className="w-full max-w-lg rounded-3xl border-4 border-amber-400 bg-brand-bg p-6">
            <h2
              id="titulo-salir-paso"
              className="text-2xl font-bold leading-tight text-brand-dark"
            >
              ¿Salir sin terminar el paso?
            </h2>
            <p className="mt-3 text-lg leading-relaxed text-brand-taupe">
              {fotos.length > 0
                ? `Guardamos ${fotos.length === 1 ? "tu foto" : `tus ${fotos.length} fotos`} en este teléfono, pero el paso no queda terminado y nadie más lo ve hasta que toques el botón verde.`
                : "Guardamos lo que llevas escrito en este teléfono, pero el paso no queda terminado hasta que toques el botón verde."}
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
                onClick={salirDelPaso}
                className={clasesBotonGrande("gris")}
              >
                <ArrowLeft className="h-9 w-9 shrink-0" aria-hidden="true" />
                <span>SÍ, SALIR</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Saltar el paso: el motivo es obligatorio y queda anotado ─── */}
      {saltoAbierto ? (
        <div
          className="fixed inset-0 z-[80] overflow-y-auto bg-brand-bg"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-saltar-paso"
        >
          <div className="mx-auto w-full max-w-2xl px-4 pb-12 pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2
                  id="titulo-saltar-paso"
                  className="text-3xl font-bold leading-tight text-brand-dark"
                >
                  ¿Por qué se salta?
                </h2>
                <p className="mt-1 text-lg text-brand-taupe">
                  Mueble <span className="font-mono font-bold">{codigo}</span> —{" "}
                  {paso.nombre}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (trabajando) return;
                  setSaltoAbierto(false);
                  setErrorSalto("");
                }}
                aria-label="Cerrar sin saltar el paso"
                className="flex min-h-[52px] shrink-0 items-center justify-center gap-2 rounded-2xl border-2 border-brand-dark/15 px-4 text-lg font-bold text-brand-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-accent/60"
              >
                <X className="h-7 w-7 shrink-0" aria-hidden="true" />
                <span>CERRAR</span>
              </button>
            </div>

            <p className="mt-6 rounded-3xl border-2 border-amber-300 bg-amber-50 p-4 text-lg leading-relaxed text-amber-900">
              El paso se dará por cerrado sin hacerlo y el mueble seguirá con el
              siguiente. Queda anotado en el historial con tu nombre y con lo que
              escribas aquí.
            </p>

            <div className="mt-6">
              <label
                htmlFor="motivo-salto"
                className="text-xl font-bold text-brand-dark"
              >
                Cuéntanos por qué
              </label>
              <textarea
                id="motivo-salto"
                value={motivoSalto}
                onChange={(evento) => {
                  setMotivoSalto(evento.target.value);
                  setErrorSalto("");
                }}
                rows={6}
                placeholder="Por ejemplo: este mueble va sin barnizar, el cliente lo pidió en madera natural."
                className="mt-2 w-full rounded-3xl border-2 border-brand-dark/15 bg-brand-card p-4 text-lg leading-relaxed text-brand-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-accent/60"
              />
            </div>

            {errorSalto ? (
              <p
                role="alert"
                className="mt-6 flex items-start gap-3 rounded-3xl border-2 border-red-300 bg-red-50 p-4 text-lg font-semibold leading-snug text-red-800"
              >
                <AlertTriangle className="mt-0.5 h-7 w-7 shrink-0" aria-hidden="true" />
                <span>{errorSalto}</span>
              </p>
            ) : null}

            <div className="mt-8 space-y-3">
              <button
                type="button"
                onClick={confirmarSalto}
                disabled={trabajando}
                className={clasesBotonGrande("oscuro")}
              >
                {trabajando ? (
                  <Loader2 className="h-9 w-9 shrink-0 animate-spin" aria-hidden="true" />
                ) : (
                  <CircleSlash className="h-9 w-9 shrink-0" aria-hidden="true" />
                )}
                <span>{trabajando ? "GUARDANDO…" : "SÍ, SALTAR ESTE PASO"}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (trabajando) return;
                  setSaltoAbierto(false);
                  setErrorSalto("");
                }}
                disabled={trabajando}
                className={clasesBotonGrande("gris")}
              >
                <ArrowLeft className="h-9 w-9 shrink-0" aria-hidden="true" />
                <span>NO, VOLVER</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

/** Lista de lo que este paso va a pedir, para que nadie se lleve sorpresas. */
function QueSePide({ paso, minFotos }: { paso: PasoUnidadDTO; minFotos: number }) {
  const cosas: { icono: typeof Camera; texto: string }[] = [];
  if (paso.requiereFoto) {
    cosas.push({
      icono: Camera,
      texto: minFotos === 1 ? "Una foto del mueble" : `${minFotos} fotos del mueble`,
    });
  }
  if (paso.checklist.length > 0) {
    cosas.push({
      icono: ClipboardCheck,
      texto:
        paso.checklist.length === 1
          ? "Marcar 1 cosa de una lista"
          : `Marcar ${paso.checklist.length} cosas de una lista`,
    });
  }
  if (paso.requiereNota) cosas.push({ icono: PenLine, texto: "Una nota corta" });
  if (paso.requiereFirma) {
    cosas.push({ icono: Signature, texto: "La firma del cliente" });
  }

  if (cosas.length === 0) return null;

  return (
    <div className="mt-6 rounded-3xl border-2 border-sky-200 bg-sky-50 p-5">
      <p className="text-lg font-bold text-sky-900">Al terminar te vamos a pedir:</p>
      <ul className="mt-3 space-y-2">
        {cosas.map((cosa) => (
          <li
            key={cosa.texto}
            className="flex items-center gap-3 text-lg leading-snug text-sky-900"
          >
            <cosa.icono className="h-6 w-6 shrink-0" aria-hidden="true" />
            <span>{cosa.texto}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResumenItem({
  icono: Icono,
  titulo,
  children,
}: {
  icono: typeof Camera;
  titulo: string;
  children?: React.ReactNode;
}) {
  return (
    <li className="rounded-3xl border-2 border-brand-dark/5 bg-brand-card p-4">
      <p className="flex items-center gap-3 text-lg font-bold text-brand-dark">
        <Icono className="h-7 w-7 shrink-0 text-green-600" aria-hidden="true" />
        {titulo}
      </p>
      {children}
    </li>
  );
}
