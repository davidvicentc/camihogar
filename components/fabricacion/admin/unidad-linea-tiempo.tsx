"use client";

/**
 * La línea de tiempo completa de un mueble: paso por paso, quién lo hizo,
 * cuándo, cuánto tardó, las fotos que dejó, la nota, la firma y la lista de
 * comprobación que marcó.
 *
 * Es la pantalla del supervisor: aquí se ve de un vistazo si algo se saltó, si
 * falta una foto o si un paso lleva demasiado tiempo abierto.
 */

import { useState } from "react";
import { Camera, PenLine, RotateCcw, ScanLine, StickyNote, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DialogoConfirmar } from "@/components/fabricacion/admin/tablero-dialogo-confirmar";
import {
  ChipEstadoPaso,
  duracionLegible,
  fechaLarga,
  type PermisosPanel,
} from "@/components/fabricacion/admin/tablero-piezas";
import { revertirPaso } from "@/lib/actions/fabricacion";
import { META_ESTADO_PASO, iconoDePaso } from "@/lib/fabricacion/constantes";
import type { PasoUnidadDTO, UnidadDTO } from "@/lib/types/fabricacion";
import { cn } from "@/lib/utils";

/** Galería de las fotos de un paso; al tocar una se ve en grande. */
function Fotos({
  fotos,
  nombrePaso,
  alAmpliar,
}: {
  fotos: string[];
  nombrePaso: string;
  alAmpliar: (url: string) => void;
}) {
  if (fotos.length === 0) return null;

  return (
    <div className="mt-3">
      <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-brand-taupe">
        <Camera className="h-4 w-4" aria-hidden="true" />
        {fotos.length === 1 ? "1 foto" : `${fotos.length} fotos`}
      </p>
      <div className="flex flex-wrap gap-2">
        {fotos.map((url, indice) => (
          <button
            key={`${url}-${indice}`}
            type="button"
            onClick={() => alAmpliar(url)}
            aria-label={`Ver en grande la foto ${indice + 1} de ${nombrePaso}`}
            className="h-24 w-24 overflow-hidden rounded-xl border border-brand-dark/10 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
          >
            {/*
              `<img>` y no `next/image`: las fotos las suben los operarios desde
              el móvil y pueden venir de cualquier alojamiento, así que no se
              puede garantizar que el dominio esté en `next.config.ts`.
            */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Foto ${indice + 1} de ${nombrePaso}`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function Paso({
  paso,
  indice,
  total,
  unidad,
  permisos,
  alAmpliar,
  alRevertir,
}: {
  paso: PasoUnidadDTO;
  indice: number;
  total: number;
  unidad: UnidadDTO;
  permisos: PermisosPanel;
  alAmpliar: (url: string) => void;
  alRevertir: (paso: PasoUnidadDTO) => void;
}) {
  const Icono = iconoDePaso(paso.icono || paso.clave);
  const marcadas = paso.checklistRespuestas.filter((respuesta) => respuesta.ok).length;

  return (
    <li className="relative pl-14">
      {/* La línea que une los pasos */}
      {indice < total - 1 && (
        <span
          aria-hidden="true"
          className="absolute left-[1.4rem] top-12 h-[calc(100%-1rem)] w-0.5 bg-brand-dark/10"
        />
      )}

      {/*
        El relleno del punto es el SEMÁFORO del estado (gris · azul · ámbar ·
        verde · rojo), el mismo que ve el operario en su móvil. El color
        decorativo del paso se queda en el borde, para no romper el vistazo.
      */}
      <span
        aria-hidden="true"
        className="absolute left-0 top-1 flex h-11 w-11 items-center justify-center rounded-full border-2 text-white shadow-warm-sm"
        style={{
          backgroundColor: META_ESTADO_PASO[paso.estado].punto,
          borderColor: paso.color || "#6E5748",
        }}
      >
        <Icono className="h-5 w-5" />
      </span>

      <div
        className={cn(
          "rounded-2xl border bg-brand-card p-4 shadow-warm-sm",
          paso.estado === "INCIDENCIA" ? "border-red-300 bg-red-50/60" : "border-brand-dark/10"
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold uppercase tracking-wide text-brand-taupe">
              Paso {indice + 1} de {total}
            </p>
            <h3 className="font-display text-xl font-semibold text-brand-dark">{paso.nombre}</h3>
            {paso.estacionNombre && paso.estacionNombre !== "" && (
              <p className="text-sm text-brand-taupe">En {paso.estacionNombre}</p>
            )}
          </div>
          <ChipEstadoPaso estado={paso.estado} />
        </div>

        {paso.instrucciones !== "" && (
          <p className="mt-2 text-base leading-relaxed text-brand-taupe">{paso.instrucciones}</p>
        )}

        <dl className="mt-3 grid gap-x-6 gap-y-1 text-base sm:grid-cols-2">
          {paso.iniciadoAt && (
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-brand-taupe">Empezó:</dt>
              <dd className="font-semibold text-brand-dark">
                {paso.iniciadoPorNombre !== "" ? paso.iniciadoPorNombre : "Alguien"} ·{" "}
                {fechaLarga(paso.iniciadoAt)}
              </dd>
            </div>
          )}
          {paso.completadoAt && (
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-brand-taupe">Terminó:</dt>
              <dd className="font-semibold text-brand-dark">
                {paso.completadoPorNombre !== "" ? paso.completadoPorNombre : "Alguien"} ·{" "}
                {fechaLarga(paso.completadoAt)}
              </dd>
            </div>
          )}
          {paso.duracionMs > 0 && (
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-brand-taupe">Tardó:</dt>
              <dd className="font-semibold text-brand-dark">
                {duracionLegible(paso.duracionMs)}
              </dd>
            </div>
          )}
          {paso.escaneadoAt && (
            <div className="flex flex-wrap gap-x-2">
              <dt className="flex items-center gap-1 text-brand-taupe">
                <ScanLine className="h-4 w-4" aria-hidden="true" />
                Escaneado:
              </dt>
              <dd className="font-semibold text-brand-dark">{fechaLarga(paso.escaneadoAt)}</dd>
            </div>
          )}
        </dl>

        {paso.motivoOmision !== "" && (
          <p className="mt-3 rounded-xl bg-slate-100 p-3 text-base text-slate-700">
            Se saltó porque: {paso.motivoOmision}
          </p>
        )}

        {paso.checklistRespuestas.length > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 text-sm font-semibold text-brand-taupe">
              Lista de comprobación ({marcadas} de {paso.checklistRespuestas.length} marcadas)
            </p>
            <ul className="space-y-1">
              {paso.checklistRespuestas.map((respuesta, posicion) => (
                <li
                  key={`${respuesta.texto}-${posicion}`}
                  className="flex items-start gap-2 text-base"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
                      respuesta.ok ? "bg-green-600" : "bg-slate-400"
                    )}
                  >
                    {respuesta.ok ? "✓" : "—"}
                  </span>
                  <span className={respuesta.ok ? "text-brand-dark" : "text-brand-taupe"}>
                    {respuesta.texto}
                    <span className="sr-only">
                      {respuesta.ok ? " (marcado)" : " (sin marcar)"}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {paso.nota !== "" && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-brand-sand/60 p-3 text-base text-brand-dark">
            <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-brand-taupe" aria-hidden="true" />
            {paso.nota}
          </p>
        )}

        <Fotos fotos={paso.fotos} nombrePaso={paso.nombre} alAmpliar={alAmpliar} />

        {paso.firmaUrl !== "" && (
          <div className="mt-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-brand-taupe">
              <PenLine className="h-4 w-4" aria-hidden="true" />
              Firma de quien recibió
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={paso.firmaUrl}
              alt={`Firma recogida en ${paso.nombre}`}
              className="h-24 rounded-xl border border-brand-dark/10 bg-white object-contain p-2"
            />
          </div>
        )}

        {/* Un mueble entregado o cancelado ya no se reabre: el botón ni se
            ofrece, igual que lo rechaza `revertirPaso` en el servidor. */}
        {permisos.revertirPasos &&
          paso.estado === "COMPLETADO" &&
          !unidad.eliminada &&
          unidad.estado !== "ENTREGADA" &&
          unidad.estado !== "CANCELADA" && (
            <Button
              type="button"
              variant="outline"
              className="mt-4 h-12 text-base font-semibold text-red-700"
              onClick={() => alRevertir(paso)}
            >
              <RotateCcw className="!size-5" aria-hidden="true" />
              Deshacer este paso
            </Button>
          )}
      </div>
    </li>
  );
}

export function LineaTiempoUnidad({
  unidad,
  permisos,
}: {
  unidad: UnidadDTO;
  permisos: PermisosPanel;
}) {
  const [ampliada, setAmpliada] = useState<string | null>(null);
  const [aRevertir, setARevertir] = useState<PasoUnidadDTO | null>(null);

  if (unidad.pasos.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-brand-dark/15 p-8 text-center text-base text-brand-taupe">
        Este mueble todavía no tiene pasos. Asígnale una ruta desde «Editar» para que el
        taller sepa qué hacer con él.
      </p>
    );
  }

  return (
    <>
      <ol className="space-y-4">
        {unidad.pasos.map((paso, indice) => (
          <Paso
            key={`${paso.clave}-${indice}`}
            paso={paso}
            indice={indice}
            total={unidad.pasos.length}
            unidad={unidad}
            permisos={permisos}
            alAmpliar={setAmpliada}
            alRevertir={setARevertir}
          />
        ))}
      </ol>

      {/* Ver una foto en grande */}
      <Dialog open={ampliada !== null} onOpenChange={(abierto) => !abierto && setAmpliada(null)}>
        <DialogContent className="max-w-3xl p-3">
          <DialogTitle className="sr-only">Foto del paso en grande</DialogTitle>
          {ampliada && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ampliada}
                alt="Foto del trabajo, ampliada"
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

      {/* Deshacer un paso: exige motivo y avisa de lo que implica */}
      {aRevertir && (
        <DialogoConfirmar
          abierto
          alCerrar={() => setARevertir(null)}
          titulo={`¿Deshacer «${aRevertir.nombre}»?`}
          descripcion="El paso vuelve a quedar como si no se hubiera hecho y el mueble retrocede hasta él. Se conservan las fotos y las notas, y queda anotado en el historial quién lo deshizo y por qué."
          pideMotivo
          etiquetaMotivo="¿Por qué hay que deshacerlo?"
          textoConfirmar="SÍ, DESHACER EL PASO"
          alConfirmar={(motivo) => revertirPaso(unidad.codigo, aRevertir.clave, motivo)}
          exito={() => `«${aRevertir.nombre}» volvió atrás.`}
        />
      )}
    </>
  );
}
