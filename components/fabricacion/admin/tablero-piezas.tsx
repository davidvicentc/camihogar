/**
 * Piezas compartidas del panel de fabricación: chips del semáforo, barras de
 * progreso, estados vacíos y las ayudas de formato de fecha.
 *
 * NO lleva `"use client"` a propósito: lo usan por igual las páginas (Server
 * Components) y las tablas interactivas. Por eso sólo importa
 * `lib/fabricacion/constantes.ts` (que es React puro) y NUNCA `permisos.ts`,
 * `codigos.ts` ni nada que arrastre Mongoose al navegador.
 *
 * Todas las fechas se formatean con zona horaria fija (`America/Caracas`) para
 * que el servidor y el navegador pinten exactamente el mismo texto y React no
 * se queje al hidratar.
 */

import type { ReactNode } from "react";
import { Inbox, Lock } from "lucide-react";
import {
  ETIQUETAS_CANAL,
  ETIQUETAS_ESTADO_INCIDENCIA,
  ETIQUETAS_ESTADO_PEDIDO,
  ETIQUETAS_PRIORIDAD,
  ETIQUETAS_SEVERIDAD,
  META_ESTADO_PASO,
  META_ESTADO_UNIDAD,
} from "@/lib/fabricacion/constantes";
import type {
  Canal,
  Capacidad,
  EstadoIncidencia,
  EstadoPaso,
  EstadoPedido,
  EstadoUnidad,
  Prioridad,
  SesionOperario,
  Severidad,
} from "@/lib/types/fabricacion";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * PERMISOS DE QUIEN ESTÁ MIRANDO
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Las capacidades que el panel necesita consultar, ya resueltas a booleanos
 * planos para poder cruzar la frontera Server → Client.
 */
export interface PermisosPanel {
  verTablero: boolean;
  gestionarPedidos: boolean;
  eliminarPedidos: boolean;
  gestionarUnidades: boolean;
  cancelarUnidades: boolean;
  revertirPasos: boolean;
  resolverIncidencias: boolean;
  reportarIncidencias: boolean;
  verPrecios: boolean;
  imprimirEtiquetas: boolean;
  verAuditoria: boolean;
  gestionarRutas: boolean;
}

const PERMISOS_VACIOS: PermisosPanel = {
  verTablero: false,
  gestionarPedidos: false,
  eliminarPedidos: false,
  gestionarUnidades: false,
  cancelarUnidades: false,
  revertirPasos: false,
  resolverIncidencias: false,
  reportarIncidencias: false,
  verPrecios: false,
  imprimirEtiquetas: false,
  verAuditoria: false,
  gestionarRutas: false,
};

/**
 * Traduce la sesión a booleanos. Repite a propósito la lógica de
 * `tiene()` (una comprobación de un array, tres líneas) en vez de importar
 * `lib/fabricacion/permisos.ts`, que arrastra Mongoose y no puede acabar en el
 * paquete del navegador.
 */
export function permisosDe(sesion: SesionOperario | null | undefined): PermisosPanel {
  if (!sesion) return PERMISOS_VACIOS;

  const puede = (capacidad: Capacidad): boolean =>
    sesion.esAdmin || sesion.capacidades.includes(capacidad);

  return {
    verTablero: puede("ver_tablero"),
    gestionarPedidos: puede("gestionar_pedidos"),
    eliminarPedidos: puede("eliminar_pedidos"),
    gestionarUnidades: puede("gestionar_unidades"),
    cancelarUnidades: puede("cancelar_unidades"),
    revertirPasos: puede("revertir_pasos"),
    resolverIncidencias: puede("resolver_incidencias"),
    reportarIncidencias: puede("reportar_incidencias"),
    verPrecios: puede("ver_precios"),
    imprimirEtiquetas: puede("imprimir_etiquetas"),
    verAuditoria: puede("ver_auditoria"),
    gestionarRutas: puede("gestionar_rutas"),
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * FECHAS Y DURACIONES
 * ──────────────────────────────────────────────────────────────────────────── */

const ZONA = "America/Caracas";

const FORMATO_FECHA = new Intl.DateTimeFormat("es-VE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: ZONA,
});

const FORMATO_FECHA_HORA = new Intl.DateTimeFormat("es-VE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: ZONA,
});

