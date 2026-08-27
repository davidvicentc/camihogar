/**
 * Códigos legibles de pedidos y muebles.
 *
 * Decisión del dueño (§1 del contrato): **el QR no lleva token**. Codifica
 * exactamente `{siteUrl}/f/COD-XXXXXX` y nada más. La seguridad real es tener
 * la sesión iniciada más la auditoría completa; un token en la etiqueta sólo
 * complicaría reimprimirla.
 *
 * `normalizarCodigo` es la pieza crítica del escaneo: la cámara, el teclado
 * numérico gigante y el buscador del panel pasan SIEMPRE por aquí, así que
 * acepta cualquier forma razonable de escribir un código y devuelve el
 * canónico (`COD-949473`) o `null`.
 */

import { siguienteSecuencia } from "@/lib/models/Counter";
import { getSiteUrl } from "@/lib/utils";

/** Prefijo de los muebles (unidades de fabricación). */
export const PREFIJO_UNIDAD = "COD";
/** Prefijo de los pedidos de cliente. */
export const PREFIJO_PEDIDO = "PED";

/** Nombres de los documentos de la colección `counters`. */
export const CONTADOR_UNIDAD = "unidad";
export const CONTADOR_PEDIDO = "pedido";

/** Los códigos arrancan altos para que nunca se lean como "el número 1". */
const BASE_PEDIDO = 100000;
const BASE_UNIDAD = 900000;

const DIGITOS = 6;
const MIN_DIGITOS = 6;
const MAX_DIGITOS = 10;

/* ────────────────────────────────────────────────────────────────────────────
 * GENERACIÓN
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * `PED-100248`. La unicidad la garantiza el contador atómico de MongoDB
 * (`findOneAndUpdate` con `$inc`), no un aleatorio: dos pedidos creados a la
 * vez nunca comparten código.
 */
export async function generarCodigoPedido(): Promise<string> {
  const secuencia = await siguienteSecuencia(CONTADOR_PEDIDO);
  return `${PREFIJO_PEDIDO}-${String(BASE_PEDIDO + secuencia).padStart(DIGITOS, "0")}`;
}

/** `COD-949473`. Mismo contador atómico que los pedidos, otra serie. */
export async function generarCodigoUnidad(): Promise<string> {
  const secuencia = await siguienteSecuencia(CONTADOR_UNIDAD);
  return `${PREFIJO_UNIDAD}-${String(BASE_UNIDAD + secuencia).padStart(DIGITOS, "0")}`;
}

/* ────────────────────────────────────────────────────────────────────────────
 * URL DEL QR — SIN TOKEN
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Lo único que se imprime en el QR de la etiqueta: `{siteUrl}/f/COD-949473`.
 *
 * No existe ninguna función que genere tokens y esta URL nunca lleva
 * parámetros: quien la abre pasa por el mismo control de sesión que el resto
 * del módulo.
 */
export function urlQr(codigo: string): string {
  const canonico = normalizarCodigo(codigo) ?? codigo.trim().toUpperCase();
  return `${getSiteUrl()}/f/${canonico}`;
}

/* ────────────────────────────────────────────────────────────────────────────
 * NORMALIZACIÓN — A PRUEBA DE BALAS
 * ──────────────────────────────────────────────────────────────────────────── */

/** Se queda con el último tramo útil de una URL o ruta (`/f/COD-949473?x=1`). */
function ultimoSegmento(entrada: string): string {
  const sinConsulta = entrada.split(/[?#]/)[0] ?? "";
  const partes = sinConsulta.split("/").filter((parte) => parte.trim() !== "");
  return partes.length > 0 ? partes[partes.length - 1] : sinConsulta;
}

function componer(prefijo: string, digitos: string): string {
  return `${prefijo}-${digitos.padStart(DIGITOS, "0")}`;
}

/**
 * Convierte cualquier forma de escribir un código en la canónica.
 *
 * Acepta, entre otras: `949473`, `cod949473`, `COD 949473`, `cod-949473`,
 * `  Cod949473  `, `PED-100248`, `https://camihogar.com/f/COD-949473`,
 * `https://camihogar.com/f/cod-949473/`, `/f/COD-949473?copias=2` y el texto
 * que devuelven algunos lectores con el código incrustado.
 *
 * Reglas:
 *  - Sin prefijo se asume que es un mueble (`COD-`), porque es lo único que se
 *    escanea y lo único que se teclea a mano en el taller.
 *  - Exige de 6 a 10 dígitos: un código a medias se rechaza en vez de apuntar
 *    por accidente a otro mueble.
 *
 * Devuelve `null` cuando no hay nada reconocible, para que la interfaz pueda
 * decir "No entendimos ese código. Vuelve a intentarlo."
 */
export function normalizarCodigo(entrada: string): string | null {
  if (typeof entrada !== "string") return null;

  let texto = entrada.trim();
  if (texto === "") return null;

  // Algunos lectores devuelven la URL con caracteres escapados (%20).
  try {
    texto = decodeURIComponent(texto);
  } catch {
    // Si el escape está mal formado seguimos con el texto tal cual.
  }

  const candidato = texto.includes("/") ? ultimoSegmento(texto) : texto;

  // Fuera acentos raros, guiones largos, espacios finos y cualquier adorno.
  const limpio = candidato
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  const directo = limpio.match(
    new RegExp(`^(${PREFIJO_UNIDAD}|${PREFIJO_PEDIDO})?(\\d{${MIN_DIGITOS},${MAX_DIGITOS}})$`)
  );
  if (directo) {
    const prefijo = directo[1] ?? PREFIJO_UNIDAD;
    return componer(prefijo, directo[2]);
  }

  // Último intento: el código va incrustado en una frase o en una URL rara.
  const incrustado = texto
    .toUpperCase()
    .match(
      new RegExp(
        `(${PREFIJO_UNIDAD}|${PREFIJO_PEDIDO})[^A-Z0-9]?(\\d{${MIN_DIGITOS},${MAX_DIGITOS}})`
      )
    );
  if (incrustado) {
    return componer(incrustado[1], incrustado[2]);
  }

  return null;
}

/** ¿Es el código de un mueble? Normaliza antes, así `cod949473` también vale. */
export function esCodigoUnidad(codigo: string): boolean {
  return normalizarCodigo(codigo)?.startsWith(`${PREFIJO_UNIDAD}-`) ?? false;
}

/** ¿Es el código de un pedido? Exige el prefijo `PED-` explícito. */
export function esCodigoPedido(codigo: string): boolean {
  return normalizarCodigo(codigo)?.startsWith(`${PREFIJO_PEDIDO}-`) ?? false;
}
