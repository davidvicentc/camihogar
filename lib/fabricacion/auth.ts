/**
 * Sesión del operario del taller.
 *
 * ⚠️ FRONTERA EDGE / NODE — leer antes de tocar nada:
 *
 *  · EDGE-SAFE (los puede usar `middleware.ts`): `OPERARIO_COOKIE`,
 *    `OPCIONES_COOKIE_OPERARIO`, `crearTokenOperario` y
 *    `verificarTokenOperario`. Sólo usan Web Crypto (`crypto.subtle`),
 *    `TextEncoder`, `btoa`/`atob`. Nada de `node:crypto`, nada de Buffer,
 *    nada de Mongoose, nada de `next/headers`.
 *
 *  · SÓLO NODE (Server Components, actions, route handlers):
 *    `getSesionOperario`, `requireOperario` y `requireCapacidad`. Cargan
 *    `next/headers` y `./permisos` con `import()` dinámico **a propósito**,
 *    para que el middleware no arrastre Mongoose al bundle de Edge.
 *
 * El token lleva sólo quién es la persona: `{uid, nombre, rolClave, exp}`.
 * **Las capacidades NUNCA van dentro** (§4 del contrato); se resuelven leyendo
 * el rol en cada comprobación, así quitar un permiso surte efecto sin que
 * nadie tenga que volver a entrar.
 */

import { ADMIN_COOKIE, verifySessionToken } from "@/lib/auth";
import { CAPACIDADES, type Capacidad, type SesionOperario } from "@/lib/types/fabricacion";

/** Cookie propia del taller, aparte de la del admin (`camihogar_admin`). */
export const OPERARIO_COOKIE = "camihogar_operario";

/** Una jornada larga: el turno no se corta a mitad de un mueble. */
const HORAS_SESION = 12;

/**
 * Opciones con las que `iniciarSesionOperario` debe escribir la cookie, para
 * que todo el módulo use exactamente las mismas.
 */
export const OPCIONES_COOKIE_OPERARIO = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: HORAS_SESION * 60 * 60,
};

/** Lo único que viaja firmado en la cookie. */
export interface DatosTokenOperario {
  uid: string;
  nombre: string;
  rolClave: string;
}

interface CargaToken extends DatosTokenOperario {
  /** Momento de caducidad en milisegundos. */
  exp: number;
}

/* ────────────────────────────────────────────────────────────────────────────
 * BASE64URL Y FIRMA — EDGE-SAFE (sin Buffer)
 * ──────────────────────────────────────────────────────────────────────────── */

