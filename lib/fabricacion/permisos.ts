/**
 * Roles dinámicos y capacidades.
 *
 * Decisión del dueño (§1 del contrato): **los roles no son un enum**, son una
 * colección editable desde el panel. Lo único cableado es el catálogo de
 * CAPACIDADES, porque cada capacidad corresponde a código real.
 *
 * De ahí la regla más importante de este archivo: **las capacidades no viajan
 * en el token de sesión**, se leen del rol en cada comprobación. Si el dueño le
 * quita un permiso a un rol, surte efecto en el acto, sin que nadie tenga que
 * volver a entrar. Para que eso no signifique una consulta por cada render,
 * los roles se cachean 30 segundos en memoria; las actions que tocan roles
 * llaman a `invalidarCacheRoles()` y el cambio se ve de inmediato.
 *
 * Usa Mongoose: lo importan Server Components, actions y scripts. **Nunca el
 * middleware** (para eso está `verificarTokenOperario` en `auth.ts`).
 */

import { Types } from "mongoose";

import { connectDB } from "@/lib/mongodb";
import OperarioModel from "@/lib/models/Operario";
import RolModel from "@/lib/models/Rol";
import {
  CAPACIDADES,
  META_CAPACIDADES,
  type Capacidad,
  type RolDTO,
  type SesionOperario,
} from "@/lib/types/fabricacion";

/**
 * Clave del rol que no se puede eliminar, desactivar ni recortar. Es el seguro
 * anti-bloqueo del §7: pase lo que pase, el dueño puede entrar.
 */
export const CLAVE_ROL_ADMIN = "admin";

/** Cuánto vive la caché de roles. Corto a propósito. */
const TTL_CACHE_MS = 30_000;

/* ────────────────────────────────────────────────────────────────────────────
 * CACHÉ EN MEMORIA (sobrevive al HMR de Next en desarrollo)
 * ──────────────────────────────────────────────────────────────────────────── */

interface CacheRoles {
  porClave: Map<string, RolDTO>;
  todos: RolDTO[];
  expiraEn: number;
  /** Consulta en vuelo, para que diez renders a la vez no hagan diez consultas. */
  cargando: Promise<RolDTO[]> | null;
}

declare global {
  var cacheRolesFabricacion: CacheRoles | undefined;
}

function cache(): CacheRoles {
  if (!global.cacheRolesFabricacion) {
    global.cacheRolesFabricacion = {
      porClave: new Map<string, RolDTO>(),
      todos: [],
      expiraEn: 0,
      cargando: null,
    };
  }
  return global.cacheRolesFabricacion;
}

/**
 * Tira la caché. La llaman `crearRol`, `actualizarRol`, `eliminarRol`,
 * `activarRol`, `desactivarRol` y `duplicarRol` para que un cambio de permisos
 * se note en el siguiente clic y no dentro de medio minuto.
 */
export function invalidarCacheRoles(): void {
  const memoria = cache();
  memoria.porClave = new Map<string, RolDTO>();
  memoria.todos = [];
  memoria.expiraEn = 0;
  memoria.cargando = null;
}

/* ────────────────────────────────────────────────────────────────────────────
 * LECTURA DE ROLES
 * ──────────────────────────────────────────────────────────────────────────── */

/** Forma mínima que necesitamos del documento; el modelo puede tener más. */
interface RolPlano {
  _id: unknown;
  clave?: string;
  nombre?: string;
  descripcion?: string;
  color?: string;
  icono?: string;
  capacidades?: unknown;
  esSistema?: boolean;
  activo?: boolean;
  orden?: number;
}

/** Descarta capacidades desconocidas (roles viejos, sembrados a mano, etc.). */
function normalizarCapacidades(valor: unknown): Capacidad[] {
  if (!Array.isArray(valor)) return [];
  const catalogo: readonly string[] = CAPACIDADES;
  return valor.filter(
    (item): item is Capacidad => typeof item === "string" && catalogo.includes(item)
  );
}

/**
 * Mapea a DTO plano aquí mismo, sin depender de `lib/data/fabricacion.ts`:
 * este archivo lo usa la sesión y no debe arrastrar toda la capa de datos.
 */
function aRolDTO(doc: RolPlano): RolDTO {
  return {
    _id: String(doc._id),
    clave: doc.clave ?? "",
    nombre: doc.nombre ?? "",
    descripcion: doc.descripcion ?? "",
    color: doc.color ?? "#E8511A",
    icono: doc.icono ?? "user",
    capacidades: normalizarCapacidades(doc.capacidades),
    esSistema: doc.esSistema ?? false,
    activo: doc.activo ?? true,
    orden: doc.orden ?? 0,
  };
}