const MS_POR_DIA = 1000 * 60 * 60 * 24;

/** "12 mar 2026" — o el texto de respaldo cuando no hay fecha. */
export function fechaCorta(iso: string | null | undefined, vacio = "Sin fecha"): string {
  if (!iso) return vacio;
  const valor = new Date(iso);
  if (Number.isNaN(valor.getTime())) return vacio;
  return FORMATO_FECHA.format(valor);
}

/** "12 mar 2026, 09:41" */
export function fechaLarga(iso: string | null | undefined, vacio = "—"): string {
  if (!iso) return vacio;
  const valor = new Date(iso);
  if (Number.isNaN(valor.getTime())) return vacio;
  return FORMATO_FECHA_HORA.format(valor);
}

/**
 * Días enteros entre dos instantes. La referencia (`ahoraIso`) SIEMPRE viaja
 * como prop desde el servidor: si cada lado llamara a `Date.now()` el texto
 * podría salir distinto y React protestaría al hidratar.
 */
export function diasEntre(desdeIso: string | null | undefined, ahoraIso: string): number {
  if (!desdeIso) return 0;
  const desde = new Date(desdeIso).getTime();
  const ahora = new Date(ahoraIso).getTime();
  if (Number.isNaN(desde) || Number.isNaN(ahora)) return 0;
  return Math.floor((ahora - desde) / MS_POR_DIA);
}

/** "hace 3 días" / "hoy" — para la antigüedad de un problema o de un paso. */
export function desdeHace(desdeIso: string | null | undefined, ahoraIso: string): string {
  const dias = diasEntre(desdeIso, ahoraIso);
  if (dias <= 0) return "hoy";
  if (dias === 1) return "hace 1 día";
  return `hace ${dias} días`;
}

/** "2 h 15 min" — lo que tardó un paso. */
export function duracionLegible(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  const minutos = Math.round(ms / 60000);
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas < 24) return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
  const dias = Math.floor(horas / 24);
  const horasResto = horas % 24;
  return horasResto === 0 ? `${dias} días` : `${dias} días ${horasResto} h`;
}

/** `true` si la fecha prometida ya pasó. Compara sólo el día, sin la hora. */
export function estaRetrasada(
  fechaPrometida: string | null | undefined,
  hoyIso: string
): boolean {
  if (!fechaPrometida) return false;
  return fechaPrometida.slice(0, 10) < hoyIso.slice(0, 10);
}

/** Convierte un ISO a `yyyy-mm-dd` para rellenar un `<input type="date">`. */
export function paraInputFecha(iso: string | null | undefined): string {
  if (!iso) return "";
  const valor = new Date(iso);
  if (Number.isNaN(valor.getTime())) return "";
  return valor.toISOString().slice(0, 10);
}

/* ────────────────────────────────────────────────────────────────────────────
 * WHATSAPP DEL CLIENTE
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Enlace para escribirle al CLIENTE por WhatsApp.
 *
 * No usa `buildWhatsAppLink` de `lib/whatsapp.ts` porque aquélla siempre abre
 * el chat de la tienda (es la del botón "pedir por WhatsApp" de la web) y aquí
 * hace falta lo contrario: el número que el cliente dejó en su pedido.
 *
 * Arregla las formas venezolanas de escribirlo: `0412-1234567`,
 * `412 1234567` o ya con el `+58` delante.
 */
