"use client";

/**
 * Los controles de filtrado de todos los listados del módulo.
 *
 * El filtro vive en la dirección (`?estado=EN_PROCESO`), no en la memoria del
 * navegador: así la página se puede compartir, el botón "atrás" funciona y las
 * consultas las resuelve el servidor con los índices que ya existen.
 *
 * Todo son chips grandes con icono + texto (§9), nada de menús desplegables
 * diminutos.
 */

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarClock, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ETIQUETAS_CANAL,
  ETIQUETAS_ESTADO_INCIDENCIA,
  ETIQUETAS_ESTADO_PEDIDO,
  ETIQUETAS_PRIORIDAD,
  ETIQUETAS_SEVERIDAD,
  META_ESTADO_UNIDAD,
  type MetaEtiqueta,
} from "@/lib/fabricacion/constantes";
import {
  CANALES,
  ESTADOS_INCIDENCIA,
  ESTADOS_PEDIDO,
  ESTADOS_UNIDAD,
  PRIORIDADES,
  SEVERIDADES,
} from "@/lib/types/fabricacion";
import { cn } from "@/lib/utils";

/**
 * Radix no admite un `SelectItem` con valor vacío, así que "sin filtro" viaja
 * con este centinela y se traduce a quitar el parámetro de la dirección.
 */
const TODOS = "__todos__";

/**
 * Los chips se arman AQUÍ, en el navegador, a partir de una clave de catálogo.
 *
 * No se pueden recibir ya montados desde la página: los iconos de
 * `lucide-react` son componentes, y un componente no cruza la frontera Server →
 * Client ("Functions cannot be passed directly to Client Components"). Así que
 * la página dice "quiero los estados de pedido" y el catálogo vive de este
 * lado.
 */
const CATALOGOS = {
  estadoPedido: ESTADOS_PEDIDO.map((clave) => ({
    valor: clave as string,
    meta: ETIQUETAS_ESTADO_PEDIDO[clave] as MetaEtiqueta,
  })),
  estadoUnidad: ESTADOS_UNIDAD.map((clave) => ({
    valor: clave as string,
    meta: {
      label: META_ESTADO_UNIDAD[clave].label,
      icono: META_ESTADO_UNIDAD[clave].icono,
      color: META_ESTADO_UNIDAD[clave].punto,
      clases: META_ESTADO_UNIDAD[clave].clases,
    } as MetaEtiqueta,
  })),
  prioridad: PRIORIDADES.map((clave) => ({
    valor: clave as string,
    meta: ETIQUETAS_PRIORIDAD[clave] as MetaEtiqueta,
  })),
  severidad: SEVERIDADES.map((clave) => ({
    valor: clave as string,
    meta: ETIQUETAS_SEVERIDAD[clave] as MetaEtiqueta,
  })),
  estadoIncidencia: ESTADOS_INCIDENCIA.map((clave) => ({
    valor: clave as string,
    meta: ETIQUETAS_ESTADO_INCIDENCIA[clave] as MetaEtiqueta,
  })),
  canal: CANALES.map((clave) => ({
    valor: clave as string,
    meta: ETIQUETAS_CANAL[clave] as MetaEtiqueta,
  })),
} as const;

export type CatalogoFiltro = keyof typeof CATALOGOS;

/** Iconos de los interruptores, por la misma razón que los catálogos. */
const ICONOS_INTERRUPTOR = {
  papelera: Trash2,
  reloj: CalendarClock,
} as const;

export type IconoInterruptor = keyof typeof ICONOS_INTERRUPTOR;

/** Lee y escribe parámetros de la dirección conservando los demás. */
function useParametros(): {
  valor: (clave: string) => string;
  fijar: (clave: string, nuevo: string | null) => void;
  limpiar: () => void;
  hayFiltros: boolean;
} {
  const router = useRouter();
  const ruta = usePathname();
  const parametros = useSearchParams();

  const valor = useCallback(
    (clave: string) => parametros.get(clave) ?? "",
    [parametros]
  );

  const fijar = useCallback(
    (clave: string, nuevo: string | null) => {
      const siguientes = new URLSearchParams(parametros.toString());
      if (nuevo === null || nuevo === "") siguientes.delete(clave);
      else siguientes.set(clave, nuevo);
      // Al cambiar un filtro se vuelve siempre a la primera página.
      siguientes.delete("pagina");
      const cadena = siguientes.toString();
      router.replace(cadena === "" ? ruta : `${ruta}?${cadena}`, { scroll: false });
    },
    [parametros, ruta, router]
  );

  const limpiar = useCallback(() => {
    router.replace(ruta, { scroll: false });
  }, [ruta, router]);

  return { valor, fijar, limpiar, hayFiltros: parametros.toString() !== "" };
}