/** Copia defensiva: nadie de fuera puede mutar lo que hay en la caché. */
function copiar(rol: RolDTO): RolDTO {
  return { ...rol, capacidades: [...rol.capacidades] };
}

async function refrescar(): Promise<RolDTO[]> {
  const memoria = cache();
  await connectDB();
  const docs = (await RolModel.find({})
    .sort({ orden: 1, nombre: 1 })
    .lean()) as unknown as RolPlano[];

  const roles = docs.map(aRolDTO).filter((rol) => rol.clave !== "");
  memoria.todos = roles;
  memoria.porClave = new Map(roles.map((rol) => [rol.clave, rol]));
  memoria.expiraEn = Date.now() + TTL_CACHE_MS;
  return roles;
}

/**
 * Devuelve los roles vigentes, refrescando la caché si tocó.
 *
 * Ante un fallo de conexión conserva lo último que supo (o una lista vacía) en
 * vez de reventar el render: mismo criterio de degradación que
 * `lib/data/products.ts`.
 */
async function rolesCacheados(): Promise<RolDTO[]> {
  const memoria = cache();
  if (memoria.expiraEn > Date.now()) return memoria.todos;
  if (memoria.cargando) return memoria.cargando;

  memoria.cargando = refrescar()
    .catch((error) => {
      console.error("[fabricacion/permisos] no se pudieron leer los roles:", error);
      // Se reintenta en la siguiente llamada; mientras, lo último conocido.
      return memoria.todos;
    })
    .finally(() => {
      memoria.cargando = null;
    });

  return memoria.cargando;
}

/** Todos los roles, activos e inactivos, ordenados como se pintan en el panel. */
export async function obtenerRoles(): Promise<RolDTO[]> {
  const roles = await rolesCacheados();
  return roles.map(copiar);
}

/** Un rol por su clave (`"tapicero"`). `null` si no existe. */
export async function obtenerRol(clave: string): Promise<RolDTO | null> {
  if (typeof clave !== "string" || clave.trim() === "") return null;
  await rolesCacheados();
  const rol = cache().porClave.get(clave.trim());
  return rol ? copiar(rol) : null;
}

/**
 * Capacidades reales de un rol.
 *
 * **Seguro anti-bloqueo**: si la clave es `admin` (o el documento no existe
 * todavía, p. ej. antes de sembrar) devuelve TODAS las capacidades, diga lo que
 * diga el documento. Nadie puede dejarse fuera del sistema editando casillas.
 */
export async function capacidadesDeRol(clave: string): Promise<Capacidad[]> {
  if (clave === CLAVE_ROL_ADMIN) return [...CAPACIDADES];
  const rol = await obtenerRol(clave);
  if (!rol) return [];
  if (rol.esSistema && rol.clave === CLAVE_ROL_ADMIN) return [...CAPACIDADES];
  // Un rol desactivado no da NINGÚN permiso: desactivarlo desde el panel es el
  // corte de acceso de golpe para toda la cuadrilla que lo tiene, no un
  // adorno. El admin queda exento por el seguro anti-bloqueo del §7 (ya salió
  // por las dos ramas de arriba).
  if (rol.activo === false) return [];
  return rol.capacidades;
}

/** ¿Este rol sirve para entrar y para trabajar? El admin siempre sirve. */
export async function rolUtilizable(clave: string): Promise<boolean> {
  if (clave === CLAVE_ROL_ADMIN) return true;
  const rol = await obtenerRol(clave);
  return rol !== null && rol.activo !== false;
}

/** Nombre bonito del rol para los mensajes ("tapicero" → "Tapicero"). */
export async function nombreDeRol(clave: string): Promise<string> {
  const rol = await obtenerRol(clave);
  return rol?.nombre ?? clave;
}

/* ────────────────────────────────────────────────────────────────────────────
 * PERSONA VIGENTE — para que la sesión no se fíe del token
 *
 * El token de la cookie dura 12 horas y lleva dentro el nombre y el rol de la
 * persona TAL COMO ESTABAN al entrar. Si en ese rato la despiden, la
 * desactivan o la cambian de rol, seguir creyéndole al token sería dejarla
 * trabajar toda la jornada con permisos que ya no tiene. Por eso
 * `getSesionOperario` vuelve a leer a la persona aquí, con el mismo patrón de
 * caché corta que los roles: una consulta cada 30 s como mucho, e invalidación
 * inmediata desde las actions que tocan personas.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Lo mínimo que la sesión necesita saber de la persona, recién leído. */