export function whatsappDelCliente(telefono: string, mensaje?: string): string | null {
  const digitos = (telefono ?? "").replace(/\D/g, "");
  if (digitos.length < 9) return null;

  let internacional = digitos;
  if (internacional.startsWith("58")) {
    // Ya viene con el código de país.
  } else if (internacional.startsWith("0")) {
    internacional = `58${internacional.slice(1)}`;
  } else if (internacional.length === 10) {
    internacional = `58${internacional}`;
  }

  const texto = mensaje ? `?text=${encodeURIComponent(mensaje)}` : "";
  return `https://wa.me/${internacional}${texto}`;
}

/* ────────────────────────────────────────────────────────────────────────────
 * CHIPS DEL SEMÁFORO
 * gris = bloqueado · azul = listo · ámbar = en curso · verde = terminado ·
 * rojo = problema. Siempre icono + texto, nunca sólo color (§9).
 * ──────────────────────────────────────────────────────────────────────────── */

const CHIP_BASE =
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold";

export function ChipEstadoUnidad({
  estado,
  className,
}: {
  estado: EstadoUnidad;
  className?: string;
}) {
  const meta = META_ESTADO_UNIDAD[estado];
  const Icono = meta.icono;
  return (
    <span className={cn(CHIP_BASE, meta.clases, className)} title={meta.descripcion}>
      <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />
      {meta.label}
    </span>
  );
}

export function ChipEstadoPaso({
  estado,
  className,
}: {
  estado: EstadoPaso;
  className?: string;
}) {
  const meta = META_ESTADO_PASO[estado];
  const Icono = meta.icono;
  return (
    <span className={cn(CHIP_BASE, meta.clases, className)} title={meta.descripcion}>
      <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />
      {meta.label}
    </span>
  );
}

export function ChipPrioridad({
  prioridad,
  className,
}: {
  prioridad: Prioridad;
  className?: string;
}) {
  const meta = ETIQUETAS_PRIORIDAD[prioridad];
  const Icono = meta.icono;
  return (
    <span className={cn(CHIP_BASE, meta.clases, className)}>
      <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />
      {meta.label}
    </span>
  );
}

export function ChipEstadoPedido({
  estado,
  className,
}: {
  estado: EstadoPedido;
  className?: string;
}) {
  const meta = ETIQUETAS_ESTADO_PEDIDO[estado];
  const Icono = meta.icono;
  return (
    <span className={cn(CHIP_BASE, meta.clases, className)}>
      <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />
      {meta.label}
    </span>
  );
}

export function ChipCanal({ canal, className }: { canal: Canal; className?: string }) {
  const meta = ETIQUETAS_CANAL[canal];
  const Icono = meta.icono;
  return (
    <span className={cn(CHIP_BASE, meta.clases, className)}>
      <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />
      {meta.label}
    </span>
  );
}

export function ChipSeveridad({
  severidad,
  className,
}: {
  severidad: Severidad;
  className?: string;
}) {
  const meta = ETIQUETAS_SEVERIDAD[severidad];
  const Icono = meta.icono;
  return (
    <span className={cn(CHIP_BASE, meta.clases, className)}>
      <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />
      {meta.label}
    </span>
  );
}

export function ChipEstadoIncidencia({
  estado,
  className,
}: {
  estado: EstadoIncidencia;
  className?: string;
}) {
  const meta = ETIQUETAS_ESTADO_INCIDENCIA[estado];
  const Icono = meta.icono;
  return (
    <span className={cn(CHIP_BASE, meta.clases, className)}>
      <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />
      {meta.label}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * PROGRESO
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Barra de progreso con su número al lado. Es un `<div>` y no el `Progress` de
 * Radix para poder usarla también desde Server Components.
 */
export function BarraProgreso({
  valor,
  etiqueta,
  className,
}: {
  valor: number;
  etiqueta?: string;
  className?: string;
}) {
  const seguro = Math.max(0, Math.min(100, Math.round(valor)));
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        role="progressbar"
        aria-valuenow={seguro}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={etiqueta ?? `Avance: ${seguro} por ciento`}
        className="h-2.5 w-full overflow-hidden rounded-full bg-brand-taupe/15"
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            seguro >= 100 ? "bg-green-600" : "bg-brand-accent"
          )}
          style={{ width: `${seguro}%` }}
        />
      </div>
      <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums text-brand-taupe">
        {seguro}%
      </span>
    </div>
  );
}

