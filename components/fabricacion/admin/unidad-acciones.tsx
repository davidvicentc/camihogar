"use client";

/**
 * El panel de acciones de la ficha de un mueble (la pantalla del supervisor).
 *
 * Asignar responsable, cambiar urgencia o fecha, pausar y reanudar, resolver
 * un problema, cancelar y eliminar. Cada botón lleva icono + texto y sólo
 * aparece si quien mira tiene el permiso. Lo irreversible pasa siempre por el
 * diálogo de confirmación con sus dos botones grandes (§7).
 */

import { useState } from "react";
import Link from "next/link";
import {
  Ban,
  CalendarClock,
  CirclePause,
  Eye,
  Link2Off,
  Loader2,
  PackageCheck,
  Pencil,
  Play,
  Printer,
  RotateCcw,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DialogoConfirmar } from "@/components/fabricacion/admin/tablero-dialogo-confirmar";
import { useAccion } from "@/components/fabricacion/admin/tablero-avisos";
import { SelectorGrande } from "@/components/fabricacion/admin/pedido-formulario-cliente";
import {
  ChipSeveridad,
  fechaLarga,
  paraInputFecha,
  type PermisosPanel,
} from "@/components/fabricacion/admin/tablero-piezas";
import {
  asignarUnidad,
  cambiarFechaPrometida,
  cambiarPrioridad,
  cancelarUnidad,
  eliminarUnidad,
  marcarEntregada,
  pausarUnidad,
  reanudarUnidad,
  restaurarUnidad,
  resolverIncidencia,
} from "@/lib/actions/fabricacion";
import { ETIQUETAS_PRIORIDAD } from "@/lib/fabricacion/constantes";
import {
  PRIORIDADES,
  type IncidenciaDTO,
  type Prioridad,
  type UnidadDTO,
} from "@/lib/types/fabricacion";
import { cn } from "@/lib/utils";

/** Una persona del equipo, reducida a lo que hace falta para asignar. */
export interface OpcionResponsable {
  _id: string;
  nombre: string;
  rolNombre: string;
}

type Panel =
  | "responsable"
  | "prioridad"
  | "fecha"
  | "pausar"
  | "cancelar"
  | "eliminar"
  | "entregar"
  | "problema"
  | null;

