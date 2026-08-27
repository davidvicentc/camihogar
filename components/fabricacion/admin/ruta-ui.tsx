"use client";

/**
 * Piezas de interfaz compartidas por el constructor de rutas y el catálogo de
 * pasos: avisos, diálogo de confirmación, interruptores grandes y chips.
 *
 * Todo está pensado para dedos gruesos y vista cansada (§9 del SPEC): áreas
 * táctiles de 44 px o más, icono SIEMPRE acompañado de texto, `aria-label` en
 * cada control y frases que dicen QUÉ HACER, no sólo qué pasó.
 */

import { useEffect, useState, type ReactNode } from "react";
import { Toaster, toast } from "sonner";
import { AlertTriangle, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { PieConfirmacion } from "@/components/fabricacion/admin/config-compartido";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * AVISOS
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Monta el contenedor de avisos de `sonner` sólo si en la página no hay otro
 * ya montado (otras pantallas del módulo pueden traer el suyo). Así nunca se
 * ve el mismo aviso dos veces.
 */
export function AvisosFabricacion() {
  const [montar, setMontar] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.querySelector("[data-sonner-toaster]")) return;
    setMontar(true);
  }, []);

  if (!montar) return null;

  return (
    <Toaster
      position="top-center"
      richColors
      expand
      duration={7000}
      toastOptions={{
        classNames: {
          toast: "text-base",
          title: "text-base font-semibold",
          description: "text-base",
        },
      }}
    />
  );
}

/** Aviso verde de que todo salió bien. */
export function avisarExito(mensaje: string) {
  toast.success(mensaje, { duration: 7000 });
}

/** Aviso rojo. El texto siempre tiene que decir qué hacer a continuación. */
export function avisarError(mensaje: string) {
  toast.error(mensaje, { duration: 10000 });
}

/* ────────────────────────────────────────────────────────────────────────────
 * DIÁLOGO DE CONFIRMACIÓN (patrón CRUD del §7)
 * ──────────────────────────────────────────────────────────────────────────── */

/** Lo que devuelve la acción que ejecuta el diálogo. */
export interface ResultadoConfirmacion {
  ok: boolean;
  /** Si falló: la frase que se pinta DENTRO del diálogo, no en un aviso. */
  error?: string;
  /** Si salió bien: la frase del aviso verde. */
  mensaje?: string;
}

export interface DialogoConfirmarProps {
  abierto: boolean;
  onAbiertoChange: (abierto: boolean) => void;
  titulo: string;
  /** Frase corta que nombra exactamente lo que va a pasar. */
  descripcion: string;
  /** Qué se conserva y qué se pierde, listas de dependencias, selectores… */
  detalle?: ReactNode;
  textoConfirmar: string;
  textoCancelar?: string;
  /** Rojo para lo destructivo, naranja para lo demás. */
  peligroso?: boolean;
  iconoConfirmar?: LucideIcon;
  onConfirmar: () => Promise<ResultadoConfirmacion>;
  /** Se llama después de un resultado correcto, con el diálogo ya cerrado. */
  onHecho?: () => void;
}