/** "3 / 5" con su barra: los muebles terminados de un pedido. */
export function ProgresoPedido({
  completadas,
  total,
  className,
}: {
  completadas: number;
  total: number;
  className?: string;
}) {
  const porcentaje = total > 0 ? Math.round((completadas / total) * 100) : 0;
  return (
    <div className={cn("min-w-[7rem] space-y-1", className)}>
      <p className="text-sm font-semibold tabular-nums text-brand-dark">
        {completadas} / {total} <span className="font-normal text-brand-taupe">listos</span>
      </p>
      <div
        role="progressbar"
        aria-valuenow={porcentaje}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${completadas} de ${total} muebles terminados`}
        className="h-2 w-full overflow-hidden rounded-full bg-brand-taupe/15"
      >
        <div
          className={cn(
            "h-full rounded-full",
            porcentaje >= 100 ? "bg-green-600" : "bg-brand-accent"
          )}
          style={{ width: `${porcentaje}%` }}
        />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * ESTADOS VACÍOS Y FALTA DE PERMISO
 * ──────────────────────────────────────────────────────────────────────────── */

/** Estado vacío amable y CON SALIDA (§9): siempre ofrece qué hacer ahora. */
export function EstadoVacio({
  titulo,
  mensaje,
  icono,
  accion,
}: {
  titulo: string;
  mensaje: string;
  icono?: ReactNode;
  accion?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-brand-dark/15 bg-brand-card p-10 text-center shadow-warm-sm">
      <span
        aria-hidden="true"
        className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-accent/10 text-brand-accent"
      >
        {icono ?? <Inbox className="h-7 w-7" />}
      </span>
      <p className="font-display text-xl font-semibold text-brand-dark">{titulo}</p>
      <p className="mx-auto mt-2 max-w-md text-base text-brand-taupe">{mensaje}</p>
      {accion && <div className="mt-6 flex justify-center">{accion}</div>}
    </div>
  );
}

/** Lo que ve quien entra a una pantalla para la que no tiene permiso. */
export function SinPermiso({
  que = "esta pantalla",
}: {
  /** Frase que completa "No puedes ver …". */
  que?: string;
}) {
  return (
    <div className="rounded-3xl border border-brand-dark/10 bg-brand-card p-10 text-center shadow-warm-sm">
      <span
        aria-hidden="true"
        className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500"
      >
        <Lock className="h-7 w-7" />
      </span>
      <h2 className="font-display text-2xl font-semibold text-brand-dark">
        No puedes ver {que}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-base text-brand-taupe">
        Tu rol no tiene este permiso. Habla con quien administra el sistema para que te
        lo active.
      </p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * DETALLES SUELTOS
 * ──────────────────────────────────────────────────────────────────────────── */

/** Par etiqueta / valor de las fichas. Si no hay valor, pinta un guion. */
export function Dato({
  etiqueta,
  children,
  className,
}: {
  etiqueta: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-sm font-medium text-brand-taupe">{etiqueta}</dt>
      <dd className="mt-0.5 break-words text-base font-semibold text-brand-dark">
        {children === "" || children === null || children === undefined ? "—" : children}
      </dd>
    </div>
  );
}

/** El código del mueble o del pedido, siempre en monoespaciada y bien grande. */
export function Codigo({
  valor,
  className,
}: {
  valor: string;
  className?: string;
}) {
  return (
    <span className={cn("font-mono font-bold tracking-tight text-brand-dark", className)}>
      {valor}
    </span>
  );
}
