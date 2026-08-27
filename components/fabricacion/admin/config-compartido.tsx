"use client";

/**
 * Piezas comunes de las pantallas de configuración del módulo de Fabricación
 * (Roles · Personas · Áreas · Historial).
 *
 * Todo lo que hay aquí cumple el §9 del contrato de diseño: letra grande,
 * áreas táctiles de 44 px o más, icono SIEMPRE acompañado de texto, colores
 * semáforo y mensajes que dicen QUÉ HACER, no sólo qué pasó.
 *
 * Ningún componente de este archivo importa Mongoose ni nada del servidor:
 * recibe DTOs planos y llama a las Server Actions desde el cliente.
 */

import * as React from "react";
import Link from "next/link";
import { Toaster, toast } from "sonner";
import {
  AlertTriangle,
  Check,
  Info,
  Loader2,
  Lock,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * AVISOS (sonner)
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * El contenedor de los avisos. Se monta sólo si no hay ya otro en la página,
 * para que un `<Toaster />` puesto en el layout del panel no duplique avisos.
 */
export function ToasterFabrica() {
  const [montar, setMontar] = React.useState(false);

  React.useEffect(() => {
    setMontar(document.querySelector("[data-sonner-toaster]") === null);
  }, []);

  if (!montar) return null;

  return (
    <Toaster
      position="top-center"
      richColors
      closeButton
      expand
      duration={6000}
      toastOptions={{
        classNames: {
          toast: "rounded-2xl border-2 p-5 shadow-warm",
          title: "text-base font-bold leading-snug",
          description: "text-base leading-snug",
          closeButton: "h-8 w-8",
        },
      }}
    />
  );
}

/** Aviso verde de "salió bien". Texto grande y tiempo generoso para leerlo. */
export function avisoExito(mensaje: string): void {
  toast.success(mensaje, { duration: 7000 });
}

/** Aviso rojo. El mensaje siempre debe decir qué hacer a continuación. */
export function avisoError(mensaje: string): void {
  toast.error(mensaje, { duration: 11000 });
}

/* ────────────────────────────────────────────────────────────────────────────
 * FECHAS EN ESPAÑOL
 * ────────────────────────────────────────────────────────────────────────────
 * Se fija la zona horaria para que el servidor y el navegador escriban lo
 * mismo y React no avise de diferencias al hidratar.
 */

const ZONA = "America/Caracas";

const FORMATO_LARGO = new Intl.DateTimeFormat("es-VE", {
  timeZone: ZONA,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const FORMATO_CORTO = new Intl.DateTimeFormat("es-VE", {
  timeZone: ZONA,
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const FORMATO_HORA = new Intl.DateTimeFormat("es-VE", {
  timeZone: ZONA,
  hour: "2-digit",
  minute: "2-digit",
});

function aFecha(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/** "lunes, 4 de agosto de 2025, 03:12 p. m." */
export function fechaLarga(iso: string | null | undefined): string {
  const fecha = aFecha(iso);
  return fecha ? FORMATO_LARGO.format(fecha) : "—";
}

/** "04 ago 2025" */
export function fechaCorta(iso: string | null | undefined): string {
  const fecha = aFecha(iso);
  return fecha ? FORMATO_CORTO.format(fecha) : "—";
}

/** "04 ago 2025, 03:12 p. m." */
export function fechaConHora(iso: string | null | undefined): string {
  const fecha = aFecha(iso);
  return fecha ? `${FORMATO_CORTO.format(fecha)}, ${FORMATO_HORA.format(fecha)}` : "—";
}

/* ────────────────────────────────────────────────────────────────────────────
 * COLOR: TEXTO LEGIBLE SOBRE CUALQUIER FONDO
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Devuelve blanco o café oscuro según el brillo del color de fondo, para que
 * el contraste siempre cumpla AA. Si el color no se entiende, asume oscuro.
 */
export function textoSobre(color: string): string {
  const limpio = (color ?? "").trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(limpio)) return "#FFFFFF";
  const r = parseInt(limpio.slice(0, 2), 16);
  const v = parseInt(limpio.slice(2, 4), 16);
  const a = parseInt(limpio.slice(4, 6), 16);
  const brillo = (r * 299 + v * 587 + a * 114) / 1000;
  return brillo > 165 ? "#25160F" : "#FFFFFF";
}

/** Iniciales para el avatar: como mucho dos letras. */
export function iniciales(nombre: string): string {
  const partes = (nombre ?? "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 1).toUpperCase();
  return `${partes[0].slice(0, 1)}${partes[1].slice(0, 1)}`.toUpperCase();
}

export function Avatar({
  nombre,
  color,
  className,
}: {
  nombre: string;
  color: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl font-display text-xl font-bold",
        className
      )}
      style={{ backgroundColor: color || "#E8511A", color: textoSobre(color) }}
    >
      {iniciales(nombre)}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * CABECERA DE PANTALLA
 * ──────────────────────────────────────────────────────────────────────────── */

export function CabeceraConfig({
  titulo,
  contador,
  descripcion,
  children,
}: {
  titulo: string;
  /** Frase ya montada: "8 roles", "12 personas". */
  contador: string;
  descripcion: string;
  /** El botón principal de la pantalla. */
  children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tighter text-brand-dark sm:text-4xl">
          {titulo}
        </h1>
        <p className="mt-2 text-lg text-brand-taupe">
          <span className="font-bold text-brand-dark">{contador}</span> · {descripcion}
        </p>
      </div>
      {children ? <div className="shrink-0">{children}</div> : null}
    </header>
  );
}

/**
 * El único botón principal de la pantalla: ancho completo en móvil, h-16 y
 * letra grande. Un solo botón así por pantalla (§9).
 */
export function BotonPrincipal({
  onClick,
  icono: Icono,
  children,
  disabled,
  type = "button",
}: {
  onClick?: () => void;
  icono: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <Button
      type={type}
      variant="accent"
      onClick={onClick}
      disabled={disabled}
      className="h-16 w-full gap-3 rounded-2xl px-8 text-xl font-bold lg:w-auto [&_svg]:size-7"
    >
      <Icono className="h-7 w-7" />
      {children}
    </Button>
  );
}

/** Botón de acción de una fila: icono + texto, nunca sólo icono, mínimo 44 px. */
export function BotonFila({
  onClick,
  icono: Icono,
  children,
  tono = "normal",
  disabled,
  titulo,
}: {
  onClick?: () => void;
  icono: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  tono?: "normal" | "peligro";
  disabled?: boolean;
  /** Explicación de por qué está deshabilitado, como `title`. */
  titulo?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={titulo}
      className={cn(
        "inline-flex h-12 min-h-[44px] items-center gap-2 rounded-xl border px-4 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45",
        tono === "peligro"
          ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
          : "border-brand-dark/15 bg-brand-card text-brand-dark hover:border-brand-accent/40 hover:bg-brand-accent/[0.07] hover:text-brand-accent"
      )}
    >
      <Icono className="h-5 w-5 shrink-0" aria-hidden="true" />
      {children}
    </button>
  );
}

/** El mismo botón de fila cuando lo que hace es ir a otra pantalla. */
export function EnlaceFila({
  href,
  icono: Icono,
  children,
}: {
  href: string;
  icono: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-12 min-h-[44px] items-center gap-2 rounded-xl border border-brand-dark/15 bg-brand-card px-4 text-base font-semibold text-brand-dark transition-colors hover:border-brand-accent/40 hover:bg-brand-accent/[0.07] hover:text-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
    >
      <Icono className="h-5 w-5 shrink-0" aria-hidden="true" />
      {children}
    </Link>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * BUSCADOR, CHIPS E INTERRUPTORES
 * ──────────────────────────────────────────────────────────────────────────── */

export function BuscadorGrande({
  id,
  valor,
  onChange,
  etiqueta,
  marcador,
}: {
  id: string;
  valor: string;
  onChange: (valor: string) => void;
  etiqueta: string;
  marcador: string;
}) {
  return (
    <div className="relative w-full">
      <Label htmlFor={id} className="sr-only">
        {etiqueta}
      </Label>
      <Search
        className="pointer-events-none absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-brand-taupe"
        aria-hidden="true"
      />
      <Input
        id={id}
        type="search"
        value={valor}
        onChange={(evento) => onChange(evento.target.value)}
        placeholder={marcador}
        aria-label={etiqueta}
        className="h-14 rounded-2xl pl-14 pr-12 text-lg"
      />
      {valor !== "" ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Borrar lo que escribí en la búsqueda"
          className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-brand-taupe transition-colors hover:bg-brand-dark/5 hover:text-brand-dark"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

export function ChipFiltro({
  activo,
  onClick,
  icono: Icono,
  children,
  cantidad,
}: {
  activo: boolean;
  onClick: () => void;
  icono?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  cantidad?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={cn(
        "inline-flex h-12 min-h-[44px] items-center gap-2 rounded-full border-2 px-5 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2",
        activo
          ? "border-brand-accent bg-brand-accent text-white shadow-warm-sm"
          : "border-brand-dark/15 bg-brand-card text-brand-dark hover:border-brand-accent/40 hover:bg-brand-accent/[0.07]"
      )}
    >
      {Icono ? <Icono className="h-5 w-5 shrink-0" aria-hidden="true" /> : null}
      {children}
      {typeof cantidad === "number" ? (
        <span
          className={cn(
            "ml-1 rounded-full px-2 py-0.5 text-sm font-bold",
            activo ? "bg-white/25 text-white" : "bg-brand-sand text-brand-taupe"
          )}
        >
          {cantidad}
        </span>
      ) : null}
    </button>
  );
}

/** Interruptor grande con etiqueta a la derecha (p. ej. "Ver eliminados"). */
export function InterruptorTexto({
  id,
  activo,
  onChange,
  etiqueta,
  ayuda,
}: {
  id: string;
  activo: boolean;
  onChange: (activo: boolean) => void;
  etiqueta: string;
  ayuda?: string;
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={activo}
      onClick={() => onChange(!activo)}
      className={cn(
        "flex h-12 min-h-[44px] items-center gap-3 rounded-2xl border-2 px-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2",
        activo
          ? "border-brand-accent bg-brand-accent/10"
          : "border-brand-dark/15 bg-brand-card hover:border-brand-accent/40"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors",
          activo ? "bg-brand-accent" : "bg-brand-taupe/30"
        )}
      >
        <span
          className={cn(
            "block h-5 w-5 rounded-full bg-white shadow transition-transform",
            activo ? "translate-x-5" : "translate-x-0"
          )}
        />
      </span>
      <span>
        <span className="block text-base font-semibold text-brand-dark">{etiqueta}</span>
        {ayuda ? <span className="block text-sm text-brand-taupe">{ayuda}</span> : null}
      </span>
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * FORMULARIOS
 * ──────────────────────────────────────────────────────────────────────────── */

/** Campo con etiqueta grande, ayuda debajo y error en español que dice qué corregir. */
export function Campo({
  htmlFor,
  etiqueta,
  ayuda,
  error,
  obligatorio,
  children,
}: {
  htmlFor: string;
  etiqueta: string;
  ayuda?: string;
  error?: string;
  obligatorio?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="text-lg font-bold text-brand-dark">
        {etiqueta}
        {obligatorio ? (
          <span className="ml-1 text-brand-accent" aria-hidden="true">
            *
          </span>
        ) : null}
      </Label>
      {ayuda ? <p className="text-base text-brand-taupe">{ayuda}</p> : null}
      {children}
      {error ? (
        <p role="alert" className="flex items-start gap-2 text-base font-semibold text-red-700">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Clases comunes para los `<select>` nativos: grandes y cómodos con el dedo. */
export const CLASES_SELECT =
  "h-14 w-full rounded-xl border border-input bg-brand-card px-4 text-lg text-brand-dark shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent disabled:cursor-not-allowed disabled:opacity-50";

/* ────────────────────────────────────────────────────────────────────────────
 * AVISOS EN PANTALLA (no se esfuman como los toasts)
 * ──────────────────────────────────────────────────────────────────────────── */

/** Recuadro rojo con lo que impide continuar y qué hacer al respecto. */
export function AvisoBloqueo({ mensaje }: { mensaje: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-red-800"
    >
      <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
      <p className="text-base font-semibold leading-snug">{mensaje}</p>
    </div>
  );
}

/** Recuadro ámbar de advertencia: se puede seguir, pero conviene leerlo. */
export function AvisoCuidado({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-amber-900">
      <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
      <p className="text-base font-semibold leading-snug">{mensaje}</p>
    </div>
  );
}

/** Recuadro azul informativo. */
export function AvisoInfo({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border-2 border-sky-300 bg-sky-50 p-4 text-sky-900">
      <Info className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
      <p className="text-base leading-snug">{mensaje}</p>
    </div>
  );
}

/** Pantalla completa para quien no tiene el permiso necesario. Amable y con salida. */
export function AvisoSinPermiso({
  titulo,
  mensaje,
}: {
  titulo: string;
  mensaje: string;
}) {
  return (
    <Card className="mx-auto max-w-2xl p-10 text-center">
      <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-sand">
        <Lock className="h-10 w-10 text-brand-taupe" aria-hidden="true" />
      </span>
      <h2 className="mt-6 font-display text-2xl font-bold tracking-tight text-brand-dark">
        {titulo}
      </h2>
      <p className="mt-3 text-lg leading-relaxed text-brand-taupe">{mensaje}</p>
    </Card>
  );
}

/** Estado vacío amable, siempre con una salida (el botón que se le pase). */
export function EstadoVacio({
  icono: Icono,
  titulo,
  mensaje,
  children,
}: {
  icono: React.ComponentType<{ className?: string }>;
  titulo: string;
  mensaje: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center p-12 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-sand">
        <Icono className="h-10 w-10 text-brand-taupe" aria-hidden="true" />
      </span>
      <h2 className="mt-6 font-display text-2xl font-bold tracking-tight text-brand-dark">
        {titulo}
      </h2>
      <p className="mt-3 max-w-md text-lg leading-relaxed text-brand-taupe">{mensaje}</p>
      {children ? <div className="mt-8 w-full max-w-sm">{children}</div> : null}
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * DIÁLOGO DE ELIMINAR (§7) — el mismo en todas las pantallas
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * EL PIE DE TODA CONFIRMACIÓN — un solo orden en todo el módulo.
 *
 * El botón seguro («NO, VOLVER») va SIEMPRE primero: arriba en columna, a la
 * izquierda en pantalla ancha. El que hace la cosa va SIEMPRE después. Si la
 * posición del botón peligroso cambia de un diálogo a otro, el supervisor
 * aprende el gesto equivocado y acaba borrando lo que quería conservar.
 */
export function PieConfirmacion({
  onCancelar,
  onConfirmar,
  textoConfirmar,
  textoCancelar = "NO, VOLVER",
  icono: Icono = Trash2,
  peligroso = true,
  cargando = false,
  confirmarDeshabilitado = false,
  textoCargando,
}: {
  onCancelar: () => void;
  onConfirmar: () => void;
  textoConfirmar: string;
  textoCancelar?: string;
  icono?: React.ComponentType<{ className?: string }>;
  /** Rojo para lo destructivo, naranja de marca para lo demás. */
  peligroso?: boolean;
  cargando?: boolean;
  confirmarDeshabilitado?: boolean;
  /** Lo que se lee mientras trabaja, si hace falta cambiar el texto. */
  textoCargando?: string;
}) {
  return (
    <div className="flex flex-col gap-3 pt-2 sm:flex-row">
      <Button
        type="button"
        variant="outline"
        onClick={onCancelar}
        disabled={cargando}
        aria-label={textoCancelar}
        className="h-16 flex-1 gap-3 rounded-2xl text-lg font-bold [&_svg]:size-6"
      >
        <X className="h-6 w-6" aria-hidden="true" />
        {textoCancelar}
      </Button>
      <Button
        type="button"
        variant={peligroso ? "destructive" : "accent"}
        onClick={onConfirmar}
        disabled={cargando || confirmarDeshabilitado}
        aria-label={textoConfirmar}
        className="h-16 flex-1 gap-3 rounded-2xl text-lg font-bold [&_svg]:size-6"
      >
        {cargando ? (
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
        ) : (
          <Icono className="h-6 w-6" aria-hidden="true" />
        )}
        {cargando ? (textoCargando ?? textoConfirmar) : textoConfirmar}
      </Button>
    </div>
  );
}

export interface PropsDialogoEliminar {
  abierto: boolean;
  onCerrar: () => void;
  /** "¿Eliminar el rol «Tapicero»?" */
  titulo: string;
  /** Qué se conserva y qué se pierde, en frases cortas. */
  queSeConserva: string;
  queSePierde: string;
  /**
   * Lo que respondió la action cuando no se pudo eliminar. Se pinta DENTRO del
   * diálogo (nunca en un aviso que se esfuma) junto a la salida sugerida.
   */
  bloqueo?: string | null;
  /** Salida sugerida: p. ej. el selector "reasignar a…". */
  salida?: React.ReactNode;
  onConfirmar: () => void;
  cargando?: boolean;
  /** Cuando la salida aún no está completa (p. ej. falta elegir el rol destino). */
  confirmarDeshabilitado?: boolean;
  textoConfirmar?: string;
}

export function DialogoEliminar({
  abierto,
  onCerrar,
  titulo,
  queSeConserva,
  queSePierde,
  bloqueo,
  salida,
  onConfirmar,
  cargando,
  confirmarDeshabilitado,
  textoConfirmar = "SÍ, ELIMINAR",
}: PropsDialogoEliminar) {
  return (
    <Dialog open={abierto} onOpenChange={(valor) => (valor ? undefined : onCerrar())}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="pr-8 font-display text-2xl font-bold leading-snug">
            {titulo}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Confirma si quieres eliminar esto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2 rounded-2xl bg-brand-sand/60 p-4">
            <p className="flex items-start gap-2 text-base text-brand-dark">
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
              <span>
                <span className="font-bold">Se conserva:</span> {queSeConserva}
              </span>
            </p>
            <p className="flex items-start gap-2 text-base text-brand-dark">
              <X className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
              <span>
                <span className="font-bold">Se pierde:</span> {queSePierde}
              </span>
            </p>
          </div>

          {bloqueo ? <AvisoBloqueo mensaje={bloqueo} /> : null}
          {salida}

          <PieConfirmacion
            onCancelar={onCerrar}
            onConfirmar={onConfirmar}
            textoConfirmar={textoConfirmar}
            cargando={cargando}
            confirmarDeshabilitado={confirmarDeshabilitado}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * BOTONES DE UN FORMULARIO EN DIÁLOGO
 * ──────────────────────────────────────────────────────────────────────────── */

export function PieFormulario({
  onCancelar,
  guardando,
  textoGuardar,
  icono: Icono,
}: {
  onCancelar: () => void;
  guardando: boolean;
  textoGuardar: string;
  icono: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="sticky bottom-0 -mx-6 mt-2 flex flex-col gap-3 border-t border-brand-dark/10 bg-brand-card px-6 pb-1 pt-4 sm:flex-row-reverse">
      <Button
        type="submit"
        variant="accent"
        disabled={guardando}
        className="h-16 flex-1 gap-3 rounded-2xl text-lg font-bold [&_svg]:size-6"
      >
        {guardando ? (
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
        ) : (
          <Icono className="h-6 w-6" aria-hidden="true" />
        )}
        {textoGuardar}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onCancelar}
        disabled={guardando}
        className="h-16 flex-1 gap-3 rounded-2xl text-lg font-bold [&_svg]:size-6"
      >
        <X className="h-6 w-6" aria-hidden="true" />
        CANCELAR
      </Button>
    </div>
  );
}
