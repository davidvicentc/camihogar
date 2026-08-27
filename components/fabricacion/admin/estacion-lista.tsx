"use client";

/**
 * Pantalla de ÁREAS DE TRABAJO: CRUD completo (§7), listado agrupado por tipo
 * y reordenación con botones ▲▼ —nunca arrastrando, como pide el §9—.
 *
 * El orden se guarda de verdad: al mover una fila se recalcula el número de
 * orden de su grupo y se manda a `actualizarEstacion`.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  MapPinned,
  Pencil,
  Plus,
  RotateCcw,
  Sofa,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  TIPOS_ESTACION,
  type EstacionDTO,
  type TipoEstacion,
} from "@/lib/types/fabricacion";
import { ETIQUETAS_TIPO_ESTACION } from "@/lib/fabricacion/constantes";
import {
  activarEstacion,
  actualizarEstacion,
  desactivarEstacion,
  eliminarEstacion,
  restaurarEstacion,
} from "@/lib/actions/fabricacion";
import { cn } from "@/lib/utils";
import {
  BotonFila,
  BotonPrincipal,
  BuscadorGrande,
  CabeceraConfig,
  ChipFiltro,
  DialogoEliminar,
  EstadoVacio,
  InterruptorTexto,
  ToasterFabrica,
  avisoError,
  avisoExito,
} from "./config-compartido";
import { FormularioEstacion } from "./estacion-formulario";

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export interface PropsListaEstaciones {
  /** Todas las áreas: activas, apagadas y eliminadas. */
  estaciones: EstacionDTO[];
}

