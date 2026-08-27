/**
 * La bitácora del taller de un mueble: todo lo que le ha pasado, lo más
 * reciente arriba.
 *
 * Es append-only (nadie puede borrar ni editar un renglón), así que aquí sólo
 * se pinta. Se renderiza en el servidor: no lleva `"use client"`.
 */

import {
  AlertTriangle,
  Ban,
  CircleCheck,
  CirclePause,
  CircleSlash,
  PackageCheck,
  PackagePlus,
  Pencil,
  Play,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  StickyNote,
  Trash2,
  UserCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { EventoDTO, TipoEvento } from "@/lib/types/fabricacion";
import { cn } from "@/lib/utils";
import { EstadoVacio, fechaLarga } from "@/components/fabricacion/admin/tablero-piezas";

interface MetaEvento {
  icono: LucideIcon;
  /** Clases del círculo del icono, con el color del semáforo del módulo. */
  clases: string;
}

const META_EVENTO: Record<TipoEvento, MetaEvento> = {
  CREADA: { icono: PackagePlus, clases: "bg-sky-100 text-sky-700" },
  PASO_INICIADO: { icono: Play, clases: "bg-amber-100 text-amber-800" },
  PASO_COMPLETADO: { icono: CircleCheck, clases: "bg-green-100 text-green-700" },
  PASO_OMITIDO: { icono: CircleSlash, clases: "bg-slate-200 text-slate-600" },
  ESCANEO: { icono: ScanLine, clases: "bg-sky-100 text-sky-700" },
  INCIDENCIA: { icono: AlertTriangle, clases: "bg-red-100 text-red-700" },
  INCIDENCIA_RESUELTA: { icono: ShieldCheck, clases: "bg-green-100 text-green-700" },
  PAUSA: { icono: CirclePause, clases: "bg-sky-100 text-sky-700" },
  REANUDACION: { icono: Play, clases: "bg-amber-100 text-amber-800" },
  ASIGNACION: { icono: UserCheck, clases: "bg-slate-100 text-slate-700" },
  NOTA: { icono: StickyNote, clases: "bg-slate-100 text-slate-700" },
  ENTREGA: { icono: PackageCheck, clases: "bg-teal-100 text-teal-700" },
  CANCELACION: { icono: Ban, clases: "bg-slate-200 text-slate-600" },
  REVERSION: { icono: RotateCcw, clases: "bg-red-100 text-red-700" },
  EDICION: { icono: Pencil, clases: "bg-slate-100 text-slate-700" },
  ELIMINACION: { icono: Trash2, clases: "bg-red-100 text-red-700" },
};

export function BitacoraUnidad({ eventos }: { eventos: EventoDTO[] }) {
  if (eventos.length === 0) {
    return (
      <EstadoVacio
        titulo="Todavía no hay movimientos"
        mensaje="Aquí se irá anotando solo cada cosa que le pase al mueble: quién empezó un paso, quién lo terminó, quién avisó de un problema."
      />
    );
  }

  return (
    <ol className="space-y-3">
      {eventos.map((evento) => {
        const meta = META_EVENTO[evento.tipo];
        const Icono = meta.icono;

        return (
          <li
            key={evento._id}
            className="flex gap-3 rounded-2xl border border-brand-dark/10 bg-brand-card p-4 shadow-warm-sm"
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                meta.clases
              )}
            >
              <Icono className="h-5 w-5" />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold leading-snug text-brand-dark">
                {evento.descripcion}
              </p>
              <p className="mt-0.5 text-sm text-brand-taupe">
                {fechaLarga(evento.createdAt)}
                {evento.operarioNombre !== "" && ` · ${evento.operarioNombre}`}
                {evento.operarioRol !== "" && ` (${evento.operarioRol})`}
                {evento.estacionNombre !== "" && ` · ${evento.estacionNombre}`}
              </p>

              {evento.fotos.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {evento.fotos.map((url, indice) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={`${url}-${indice}`}
                      src={url}
                      alt={`Foto del movimiento: ${evento.descripcion}`}
                      className="h-20 w-20 rounded-xl border border-brand-dark/10 object-cover"
                      loading="lazy"
                    />
                  ))}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
