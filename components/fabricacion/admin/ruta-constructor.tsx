"use client";

/**
 * EL CONSTRUCTOR DE RUTAS. Es la pieza estrella de la configuración, así que
 * está hecho para que lo use cualquiera:
 *
 *  · A la izquierda, los pasos que ya existen, con un «+» enorme.
 *  · A la derecha, la ruta numerada 1, 2, 3… con botones SUBIR / BAJAR / QUITAR.
 *    Botones, nunca arrastrar: tiene que funcionar con dedos gruesos en táctil.
 *  · Debajo, la vista previa de cómo lo verá el trabajador en el teléfono.
 *
 * El mismo componente sirve para crear y para editar: si viene `rutaInicial`,
 * edita; si no, crea.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  MapPin,
  Pencil,
  Route as RouteIcon,
  Save,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  PLANTILLAS_RUTA,
  ETIQUETAS_TIPO_PASO,
  iconoDePaso,
  pasoSugerido,
} from "@/lib/fabricacion/constantes";
import { actualizarRuta, crearPasoCatalogo, crearRuta } from "@/lib/actions/fabricacion";
import type { RutaInput } from "@/lib/actions/fabricacion";
import type {
  CatalogoPasoDTO,
  EstacionDTO,
  RolDTO,
  RutaDTO,
} from "@/lib/types/fabricacion";
import { cn } from "@/lib/utils";
import {
  DialogoPaso,
  PASO_VACIO,
  aPasoPlantillaInput,
  claveDesdeNombre,
  valoresDesdePaso,
  valoresDesdeSugerido,
  validarPaso,
  type ValoresPaso,
} from "./catalogo-formulario-paso";
import { PanelCatalogo } from "./ruta-panel-catalogo";
import {
  AvisosFabricacion,
  DialogoConfirmar,
  FilaInterruptor,
  avisarExito,
  type ResultadoConfirmacion,
} from "./ruta-ui";
import { VistaPreviaOperario } from "./ruta-vista-previa";

/** Deja cada paso con una clave propia y distinta de las demás. */
function asignarClaves(pasos: ValoresPaso[]): ValoresPaso[] {
  const usadas = new Set<string>();
  return pasos.map((paso) => {
    const base = paso.clave.trim() !== "" ? paso.clave.trim() : claveDesdeNombre(paso.nombre);
    let candidata = base;
    let intento = 2;
    while (usadas.has(candidata)) {
      candidata = `${base}_${intento}`;
      intento += 1;
    }
    usadas.add(candidata);
    return { ...paso, clave: candidata };
  });
}

interface EdicionPaso {
  /** `null` = es un paso nuevo que todavía no está en la ruta. */
  indice: number | null;
  valores: ValoresPaso;
}

export interface RutaConstructorProps {
  rutaInicial?: RutaDTO | null;
  catalogo: CatalogoPasoDTO[];
  estaciones: EstacionDTO[];
  roles: RolDTO[];
  /** Nombre de la plantilla con la que arrancar (sólo al crear). */
  plantillaInicial?: string | null;
  /** Muebles que ya se están fabricando con esta ruta. */
  unidadesEnCurso?: number;
}

