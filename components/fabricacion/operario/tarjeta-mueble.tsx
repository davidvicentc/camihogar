import Link from "next/link";
import { ArrowRight, CalendarClock, Hammer, Play, User } from "lucide-react";

import type { UnidadDTO } from "@/lib/types/fabricacion";
import { ETIQUETAS_PRIORIDAD, iconoDePaso } from "@/lib/fabricacion/constantes";
import { siguientePasoAccionable } from "@/lib/fabricacion/reglas";
import { cn } from "@/lib/utils";
import { avisoDeEntrega } from "./formato";
import { FotoMueble } from "./foto-mueble";

/**
 * La tarjeta de un mueble en la pantalla "Mi trabajo".
 *
 * Dos variantes con el color del semáforo:
 *  · `enCurso` — ámbar: es un trabajo que esta persona ya empezó.
 *  · `lista`   — azul: está libre y le toca.
 *
 * El código va enorme y en monoespaciada porque es lo que el operario compara
 * con la etiqueta pegada al mueble.
 */
interface TarjetaMuebleProps {
  unidad: UnidadDTO;
  variante: "enCurso" | "lista";
}

export function TarjetaMueble({ unidad, variante }: TarjetaMuebleProps) {
  const paso = siguientePasoAccionable(unidad.pasos);
  const IconoPaso = iconoDePaso(paso?.icono ?? paso?.clave);
  const prioridad = ETIQUETAS_PRIORIDAD[unidad.prioridad];
  const IconoPrioridad = prioridad.icono;
  const aviso = avisoDeEntrega(unidad.fechaPrometida);

  const enCurso = variante === "enCurso";
  const destinoPaso = paso
    ? `/fabrica/u/${unidad.codigo}/paso/${paso.clave}`
    : `/fabrica/u/${unidad.codigo}`;

  return (
    <article
      className={cn(
        "overflow-hidden rounded-3xl border-4 bg-brand-card shadow-warm-sm",
        enCurso ? "border-amber-400" : "border-sky-400"
      )}
    >
      <Link
        href={`/fabrica/u/${unidad.codigo}`}
        aria-label={`Ver la ficha del mueble ${unidad.codigo}`}
        className="flex gap-4 p-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-accent/60"
      >
        <FotoMueble
          src={unidad.producto.imagen}
          alt={unidad.producto.titulo}
          className="h-24 w-24 shrink-0"
        />

        <div className="min-w-0 flex-1">
          <p className="font-mono text-3xl font-bold leading-none tracking-tight text-brand-dark">
            {unidad.codigo}
          </p>
          <p className="mt-2 truncate text-lg font-semibold text-brand-dark">
            {unidad.producto.titulo}
          </p>
          <p className="mt-1 flex items-center gap-2 truncate text-base text-brand-taupe">
            <User className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="truncate">Para: {unidad.clienteNombre}</span>
          </p>
        </div>
      </Link>

      <div className="space-y-3 px-4 pb-4">
        <p
          className={cn(
            "flex items-center gap-3 rounded-2xl px-4 py-3 text-lg font-bold leading-tight",
            enCurso ? "bg-amber-100 text-amber-900" : "bg-sky-100 text-sky-900"
          )}
        >
          {enCurso ? (
            <Hammer className="h-7 w-7 shrink-0" aria-hidden="true" />
          ) : (
            <IconoPaso className="h-7 w-7 shrink-0" aria-hidden="true" />
          )}
          <span className="min-w-0">
            <span className="block text-sm font-semibold uppercase tracking-wide opacity-80">
              {enCurso ? "Estás trabajando en" : "Te toca hacer"}
            </span>
            <span className="block truncate">
              {paso ? paso.nombre : "Este mueble no tiene pasos por hacer"}
            </span>
          </span>
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {unidad.prioridad !== "NORMAL" ? (
            <span
              className={cn(
                "inline-flex min-h-[36px] items-center gap-2 rounded-full px-3 py-1 text-base font-bold",
                prioridad.clases
              )}
            >
              <IconoPrioridad className="h-5 w-5" aria-hidden="true" />
              {prioridad.label}
            </span>
          ) : null}

          {aviso ? (
            <span
              className={cn(
                "inline-flex min-h-[36px] items-center gap-2 rounded-full border px-3 py-1 text-base font-semibold",
                aviso.tarde
                  ? "border-red-300 bg-red-100 text-red-800"
                  : aviso.cerca
                    ? "border-orange-300 bg-orange-100 text-orange-800"
                    : "border-brand-dark/10 bg-brand-sand text-brand-taupe"
              )}
            >
              <CalendarClock className="h-5 w-5" aria-hidden="true" />
              {aviso.texto}
            </span>
          ) : null}
        </div>

        <Link
          href={destinoPaso}
          aria-label={
            enCurso
              ? `Continuar el paso ${paso?.nombre ?? ""} del mueble ${unidad.codigo}`
              : `Empezar el paso ${paso?.nombre ?? ""} del mueble ${unidad.codigo}`
          }
          className={cn(
            "flex min-h-[4.5rem] w-full items-center justify-center gap-3 rounded-2xl text-xl font-bold transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2",
            enCurso
              ? "bg-amber-500 text-brand-dark hover:bg-amber-600 focus-visible:ring-amber-300"
              : "bg-sky-600 text-white hover:bg-sky-700 focus-visible:ring-sky-300"
          )}
        >
          {enCurso ? (
            <ArrowRight className="h-8 w-8 shrink-0" aria-hidden="true" />
          ) : (
            <Play className="h-8 w-8 shrink-0" aria-hidden="true" />
          )}
          <span>{enCurso ? "CONTINUAR" : "EMPEZAR"}</span>
        </Link>
      </div>
    </article>
  );
}