export function DialogoConfirmar({
  abierto,
  onAbiertoChange,
  titulo,
  descripcion,
  detalle,
  textoConfirmar,
  textoCancelar = "NO, VOLVER",
  peligroso = false,
  iconoConfirmar: IconoConfirmar = Check,
  onConfirmar,
  onHecho,
}: DialogoConfirmarProps) {
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (abierto) setError(null);
  }, [abierto]);

  async function confirmar() {
    setProcesando(true);
    setError(null);
    const resultado = await onConfirmar();
    setProcesando(false);

    if (!resultado.ok) {
      setError(resultado.error ?? "No pudimos hacerlo. Vuelve a intentarlo en un momento.");
      return;
    }

    onAbiertoChange(false);
    if (resultado.mensaje) avisarExito(resultado.mensaje);
    onHecho?.();
  }

  return (
    <Dialog open={abierto} onOpenChange={procesando ? undefined : onAbiertoChange}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl leading-tight">{titulo}</DialogTitle>
          <DialogDescription className="text-base text-brand-taupe">
            {descripcion}
          </DialogDescription>
        </DialogHeader>

        {detalle ? <div className="text-base text-brand-dark">{detalle}</div> : null}

        {error ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-2xl border border-red-300 bg-red-50 p-4 text-base font-medium text-red-800"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        ) : null}

        {/* Mismo pie que todos los diálogos: el botón seguro siempre primero. */}
        <PieConfirmacion
          onCancelar={() => onAbiertoChange(false)}
          onConfirmar={confirmar}
          textoConfirmar={textoConfirmar}
          textoCancelar={textoCancelar}
          icono={IconoConfirmar}
          peligroso={peligroso}
          cargando={procesando}
          textoCargando="UN MOMENTO…"
        />
      </DialogContent>
    </Dialog>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * CONTROLES GRANDES
 * ──────────────────────────────────────────────────────────────────────────── */

export interface FilaInterruptorProps {
  id: string;
  /** La pregunta, en lenguaje llano: "¿Tiene que tomar una foto?". */
  pregunta: string;
  /** Una frase más que explica cuándo se usa. */
  ayuda?: string;
  activo: boolean;
  onCambiar: (activo: boolean) => void;
  /** Aviso naranja que aparece sólo cuando está encendido. */
  avisoEncendido?: string;
  icono?: LucideIcon;
  children?: ReactNode;
}

/** Pregunta + interruptor grande, toda la fila clicable. */
export function FilaInterruptor({
  id,
  pregunta,
  ayuda,
  activo,
  onCambiar,
  avisoEncendido,
  icono: Icono,
  children,
}: FilaInterruptorProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 transition-colors",
        activo ? "border-brand-accent/40 bg-brand-accent/[0.06]" : "border-brand-dark/10 bg-white"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <label htmlFor={id} className="flex-1 cursor-pointer">
          <span className="flex items-center gap-2 text-lg font-semibold text-brand-dark">
            {Icono ? <Icono className="h-5 w-5 shrink-0 text-brand-accent" aria-hidden="true" /> : null}
            {pregunta}
          </span>
          {ayuda ? <span className="mt-1 block text-base text-brand-taupe">{ayuda}</span> : null}
        </label>
        <Switch
          id={id}
          checked={activo}
          onCheckedChange={onCambiar}
          aria-label={pregunta}
          className="mt-1 shrink-0 scale-[1.4] origin-right"
        />
      </div>

      {activo && avisoEncendido ? (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-base text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <span>{avisoEncendido}</span>
        </p>
      ) : null}

      {activo && children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

export interface ChipBotonProps {
  activo: boolean;
  etiqueta: string;
  onClick: () => void;
  icono?: LucideIcon;
  /** Punto de color a la izquierda (roles, colores de paso…). */
  color?: string;
  ariaLabel?: string;
}

/** Chip grande de selección. Siempre icono o punto + texto. */
export function ChipBoton({
  activo,
  etiqueta,
  onClick,
  icono: Icono,
  color,
  ariaLabel,
}: ChipBotonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      aria-label={ariaLabel ?? etiqueta}
      className={cn(
        "inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent",
        activo
          ? "border-brand-accent bg-brand-accent/10 text-brand-accent"
          : "border-brand-dark/15 bg-white text-brand-dark hover:border-brand-accent/40"
      )}
    >
      {color ? (
        <span
          className="h-4 w-4 shrink-0 rounded-full border border-black/10"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
      ) : null}
      {Icono ? <Icono className="h-5 w-5 shrink-0" aria-hidden="true" /> : null}
      {etiqueta}
      {activo ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
    </button>
  );
}

export interface EstadoVacioProps {
  icono: LucideIcon;
  titulo: string;
  descripcion: string;
  children?: ReactNode;
}

/** Estado vacío amable y con salida (§9). */
export function EstadoVacio({ icono: Icono, titulo, descripcion, children }: EstadoVacioProps) {
  return (
    <div className="rounded-3xl border border-dashed border-brand-dark/15 bg-white p-8 text-center">
      <Icono className="mx-auto h-14 w-14 text-brand-accent" aria-hidden="true" />
      <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight text-brand-dark">
        {titulo}
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-base text-brand-taupe">{descripcion}</p>
      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  );
}

/** Cartel de "no tienes permiso" con la salida sugerida. */
export function SinPermiso({ que }: { que: string }) {
  return (
    <EstadoVacio
      icono={AlertTriangle}
      titulo="Esta pantalla no está disponible para ti"
      descripcion={`No tienes permiso para ${que}. Si lo necesitas, pídeselo a quien administra el sistema.`}
    />
  );
}