export function AccionesUnidad({
  unidad,
  permisos,
  responsables,
  incidenciasAbiertas,
  seguimientoActivo,
  urlSeguimiento,
}: {
  unidad: UnidadDTO;
  permisos: PermisosPanel;
  responsables: OpcionResponsable[];
  incidenciasAbiertas: IncidenciaDTO[];
  seguimientoActivo: boolean;
  urlSeguimiento: string;
}) {
  const { ejecutando, ejecutar } = useAccion();
  const [panel, setPanel] = useState<Panel>(null);
  const [fecha, setFecha] = useState(() => paraInputFecha(unidad.fechaPrometida));
  const [problemaId, setProblemaId] = useState<string>(incidenciasAbiertas[0]?._id ?? "");
  const [resolucion, setResolucion] = useState("");
  const [errorProblema, setErrorProblema] = useState<string | null>(null);

  const viva =
    !unidad.eliminada && unidad.estado !== "CANCELADA" && unidad.estado !== "ENTREGADA";

  function resolverElProblema() {
    if (problemaId === "") {
      setErrorProblema("Elige cuál de los problemas vas a dar por resuelto.");
      return;
    }
    if (resolucion.trim().length < 3) {
      setErrorProblema("Escribe cómo se resolvió. Con una frase corta basta.");
      return;
    }
    setErrorProblema(null);
    ejecutar(() => resolverIncidencia(problemaId, resolucion.trim()), {
      exito: "Problema resuelto. El mueble puede seguir avanzando.",
      alTerminar: () => {
        setPanel(null);
        setResolucion("");
      },
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {permisos.gestionarUnidades && viva && (
          <Button
            type="button"
            variant="outline"
            className="h-14 text-base font-semibold"
            onClick={() => setPanel("responsable")}
          >
            <UserCheck className="!size-5" aria-hidden="true" />
            Asignar responsable
          </Button>
        )}

        {permisos.gestionarUnidades && viva && (
          <Button
            type="button"
            variant="outline"
            className="h-14 text-base font-semibold"
            onClick={() => setPanel("prioridad")}
          >
            <TriangleAlert className="!size-5" aria-hidden="true" />
            Cambiar la urgencia
          </Button>
        )}

        {permisos.gestionarUnidades && viva && (
          <Button
            type="button"
            variant="outline"
            className="h-14 text-base font-semibold"
            onClick={() => setPanel("fecha")}
          >
            <CalendarClock className="!size-5" aria-hidden="true" />
            Cambiar la fecha de entrega
          </Button>
        )}

        {permisos.gestionarUnidades && viva && unidad.estado === "PAUSADA" && (
          <Button
            type="button"
            variant="accent"
            className="h-14 text-base font-semibold"
            disabled={ejecutando}
            onClick={() =>
              ejecutar(() => reanudarUnidad(unidad.codigo), {
                exito: `${unidad.codigo} vuelve a estar en marcha.`,
              })
            }
          >
            {ejecutando ? (
              <Loader2 className="!size-5 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="!size-5" aria-hidden="true" />
            )}
            Reanudar el trabajo
          </Button>
        )}

        {permisos.gestionarUnidades && viva && unidad.estado !== "PAUSADA" && (
          <Button
            type="button"
            variant="outline"
            className="h-14 text-base font-semibold"
            onClick={() => setPanel("pausar")}
          >
            <CirclePause className="!size-5" aria-hidden="true" />
            Pausar el trabajo
          </Button>
        )}

        {permisos.resolverIncidencias && incidenciasAbiertas.length > 0 && (
          <Button
            type="button"
            variant="accent"
            className="h-14 text-base font-semibold"
            onClick={() => setPanel("problema")}
          >
            <ShieldCheck className="!size-5" aria-hidden="true" />
            Resolver el problema
          </Button>
        )}

        {permisos.gestionarUnidades && unidad.estado === "TERMINADA" && !unidad.eliminada && (
          <Button
            type="button"
            variant="outline"
            className="h-14 text-base font-semibold text-teal-700"
            onClick={() => setPanel("entregar")}
          >
            <PackageCheck className="!size-5" aria-hidden="true" />
            Marcar como entregado
          </Button>
        )}

        {permisos.gestionarUnidades && !unidad.eliminada && (
          <Button asChild variant="outline" className="h-14 text-base font-semibold">
            <Link href={`/admin/fabricacion/unidades/${unidad.codigo}/editar`}>
              <Pencil className="!size-5" aria-hidden="true" />
              Editar los datos
            </Link>
          </Button>
        )}

        {permisos.imprimirEtiquetas && (
          <Button asChild variant="outline" className="h-14 text-base font-semibold">
            <Link href={`/admin/fabricacion/etiquetas/${unidad.codigo}`}>
              <Printer className="!size-5" aria-hidden="true" />
              Imprimir la etiqueta
            </Link>
          </Button>
        )}

        {permisos.cancelarUnidades && viva && (
          <Button
            type="button"
            variant="outline"
            className="h-14 text-base font-semibold text-red-700"
            onClick={() => setPanel("cancelar")}
          >
            <Ban className="!size-5" aria-hidden="true" />
            Cancelar el mueble
          </Button>
        )}

        {permisos.eliminarPedidos && !unidad.eliminada && (
          <Button
            type="button"
            variant="outline"
            className="h-14 text-base font-semibold text-red-700"
            onClick={() => setPanel("eliminar")}
          >
            <Trash2 className="!size-5" aria-hidden="true" />
            Eliminar
          </Button>
        )}

        {permisos.eliminarPedidos && unidad.eliminada && (
          <Button
            type="button"
            variant="accent"
            className="h-14 text-base font-semibold"
            disabled={ejecutando}
            onClick={() =>
              ejecutar(() => restaurarUnidad(unidad.codigo), {
                exito: `${unidad.codigo} vuelve a estar en los listados.`,
              })
            }
          >
            {ejecutando ? (
              <Loader2 className="!size-5 animate-spin" aria-hidden="true" />
            ) : (
              <RotateCcw className="!size-5" aria-hidden="true" />
            )}
            Restaurar el mueble
          </Button>
        )}
      </div>

      {/* Ver como lo ve el cliente — sólo si el seguimiento está encendido */}
      {seguimientoActivo ? (
        <div className="mt-4">
          <Button asChild variant="ghost" className="h-12 text-base font-semibold">
            <a href={urlSeguimiento} target="_blank" rel="noopener noreferrer">
              <Eye className="!size-5" aria-hidden="true" />
              Ver como lo ve el cliente
            </a>
          </Button>
        </div>
      ) : (
        <p className="mt-4 flex items-start gap-2 rounded-2xl border border-brand-dark/10 bg-brand-sand/40 p-4 text-sm text-brand-taupe">
          <Link2Off className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          El seguimiento para clientes está apagado: por ahora esta información es sólo
          interna. Se enciende desde la configuración del sitio.
        </p>
      )}

      {/* ── Asignar responsable ─────────────────────────────────────────── */}
      <Dialog open={panel === "responsable"} onOpenChange={(abierto) => !abierto && setPanel(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              ¿Quién se encarga de {unidad.codigo}?
            </DialogTitle>
            <DialogDescription className="text-base">
              La persona verá este mueble en «lo mío» cuando entre a la app del taller.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <button
              type="button"
              disabled={ejecutando}
              onClick={() =>
                ejecutar(() => asignarUnidad(unidad.codigo, null), {
                  exito: `${unidad.codigo} quedó sin responsable.`,
                  alTerminar: () => setPanel(null),
                })
              }
              className={cn(
                "flex min-h-[64px] w-full items-center gap-3 rounded-2xl border-2 px-5 text-left text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent",
                unidad.asignadoAId === null
                  ? "border-brand-accent bg-brand-accent/10 text-brand-accent"
                  : "border-brand-dark/15 hover:border-brand-accent/40"
              )}
            >
              Sin responsable (cualquiera lo puede tomar)
            </button>

            {responsables.map((persona) => (
              <button
                key={persona._id}
                type="button"
                disabled={ejecutando}
                onClick={() =>
                  ejecutar(() => asignarUnidad(unidad.codigo, persona._id), {
                    exito: `${persona.nombre} es ahora responsable de ${unidad.codigo}.`,
                    alTerminar: () => setPanel(null),
                  })
                }
                className={cn(
                  "flex min-h-[64px] w-full flex-col justify-center rounded-2xl border-2 px-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent",
                  unidad.asignadoAId === persona._id
                    ? "border-brand-accent bg-brand-accent/10"
                    : "border-brand-dark/15 hover:border-brand-accent/40"
                )}
              >
                <span className="text-base font-semibold text-brand-dark">{persona.nombre}</span>
                <span className="text-sm text-brand-taupe">{persona.rolNombre}</span>
              </button>
            ))}

            {responsables.length === 0 && (
              <p className="rounded-2xl bg-brand-sand/60 p-4 text-base text-brand-taupe">
                Todavía no hay personas dadas de alta en el equipo.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Cambiar la urgencia ─────────────────────────────────────────── */}
      <Dialog open={panel === "prioridad"} onOpenChange={(abierto) => !abierto && setPanel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl">¿Qué tan urgente es este mueble?</DialogTitle>
            <DialogDescription className="text-base">
              Lo urgente se pone primero en el tablero del taller.
            </DialogDescription>
          </DialogHeader>

          <SelectorGrande<Prioridad>
            etiqueta="Urgencia"
            valor={unidad.prioridad}
            opciones={PRIORIDADES.map((prioridad) => ({
              valor: prioridad,
              texto: ETIQUETAS_PRIORIDAD[prioridad].label,
              icono: ETIQUETAS_PRIORIDAD[prioridad].icono,
            }))}
            alElegir={(nueva) =>
              ejecutar(() => cambiarPrioridad(unidad.codigo, nueva), {
                exito: `${unidad.codigo} quedó como ${ETIQUETAS_PRIORIDAD[nueva].label.toLowerCase()}.`,
                alTerminar: () => setPanel(null),
              })
            }
          />
        </DialogContent>
      </Dialog>

      {/* ── Cambiar la fecha de entrega ─────────────────────────────────── */}
      <Dialog open={panel === "fecha"} onOpenChange={(abierto) => !abierto && setPanel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl">¿Para cuándo hay que tenerlo?</DialogTitle>
            <DialogDescription className="text-base">
              Ahora mismo está prometido para {fechaLarga(unidad.fechaPrometida, "una fecha sin fijar")}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="nueva-fecha" className="text-base font-semibold">
              Nueva fecha
            </Label>
            <Input
              id="nueva-fecha"
              type="date"
              value={fecha}
              onChange={(evento) => setFecha(evento.target.value)}
              className="h-14 text-base"
            />
            <p className="text-sm text-brand-taupe">
              Déjala vacía si todavía no hay fecha comprometida.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className="h-16 text-lg font-bold"
              disabled={ejecutando}
              onClick={() => setPanel(null)}
            >
              NO, VOLVER
            </Button>
            <Button
              type="button"
              variant="accent"
              className="h-16 text-lg font-bold"
              disabled={ejecutando}
              onClick={() =>
                ejecutar(
                  () => cambiarFechaPrometida(unidad.codigo, fecha === "" ? null : fecha),
                  {
                    exito: "Guardamos la nueva fecha de entrega.",
                    alTerminar: () => setPanel(null),
                  }
                )
              }
            >
              GUARDAR LA FECHA
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Resolver un problema ────────────────────────────────────────── */}
      <Dialog open={panel === "problema"} onOpenChange={(abierto) => !abierto && setPanel(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Resolver el problema</DialogTitle>
            <DialogDescription className="text-base">
              Al resolverlo, el mueble deja de estar bloqueado y el taller puede seguir.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {incidenciasAbiertas.map((problema) => (
              <button
                key={problema._id}
                type="button"
                onClick={() => setProblemaId(problema._id)}
                aria-pressed={problemaId === problema._id}
                className={cn(
                  "w-full rounded-2xl border-2 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent",
                  problemaId === problema._id
                    ? "border-brand-accent bg-brand-accent/10"
                    : "border-brand-dark/15 hover:border-brand-accent/40"
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <ChipSeveridad severidad={problema.severidad} />
                  <span className="text-base font-semibold text-brand-dark">
                    {problema.motivo}
                  </span>
                </div>
                {problema.descripcion !== "" && (
                  <p className="mt-1 text-base text-brand-taupe">{problema.descripcion}</p>
                )}
                <p className="mt-1 text-sm text-brand-taupe">
                  Lo avisó {problema.reportadaPorNombre || "alguien"} ·{" "}
                  {fechaLarga(problema.createdAt)}
                  {problema.pasoNombre !== "" && ` · en «${problema.pasoNombre}»`}
                </p>
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="resolucion-problema" className="text-base font-semibold">
              ¿Cómo se resolvió?
            </Label>
            <Textarea
              id="resolucion-problema"
              value={resolucion}
              onChange={(evento) => setResolucion(evento.target.value)}
              placeholder="Se cambió la tela por una del mismo lote."
              className="min-h-[100px] text-base"
            />
            <p className="text-sm text-brand-taupe">
              Queda guardado con tu nombre y la fecha.
            </p>
          </div>

          {errorProblema && (
            <p
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-base text-red-800"
            >
              {errorProblema}
            </p>
          )}

          <Button
            type="button"
            variant="accent"
            className="h-20 w-full rounded-2xl text-xl font-bold"
            disabled={ejecutando}
            onClick={resolverElProblema}
          >
            {ejecutando ? (
              <Loader2 className="!size-7 animate-spin" aria-hidden="true" />
            ) : (
              <ShieldCheck className="!size-7" aria-hidden="true" />
            )}
            SÍ, YA ESTÁ RESUELTO
          </Button>
        </DialogContent>
      </Dialog>

      {/* ── Confirmaciones ──────────────────────────────────────────────── */}
      <DialogoConfirmar
        abierto={panel === "pausar"}
        alCerrar={() => setPanel(null)}
        tono="normal"
        titulo={`¿Pausar el mueble ${unidad.codigo}?`}
        descripcion="El trabajo se detiene hasta que alguien lo reanude. No se pierde nada de lo hecho."
        pideMotivo
        etiquetaMotivo="¿Por qué se pausa?"
        textoConfirmar="SÍ, PAUSAR"
        alConfirmar={(motivo) => pausarUnidad(unidad.codigo, motivo)}
        exito={() => `${unidad.codigo} quedó en pausa.`}
      />

      <DialogoConfirmar
        abierto={panel === "cancelar"}
        alCerrar={() => setPanel(null)}
        titulo={`¿Cancelar el mueble ${unidad.codigo}?`}
        descripcion="Este mueble ya no se fabricará. Se conservan su historial y sus fotos, y deja de contar para el pedido."
        pideMotivo
        etiquetaMotivo="¿Por qué se cancela?"
        textoConfirmar="SÍ, CANCELAR"
        alConfirmar={(motivo) => cancelarUnidad(unidad.codigo, motivo)}
        exito={() => `${unidad.codigo} quedó cancelado.`}
      />

      <DialogoConfirmar
        abierto={panel === "eliminar"}
        alCerrar={() => setPanel(null)}
        titulo={`¿Eliminar el mueble ${unidad.codigo}?`}
        descripcion="Desaparece de los listados. Si ya se había trabajado en él, se guarda todo su historial y podrás restaurarlo desde «Ver eliminados»."
        textoConfirmar="SÍ, ELIMINAR"
        alConfirmar={() => eliminarUnidad(unidad.codigo)}
        exito={(dato) => dato?.mensaje ?? "Mueble eliminado."}
      />

      <DialogoConfirmar
        abierto={panel === "entregar"}
        alCerrar={() => setPanel(null)}
        tono="normal"
        titulo={`¿Ya se le entregó ${unidad.codigo} al cliente?`}
        descripcion="Se marca como entregado con la fecha de hoy y deja de aparecer en el tablero del taller."
        textoConfirmar="SÍ, YA SE ENTREGÓ"
        alConfirmar={() => marcarEntregada(unidad.codigo)}
        exito={() => `${unidad.codigo} quedó como entregado.`}
      />
    </>
  );
}