export interface OperarioVigente {
  uid: string;
  nombre: string;
  rolClave: string;
}

interface EntradaOperario {
  valor: OperarioVigente | null;
  expiraEn: number;
}

declare global {
  var cacheOperariosFabricacion: Map<string, EntradaOperario> | undefined;
}

function cacheOperarios(): Map<string, EntradaOperario> {
  global.cacheOperariosFabricacion ??= new Map<string, EntradaOperario>();
  return global.cacheOperariosFabricacion;
}

/**
 * Olvida lo que sabíamos de una persona (o de todas si no se pasa `uid`).
 * La llaman `actualizarOperario`, `cambiarRolOperario`, `activarOperario`,
 * `desactivarOperario`, `eliminarOperario` y `restaurarOperario`.
 */
export function invalidarCacheOperarios(uid?: string): void {
  if (typeof uid === "string" && uid !== "") {
    cacheOperarios().delete(uid);
    return;
  }
  cacheOperarios().clear();
}

/** Forma mínima del documento; el modelo tiene bastante más. */
interface OperarioPlano {
  _id: unknown;
  nombre?: string;
  rolClave?: string;
  activo?: boolean;
  eliminado?: boolean;
}

/**
 * La persona tal como está AHORA en la base, o `null` si ya no sirve para
 * trabajar (no existe, está desactivada o está eliminada).
 *
 * Ante un fallo de conexión devuelve `null`: preferimos mandar a alguien a la
 * pantalla de entrada antes que dejar pasar a quien quizá ya no debería.
 */
export async function obtenerOperarioVigente(
  uid: string
): Promise<OperarioVigente | null> {
  if (typeof uid !== "string" || uid.trim() === "") return null;
  const clave = uid.trim();
  if (!Types.ObjectId.isValid(clave)) return null;

  const memoria = cacheOperarios();
  const guardado = memoria.get(clave);
  if (guardado && guardado.expiraEn > Date.now()) return guardado.valor;

  try {
    await connectDB();
    const doc = (await OperarioModel.findById(clave)
      .select("nombre rolClave activo eliminado")
      .lean()) as unknown as OperarioPlano | null;

    const utilizable =
      doc !== null && doc.activo === true && doc.eliminado !== true;

    const valor: OperarioVigente | null = utilizable
      ? {
          uid: clave,
          nombre: doc.nombre ?? "",
          rolClave: doc.rolClave ?? "",
        }
      : null;

    memoria.set(clave, { valor, expiraEn: Date.now() + TTL_CACHE_MS });
    return valor;
  } catch (error) {
    console.error("[fabricacion/permisos] no se pudo leer a la persona:", error);
    return null;
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * COMPROBACIONES SÍNCRONAS SOBRE UNA SESIÓN YA RESUELTA
 * ──────────────────────────────────────────────────────────────────────────── */

/** ¿Esta persona puede hacer esto? El admin siempre puede. */
export function tiene(
  sesion: SesionOperario | null | undefined,
  capacidad: Capacidad
): boolean {
  if (!sesion) return false;
  if (sesion.esAdmin) return true;
  return sesion.capacidades.includes(capacidad);
}

/** Basta con una de las capacidades (para enseñar u ocultar un menú). */
export function tieneAlguna(
  sesion: SesionOperario | null | undefined,
  capacidades: Capacidad[]
): boolean {
  if (!sesion) return false;
  if (sesion.esAdmin) return true;
  return capacidades.some((capacidad) => sesion.capacidades.includes(capacidad));
}

/** Hacen falta todas (para acciones que tocan dos cosas a la vez). */
export function tieneTodas(
  sesion: SesionOperario | null | undefined,
  capacidades: Capacidad[]
): boolean {
  if (!sesion) return false;
  if (sesion.esAdmin) return true;
  return capacidades.every((capacidad) => sesion.capacidades.includes(capacidad));
}

/** ¿Es una capacidad del catálogo? Filtra lo que llega de un formulario. */
export function esCapacidad(valor: unknown): valor is Capacidad {
  const catalogo: readonly string[] = CAPACIDADES;
  return typeof valor === "string" && catalogo.includes(valor);
}

/** Sólo deja pasar las capacidades reconocidas de una lista cualquiera. */
export function filtrarCapacidades(valores: unknown): Capacidad[] {
  return normalizarCapacidades(valores);
}

/**
 * La frase llana de una capacidad, la misma que se lee junto a la casilla del
 * panel de roles ("Crear, editar y eliminar personas").
 */
export function describirCapacidad(capacidad: string): string {
  return esCapacidad(capacidad) ? META_CAPACIDADES[capacidad].etiqueta : capacidad;
}
