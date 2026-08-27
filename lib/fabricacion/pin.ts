/**
 * PIN de entrada al taller: 4 a 6 dígitos, guardado como hash con sal propia.
 *
 * SÓLO NODE. Usa `node:crypto`, así que **este archivo no puede importarlo el
 * middleware** (Edge Runtime) ni ningún componente de cliente: sólo actions,
 * route handlers y scripts. La comprobación de sesión que sí corre en Edge
 * vive en `lib/fabricacion/auth.ts`.
 *
 * Por qué un PIN y no una contraseña: lo teclea gente con las manos sucias en
 * un teclado numérico gigante. La seguridad real del módulo es la sesión con
 * cookie firmada más la auditoría completa (§1 del contrato).
 */

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/** Longitud de la sal en bytes (32 caracteres en hexadecimal). */
const BYTES_SAL = 16;
/** Longitud del hash derivado en bytes (128 caracteres en hexadecimal). */
const BYTES_HASH = 64;

const MIN_DIGITOS = 4;
const MAX_DIGITOS = 6;

/** El PIN es exactamente de 4 a 6 números, sin letras ni espacios. */
export function esPinValido(pin: string): boolean {
  return typeof pin === "string" && new RegExp(`^\\d{${MIN_DIGITOS},${MAX_DIGITOS}}$`).test(pin);
}

/**
 * Deriva el PIN con `scrypt` y una sal nueva por persona.
 *
 * Lanza si el PIN no tiene el formato correcto: las actions validan antes con
 * `esPinValido` para poder devolver el mensaje en español al usuario.
 */
export function hashPin(pin: string): { pinHash: string; pinSalt: string } {
  if (!esPinValido(pin)) {
    throw new Error("El PIN debe tener entre 4 y 6 números.");
  }
  const pinSalt = randomBytes(BYTES_SAL).toString("hex");
  const pinHash = scryptSync(pin, pinSalt, BYTES_HASH).toString("hex");
  return { pinHash, pinSalt };
}

/**
 * Comprueba un PIN contra el hash guardado, en tiempo constante.
 *
 * Nunca lanza: cualquier dato ausente o corrupto devuelve `false`, de forma
 * que un registro estropeado no deja a nadie entrar por error.
 */
export function verificarPin(pin: string, pinHash: string, pinSalt: string): boolean {
  if (typeof pin !== "string" || pin === "") return false;
  if (typeof pinHash !== "string" || pinHash === "") return false;
  if (typeof pinSalt !== "string" || pinSalt === "") return false;

  try {
    const guardado = Buffer.from(pinHash, "hex");
    const calculado = scryptSync(pin, pinSalt, guardado.length > 0 ? guardado.length : BYTES_HASH);
    // `timingSafeEqual` exige la misma longitud: si no coincide, ni comparamos.
    if (guardado.length !== calculado.length) return false;
    return timingSafeEqual(guardado, calculado);
  } catch (error) {
    console.error("[fabricacion/pin] verificarPin:", error);
    return false;
  }
}