function aBase64Url(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let binario = "";
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deBase64Url(valor: string): string {
  const base64 = valor.replace(/-/g, "+").replace(/_/g, "/");
  const sobra = base64.length % 4;
  const relleno = sobra === 0 ? "" : "=".repeat(4 - sobra);
  const binario = atob(base64 + relleno);
  const bytes = Uint8Array.from(binario, (caracter) => caracter.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function getSecret(): string {
  const secreto = process.env.AUTH_SECRET;
  if (!secreto) {
    throw new Error("Falta AUTH_SECRET en las variables de entorno.");
  }
  return secreto;
}

/** HMAC-SHA256 en hexadecimal, igual que `lib/auth.ts`. */
async function firmar(carga: string): Promise<string> {
  const clave = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const firma = await crypto.subtle.sign("HMAC", clave, new TextEncoder().encode(carga));
  return Array.from(new Uint8Array(firma))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Comparación en tiempo constante, para no filtrar la firma byte a byte. */
function igualesEnTiempoConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) {
    diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diferencia === 0;
}

function esCargaValida(valor: unknown): valor is CargaToken {
  if (typeof valor !== "object" || valor === null) return false;
  const carga = valor as Record<string, unknown>;
  return (
    typeof carga.uid === "string" &&
    carga.uid !== "" &&
    typeof carga.nombre === "string" &&
    typeof carga.rolClave === "string" &&
    carga.rolClave !== "" &&
    typeof carga.exp === "number" &&
    Number.isFinite(carga.exp)
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * TOKEN — EDGE-SAFE
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * EDGE-SAFE. Crea el token `base64url({uid,nombre,rolClave,exp}).<firma>`.
 * Sin capacidades dentro: eso se resuelve siempre contra el rol.
 */
export async function crearTokenOperario(datos: DatosTokenOperario): Promise<string> {
  const carga: CargaToken = {
    uid: datos.uid,
    nombre: datos.nombre,
    rolClave: datos.rolClave,
    exp: Date.now() + HORAS_SESION * 60 * 60 * 1000,
  };
  const cuerpo = aBase64Url(JSON.stringify(carga));
  const firma = await firmar(cuerpo);
  return `${cuerpo}.${firma}`;
}

/**
 * EDGE-SAFE. Valida firma y caducidad y devuelve quién es la persona.
 * No toca la base de datos: **no resuelve capacidades** (eso es cosa de
 * `getSesionOperario`, que sí corre en Node).
 */
export async function verificarTokenOperario(
  token?: string
): Promise<DatosTokenOperario | null> {
  if (!token) return null;

  const separador = token.lastIndexOf(".");
  if (separador <= 0) return null;

  const cuerpo = token.slice(0, separador);
  const firma = token.slice(separador + 1);
  if (cuerpo === "" || firma === "") return null;

  const esperada = await firmar(cuerpo);
  if (!igualesEnTiempoConstante(esperada, firma)) return null;

  try {
    const carga: unknown = JSON.parse(deBase64Url(cuerpo));
    if (!esCargaValida(carga)) return null;
    if (carga.exp < Date.now()) return null;
    return { uid: carga.uid, nombre: carga.nombre, rolClave: carga.rolClave };
  } catch {
    // Token manipulado o base64 corrupto: se trata como si no hubiera sesión.
    return null;
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * SESIÓN COMPLETA — SÓLO NODE
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * ¿Es este error una señal interna de Next y no un fallo de verdad?
 *
 * `cookies()`, `redirect()` y `notFound()` no devuelven: lanzan un error con
 * un `digest` de texto (`DYNAMIC_SERVER_USAGE`, `NEXT_REDIRECT`, …) que el
 * propio framework espera cazar más arriba. Si lo capturamos nosotros, Next
 * nunca se entera y la página acaba renderizada mal.
 */
function esSenalDeNext(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string"
  );
}

/** El dueño entrando con la cookie del panel: siempre lo puede todo. */
function sesionAdminVirtual(): SesionOperario {
  return {
    uid: "admin",
    nombre: "Administrador",
    rolClave: "admin",
    rolNombre: "Administrador",
    capacidades: [...CAPACIDADES],
    esAdmin: true,
  };
}

/**
 * SÓLO NODE. Quién está usando el módulo ahora mismo, con sus capacidades ya
 * resueltas desde el rol (no desde el token).
 *
 * Si no hay cookie de operario pero sí una sesión de admin válida, devuelve el
 * operario virtual «Administrador»: el dueño entra sin tener que crearse un
 * usuario del taller.
 *
 * Nunca lanza: ante cualquier problema devuelve `null` y quien llama redirige
 * al login.
 */
export async function getSesionOperario(): Promise<SesionOperario | null> {
  /*
   * Frontera Edge/Node, y no es sólo una guarda de ejecución: en el bundle del
   * middleware `process.env.NEXT_RUNTIME` es la constante "edge", así que este
   * bloque entero se elimina en compilación y con él los `import()` de
   * `next/headers` y de `./permisos` — que arrastraría Mongoose al Edge
   * Runtime y rompería el build. El middleware sólo comprueba que la sesión
   * sea válida (`verificarTokenOperario`); las capacidades se miran en las
   * páginas y en las actions, que sí corren en Node.
   */
  if (process.env.NEXT_RUNTIME !== "edge") {
    try {
      const { cookies } = await import("next/headers");
      const almacen = await cookies();

      const datos = await verificarTokenOperario(almacen.get(OPERARIO_COOKIE)?.value);
      if (datos) {
        const {
          capacidadesDeRol,
          obtenerOperarioVigente,
          obtenerRol,
          CLAVE_ROL_ADMIN,
        } = await import("./permisos");

        /*
         * El token dice quién ERA la persona hace hasta 12 horas. Lo que manda
         * es lo que dice la base AHORA: si la despidieron, la desactivaron o la
         * cambiaron de rol mientras tenía la pestaña abierta, se acabó en el
         * acto y sin esperar a que caduque la cookie. De ahí también que el
         * nombre y el rol salgan del documento y no del token: la bitácora
         * firma con el nombre bueno aunque se lo hayan corregido.
         */
        const vigente = await obtenerOperarioVigente(datos.uid);
        if (vigente) {
          const rol = await obtenerRol(vigente.rolClave);
          const capacidades = await capacidadesDeRol(vigente.rolClave);
          return {
            uid: vigente.uid,
            nombre: vigente.nombre === "" ? datos.nombre : vigente.nombre,
            rolClave: vigente.rolClave,
            rolNombre: rol?.nombre ?? vigente.rolClave,
            capacidades,
            esAdmin: vigente.rolClave === CLAVE_ROL_ADMIN,
          };
        }
        // Si la persona ya no sirve, todavía puede quedar la cookie del panel:
        // el dueño no se queda fuera por haber borrado su usuario de taller.
      }

      if (await verifySessionToken(almacen.get(ADMIN_COOKIE)?.value)) {
        return sesionAdminVirtual();
      }
    } catch (error) {
      // Next señaliza "esta ruta es dinámica" lanzando un error con `digest`.
      // Tragárnoslo haría que la página se generara como si nadie hubiera
      // entrado y se cacheara así, que es peor que fallar: se vuelve a lanzar.
      if (esSenalDeNext(error)) throw error;
      console.error("[fabricacion/auth] getSesionOperario:", error);
      return null;
    }
  }

  return null;
}

/** SÓLO NODE. La sesión o `Error("No autorizado")`. */
export async function requireOperario(): Promise<SesionOperario> {
  const sesion = await getSesionOperario();
  if (!sesion) throw new Error("No autorizado");
  return sesion;
}

/**
 * SÓLO NODE. La sesión, comprobando además una capacidad concreta.
 * Lanza `Error("No autorizado")`; las actions lo capturan y devuelven el
 * `ActionResult` con el mensaje en español.
 */
export async function requireCapacidad(capacidad: Capacidad): Promise<SesionOperario> {
  const sesion = await requireOperario();
  if (sesion.esAdmin) return sesion;
  if (!sesion.capacidades.includes(capacidad)) throw new Error("No autorizado");
  return sesion;
}
