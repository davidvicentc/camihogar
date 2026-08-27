"use server";

/**
 * Entrada y salida de la app del taller.
 *
 * Se separa de `lib/actions/fabricacion.ts` porque es lo único que escribe la
 * cookie de sesión y lo único que toca `pin.ts` (sólo Node). Todo lo demás del
 * módulo asume que la sesión ya existe.
 *
 * Dos decisiones que no se negocian:
 *  1. **Mensaje único ante el fallo.** Da igual si la persona no existe, si
 *     está desactivada, si está eliminada o si el PIN está mal: siempre se
 *     responde "Clave incorrecta. Inténtalo otra vez.". Así nadie puede usar
 *     la pantalla de entrada para averiguar quién trabaja aquí.
 *  2. **Todo queda anotado** (§1 del contrato): la entrada buena deja un
 *     `INICIO_SESION` y la fallida un `INTENTO_FALLIDO`, ambos en
 *     `RegistroAuditoria`.
 *  3. **El freno a la fuerza bruta vive AQUÍ**, no en el route handler. Ésta es
 *     la única puerta por la que se entra de verdad: la pantalla del taller
 *     llama a esta action directamente y `/api/fabrica/sesion` no es más que un
 *     envoltorio HTTP. Un contador puesto sólo allí no frenaría nada.
 *
 * FRENO A LA FUERZA BRUTA — limitación conocida y aceptada: los contadores
 * viven en la memoria del proceso (`globalThis`), así que son POR INSTANCIA del
 * servidor, igual que la conexión de `lib/mongodb.ts`. Con varias instancias en
 * paralelo alguien podría probar más veces de la cuenta. Es suficiente para un
 * taller y no añade dependencias; si algún día hace falta algo serio (Redis,
 * una colección), el sitio donde cambiarlo es este archivo.
 */

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { Types } from "mongoose";

import { connectDB } from "@/lib/mongodb";
import OperarioModel from "@/lib/models/Operario";
import {
  OPCIONES_COOKIE_OPERARIO,
  OPERARIO_COOKIE,
  crearTokenOperario,
} from "@/lib/fabricacion/auth";
import { registrarAuditoria } from "@/lib/fabricacion/auditoria";
import { nombreDeRol, rolUtilizable } from "@/lib/fabricacion/permisos";
import { verificarPin } from "@/lib/fabricacion/pin";
import type { ActionResult } from "@/lib/types/fabricacion";

/** El mismo texto para todos los fallos: no revela nada de quién existe. */
const CLAVE_INCORRECTA = "Clave incorrecta. Inténtalo otra vez.";

/* ────────────────────────────────────────────────────────────────────────────
 * FRENO A LA FUERZA BRUTA
 *
 * Dos contadores, porque uno solo se esquiva:
 *  · POR PERSONA — cinco fallos seguidos y esa persona espera un minuto. Frena
 *    a quien prueba los 10.000 PINes de cuatro cifras contra un mismo nombre.
 *  · GLOBAL POR FRANJA — el atacante puede ir rotando de identificador para no
 *    tocar nunca el techo de ninguna persona, así que también se cuentan los
 *    fallos de todo el taller juntos. Cuando se disparan, la puerta descansa un
 *    minuto para todos.
 *
 * El freno se comprueba ANTES de verificar el PIN a propósito: `verificarPin`
 * hace un `scryptSync` completo, que es caro y bloquea el hilo de Node. Sin
 * esta guarda delante, unos cientos de intentos en paralelo tumbarían el
 * servidor entero aunque ninguno acertara.
 * ──────────────────────────────────────────────────────────────────────────── */

/** A partir del quinto fallo seguido, esa persona espera un minuto. */
const FALLOS_PERMITIDOS = 5;
const ESPERA_MS = 60_000;

/** Y si en un minuto se acumulan estos fallos entre todos, descansa la puerta. */
const FALLOS_GLOBALES_PERMITIDOS = 30;
const VENTANA_GLOBAL_MS = 60_000;

/** Tope de identificadores recordados, para que rotarlos no coma memoria. */
const MAXIMO_RECORDADOS = 500;

