"use client";

/**
 * La bandeja de problemas del taller.
 *
 * Va en tarjetas y no en una tabla porque cada problema trae fotos y una
 * explicación: en una fila no se leerían. Los graves sin resolver se pintan en
 * rojo y salen los primeros.
 */

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Camera,
  Eye,
  Loader2,
  Pencil,
  ShieldCheck,
  Trash2,
  X,
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
  ChipEstadoIncidencia,
  ChipSeveridad,
  Codigo,
  desdeHace,
  fechaLarga,
  type PermisosPanel,
} from "@/components/fabricacion/admin/tablero-piezas";
import {
  actualizarIncidencia,
  eliminarIncidencia,
  resolverIncidencia,
} from "@/lib/actions/fabricacion";
import { ETIQUETAS_SEVERIDAD } from "@/lib/fabricacion/constantes";
import { SEVERIDADES, type IncidenciaDTO, type Severidad } from "@/lib/types/fabricacion";
import { cn } from "@/lib/utils";

interface Edicion {
  id: string;
  motivo: string;
  descripcion: string;
  severidad: Severidad;
}

export function TablaIncidencias({
  incidencias,
  permisos,
  ahoraIso,
}: {
  incidencias: IncidenciaDTO[];
  permisos: PermisosPanel;
  ahoraIso: string;
}) {
  const { ejecutando, ejecutar } = useAccion();
  const [ampliada, setAmpliada] = useState<string | null>(null);
  const [resolviendo, setResolviendo] = useState<IncidenciaDTO | null>(null);
  const [resolucion, setResolucion] = useState("");
  const [errorResolucion, setErrorResolucion] = useState<string | null>(null);
  const [editando, setEditando] = useState<Edicion | null>(null);
  const [errorEdicion, setErrorEdicion] = useState<string | null>(null);
  const [aEliminar, setAEliminar] = useState<IncidenciaDTO | null>(null);

  function guardarResolucion() {
    if (!resolviendo) return;
    if (resolucion.trim().length < 3) {
      setErrorResolucion("Escribe cómo se resolvió. Con una frase corta basta.");
      return;
    }
    setErrorResolucion(null);
    ejecutar(() => resolverIncidencia(resolviendo._id, resolucion.trim()), {
      exito: `Problema de ${resolviendo.unidadCodigo} resuelto.`,
      alTerminar: () => {
        setResolviendo(null);
        setResolucion("");
      },
    });
  }

  function guardarEdicion() {
    if (!editando) return;
    if (editando.motivo.trim().length < 3) {
      setErrorEdicion("Escribe en pocas palabras qué pasó, por ejemplo «la tela vino manchada».");
      return;
    }
    setErrorEdicion(null);
    ejecutar(
      () =>
        actualizarIncidencia(editando.id, {
          motivo: editando.motivo.trim(),
          descripcion: editando.descripcion.trim(),
          severidad: editando.severidad,
        }),
      {
        exito: "Guardamos los cambios del problema.",
        alTerminar: () => setEditando(null),
      }
    );
  }

  return (
    <>
      <ul className="space-y-4">
        {incidencias.map((problema) => {
          const grave = problema.severidad === "ALTA" && problema.estado === "ABIERTA";

          return (
            <li
              key={problema._id}
              className={cn(
                "rounded-3xl border p-5 shadow-warm-sm",
                grave
                  ? "border-red-300 bg-red-50"
                  : problema.estado === "RESUELTA"
                    ? "border-brand-dark/10 bg-brand-card opacity-80"
                    : "border-brand-dark/10 bg-brand-card"
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <ChipSeveridad severidad={problema.severidad} />
                    <ChipEstadoIncidencia estado={problema.estado} />
                    {grave && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-sm font-bold text-white">
                        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                        ATENDER YA
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 font-display text-xl font-semibold text-brand-dark">
                    {problema.motivo}
                  </h3>
                  {problema.descripcion !== "" && (
                    <p className="mt-1 text-base leading-relaxed text-brand-taupe">
                      {problema.descripcion}
                    </p>
                  )}
                </div>

                <Link
                  href={`/admin/fabricacion/unidades/${problema.unidadCodigo}`}
                  className="shrink-0 rounded-xl px-2 py-1 text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                >
                  <Codigo valor={problema.unidadCodigo} className="text-lg underline-offset-4 hover:underline" />
                  {problema.pasoNombre !== "" && (
                    <p className="text-sm text-brand-taupe">en «{problema.pasoNombre}»</p>
                  )}
                </Link>
              </div>

              <p className="mt-3 text-base text-brand-taupe">
                Lo avisó{" "}
                <strong className="text-brand-dark">
                  {problema.reportadaPorNombre || "alguien del taller"}
                </strong>{" "}
                {desdeHace(problema.createdAt, ahoraIso)} · {fechaLarga(problema.createdAt)}
              </p>

              {problema.estado === "RESUELTA" && (
                <p className="mt-2 rounded-2xl bg-green-50 p-3 text-base text-green-900">
                  <strong>Resuelto</strong> por {problema.resueltaPorNombre || "alguien"} el{" "}
                  {fechaLarga(problema.resueltaAt)}
                  {problema.resolucion !== "" && `: ${problema.resolucion}`}
                </p>
              )}

              {problema.fotos.length > 0 && (
                <div className="mt-3">
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-brand-taupe">
                    <Camera className="h-4 w-4" aria-hidden="true" />
                    {problema.fotos.length === 1
                      ? "1 foto"
                      : `${problema.fotos.length} fotos`}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {problema.fotos.map((url, indice) => (
                      <button
                        key={`${url}-${indice}`}
                        type="button"
                        onClick={() => setAmpliada(url)}
                        aria-label={`Ver en grande la foto ${indice + 1} del problema`}
                        className="h-24 w-24 overflow-hidden rounded-xl border border-brand-dark/10 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Foto ${indice + 1} del problema en ${problema.unidadCodigo}`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild variant="outline" className="h-12 text-base font-semibold">
                  <Link href={`/admin/fabricacion/unidades/${problema.unidadCodigo}`}>
                    <Eye className="!size-5" aria-hidden="true" />
                    Ver el mueble
                  </Link>
                </Button>

                {permisos.resolverIncidencias && problema.estado === "ABIERTA" && (
                  <Button
                    type="button"
                    variant="accent"
                    className="h-12 text-base font-semibold"
                    onClick={() => {
                      setResolviendo(problema);
                      setResolucion("");
                      setErrorResolucion(null);
                    }}
                  >
                    <ShieldCheck className="!size-5" aria-hidden="true" />
                    Resolver
                  </Button>
                )}

                {permisos.resolverIncidencias && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-12 text-base font-semibold"
                    onClick={() => {
                      setEditando({
                        id: problema._id,
                        motivo: problema.motivo,
                        descripcion: problema.descripcion,
                        severidad: problema.severidad,
                      });
                      setErrorEdicion(null);
                    }}
                  >
                    <Pencil className="!size-5" aria-hidden="true" />
                    Editar
                  </Button>
                )}

                {permisos.resolverIncidencias && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-12 text-base font-semibold text-red-700"
                    onClick={() => setAEliminar(problema)}
                  >
                    <Trash2 className="!size-5" aria-hidden="true" />
                    Eliminar
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Ver una foto en grande */}
      <Dialog open={ampliada !== null} onOpenChange={(abierto) => !abierto && setAmpliada(null)}>
        <DialogContent className="max-w-3xl p-3">
          <DialogTitle className="sr-only">Foto del problema en grande</DialogTitle>
          {ampliada && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ampliada}
                alt="Foto del problema, ampliada"
                className="max-h-[75vh] w-full rounded-2xl object-contain"
              />
              <Button
                type="button"
                variant="outline"
                className="h-14 w-full text-base font-semibold"
                onClick={() => setAmpliada(null)}
              >
                <X className="!size-5" aria-hidden="true" />
                CERRAR LA FOTO
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Resolver */}
      <Dialog
        open={resolviendo !== null}
        onOpenChange={(abierto) => !abierto && setResolviendo(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl">
              ¿Cómo se resolvió «{resolviendo?.motivo}»?
            </DialogTitle>
            <DialogDescription className="text-base">
              Al resolverlo, el mueble {resolviendo?.unidadCodigo} deja de estar bloqueado y el
              taller puede seguir.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="texto-resolucion" className="text-base font-semibold">
              Cuéntalo en una frase
            </Label>
            <Textarea
              id="texto-resolucion"
              value={resolucion}
              onChange={(evento) => setResolucion(evento.target.value)}
              placeholder="Se cambió la tela por una del mismo lote."
              className="min-h-[110px] text-base"
            />
            <p className="text-sm text-brand-taupe">Queda guardado con tu nombre y la fecha.</p>
          </div>

          {errorResolucion && (
            <p
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-base text-red-800"
            >
              {errorResolucion}
            </p>
          )}

          <Button
            type="button"
            variant="accent"
            className="h-20 w-full rounded-2xl text-xl font-bold"
            disabled={ejecutando}
            onClick={guardarResolucion}
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

      {/* Editar */}
      <Dialog open={editando !== null} onOpenChange={(abierto) => !abierto && setEditando(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Editar el problema</DialogTitle>
            <DialogDescription className="text-base">
              Corrige lo que se anotó. Queda registrado quién lo cambió.
            </DialogDescription>
          </DialogHeader>

          {editando && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="motivo-problema" className="text-base font-semibold">
                  ¿Qué pasó?
                </Label>
                <Input
                  id="motivo-problema"
                  value={editando.motivo}
                  onChange={(evento) =>
                    setEditando({ ...editando, motivo: evento.target.value })
                  }
                  className="h-14 text-base"
                />
                <p className="text-sm text-brand-taupe">En pocas palabras, como un titular.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="descripcion-problema" className="text-base font-semibold">
                  Explícalo un poco más
                </Label>
                <Textarea
                  id="descripcion-problema"
                  value={editando.descripcion}
                  onChange={(evento) =>
                    setEditando({ ...editando, descripcion: evento.target.value })
                  }
                  className="min-h-[100px] text-base"
                />
              </div>

              <SelectorGrande<Severidad>
                etiqueta="¿Qué tan grave es?"
                ayuda="Los graves salen los primeros y en rojo."
                valor={editando.severidad}
                opciones={SEVERIDADES.map((severidad) => ({
                  valor: severidad,
                  texto: ETIQUETAS_SEVERIDAD[severidad].label,
                  icono: ETIQUETAS_SEVERIDAD[severidad].icono,
                }))}
                alElegir={(nueva) => setEditando({ ...editando, severidad: nueva })}
              />

              {errorEdicion && (
                <p
                  role="alert"
                  className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-base text-red-800"
                >
                  {errorEdicion}
                </p>
              )}

              <Button
                type="button"
                variant="accent"
                className="h-16 w-full rounded-2xl text-lg font-bold"
                disabled={ejecutando}
                onClick={guardarEdicion}
              >
                {ejecutando && <Loader2 className="!size-6 animate-spin" aria-hidden="true" />}
                GUARDAR LOS CAMBIOS
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Eliminar */}
      {aEliminar && (
        <DialogoConfirmar
          abierto
          alCerrar={() => setAEliminar(null)}
          titulo={`¿Eliminar el problema «${aEliminar.motivo}»?`}
          descripcion={`Se borra del listado de ${aEliminar.unidadCodigo}. Lo que ya quedó anotado en la bitácora del mueble se conserva. Si el problema fue real, es mejor resolverlo que borrarlo.`}
          textoConfirmar="SÍ, ELIMINAR"
          alConfirmar={() => eliminarIncidencia(aEliminar._id)}
          exito={(dato) => dato?.mensaje ?? "Problema eliminado."}
        />
      )}
    </>
  );
}