export function RutaConstructor({
  rutaInicial = null,
  catalogo,
  estaciones,
  roles,
  plantillaInicial = null,
  unidadesEnCurso = 0,
}: RutaConstructorProps) {
  const router = useRouter();
  const editando = Boolean(rutaInicial);

  /** Pasos de arranque: los de la ruta que se edita o los de una plantilla. */
  const arranque = useMemo(() => {
    if (rutaInicial) {
      return {
        nombre: rutaInicial.nombre,
        descripcion: rutaInicial.descripcion,
        categoria: rutaInicial.categoriaSugerida,
        predeterminada: rutaInicial.esPredeterminada,
        pasos: rutaInicial.pasos.map(valoresDesdePaso),
      };
    }

    const plantilla = PLANTILLAS_RUTA.find((opcion) => opcion.nombre === plantillaInicial);
    if (!plantilla) {
      return { nombre: "", descripcion: "", categoria: "", predeterminada: false, pasos: [] };
    }

    return {
      nombre: plantilla.nombre,
      descripcion: plantilla.descripcion,
      categoria: plantilla.categoriaSugerida,
      predeterminada: false,
      pasos: pasosDesdePlantilla(plantilla.pasos, catalogo, estaciones),
    };
  }, [catalogo, estaciones, plantillaInicial, rutaInicial]);

  const [nombre, setNombre] = useState(arranque.nombre);
  const [descripcion, setDescripcion] = useState(arranque.descripcion);
  const [categoria, setCategoria] = useState(arranque.categoria);
  const [predeterminada, setPredeterminada] = useState(arranque.predeterminada);
  const [pasos, setPasos] = useState<ValoresPaso[]>(arranque.pasos);
  const [edicion, setEdicion] = useState<EdicionPaso | null>(null);
  const [verVistaPrevia, setVerVistaPrevia] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Índice del paso que se va a quitar, mientras se confirma. */
  const [porQuitar, setPorQuitar] = useState<number | null>(null);
  const [confirmandoSalida, setConfirmandoSalida] = useState(false);
  /** Se pone en `true` al guardar bien: a partir de ahí ya no hay nada que perder. */
  const yaGuardado = useRef(false);

  /**
   * ¿Hay cambios sin guardar? Una ruta de nueve pasos son veinte minutos de
   * trabajo que viven sólo en esta pantalla hasta que se toca «GUARDAR LA RUTA».
   */
  const sucio =
    !yaGuardado.current &&
    (nombre !== arranque.nombre ||
      descripcion !== arranque.descripcion ||
      categoria !== arranque.categoria ||
      predeterminada !== arranque.predeterminada ||
      JSON.stringify(pasos) !== JSON.stringify(arranque.pasos));

  // Cerrar la pestaña o recargar con cambios sin guardar pide confirmación al
  // navegador. Los enlaces internos los frena el diálogo de aquí abajo.
  useEffect(() => {
    if (!sucio) return;
    function alSalir(evento: BeforeUnloadEvent) {
      evento.preventDefault();
      evento.returnValue = "";
    }
    window.addEventListener("beforeunload", alSalir);
    return () => window.removeEventListener("beforeunload", alSalir);
  }, [sucio]);

  const horasTotales = useMemo(
    () => Math.round(pasos.reduce((suma, paso) => suma + paso.horasEstimadas, 0) * 10) / 10,
    [pasos]
  );

  function mover(indice: number, direccion: -1 | 1) {
    const destino = indice + direccion;
    if (destino < 0 || destino >= pasos.length) return;
    const copia = [...pasos];
    const [movido] = copia.splice(indice, 1);
    copia.splice(destino, 0, movido);
    setPasos(copia);
  }

  /** ¿Este paso existe en el catálogo, es decir, se puede volver a añadir? */
  function estaEnCatalogo(clave: string): boolean {
    return clave !== "" && catalogo.some((paso) => paso.clave === clave);
  }

  /**
   * Quitar un paso de la ruta. Sólo se llama desde el diálogo de confirmación:
   * si el paso no está en el catálogo, quitarlo borra su configuración entera
   * (instrucciones, lista, roles y horas) y no hay forma de recuperarla.
   */
  function quitar(indice: number): string {
    const paso = pasos[indice];
    setPasos(pasos.filter((_, i) => i !== indice));
    setPorQuitar(null);
    return estaEnCatalogo(paso.clave)
      ? `Se quitó «${paso.nombre}» de la ruta. Sigue en el catálogo de la izquierda: puedes volver a añadirlo cuando quieras.`
      : `Se quitó «${paso.nombre}» de la ruta. No estaba en el catálogo, así que habrá que volver a crearlo si lo necesitas.`;
  }

  function agregarDelCatalogo(paso: CatalogoPasoDTO) {
    setPasos((actuales) => [...actuales, valoresDesdePaso(paso)]);
    setError(null);
    avisarExito(`Se añadió «${paso.nombre}» al final de tu ruta.`);
  }

  function usarPlantilla(nombrePlantilla: string) {
    const plantilla = PLANTILLAS_RUTA.find((opcion) => opcion.nombre === nombrePlantilla);
    if (!plantilla) return;
    setNombre((actual) => (actual.trim() === "" ? plantilla.nombre : actual));
    setDescripcion((actual) => (actual.trim() === "" ? plantilla.descripcion : actual));
    setCategoria((actual) => (actual.trim() === "" ? plantilla.categoriaSugerida : actual));
    setPasos(pasosDesdePlantilla(plantilla.pasos, catalogo, estaciones));
    setError(null);
    avisarExito(
      `Se cargaron los ${plantilla.pasos.length} pasos de «${plantilla.nombre}». Cámbialos a tu gusto y guarda.`
    );
  }

  /** Guardar el paso del diálogo: se mete en la ruta y, si se pidió, al catálogo. */
  async function guardarPasoDelDialogo(
    valores: ValoresPaso,
    guardarEnCatalogo: boolean
  ): Promise<ResultadoConfirmacion> {
    if (guardarEnCatalogo) {
      const resultado = await crearPasoCatalogo({
        ...aPasoPlantillaInput({
          ...valores,
          clave: valores.clave === "" ? claveDesdeNombre(valores.nombre) : valores.clave,
        }),
        activo: true,
      });
      if (!resultado.ok) {
        return {
          ok: false,
          error: `El paso no se pudo guardar en el catálogo: ${
            resultado.error ?? "vuelve a intentarlo."
          } Puedes apagar esa opción y usarlo sólo en esta ruta.`,
        };
      }
      avisarExito(`«${valores.nombre}» quedó guardado en el catálogo para reutilizarlo.`);
    }

    if (edicion?.indice === null || edicion === null) {
      setPasos((actuales) => [...actuales, valores]);
    } else {
      const indice = edicion.indice;
      setPasos((actuales) => actuales.map((paso, i) => (i === indice ? valores : paso)));
    }

    setError(null);
    return { ok: true };
  }

  async function guardarRuta() {
    setError(null);

    if (nombre.trim() === "") {
      setError("Ponle un nombre a la ruta, por ejemplo «Sofá tapizado completo».");
      return;
    }
    if (pasos.length === 0) {
      setError(
        "Tu ruta todavía no tiene pasos. Añade al menos uno con el botón «+» de la lista de la izquierda."
      );
      return;
    }

    for (let indice = 0; indice < pasos.length; indice += 1) {
      const problema = validarPaso(pasos[indice]);
      if (problema) {
        setError(`Revisa el paso ${indice + 1}: ${problema}`);
        return;
      }
    }

    const entrada: RutaInput = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      categoriaSugerida: categoria.trim(),
      esPredeterminada: predeterminada,
      pasos: asignarClaves(pasos).map(aPasoPlantillaInput),
    };

    setGuardando(true);
    const resultado = rutaInicial
      ? await actualizarRuta(rutaInicial._id, entrada)
      : await crearRuta(entrada);
    setGuardando(false);

    if (!resultado.ok) {
      setError(resultado.error ?? "No pudimos guardar la ruta. Vuelve a intentarlo en un momento.");
      return;
    }

    yaGuardado.current = true;
    avisarExito(
      editando
        ? `Se guardaron los cambios de «${entrada.nombre}».`
        : `Se creó la ruta «${entrada.nombre}» con ${pasos.length} ${
            pasos.length === 1 ? "paso" : "pasos"
          }.`
    );
    router.push("/admin/fabricacion/rutas");
    router.refresh();
  }

  const clavesEnRuta = pasos.map((paso) => paso.clave).filter((clave) => clave !== "");

  return (
    <div className="space-y-6 pb-28 text-lg">
      <AvisosFabricacion />

      <div>
        {/*
          Botón y no enlace: con nueve pasos configurados a mano, un toque aquí
          no puede llevarse el trabajo por delante sin preguntar.
        */}
        <button
          type="button"
          onClick={() => {
            if (sucio) {
              setConfirmandoSalida(true);
              return;
            }
            router.push("/admin/fabricacion/rutas");
          }}
          className="inline-flex min-h-[44px] items-center gap-2 text-base font-semibold text-brand-taupe hover:text-brand-accent"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          VOLVER A LAS RUTAS
        </button>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-brand-dark sm:text-4xl">
          {editando ? "Editar la ruta" : "Crear una ruta nueva"}
        </h1>
        <p className="mt-1 text-base text-brand-taupe">
          Una ruta es el camino de pasos que sigue un mueble desde que se corta la madera hasta que
          llega a la casa del cliente.
        </p>
      </div>

      {editando && unidadesEnCurso > 0 ? (
        <p className="flex items-start gap-3 rounded-3xl border border-amber-300 bg-amber-50 p-4 text-base text-amber-900">
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
          <span>
            <strong className="font-bold">Ojo: esta ruta ya se está usando.</strong> Los{" "}
            {unidadesEnCurso} {unidadesEnCurso === 1 ? "mueble que está" : "muebles que están"} en
            fabricación seguirán con la ruta anterior. Los nuevos usarán esta.
          </span>
        </p>
      ) : null}

      {/* Datos de la ruta */}
      <section className="space-y-4 rounded-3xl border border-brand-dark/5 bg-brand-card p-5 shadow-warm-sm">
        <div className="space-y-2">
          <Label htmlFor="ruta-nombre" className="text-lg font-semibold">
            ¿Cómo se llama esta ruta?
          </Label>
          <p className="text-base text-brand-taupe">
            Ponle el nombre del tipo de mueble que la va a usar.
          </p>
          <Input
            id="ruta-nombre"
            value={nombre}
            onChange={(evento) => setNombre(evento.target.value)}
            placeholder="Por ejemplo: Sofá tapizado completo"
            className="h-14 text-lg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ruta-descripcion" className="text-lg font-semibold">
            ¿Para qué sirve? (opcional)
          </Label>
          <Textarea
            id="ruta-descripcion"
            value={descripcion}
            onChange={(evento) => setDescripcion(evento.target.value)}
            placeholder="Por ejemplo: El camino completo de un sofá: madera, espuma, tela y entrega en la casa del cliente."
            className="min-h-[90px] text-lg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ruta-categoria" className="text-lg font-semibold">
            ¿A qué clase de muebles se le pone? (opcional)
          </Label>
          <p className="text-base text-brand-taupe">
            Se usa para proponerla sola cuando el pedido es de esa categoría.
          </p>
          <Input
            id="ruta-categoria"
            value={categoria}
            onChange={(evento) => setCategoria(evento.target.value)}
            placeholder="Por ejemplo: Salas"
            className="h-14 text-lg"
          />
        </div>

        <FilaInterruptor
          id="ruta-predeterminada"
          pregunta="¿Esta es la ruta que se propone sola?"
          ayuda="Al registrar un mueble nuevo sin elegir ruta, se usará esta. Sólo puede haber una."
          activo={predeterminada}
          onCambiar={setPredeterminada}
        />
      </section>

      {/* Plantillas de arranque */}
      {!editando && pasos.length === 0 ? (
        <section className="rounded-3xl border border-brand-dark/5 bg-brand-card p-5 shadow-warm-sm">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-brand-dark">
            <Sparkles className="h-6 w-6 text-brand-accent" aria-hidden="true" />
            ¿Prefieres empezar con una ruta ya armada?
          </h2>
          <p className="mt-1 text-base text-brand-taupe">
            Toca una y se cargan sus pasos. Después los cambias a tu gusto: quitas los que no usas y
            añades los tuyos.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {PLANTILLAS_RUTA.map((plantilla) => (
              <Button
                key={plantilla.nombre}
                type="button"
                variant="outline"
                onClick={() => usarPlantilla(plantilla.nombre)}
                aria-label={`Empezar con la ruta ${plantilla.nombre}, ${plantilla.pasos.length} pasos`}
                className="h-auto min-h-[5rem] flex-col items-start gap-1 whitespace-normal p-4 text-left text-base font-bold [&_svg]:size-5"
              >
                <span className="flex items-center gap-2">
                  <RouteIcon className="h-5 w-5" aria-hidden="true" />
                  {plantilla.nombre}
                </span>
                <span className="text-sm font-medium text-brand-taupe">
                  {plantilla.pasos.length} pasos listos
                </span>
              </Button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <PanelCatalogo
          catalogo={catalogo}
          clavesEnRuta={clavesEnRuta}
          onAgregar={agregarDelCatalogo}
          onCrearPasoNuevo={() => setEdicion({ indice: null, valores: { ...PASO_VACIO } })}
        />

        {/* Panel derecho: TU RUTA */}
        <section
          aria-labelledby="titulo-tu-ruta"
          className="rounded-3xl border border-brand-dark/5 bg-brand-card p-5 shadow-warm-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2
                id="titulo-tu-ruta"
                className="font-display text-xl font-bold uppercase tracking-tight text-brand-dark"
              >
                Tu ruta
              </h2>
              <p className="text-base text-brand-taupe">
                {pasos.length === 0
                  ? "Todavía no has puesto ningún paso."
                  : `${pasos.length} ${pasos.length === 1 ? "paso" : "pasos"}${
                      horasTotales > 0 ? ` · unas ${horasTotales} horas en total` : ""
                    }`}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setVerVistaPrevia((actual) => !actual)}
              aria-label={
                verVistaPrevia
                  ? "Ocultar cómo lo verá el trabajador"
                  : "Ver cómo lo verá el trabajador"
              }
              className="h-12 text-base font-bold [&_svg]:size-5"
            >
              {verVistaPrevia ? (
                <EyeOff className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Eye className="h-5 w-5" aria-hidden="true" />
              )}
              {verVistaPrevia ? "OCULTAR VISTA PREVIA" : "VER CÓMO LO VERÁ EL TRABAJADOR"}
            </Button>
          </div>

          {pasos.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-brand-dark/15 p-8 text-center text-base text-brand-taupe">
              Empieza tocando el botón «+» de un paso de la izquierda. Los pasos se hacen en el
              orden en que los pongas aquí.
            </p>
          ) : (
            <ol className="mt-4 space-y-3">
              {pasos.map((paso, indice) => (
                <FilaPaso
                  key={`${paso.clave}-${indice}`}
                  paso={paso}
                  indice={indice}
                  total={pasos.length}
                  estaciones={estaciones}
                  roles={roles}
                  onSubir={() => mover(indice, -1)}
                  onBajar={() => mover(indice, 1)}
                  onQuitar={() => setPorQuitar(indice)}
                  onEditar={() => setEdicion({ indice, valores: paso })}
                />
              ))}
            </ol>
          )}

          {verVistaPrevia ? (
            <div className="mt-5">
              <h3 className="mb-2 font-display text-lg font-bold text-brand-dark">
                Así lo verá el trabajador
              </h3>
              <VistaPreviaOperario nombreRuta={nombre} pasos={pasos} />
            </div>
          ) : null}
        </section>
      </div>

      {error ? (
        <p
          role="alert"
          className="flex items-start gap-3 rounded-3xl border border-red-300 bg-red-50 p-4 text-base font-medium text-red-800"
        >
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}

      {/* Botón principal: uno solo en toda la pantalla */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-brand-dark/10 bg-brand-bg/95 p-3 backdrop-blur lg:pl-64">
        <div className="mx-auto w-full max-w-6xl">
          <Button
            type="button"
            onClick={guardarRuta}
            disabled={guardando}
            aria-label={editando ? "Guardar los cambios de la ruta" : "Guardar la ruta nueva"}
            className="h-20 w-full bg-ember-gradient text-xl font-bold text-white shadow-ember [&_svg]:size-7 hover:brightness-[1.06]"
          >
            {guardando ? (
              <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-7 w-7" aria-hidden="true" />
            )}
            {guardando ? "GUARDANDO…" : editando ? "GUARDAR LOS CAMBIOS" : "GUARDAR LA RUTA"}
          </Button>
        </div>
      </div>

      {edicion ? (
        <DialogoPaso
          abierto
          onAbiertoChange={(abierto) => {
            if (!abierto) setEdicion(null);
          }}
          titulo={edicion.indice === null ? "Un paso nuevo" : `Configurar «${edicion.valores.nombre}»`}
          descripcion={
            edicion.indice === null
              ? "Este paso se añadirá al final de tu ruta."
              : "Lo que cambies aquí vale sólo para esta ruta, salvo que lo guardes también en el catálogo."
          }
          inicial={edicion.valores}
          estaciones={estaciones}
          roles={roles}
          textoGuardar={edicion.indice === null ? "AÑADIR ESTE PASO" : "GUARDAR EL PASO"}
          opcionCatalogo={
            edicion.indice === null
              ? {
                  etiqueta: "¿Guardarlo también en el catálogo?",
                  ayuda: "Así te aparecerá en la lista de la izquierda para usarlo en otras rutas.",
                }
              : undefined
          }
          onGuardar={guardarPasoDelDialogo}
          onGuardado={() => setEdicion(null)}
        />
      ) : null}

      {porQuitar !== null && pasos[porQuitar] !== undefined ? (
        <DialogoConfirmar
          abierto
          onAbiertoChange={(abierto) => {
            if (!abierto) setPorQuitar(null);
          }}
          titulo={`¿Quitar «${pasos[porQuitar].nombre}» del paso ${porQuitar + 1}?`}
          descripcion={
            estaEnCatalogo(pasos[porQuitar].clave)
              ? "Se quita de esta ruta. El paso sigue guardado en el catálogo de la izquierda, así que puedes volver a añadirlo cuando quieras."
              : "Este paso NO está guardado en el catálogo. Si lo quitas se pierden sus instrucciones, su lista, sus roles y sus horas, y habrá que volver a escribirlo todo."
          }
          textoConfirmar="SÍ, QUITARLO"
          peligroso
          iconoConfirmar={X}
          onConfirmar={() =>
            Promise.resolve({ ok: true, mensaje: quitar(porQuitar) })
          }
        />
      ) : null}

      {confirmandoSalida ? (
        <DialogoConfirmar
          abierto
          onAbiertoChange={(abierto) => {
            if (!abierto) setConfirmandoSalida(false);
          }}
          titulo="Tienes cambios sin guardar"
          descripcion={
            pasos.length === 1
              ? "Tu ruta tiene 1 paso que todavía no está guardado. Si sales ahora se pierde."
              : `Tu ruta tiene ${pasos.length} pasos que todavía no están guardados. Si sales ahora se pierden.`
          }
          textoConfirmar="SÍ, SALIR Y PERDERLOS"
          textoCancelar="NO, SEGUIR AQUÍ"
          peligroso
          iconoConfirmar={ArrowLeft}
          onConfirmar={() => {
            yaGuardado.current = true;
            router.push("/admin/fabricacion/rutas");
            return Promise.resolve({ ok: true });
          }}
        />
      ) : null}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * PIEZAS INTERNAS
 * ──────────────────────────────────────────────────────────────────────────── */

/** Expande las claves de una plantilla usando el catálogo real si existe. */
function pasosDesdePlantilla(
  claves: string[],
  catalogo: CatalogoPasoDTO[],
  estaciones: EstacionDTO[]
): ValoresPaso[] {
  const resultado: ValoresPaso[] = [];
  for (const clave of claves) {
    const delCatalogo = catalogo.find((paso) => paso.clave === clave);
    if (delCatalogo) {
      resultado.push(valoresDesdePaso(delCatalogo));
      continue;
    }
    const sugerido = pasoSugerido(clave);
    if (sugerido) resultado.push(valoresDesdeSugerido(sugerido, estaciones));
  }
  return resultado;
}

function FilaPaso({
  paso,
  indice,
  total,
  estaciones,
  roles,
  onSubir,
  onBajar,
  onQuitar,
  onEditar,
}: {
  paso: ValoresPaso;
  indice: number;
  total: number;
  estaciones: EstacionDTO[];
  roles: RolDTO[];
  onSubir: () => void;
  onBajar: () => void;
  onQuitar: () => void;
  onEditar: () => void;
}) {
  const Icono = iconoDePaso(paso.icono || paso.clave);
  const metaTipo = ETIQUETAS_TIPO_PASO[paso.tipo];
  const area = estaciones.find((estacion) => estacion._id === paso.estacionId);
  const nombresRoles = paso.rolesPermitidos
    .map((clave) => roles.find((rol) => rol.clave === clave)?.nombre ?? clave)
    .join(", ");

  return (
    <li className="relative pl-6">
      {/* Línea conectora entre pasos */}
      {indice < total - 1 ? (
        <span
          className="absolute left-[0.6rem] top-14 h-[calc(100%-2rem)] w-0.5 rounded-full bg-brand-dark/10"
          aria-hidden="true"
        />
      ) : null}
      <span
        className="absolute left-0 top-6 h-5 w-5 rounded-full border-4 border-brand-card"
        style={{ backgroundColor: paso.color }}
        aria-hidden="true"
      />

      <div className="rounded-2xl border border-brand-dark/10 bg-white p-4">
        <button
          type="button"
          onClick={onEditar}
          aria-label={`Configurar el paso ${indice + 1}: ${paso.nombre}`}
          className="flex w-full items-start gap-3 text-left"
        >
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${paso.color}1A`, color: paso.color }}
          >
            <Icono className="h-7 w-7" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold uppercase tracking-wide text-brand-taupe">
              Paso {indice + 1} de {total}
            </span>
            <span className="block text-xl font-bold leading-tight text-brand-dark">
              {paso.nombre.trim() === "" ? "Paso sin nombre" : paso.nombre}
            </span>
            <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-base text-brand-taupe">
              <span className="inline-flex items-center gap-1">
                <metaTipo.icono className="h-4 w-4" aria-hidden="true" />
                {metaTipo.label}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {area ? area.nombre : "En cualquier parte"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-4 w-4" aria-hidden="true" />
                {nombresRoles === "" ? "Cualquiera" : nombresRoles}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-4 w-4" aria-hidden="true" />
                {paso.horasEstimadas} {paso.horasEstimadas === 1 ? "hora" : "horas"}
              </span>
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-brand-dark/15 px-3 py-1.5 text-sm font-bold text-brand-dark">
            <Pencil className="h-4 w-4" aria-hidden="true" />
            CONFIGURAR
          </span>
        </button>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onSubir}
            disabled={indice === 0}
            aria-label={`Subir el paso ${paso.nombre}`}
            className="h-14 text-base font-bold [&_svg]:size-6"
          >
            <ArrowUp className="h-6 w-6" aria-hidden="true" />
            SUBIR
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onBajar}
            disabled={indice === total - 1}
            aria-label={`Bajar el paso ${paso.nombre}`}
            className="h-14 text-base font-bold [&_svg]:size-6"
          >
            <ArrowDown className="h-6 w-6" aria-hidden="true" />
            BAJAR
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onQuitar}
            aria-label={`Quitar el paso ${paso.nombre} de la ruta`}
            // Rojo y con borde propio SIEMPRE, no sólo al pasar el ratón: tiene
            // que verse distinto de SUBIR y BAJAR aunque se mire de reojo.
            className={cn(
              "h-14 border-red-300 bg-red-50/70 text-base font-bold text-red-700 [&_svg]:size-6",
              "hover:border-red-400 hover:bg-red-100 hover:text-red-800"
            )}
          >
            <X className="h-6 w-6" aria-hidden="true" />
            QUITAR
          </Button>
        </div>
      </div>
    </li>
  );
}