interface IntentosPersona {
  fallos: number;
  /** Momento a partir del cual se vuelve a permitir intentar. */
  bloqueadoHasta: number;
  /** Cuándo se olvida la cuenta de fallos si no hay más intentos. */
  caducaEn: number;
}

interface IntentosGlobales {
  fallos: number;
  ventanaHasta: number;
  bloqueadoHasta: number;
}

/**
 * Se cuelgan de `globalThis` para sobrevivir a las recargas en caliente del
 * modo desarrollo, igual que hace `lib/mongodb.ts` con la conexión.
 */
const almacenGlobal = globalThis as typeof globalThis & {
  __camihogarIntentosPin?: Map<string, IntentosPersona>;
  __camihogarIntentosPinGlobal?: IntentosGlobales;
};

function porPersona(): Map<string, IntentosPersona> {
  almacenGlobal.__camihogarIntentosPin ??= new Map<string, IntentosPersona>();
  return almacenGlobal.__camihogarIntentosPin;
}

function globales(): IntentosGlobales {
  almacenGlobal.__camihogarIntentosPinGlobal ??= {
    fallos: 0,
    ventanaHasta: 0,
    bloqueadoHasta: 0,
  };
  return almacenGlobal.__camihogarIntentosPinGlobal;
}

/** Tira lo que ya no frena a nadie cuando el mapa se hace grande. */
function podar(mapa: Map<string, IntentosPersona>, ahora: number): void {
  if (mapa.size < MAXIMO_RECORDADOS) return;
  for (const [clave, registro] of mapa) {
    if (registro.bloqueadoHasta <= ahora && registro.caducaEn <= ahora) {
      mapa.delete(clave);
    }
  }
}

/** Segundos que faltan para poder reintentar; 0 si no hay que esperar. */
function segundosDeEspera(operarioId: string): number {
  const ahora = Date.now();
  const registro = porPersona().get(operarioId);
  const suyo = registro ? registro.bloqueadoHasta - ahora : 0;
  const detodos = globales().bloqueadoHasta - ahora;
  const restante = Math.max(suyo, detodos);
  return restante > 0 ? Math.ceil(restante / 1000) : 0;
}

/** Un intento fallido más, para esa persona y para el taller entero. */
function anotarFallo(operarioId: string): void {
  const ahora = Date.now();

  const mapa = porPersona();
  podar(mapa, ahora);
  const previo = mapa.get(operarioId);
  const registro: IntentosPersona =
    previo && previo.caducaEn > ahora
      ? previo
      : { fallos: 0, bloqueadoHasta: 0, caducaEn: 0 };
  registro.fallos += 1;
  registro.caducaEn = ahora + ESPERA_MS;
  if (registro.fallos >= FALLOS_PERMITIDOS) {
    registro.bloqueadoHasta = ahora + ESPERA_MS;
    registro.fallos = 0;
  }
  mapa.set(operarioId, registro);

  const todos = globales();
  if (todos.ventanaHasta <= ahora) {
    todos.fallos = 0;
    todos.ventanaHasta = ahora + VENTANA_GLOBAL_MS;
  }
  todos.fallos += 1;
  if (todos.fallos >= FALLOS_GLOBALES_PERMITIDOS) {
    todos.bloqueadoHasta = ahora + VENTANA_GLOBAL_MS;
    todos.fallos = 0;
    todos.ventanaHasta = ahora + VENTANA_GLOBAL_MS;
  }
}

/** Entró bien: se le perdona todo lo anterior. */
function limpiarFallos(operarioId: string): void {
  porPersona().delete(operarioId);
}

/** El aviso de la espera, en la misma lengua llana que el resto. */
function mensajeDeEspera(segundos: number): string {
  return `Has fallado el PIN varias veces. Espera ${segundos} segundos y vuelve a intentarlo, o pide ayuda a tu supervisor.`;
}

/** Lo que la pantalla necesita saber tras entrar, para dar la bienvenida. */
export interface SesionIniciada {
  uid: string;
  nombre: string;
  rolClave: string;
  rolNombre: string;
}

/**
 * Entra al taller con la persona elegida en la lista y su PIN.
 *
 * La lista de la pantalla de entrada sólo trae personas activas; aun así aquí
 * se vuelve a comprobar (`activo`, `eliminado`), porque una lista cacheada no
 * es una autorización.
 */
