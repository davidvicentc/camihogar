"use client";

/**
 * Catálogo de pasos reutilizables, con su CRUD completo (§7).
 *
 * Es la lista de la que bebe el constructor de rutas: aquí el dueño añade y
 * quita pasos sin tocar código. Los pasos que vienen con el sistema se pueden
 * editar y desactivar, pero no eliminar (se explica en el diálogo).
 */

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Camera,
  Check,
  ClipboardList,
  Clock,
  Copy,
  EyeOff,
  Loader2,
  MapPin,
  Pencil,
  PenTool,
  PlusCircle,
  Power,
  ScanLine,
  Search,
  Sparkles,
  StickyNote,
  Trash2,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  ETIQUETAS_TIPO_PASO,
  PASOS_SUGERIDOS,
  iconoDePaso,
} from "@/lib/fabricacion/constantes";
import {
  activarPasoCatalogo,
  actualizarPasoCatalogo,
  crearPasoCatalogo,
  desactivarPasoCatalogo,
  duplicarPasoCatalogo,
  eliminarPasoCatalogo,
} from "@/lib/actions/fabricacion";
import type {
  CatalogoPasoDTO,
  EstacionDTO,
  RolDTO,
  TipoPaso,
} from "@/lib/types/fabricacion";
import { TIPOS_PASO } from "@/lib/types/fabricacion";
import { cn } from "@/lib/utils";
import {
  DialogoPaso,
  PASO_VACIO,
  aPasoPlantillaInput,
  claveDesdeNombre,
  valoresDesdePaso,
  valoresDesdeSugerido,
  type ValoresPaso,
} from "./catalogo-formulario-paso";
import {
  AvisosFabricacion,
  ChipBoton,
  DialogoConfirmar,
  EstadoVacio,
  avisarError,
  avisarExito,
} from "./ruta-ui";

interface EdicionCatalogo {
  /** `null` = paso nuevo. */
  paso: CatalogoPasoDTO | null;
  valores: ValoresPaso;
}

function Requisito({ icono: Icono, texto }: { icono: LucideIcon; texto: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-sand px-3 py-1 text-sm font-semibold text-brand-taupe">
      <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />
      {texto}
    </span>
  );
}

export interface CatalogoListadoProps {
  pasos: CatalogoPasoDTO[];
  estaciones: EstacionDTO[];
  roles: RolDTO[];
  verDesactivados: boolean;
}