/** Una fila de chips grandes que fijan un parámetro de la dirección. */
export function ChipsFiltro({
  etiqueta,
  parametro,
  catalogo,
  textoTodos = "Todos",
  className,
}: {
  etiqueta: string;
  parametro: string;
  /** Qué lista de valores pintar. Los textos y los iconos salen del catálogo. */
  catalogo: CatalogoFiltro;
  textoTodos?: string;
  className?: string;
}) {
  const { valor, fijar } = useParametros();
  const actual = valor(parametro);

  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-taupe">
        {etiqueta}
      </legend>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={actual === ""}
          onClick={() => fijar(parametro, null)}
          className={cn(
            "inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent",
            actual === ""
              ? "border-transparent bg-brand-dark text-brand-bg shadow-warm-sm"
              : "border-brand-dark/15 bg-brand-card text-brand-dark hover:border-brand-accent/40 hover:bg-brand-accent/[0.06]"
          )}
        >
          {textoTodos}
        </button>

        {CATALOGOS[catalogo].map((opcion) => {
          const elegido = actual === opcion.valor;
          const Icono = opcion.meta.icono;
          return (
            <button
              key={opcion.valor}
              type="button"
              aria-pressed={elegido}
              onClick={() => fijar(parametro, opcion.valor)}
              className={cn(
                "inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent",
                elegido
                  ? opcion.meta.clases
                  : "border-brand-dark/15 bg-brand-card text-brand-dark hover:border-brand-accent/40 hover:bg-brand-accent/[0.06]"
              )}
            >
              <Icono className="h-5 w-5 shrink-0" aria-hidden="true" />
              {opcion.meta.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Buscador grande. Escribe en la dirección al enviar, no en cada tecla. */
export function BuscadorLista({
  marcador,
  parametro = "q",
  etiqueta = "Buscar",
  className,
}: {
  marcador: string;
  parametro?: string;
  etiqueta?: string;
  className?: string;
}) {
  const { valor, fijar } = useParametros();
  const guardado = valor(parametro);
  const [texto, setTexto] = useState(guardado);

  // Si el filtro cambia por otra vía (limpiar, botón atrás), refleja el cambio.
  useEffect(() => {
    setTexto(guardado);
  }, [guardado]);

  return (
    <form
      className={cn("flex flex-col gap-2 sm:flex-row", className)}
      onSubmit={(evento) => {
        evento.preventDefault();
        fijar(parametro, texto.trim() === "" ? null : texto.trim());
      }}
    >
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-taupe"
          aria-hidden="true"
        />
        <Input
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          placeholder={marcador}
          aria-label={etiqueta}
          className="h-14 rounded-2xl pl-12 text-base"
        />
        {texto !== "" && (
          <button
            type="button"
            aria-label="Borrar lo escrito"
            onClick={() => {
              setTexto("");
              fijar(parametro, null);
            }}
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-brand-taupe transition-colors hover:bg-brand-dark/5"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>
      <Button type="submit" variant="outline" className="h-14 px-6 text-base font-semibold">
        <Search className="!size-5" aria-hidden="true" />
        Buscar
      </Button>
    </form>
  );
}

/** Interruptor de sí/no: "Ver eliminados", "Sólo retrasadas"… */
export function InterruptorFiltro({
  etiqueta,
  ayuda,
  parametro,
  icono,
  className,
}: {
  etiqueta: string;
  ayuda?: string;
  parametro: string;
  /** Clave del icono; el componente vive aquí, no viaja desde la página. */
  icono?: IconoInterruptor;
  className?: string;
}) {
  const { valor, fijar } = useParametros();
  const activo = valor(parametro) === "1";
  const Icono = icono ? ICONOS_INTERRUPTOR[icono] : null;

  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={() => fijar(parametro, activo ? null : "1")}
      className={cn(
        "inline-flex min-h-[44px] items-center gap-2.5 rounded-2xl border px-4 py-2 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent",
        activo
          ? "border-transparent bg-brand-dark text-brand-bg"
          : "border-brand-dark/15 bg-brand-card text-brand-dark hover:border-brand-accent/40",
        className
      )}
      title={ayuda}
    >
      {Icono && <Icono className="h-5 w-5 shrink-0" aria-hidden="true" />}
      <span
        aria-hidden="true"
        className={cn(
          "flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent px-0.5 transition-colors",
          activo ? "bg-brand-accent" : "bg-brand-taupe/30"
        )}
      >
        <span
          className={cn(
            "h-5 w-5 rounded-full bg-white shadow transition-transform",
            activo && "translate-x-5"
          )}
        />
      </span>
      {etiqueta}
    </button>
  );
}

/**
 * Filtro con desplegable, para las listas largas donde los chips no caben
 * (pasos del catálogo, personas del equipo, áreas de trabajo).
 */
export function SelectFiltro({
  etiqueta,
  parametro,
  opciones,
  textoTodos = "Todos",
  className,
}: {
  etiqueta: string;
  parametro: string;
  opciones: { valor: string; texto: string }[];
  textoTodos?: string;
  className?: string;
}) {
  const { valor, fijar } = useParametros();
  const actual = valor(parametro);

  return (
    <div className={cn("min-w-0 space-y-2", className)}>
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-taupe">
        {etiqueta}
      </p>
      <Select
        value={actual === "" ? TODOS : actual}
        onValueChange={(nuevo) => fijar(parametro, nuevo === TODOS ? null : nuevo)}
      >
        <SelectTrigger className="h-14 rounded-2xl text-base" aria-label={etiqueta}>
          <SelectValue placeholder={textoTodos} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS} className="py-3 text-base">
            {textoTodos}
          </SelectItem>
          {opciones.map((opcion) => (
            <SelectItem key={opcion.valor} value={opcion.valor} className="py-3 text-base">
              {opcion.texto}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Botón de "quitar todos los filtros". Sólo aparece si hay alguno puesto. */
export function LimpiarFiltros({ className }: { className?: string }) {
  const { limpiar, hayFiltros } = useParametros();
  if (!hayFiltros) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={limpiar}
      className={cn("h-11 text-base font-semibold text-brand-taupe", className)}
    >
      <X className="!size-5" aria-hidden="true" />
      Quitar los filtros
    </Button>
  );
}

/** Caja que agrupa buscador y filtros con el mismo aire en todas las pantallas. */
export function PanelFiltros({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4 rounded-3xl border border-brand-dark/5 bg-brand-card p-5 shadow-warm-sm">
      {children}
    </div>
  );
}