export async function iniciarSesionOperario(
  operarioId: string,
  pin: string
): Promise<ActionResult<SesionIniciada>> {
  try {
    const id = typeof operarioId === "string" ? operarioId.trim() : "";
    const clave = typeof pin === "string" ? pin.trim() : "";

    if (id === "") {
      return { ok: false, error: "Toca tu nombre en la lista para entrar." };
    }
    if (clave === "") {
      return { ok: false, error: "Escribe tu PIN con el teclado numérico." };
    }
    // El freno va ANTES de tocar la base y ANTES del `scryptSync` del PIN.
    const espera = segundosDeEspera(id);
    if (espera > 0) {
      return { ok: false, error: mensajeDeEspera(espera) };
    }

    if (!Types.ObjectId.isValid(id)) {
      anotarFallo(id);
      return { ok: false, error: CLAVE_INCORRECTA };
    }

    await connectDB();
    const operario = await OperarioModel.findById(id).lean();

    // Una persona borrada o desactivada se trata igual que un PIN malo.
    const utilizable =
      operario !== null && operario.activo === true && operario.eliminado !== true;

    // Y su rol también tiene que servir: si el dueño desactivó «Delivery», los
    // seis repartidores dejan de poder entrar en el acto, no cuando les caduque
    // la cookie. El rol `admin` está exento (seguro anti-bloqueo del §7).
    const rolClave = utilizable ? (operario.rolClave ?? "") : "";
    const rolSirve = utilizable ? await rolUtilizable(rolClave) : false;

    if (!utilizable || !rolSirve || !verificarPin(clave, operario.pinHash, operario.pinSalt)) {
      anotarFallo(id);
      await registrarAuditoria({
        entidad: "SESION",
        entidadId: id,
        entidadNombre: operario?.nombre ?? "",
        accion: "INTENTO_FALLIDO",
        actor: { uid: id, nombre: operario?.nombre ?? "Alguien" },
        descripcion: "",
        metadata: {
          motivo: !operario
            ? "la persona no existe"
            : operario.eliminado === true
              ? "la persona está eliminada"
              : operario.activo !== true
                ? "la persona está desactivada"
                : !rolSirve
                  ? "su rol ya no existe o está desactivado"
                  : "el PIN no coincide",
        },
      });
      return { ok: false, error: CLAVE_INCORRECTA };
    }

    limpiarFallos(id);

    const rolNombre = await nombreDeRol(rolClave);
    const uid = String(operario._id);

    await OperarioModel.updateOne(
      { _id: operario._id },
      { $set: { ultimoAccesoAt: new Date() } }
    );

    const token = await crearTokenOperario({
      uid,
      nombre: operario.nombre,
      rolClave,
    });

    const almacen = await cookies();
    almacen.set(OPERARIO_COOKIE, token, OPCIONES_COOKIE_OPERARIO);

    await registrarAuditoria({
      entidad: "SESION",
      entidadId: uid,
      entidadNombre: operario.nombre,
      accion: "INICIO_SESION",
      actor: { uid, nombre: operario.nombre, rolClave, rolNombre },
      descripcion: "",
    });

    revalidatePath("/fabrica");

    return {
      ok: true,
      data: { uid, nombre: operario.nombre, rolClave, rolNombre },
    };
  } catch (error) {
    console.error("[actions/sesion-fabrica] iniciarSesionOperario:", error);
    return {
      ok: false,
      error: "No pudimos entrar ahora mismo. Espera un momento y vuelve a intentarlo.",
    };
  }
}

/** Sale del taller: borra la cookie del operario (la del panel no se toca). */
export async function cerrarSesionOperario(): Promise<ActionResult> {
  try {
    const almacen = await cookies();
    almacen.delete(OPERARIO_COOKIE);
    revalidatePath("/fabrica");
    return { ok: true };
  } catch (error) {
    console.error("[actions/sesion-fabrica] cerrarSesionOperario:", error);
    return { ok: false, error: "No pudimos cerrar la sesión. Vuelve a intentarlo." };
  }
}