export function ListaEstaciones({ estaciones }: PropsListaEstaciones) {
  const router = useRouter();

  const [busqueda, setBusqueda] = React.useState("");
  const [filtroTipo, setFiltroTipo] = React.useState<TipoEstacion | "">("");
  const [verEliminadas, setVerEliminadas] = React.useState(false);
  const [ocupado, setOcupado] = React.useState(false);

  const [formularioAbierto, setFormularioAbierto] = React.useState(false);
  const [enEdicion, setEnEdicion] = React.useState<EstacionDTO | null>(null);

  const [aEliminar, setAEliminar] = React.useState<EstacionDTO | null>(null);
  const [bloqueo, setBloqueo] = React.useState<string | null>(null);

  const vivas = React.useMemo(
    () => estaciones.filter((area) => !area.eliminada),
    [estaciones]
  );
  const cuantasEliminadas = estaciones.length - vivas.length;

  const visibles = React.useMemo(() => {
    const patron = normalizar(busqueda.trim());
    return estaciones
      .filter((area) => (verEliminadas ? area.eliminada : !area.eliminada))
      .filter((area) => (filtroTipo === "" ? true : area.tipo === filtroTipo))
      .filter((area) => {
        if (patron === "") return true;
        return (
          normalizar(area.nombre).includes(patron) ||
          normalizar(area.direccion).includes(patron) ||
          normalizar(area.telefono).includes(patron)
        );
      });
  }, [estaciones, busqueda, filtroTipo, verEliminadas]);

  const grupos = React.useMemo(
    () =>
      TIPOS_ESTACION.map((tipo) => ({
        tipo,
        areas: visibles.filter((area) => area.tipo === tipo),
      })).filter((grupo) => grupo.areas.length > 0),
    [visibles]
  );

  // Mover con ▲▼ sólo tiene sentido cuando se ve el grupo entero.
  const puedeReordenar = busqueda.trim() === "" && !verEliminadas;

  function refrescar(): void {
    router.refresh();
  }

  async function mover(area: EstacionDTO, hacia: "arriba" | "abajo"): Promise<void> {
    const grupo = vivas.filter((otra) => otra.tipo === area.tipo);
    const desde = grupo.findIndex((otra) => otra._id === area._id);
    const hasta = hacia === "arriba" ? desde - 1 : desde + 1;
    if (desde < 0 || hasta < 0 || hasta >= grupo.length) return;

    const nuevoOrden = [...grupo];
    const [movida] = nuevoOrden.splice(desde, 1);
    nuevoOrden.splice(hasta, 0, movida);

    setOcupado(true);
    let fallo = "";
    for (let indice = 0; indice < nuevoOrden.length; indice += 1) {
      const actual = nuevoOrden[indice];
      if (actual.orden === indice) continue;
      const resultado = await actualizarEstacion(actual._id, {
        nombre: actual.nombre,
        orden: indice,
      });
      if (!resultado.ok) {
        fallo = resultado.error ?? "No pudimos cambiar el orden. Vuelve a intentarlo.";
        break;
      }
    }
    setOcupado(false);

    if (fallo !== "") {
      avisoError(fallo);
      return;
    }
    avisoExito(`«${area.nombre}» se movió ${hacia === "arriba" ? "hacia arriba" : "hacia abajo"}.`);
    refrescar();
  }

  async function alCambiarActiva(area: EstacionDTO): Promise<void> {
    setOcupado(true);
    const resultado = area.activa
      ? await desactivarEstacion(area._id)
      : await activarEstacion(area._id);
    setOcupado(false);

    if (!resultado.ok) {
      avisoError(resultado.error ?? "No pudimos cambiar el área. Vuelve a intentarlo.");
      return;
    }
    avisoExito(
      area.activa
        ? `El área «${area.nombre}» quedó apagada: ya no se puede elegir en sitios nuevos.`
        : `El área «${area.nombre}» vuelve a estar disponible.`
    );
    refrescar();
  }

  async function alRestaurar(area: EstacionDTO): Promise<void> {
    setOcupado(true);
    const resultado = await restaurarEstacion(area._id);
    setOcupado(false);

    if (!resultado.ok) {
      avisoError(resultado.error ?? "No pudimos recuperar el área. Vuelve a intentarlo.");
      return;
    }
    avisoExito(`El área «${area.nombre}» vuelve a estar en la lista.`);
    refrescar();
  }

  async function confirmarEliminar(): Promise<void> {
    if (!aEliminar) return;

    setOcupado(true);
    const resultado = await eliminarEstacion(aEliminar._id);
    setOcupado(false);

    if (!resultado.ok) {
      setBloqueo(resultado.error ?? "No pudimos eliminar el área. Vuelve a intentarlo.");
      return;
    }

    avisoExito(resultado.data?.mensaje ?? `Se eliminó el área «${aEliminar.nombre}».`);
    setAEliminar(null);
    setBloqueo(null);
    refrescar();
  }

  function abrirCreacion(): void {
    setEnEdicion(null);
    setFormularioAbierto(true);
  }

  return (
    <div className="space-y-8">
      <ToasterFabrica />

      <CabeceraConfig
        titulo="Áreas de trabajo"
        contador={`${vivas.length} ${vivas.length === 1 ? "área" : "áreas"}`}
        descripcion="Los sitios por los que pasa un mueble: talleres, almacenes, camiones y tiendas."
      >
        <BotonPrincipal icono={Plus} onClick={abrirCreacion} disabled={ocupado}>
          CREAR ÁREA NUEVA
        </BotonPrincipal>
      </CabeceraConfig>

      <div className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="lg:max-w-md lg:flex-1">
            <BuscadorGrande
              id="buscar-area"
              valor={busqueda}
              onChange={setBusqueda}
              etiqueta="Buscar un área por su nombre o su dirección"
              marcador="Buscar un área…"
            />
          </div>
          <InterruptorTexto
            id="ver-areas-eliminadas"
            activo={verEliminadas}
            onChange={setVerEliminadas}
            etiqueta="Ver eliminadas"
            ayuda={
              cuantasEliminadas === 0
                ? "No hay áreas eliminadas"
                : `Hay ${cuantasEliminadas} ${
                    cuantasEliminadas === 1 ? "área eliminada" : "áreas eliminadas"
                  }`
            }
          />
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tipo de área">
          <ChipFiltro
            activo={filtroTipo === ""}
            onClick={() => setFiltroTipo("")}
            icono={MapPinned}
            cantidad={vivas.length}
          >
            Todas
          </ChipFiltro>
          {TIPOS_ESTACION.map((tipo) => {
            const meta = ETIQUETAS_TIPO_ESTACION[tipo];
            const cantidad = vivas.filter((area) => area.tipo === tipo).length;
            return (
              <ChipFiltro
                key={tipo}
                activo={filtroTipo === tipo}
                onClick={() => setFiltroTipo(filtroTipo === tipo ? "" : tipo)}
                icono={meta.icono}
                cantidad={cantidad}
              >
                {meta.label}
              </ChipFiltro>
            );
          })}
        </div>
      </div>

      {estaciones.length === 0 ? (
        <EstadoVacio
          icono={MapPinned}
          titulo="Todavía no hay áreas de trabajo"
          mensaje="Crea la primera: el taller donde se arma el mueble, el almacén donde espera, el camión que lo lleva o la tienda donde se entrega."
        >
          <BotonPrincipal icono={Plus} onClick={abrirCreacion}>
            CREAR ÁREA NUEVA
          </BotonPrincipal>
        </EstadoVacio>
      ) : grupos.length === 0 ? (
        <EstadoVacio
          icono={MapPinned}
          titulo={
            verEliminadas ? "No hay áreas eliminadas" : "No encontramos ningún área así"
          }
          mensaje={
            verEliminadas
              ? "Apaga «Ver eliminadas» para volver a la lista de siempre."
              : "Prueba a escribir menos letras o quita el filtro de tipo."
          }
        />
      ) : (
        <div className="space-y-8">
          {grupos.map(({ tipo, areas }) => {
            const meta = ETIQUETAS_TIPO_ESTACION[tipo];
            const IconoTipo = meta.icono;
            const delGrupoVivas = vivas.filter((area) => area.tipo === tipo);

            return (
              <section key={tipo} className="space-y-3">
                <h2 className="flex items-center gap-3 font-display text-2xl font-bold tracking-tight text-brand-dark">
                  <span
                    aria-hidden="true"
                    className="flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${meta.color}1A`, color: meta.color }}
                  >
                    <IconoTipo className="h-6 w-6" />
                  </span>
                  {meta.label}
                  <span className="text-lg font-semibold text-brand-taupe">
                    ({areas.length})
                  </span>
                </h2>

                <div className="space-y-3">
                  {areas.map((area) => {
                    const posicion = delGrupoVivas.findIndex((otra) => otra._id === area._id);
                    const esPrimera = posicion <= 0;
                    const esUltima =
                      posicion === -1 || posicion === delGrupoVivas.length - 1;
                    const enUso = area.cantidadUnidades ?? 0;

                    return (
                      <Card
                        key={area._id}
                        className={cn(
                          "p-5",
                          (!area.activa || area.eliminada) && "opacity-75"
                        )}
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="flex min-w-0 items-start gap-3">
                            {puedeReordenar && !area.eliminada ? (
                              <div className="flex shrink-0 flex-col gap-1">
                                <button
                                  type="button"
                                  onClick={() => void mover(area, "arriba")}
                                  disabled={ocupado || esPrimera}
                                  aria-label={`Subir «${area.nombre}» en la lista`}
                                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand-dark/15 bg-brand-card text-brand-dark transition-colors hover:border-brand-accent hover:text-brand-accent disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                                >
                                  <ArrowUp className="h-5 w-5" aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void mover(area, "abajo")}
                                  disabled={ocupado || esUltima}
                                  aria-label={`Bajar «${area.nombre}» en la lista`}
                                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand-dark/15 bg-brand-card text-brand-dark transition-colors hover:border-brand-accent hover:text-brand-accent disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                                >
                                  <ArrowDown className="h-5 w-5" aria-hidden="true" />
                                </button>
                              </div>
                            ) : null}

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-display text-xl font-bold text-brand-dark">
                                  {area.nombre}
                                </h3>
                                {area.eliminada ? (
                                  <Badge variant="destructive" className="text-sm">
                                    Eliminada
                                  </Badge>
                                ) : area.activa ? null : (
                                  <Badge variant="muted" className="text-sm">
                                    Apagada
                                  </Badge>
                                )}
                              </div>

                              {area.direccion !== "" ? (
                                <p className="mt-1 text-base text-brand-taupe">
                                  {area.direccion}
                                </p>
                              ) : null}
                              {area.telefono !== "" ? (
                                <p className="text-base text-brand-taupe">
                                  Teléfono: {area.telefono}
                                </p>
                              ) : null}

                              <p className="mt-2 flex items-center gap-2 text-base font-semibold text-brand-dark">
                                <Sofa className="h-5 w-5 text-brand-taupe" aria-hidden="true" />
                                {enUso === 0
                                  ? "Ahora mismo no hay muebles aquí"
                                  : `${enUso} ${enUso === 1 ? "mueble está aquí ahora" : "muebles están aquí ahora"}`}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 lg:justify-end">
                            {area.eliminada ? (
                              <BotonFila
                                icono={RotateCcw}
                                onClick={() => void alRestaurar(area)}
                                disabled={ocupado}
                              >
                                Restaurar
                              </BotonFila>
                            ) : (
                              <>
                                <BotonFila
                                  icono={Pencil}
                                  onClick={() => {
                                    setEnEdicion(area);
                                    setFormularioAbierto(true);
                                  }}
                                  disabled={ocupado}
                                >
                                  Editar
                                </BotonFila>
                                <BotonFila
                                  icono={area.activa ? EyeOff : Eye}
                                  onClick={() => void alCambiarActiva(area)}
                                  disabled={ocupado}
                                >
                                  {area.activa ? "Desactivar" : "Activar"}
                                </BotonFila>
                                <BotonFila
                                  icono={Trash2}
                                  tono="peligro"
                                  onClick={() => {
                                    setAEliminar(area);
                                    setBloqueo(null);
                                  }}
                                  disabled={ocupado}
                                >
                                  Eliminar
                                </BotonFila>
                              </>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {!puedeReordenar ? (
            <p className="rounded-2xl bg-brand-sand/60 p-4 text-base text-brand-taupe">
              Las flechas para cambiar el orden aparecen cuando la lista está completa:
              borra la búsqueda y apaga «Ver eliminadas».
            </p>
          ) : null}
        </div>
      )}

      <FormularioEstacion
        abierto={formularioAbierto}
        onCerrar={() => setFormularioAbierto(false)}
        inicial={enEdicion}
        onGuardado={refrescar}
      />

      <DialogoEliminar
        abierto={aEliminar !== null}
        onCerrar={() => {
          if (ocupado) return;
          setAEliminar(null);
          setBloqueo(null);
        }}
        titulo={`¿Eliminar el área «${aEliminar?.nombre ?? ""}»?`}
        queSeConserva="El historial de los muebles que pasaron por aquí y los pasos que la mencionan."
        queSePierde="El área deja de aparecer para elegirla en pasos y personas."
        bloqueo={bloqueo}
        cargando={ocupado}
        onConfirmar={() => void confirmarEliminar()}
      />
    </div>
  );
}