export function CatalogoListado({
  pasos,
  estaciones,
  roles,
  verDesactivados,
}: CatalogoListadoProps) {
  const router = useRouter();
  const rutaActual = usePathname();
  const parametros = useSearchParams();
  const [, iniciarTransicion] = useTransition();

  const [busqueda, setBusqueda] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<TipoPaso | "">("");
  const [ocupadoId, setOcupadoId] = useState<string | null>(null);
  const [edicion, setEdicion] = useState<EdicionCatalogo | null>(null);
  const [aEliminar, setAEliminar] = useState<CatalogoPasoDTO | null>(null);
  const [restaurando, setRestaurando] = useState(false);

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return pasos.filter((paso) => {
      if (tipoFiltro !== "" && paso.tipo !== tipoFiltro) return false;
      if (texto === "") return true;
      return (
        paso.nombre.toLowerCase().includes(texto) ||
        paso.instrucciones.toLowerCase().includes(texto) ||
        (paso.estacionNombre ?? "").toLowerCase().includes(texto)
      );
    });
  }, [busqueda, pasos, tipoFiltro]);

  const porTipo = useMemo(() => {
    const mapa = new Map<TipoPaso, CatalogoPasoDTO[]>();
    for (const tipo of TIPOS_PASO) mapa.set(tipo, []);
    for (const paso of visibles) mapa.get(paso.tipo)?.push(paso);
    return mapa;
  }, [visibles]);

  function cambiarDesactivados(activo: boolean) {
    const nuevos = new URLSearchParams(parametros.toString());
    if (activo) nuevos.set("desactivados", "1");
    else nuevos.delete("desactivados");
    const consulta = nuevos.toString();
    iniciarTransicion(() => {
      router.push(consulta === "" ? rutaActual : `${rutaActual}?${consulta}`);
    });
  }

  async function accionDirecta(
    paso: CatalogoPasoDTO,
    ejecutar: () => Promise<{ ok: boolean; error?: string }>,
    mensajeExito: string
  ) {
    setOcupadoId(paso._id);
    const resultado = await ejecutar();
    setOcupadoId(null);

    if (!resultado.ok) {
      avisarError(resultado.error ?? "No pudimos hacerlo. Vuelve a intentarlo en un momento.");
      return;
    }
    avisarExito(mensajeExito);
    router.refresh();
  }

  /** Vuelve a crear los pasos de ejemplo que trae el sistema. */
  async function restaurarEjemplos() {
    setRestaurando(true);
    let creados = 0;
    for (const sugerido of PASOS_SUGERIDOS) {
      const valores = valoresDesdeSugerido(sugerido, estaciones);
      const resultado = await crearPasoCatalogo({
        ...aPasoPlantillaInput(valores),
        activo: true,
        orden: sugerido.orden,
      });
      if (resultado.ok) creados += 1;
    }
    setRestaurando(false);

    if (creados === 0) {
      avisarError(
        "No se creó ningún paso: puede que ya existan todos. Enciende «Ver desactivados» para comprobarlo."
      );
      return;
    }
    avisarExito(
      `Se añadieron ${creados} ${creados === 1 ? "paso de ejemplo" : "pasos de ejemplo"}. Edítalos a tu gusto.`
    );
    router.refresh();
  }

  return (
    <div className="space-y-6 text-lg">
      <AvisosFabricacion />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-brand-dark sm:text-4xl">
            Pasos del taller
          </h1>
          <p className="mt-1 text-base text-brand-taupe">
            {pasos.length} {pasos.length === 1 ? "paso" : "pasos"} · Son las piezas con las que se
            arman las rutas. Créalos una vez y úsalos en todas las rutas que quieras.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setEdicion({ paso: null, valores: { ...PASO_VACIO } })}
          aria-label="Crear un paso nuevo"
          className="h-16 bg-ember-gradient px-6 text-lg font-bold text-white shadow-ember [&_svg]:size-6 hover:brightness-[1.06]"
        >
          <PlusCircle className="h-6 w-6" aria-hidden="true" />
          CREAR PASO NUEVO
        </Button>
      </header>

      {/* Buscador y filtros */}
      <div className="space-y-3 rounded-3xl border border-brand-dark/5 bg-brand-card p-4 shadow-warm-sm">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-taupe"
            aria-hidden="true"
          />
          <Input
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Buscar un paso por su nombre…"
            aria-label="Buscar un paso"
            className="h-14 pl-12 text-lg"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <ChipBoton activo={tipoFiltro === ""} etiqueta="Todos" onClick={() => setTipoFiltro("")} />
          {TIPOS_PASO.map((tipo) => {
            const meta = ETIQUETAS_TIPO_PASO[tipo];
            return (
              <ChipBoton
                key={tipo}
                activo={tipoFiltro === tipo}
                etiqueta={meta.label}
                icono={meta.icono}
                onClick={() => setTipoFiltro(tipo)}
              />
            );
          })}
        </div>

        <label
          htmlFor="ver-desactivados"
          className="flex min-h-[44px] cursor-pointer items-center justify-between gap-4 rounded-2xl border border-brand-dark/10 bg-white p-3"
        >
          <span>
            <span className="flex items-center gap-2 text-lg font-semibold text-brand-dark">
              <EyeOff className="h-5 w-5 text-brand-taupe" aria-hidden="true" />
              Ver desactivados
            </span>
            <span className="mt-0.5 block text-base text-brand-taupe">
              Los pasos que dejaron de ofrecerse al armar rutas. Se pueden volver a activar.
            </span>
          </span>
          <Switch
            id="ver-desactivados"
            checked={verDesactivados}
            onCheckedChange={cambiarDesactivados}
            aria-label="Ver los pasos desactivados"
            className="shrink-0 scale-[1.4] origin-right"
          />
        </label>
      </div>

      {/* Listado */}
      {pasos.length === 0 ? (
        <EstadoVacio
          icono={ClipboardList}
          titulo="Todavía no hay pasos"
          descripcion="Puedes crear el primero a tu manera o traer los pasos de ejemplo del taller (diseño, corte, lijado, tapizado, entrega…) y cambiarlos a tu gusto."
        >
          <div className="space-y-3">
            <Button
              type="button"
              onClick={restaurarEjemplos}
              disabled={restaurando}
              aria-label="Traer los pasos de ejemplo"
              className="h-16 w-full bg-ember-gradient text-lg font-bold text-white shadow-ember [&_svg]:size-6 hover:brightness-[1.06]"
            >
              {restaurando ? (
                <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-6 w-6" aria-hidden="true" />
              )}
              {restaurando ? "AÑADIENDO PASOS…" : "TRAER LOS PASOS DE EJEMPLO"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEdicion({ paso: null, valores: { ...PASO_VACIO } })}
              aria-label="Crear un paso nuevo desde cero"
              className="h-14 w-full text-base font-bold [&_svg]:size-5"
            >
              <PlusCircle className="h-5 w-5" aria-hidden="true" />
              CREAR UN PASO DESDE CERO
            </Button>
          </div>
        </EstadoVacio>
      ) : visibles.length === 0 ? (
        <EstadoVacio
          icono={Search}
          titulo="No encontramos ningún paso así"
          descripcion="Prueba con otra palabra o quita el filtro para verlos todos otra vez."
        >
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setBusqueda("");
              setTipoFiltro("");
            }}
            aria-label="Ver todos los pasos otra vez"
            className="h-14 px-6 text-base font-bold"
          >
            VER TODOS
          </Button>
        </EstadoVacio>
      ) : (
        <div className="space-y-8">
          {TIPOS_PASO.map((tipo) => {
            const lista = porTipo.get(tipo) ?? [];
            if (lista.length === 0) return null;
            const meta = ETIQUETAS_TIPO_PASO[tipo];
            const IconoTipo = meta.icono;

            return (
              <section key={tipo} aria-labelledby={`grupo-${tipo}`}>
                <h2
                  id={`grupo-${tipo}`}
                  className="flex items-center gap-2 font-display text-xl font-bold uppercase tracking-tight text-brand-dark"
                >
                  <IconoTipo className="h-6 w-6 text-brand-accent" aria-hidden="true" />
                  {meta.label}
                  <span className="text-base font-normal normal-case text-brand-taupe">
                    ({lista.length})
                  </span>
                </h2>

                <ul className="mt-3 space-y-3">
                  {lista.map((paso) => {
                    const Icono = iconoDePaso(paso.icono || paso.clave);
                    const ocupado = ocupadoId === paso._id;
                    const nombresRoles = paso.rolesPermitidos
                      .map((clave) => roles.find((rol) => rol.clave === clave)?.nombre ?? clave)
                      .join(", ");

                    return (
                      <li
                        key={paso._id}
                        className={cn(
                          "rounded-3xl border bg-brand-card p-5 shadow-warm-sm",
                          paso.activo ? "border-brand-dark/5" : "border-slate-300 bg-slate-50"
                        )}
                      >
                        <div className="flex items-start gap-4">
                          <span
                            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                            style={{ backgroundColor: `${paso.color}1A`, color: paso.color }}
                          >
                            <Icono className="h-7 w-7" aria-hidden="true" />
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-xl font-bold leading-tight text-brand-dark">
                                {paso.nombre}
                              </h3>
                              {paso.esSistema ? (
                                <span className="rounded-full border border-brand-dark/15 px-3 py-1 text-sm font-bold text-brand-taupe">
                                  VIENE CON EL SISTEMA
                                </span>
                              ) : null}
                              {paso.activo ? null : (
                                <span className="rounded-full border border-slate-400 bg-slate-200 px-3 py-1 text-sm font-bold text-slate-700">
                                  DESACTIVADO
                                </span>
                              )}
                            </div>

                            {paso.instrucciones !== "" ? (
                              <p className="mt-1 whitespace-pre-line text-base text-brand-taupe">
                                {paso.instrucciones}
                              </p>
                            ) : null}

                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <Requisito
                                icono={MapPin}
                                texto={
                                  paso.estacionNombre && paso.estacionNombre !== ""
                                    ? paso.estacionNombre
                                    : "En cualquier parte"
                                }
                              />
                              <Requisito
                                icono={Users}
                                texto={nombresRoles === "" ? "Lo hace cualquiera" : nombresRoles}
                              />
                              {paso.horasEstimadas > 0 ? (
                                <Requisito
                                  icono={Clock}
                                  texto={`${paso.horasEstimadas} ${
                                    paso.horasEstimadas === 1 ? "hora" : "horas"
                                  }`}
                                />
                              ) : null}
                              {paso.requiereFoto ? (
                                <Requisito
                                  icono={Camera}
                                  texto={`${paso.minFotos} ${paso.minFotos === 1 ? "foto" : "fotos"}`}
                                />
                              ) : null}
                              {paso.requiereEscaneo ? (
                                <Requisito icono={ScanLine} texto="Escanear" />
                              ) : null}
                              {paso.requiereFirma ? <Requisito icono={PenTool} texto="Firma" /> : null}
                              {paso.requiereNota ? <Requisito icono={StickyNote} texto="Nota" /> : null}
                              {paso.checklist.length > 0 ? (
                                <Requisito
                                  icono={ClipboardList}
                                  texto={`${paso.checklist.length} ${
                                    paso.checklist.length === 1 ? "comprobación" : "comprobaciones"
                                  }`}
                                />
                              ) : null}
                              <Requisito
                                icono={Check}
                                texto={
                                  (paso.usadoEnRutas ?? 0) === 0
                                    ? "No lo usa ninguna ruta"
                                    : `Lo usan ${paso.usadoEnRutas} ${
                                        (paso.usadoEnRutas ?? 0) === 1 ? "ruta" : "rutas"
                                      }`
                                }
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={ocupado}
                            onClick={() =>
                              setEdicion({ paso, valores: valoresDesdePaso(paso) })
                            }
                            aria-label={`Editar el paso ${paso.nombre}`}
                            className="h-14 px-5 text-base font-bold [&_svg]:size-5"
                          >
                            <Pencil className="h-5 w-5" aria-hidden="true" />
                            EDITAR
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            disabled={ocupado}
                            onClick={() =>
                              accionDirecta(
                                paso,
                                () => duplicarPasoCatalogo(paso._id),
                                `Se creó una copia de «${paso.nombre}».`
                              )
                            }
                            aria-label={`Duplicar el paso ${paso.nombre}`}
                            className="h-14 px-5 text-base font-bold [&_svg]:size-5"
                          >
                            <Copy className="h-5 w-5" aria-hidden="true" />
                            DUPLICAR
                          </Button>

                          {paso.activo ? (
                            <Button
                              type="button"
                              variant="outline"
                              disabled={ocupado}
                              onClick={() =>
                                accionDirecta(
                                  paso,
                                  () => desactivarPasoCatalogo(paso._id),
                                  `«${paso.nombre}» ya no se ofrecerá al armar rutas. Las rutas que lo tienen siguen igual.`
                                )
                              }
                              aria-label={`Desactivar el paso ${paso.nombre}`}
                              className="h-14 px-5 text-base font-bold [&_svg]:size-5"
                            >
                              <Power className="h-5 w-5" aria-hidden="true" />
                              DESACTIVAR
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              disabled={ocupado}
                              onClick={() =>
                                accionDirecta(
                                  paso,
                                  () => activarPasoCatalogo(paso._id),
                                  `«${paso.nombre}» vuelve a estar disponible.`
                                )
                              }
                              aria-label={`Activar el paso ${paso.nombre}`}
                              className="h-14 px-5 text-base font-bold [&_svg]:size-5"
                            >
                              <Power className="h-5 w-5" aria-hidden="true" />
                              ACTIVAR
                            </Button>
                          )}

                          <Button
                            type="button"
                            variant="outline"
                            disabled={ocupado}
                            onClick={() => setAEliminar(paso)}
                            aria-label={`Eliminar el paso ${paso.nombre}`}
                            className="h-14 px-5 text-base font-bold text-red-700 [&_svg]:size-5 hover:border-red-300 hover:bg-red-50 hover:text-red-800"
                          >
                            <Trash2 className="h-5 w-5" aria-hidden="true" />
                            ELIMINAR
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {/* Crear y editar comparten el mismo formulario */}
      {edicion ? (
        <DialogoPaso
          abierto
          onAbiertoChange={(abierto) => {
            if (!abierto) setEdicion(null);
          }}
          titulo={edicion.paso ? `Editar «${edicion.paso.nombre}»` : "Crear un paso nuevo"}
          descripcion={
            edicion.paso
              ? "Los cambios valen para las rutas que se armen de ahora en adelante. Las rutas y los muebles que ya existen no cambian."
              : "Este paso quedará guardado para usarlo en cualquier ruta."
          }
          inicial={edicion.valores}
          estaciones={estaciones}
          roles={roles}
          textoGuardar={edicion.paso ? "GUARDAR LOS CAMBIOS" : "CREAR EL PASO"}
          onGuardar={async (valores) => {
            const entrada = {
              ...aPasoPlantillaInput({
                ...valores,
                clave: valores.clave === "" ? claveDesdeNombre(valores.nombre) : valores.clave,
              }),
              activo: edicion.paso ? edicion.paso.activo : true,
            };

            const resultado = edicion.paso
              ? await actualizarPasoCatalogo(edicion.paso._id, entrada)
              : await crearPasoCatalogo(entrada);

            if (!resultado.ok) return { ok: false, error: resultado.error };

            avisarExito(
              edicion.paso
                ? `Se guardaron los cambios de «${valores.nombre}».`
                : `Se creó el paso «${valores.nombre}».`
            );
            router.refresh();
            return { ok: true };
          }}
          onGuardado={() => setEdicion(null)}
        />
      ) : null}

      {/* Eliminar */}
      {aEliminar ? (
        <DialogoConfirmar
          abierto
          onAbiertoChange={(abierto) => {
            if (!abierto) setAEliminar(null);
          }}
          titulo={`¿Eliminar el paso «${aEliminar.nombre}»?`}
          descripcion={
            aEliminar.esSistema
              ? "Este paso viene con el sistema, así que no se puede borrar. Lo que sí puedes hacer es desactivarlo."
              : (aEliminar.usadoEnRutas ?? 0) > 0
                ? `Este paso lo usan ${aEliminar.usadoEnRutas} ${
                    (aEliminar.usadoEnRutas ?? 0) === 1 ? "ruta" : "rutas"
                  }, así que no se puede borrar: se va a desactivar.`
                : "No lo usa ninguna ruta, así que se va a borrar del todo."
          }
          detalle={
            <ul className="list-disc space-y-1 pl-5 text-base text-brand-taupe">
              <li>
                <strong className="text-brand-dark">Se conserva:</strong> las rutas y los muebles
                que ya lo tienen siguen funcionando igual, con su copia del paso.
              </li>
              <li>
                <strong className="text-brand-dark">Se pierde:</strong> dejará de aparecer en la
                lista de pasos disponibles al armar rutas.
              </li>
              {aEliminar.esSistema || (aEliminar.usadoEnRutas ?? 0) > 0 ? (
                <li>Podrás volver a activarlo cuando quieras desde «Ver desactivados».</li>
              ) : null}
            </ul>
          }
          textoConfirmar={
            aEliminar.esSistema || (aEliminar.usadoEnRutas ?? 0) > 0
              ? "SÍ, DESACTIVAR"
              : "SÍ, ELIMINAR"
          }
          peligroso
          iconoConfirmar={aEliminar.esSistema ? Power : Trash2}
          onConfirmar={async () => {
            // Los pasos del sistema no se borran: la acción los rechaza, así que
            // aquí se desactivan directamente, que es la salida que se ofrece.
            if (aEliminar.esSistema) {
              const apagado = await desactivarPasoCatalogo(aEliminar._id);
              return {
                ok: apagado.ok,
                error: apagado.error,
                mensaje: `«${aEliminar.nombre}» quedó desactivado y ya no se ofrecerá al armar rutas.`,
              };
            }

            const resultado = await eliminarPasoCatalogo(aEliminar._id);
            if (!resultado.ok) return { ok: false, error: resultado.error };
            return {
              ok: true,
              mensaje: resultado.data?.mensaje ?? `Se eliminó el paso «${aEliminar.nombre}».`,
            };
          }}
          onHecho={() => {
            setAEliminar(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
