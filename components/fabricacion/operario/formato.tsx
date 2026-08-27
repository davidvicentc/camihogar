/**
 * Formato de fechas y textos para la app del taller.
 *
 * Todo se calcula con la zona horaria de Venezuela puesta a mano
 * (`America/Caracas`). Es la única forma de que el servidor (que en producción
 * corre en UTC) y el teléfono del operario escriban exactamente la misma hora:
 * si no, React avisa de que lo pintado no coincide y, peor, el carpintero ve
 * una hora que no es la suya.
 *
 * Son funciones puras: las usan por igual las páginas del servidor y los
 * componentes de cliente.
 */

const ZONA = "America/Caracas";
const LOCALE = "es-VE";

/** Convierte una fecha ISO en `Date`, o `null` si no vale. */
function aFecha(iso: string | null | undefined): Date | null {
  if (typeof iso !== "string" || iso.trim() === "") return null;
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

const FORMATO_FECHA_CORTA = new Intl.DateTimeFormat(LOCALE, {
  timeZone: ZONA,
  day: "numeric",
  month: "short",
  year: "numeric",
});

const FORMATO_DIA_MES = new Intl.DateTimeFormat(LOCALE, {
  timeZone: ZONA,
  day: "numeric",
  month: "short",
});

const FORMATO_HORA = new Intl.DateTimeFormat(LOCALE, {
  timeZone: ZONA,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const FORMATO_DIA_LARGO = new Intl.DateTimeFormat(LOCALE, {
  timeZone: ZONA,
  weekday: "long",
  day: "numeric",
  month: "long",
});

const FORMATO_CLAVE_DIA = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "14 ene 2026". Cadena vacía si no hay fecha. */
export function formatearFechaCorta(iso: string | null | undefined): string {
  const fecha = aFecha(iso);
  return fecha ? FORMATO_FECHA_CORTA.format(fecha) : "";
}

/** "14 ene, 3:20 p. m." — el formato de la línea de tiempo. */
export function formatearFechaHora(iso: string | null | undefined): string {
  const fecha = aFecha(iso);
  if (!fecha) return "";
  return `${FORMATO_DIA_MES.format(fecha)}, ${FORMATO_HORA.format(fecha)}`;
}

/** "martes, 26 de agosto" — el saludo de la pantalla principal. */
export function formatearDiaLargo(fecha: Date): string {
  return FORMATO_DIA_LARGO.format(fecha);
}

/** El día del calendario en Caracas, como número, para restar días sin líos. */
function claveDia(fecha: Date): number {
  return Date.parse(`${FORMATO_CLAVE_DIA.format(fecha)}T00:00:00Z`);
}

/**
 * Cuántos días faltan para esa fecha (negativo si ya pasó), contando días de
 * calendario y no horas sueltas. `null` si no hay fecha.
 */
export function diasHastaFecha(
  iso: string | null | undefined,
  ahora: Date = new Date()
): number | null {
  const fecha = aFecha(iso);
  if (!fecha) return null;
  return Math.round((claveDia(fecha) - claveDia(ahora)) / 86_400_000);
}

/** Cómo se avisa de la fecha de entrega, en frases que dicen qué pasa. */
export interface AvisoEntrega {
  /** "Hay que entregarlo hoy" · "Se pasó la fecha por 3 días". */
  texto: string;
  /** La fecha en corto, para ponerla al lado. */
  fecha: string;
  /** Ya pasó la fecha: se pinta en rojo y grande. */
  tarde: boolean;
  /** Falta poco (hoy o mañana): se pinta en naranja. */
  cerca: boolean;
}

/**
 * Traduce la fecha prometida a un aviso en español llano. `null` cuando el
 * mueble no tiene fecha comprometida.
 */
export function avisoDeEntrega(
  iso: string | null | undefined,
  ahora: Date = new Date()
): AvisoEntrega | null {
  const dias = diasHastaFecha(iso, ahora);
  if (dias === null) return null;

  const fecha = formatearFechaCorta(iso);

  if (dias < 0) {
    const atraso = Math.abs(dias);
    return {
      texto:
        atraso === 1
          ? "Se pasó la fecha de entrega por 1 día"
          : `Se pasó la fecha de entrega por ${atraso} días`,
      fecha,
      tarde: true,
      cerca: false,
    };
  }
  if (dias === 0) {
    return { texto: "Hay que entregarlo hoy", fecha, tarde: false, cerca: true };
  }
  if (dias === 1) {
    return { texto: "Hay que entregarlo mañana", fecha, tarde: false, cerca: true };
  }
  return {
    texto: `Faltan ${dias} días para entregarlo`,
    fecha,
    tarde: false,
    cerca: dias <= 3,
  };
}

/** "David Pérez" → "D". Para el círculo de color de cada persona. */
export function inicialDe(nombre: string): string {
  const limpio = (nombre ?? "").trim();
  return limpio === "" ? "?" : limpio.charAt(0).toUpperCase();
}

/** "David Pérez" → "David". El saludo se hace con el nombre de pila. */
export function primerNombre(nombre: string): string {
  const limpio = (nombre ?? "").trim();
  if (limpio === "") return "";
  return limpio.split(/\s+/)[0];
}

/** "2 h 15 min" · "45 min" · "" si no hay duración. */
export function formatearDuracion(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "";
  const minutos = Math.round(ms / 60_000);
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}
