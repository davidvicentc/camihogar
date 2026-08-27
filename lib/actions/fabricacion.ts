"use server";

/**
 * TODAS las mutaciones del módulo de Fabricación.
 *
 * Contrato uniforme de cada action (§6 del contrato), sin excepciones:
 *  1. `requireCapacidad("...")` — el permiso SIEMPRE por capacidad, jamás por
 *     el nombre del rol (los roles son datos editables, no un enum).
 *  2. Validar la entrada y devolver un mensaje en español que diga QUÉ HACER.
 *  3. Para editar: leer el documento ANTES de tocarlo, para poder calcular el
 *     diff campo a campo.
 *  4. Mutar.
 *  5. Anotar: `registrarAuditoria` con el diff (configuración) y/o un
 *     `EventoUnidad` (taller). Ninguna action de este archivo borra ni edita
 *     un registro de auditoría: las dos bitácoras son sólo-añadir.
 *  6. `revalidatePath` de lo afectado.
 *  7. Devolver `ActionResult<T>`. NUNCA lanzar al cliente.
 *
 * ── POLÍTICA DE BORRADO (§7), aplicada igual en todas partes ────────────────
 *
 *  · Antes de borrar se llama a `dependenciasDeX` y se cuenta qué hay colgando.
 *  · Entidades **con bandera de borrado lógico** (Operario, Estación, Pedido,
 *    Unidad, Ruta→`archivada`, Paso de catálogo→`activo`): con dependencias se
 *    hace borrado LÓGICO (la trazabilidad no se destruye jamás) y existe su
 *    `restaurarX`. Sin dependencias se permite el borrado FÍSICO, auditado
 *    ANTES de borrar.
 *  · Entidades **sin bandera** (Rol, Incidencia): con dependencias no se borra,
 *    se rechaza explicando cuántas hay y qué hacer antes.
 *  · Cada `eliminarX` devuelve `ResultadoEliminacion` para que la interfaz
 *    pueda decir si se archivó o si se borró de verdad.
 *
 * ── SEGUROS ANTI-BLOQUEO ────────────────────────────────────────────────────
 *
 *  · El rol `admin` (`esSistema`) no se elimina, no se desactiva y no se le
 *    quitan capacidades.
 *  · No se puede dejar el sistema sin NADIE que pueda gestionar usuarios.
 *  · Nadie puede eliminarse ni desactivarse a sí mismo.
 *  · Lo que está en uso se archiva; lo que ya empezó a fabricarse se cancela.
 */

import { revalidatePath } from "next/cache";
import { Types } from "mongoose";

import { connectDB } from "@/lib/mongodb";
import CatalogoPasoModel from "@/lib/models/CatalogoPaso";
import EstacionModel from "@/lib/models/Estacion";
import EventoUnidadModel from "@/lib/models/EventoUnidad";
import IncidenciaModel from "@/lib/models/Incidencia";
import OperarioModel from "@/lib/models/Operario";
import PedidoModel from "@/lib/models/Pedido";
import RolModel from "@/lib/models/Rol";
import RutaFabricacionModel from "@/lib/models/RutaFabricacion";
import UnidadFabricacionModel from "@/lib/models/UnidadFabricacion";

import {
  calcularCambios,
  formatoCapacidades,
  formatoFecha,
  formatoLista,
  formatoSiNo,
  registrarAuditoria,
  type CampoAuditoria,
} from "@/lib/fabricacion/auditoria";
import { requireCapacidad } from "@/lib/fabricacion/auth";
import {
  generarCodigoPedido,
  generarCodigoUnidad,
  normalizarCodigo,
} from "@/lib/fabricacion/codigos";
import {
  CLAVE_ROL_ADMIN,
  filtrarCapacidades,
  invalidarCacheOperarios,
  invalidarCacheRoles,
  obtenerRoles,
} from "@/lib/fabricacion/permisos";
import { esPinValido, hashPin } from "@/lib/fabricacion/pin";
import {
  MENSAJES,
  calcularProgreso,
  estadoUnidadDesdePasos,
  frasePersonasPermitidas,
  indicePasoActual,
  puedeCompletarPaso,
  puedeIniciarPaso,
  recalcularEstados,
  rolPuedeHacerPaso,
} from "@/lib/fabricacion/reglas";

import {
  dependenciasDeEstacion,
  dependenciasDeOperario,
  dependenciasDePasoCatalogo,
  dependenciasDePedido,
  dependenciasDeRol,
  dependenciasDeRuta,
  dependenciasDeUnidad,
  serializarCatalogoPaso,
  serializarEstacion,
  serializarIncidencia,
  serializarOperario,
  serializarPasoUnidad,
  serializarPedido,
  serializarRol,
  serializarRuta,
  serializarUnidad,
} from "@/lib/data/fabricacion";

import {
  CANALES,
  CAPACIDADES,
  PRIORIDADES,
  SEVERIDADES,
  TIPOS_ESTACION,
  TIPOS_PASO,
  type ActionResult,
  type Canal,
  type CatalogoPasoDTO,
  type ChecklistItemDTO,
  type DependenciasEliminacion,
  type EstacionDTO,
  type EstadoPaso,
  type EstadoPedido,
  type EstadoUnidad,
  type EvidenciaPaso,
  type IncidenciaDTO,
  type OperarioDTO,
  type PasoUnidadDTO,
  type PedidoDTO,
  type Prioridad,
  type RolDTO,
  type RutaDTO,
  type SesionOperario,
  type Severidad,
  type TipoEstacion,
  type TipoEvento,
  type TipoPaso,
  type UnidadDTO,
} from "@/lib/types/fabricacion";

/* ════════════════════════════════════════════════════════════════════════════
 * TIPOS DE ENTRADA (los que rellenan los formularios del panel)
 * ════════════════════════════════════════════════════════════════════════════ */

/** Qué pasó al eliminar: si se archivó (se puede restaurar) o se borró de verdad. */
export interface ResultadoEliminacion {
  modo: "LOGICO" | "FISICO";
  /** Frase lista para el aviso de la pantalla. */
  mensaje: string;
}

export interface RolInput {
  /** Si no viene, se deduce del nombre. No se puede cambiar al editar. */
  clave?: string;
  nombre: string;
  descripcion?: string;
  color?: string;
  icono?: string;
  /** Las casillas marcadas en el panel. Se filtra lo desconocido. */
  capacidades?: string[];
  activo?: boolean;
  orden?: number;
}

export interface OperarioInput {
  nombre: string;
  codigoEmpleado?: string;
  /** Sólo al crear o al resetear; nunca se guarda ni se audita en claro. */
  pin?: string;
  rolClave?: string;
  estacionesIds?: string[];
  telefono?: string;
  colorAvatar?: string;
  fotoUrl?: string;
  activo?: boolean;
}

export interface EstacionInput {
  nombre: string;
  tipo?: TipoEstacion;
  direccion?: string;
  telefono?: string;
  activa?: boolean;
  orden?: number;
}

/** Los campos comunes a un paso del catálogo y a un paso dentro de una ruta. */
export interface PasoPlantillaInput {
  clave?: string;
  nombre: string;
  instrucciones?: string;
  icono?: string;
  color?: string;
  tipo?: TipoPaso;
  estacionId?: string | null;
  rolesPermitidos?: string[];
  requiereFoto?: boolean;
  minFotos?: number;
  requiereEscaneo?: boolean;
  requiereFirma?: boolean;
  requiereNota?: boolean;
  checklist?: { texto: string; obligatorio?: boolean }[];
  horasEstimadas?: number;
  permiteParalelo?: boolean;
  permiteOmitir?: boolean;
  notificaCliente?: boolean;
}

export interface PasoCatalogoInput extends PasoPlantillaInput {
  activo?: boolean;
  orden?: number;
}

export interface RutaInput {
  nombre: string;
  descripcion?: string;
  categoriaSugerida?: string;
  activa?: boolean;
  esPredeterminada?: boolean;
  pasos?: PasoPlantillaInput[];
}

export interface ClienteInput {
  nombre: string;
  telefono: string;
  cedula?: string;
  direccion?: string;
  ciudad?: string;
  email?: string;
}

export interface ProductoSnapshotInput {
  titulo: string;
  categoria?: string;
  imagen?: string;
  tela?: string;
  acabado?: string;
  configuracion?: string;
  medidas?: string;
  precio?: number | null;
}

/** Una línea del pedido: un mueble por `cantidad` unidades independientes. */
export interface LineaPedidoInput {
  productoId?: string | null;
  producto: ProductoSnapshotInput;
  cantidad: number;
  /** Si no viene, se usa la ruta marcada como predeterminada. */
  rutaId?: string | null;
}

export interface PedidoInput {
  cliente: ClienteInput;
  canal?: Canal;
  prioridad?: Prioridad;
  /** ISO. `null` o vacío = sin fecha comprometida. */
  fechaPrometida?: string | null;
  notas?: string;
  lineas: LineaPedidoInput[];
}

export interface PedidoEdicionInput {
  cliente?: Partial<ClienteInput>;
  canal?: Canal;
  prioridad?: Prioridad;
  fechaPrometida?: string | null;
  notas?: string;
}

export interface UnidadInput {
  prioridad?: Prioridad;
  fechaPrometida?: string | null;
  notas?: string;
  asignadoAId?: string | null;
  ubicacionActualId?: string | null;
  producto?: Partial<ProductoSnapshotInput>;
}

export interface IncidenciaInput {
  pasoClave?: string;
  motivo: string;
  descripcion?: string;
  severidad?: Severidad;
  fotos?: string[];
}

/* ════════════════════════════════════════════════════════════════════════════
 * AYUDAS COMUNES
 * ════════════════════════════════════════════════════════════════════════════ */

const RUTA_PANEL = "/admin/fabricacion";

/** Mensaje único cuando `requireCapacidad` deniega. Nunca se filtra el motivo. */
const SIN_PERMISO =
  "No tienes permiso para hacer esto. Habla con quien administra el sistema.";

function fallo<T = undefined>(mensaje: string): ActionResult<T> {
  return { ok: false, error: mensaje };
}

function exito<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

/**
 * ¿Se puede borrar de verdad, o hay que hacer borrado LÓGICO?
 *
 * Contrato de `dependenciasDeX` (cabecera de `lib/data/fabricacion.ts`) y §7:
 * el borrado FÍSICO sólo se permite cuando NO hay absolutamente nada colgando.
 * Si la comprobación dice que no se puede, o si devuelve alguna dependencia con
 * cantidad (muebles, rutas, anotaciones del historial…), la entidad se marca
 * como eliminada/archivada y se conserva todo: jamás se destruye trazabilidad.
 *
 * Vale para las entidades que tienen bandera de borrado lógico (Operario,
 * Estación, Pedido, Unidad, Ruta→`archivada`, Paso de catálogo→`activo`).
 * `Rol` e `Incidencia` no la tienen y siguen su propio criterio.
 */
function permiteBorradoFisico(dependencias: DependenciasEliminacion): boolean {
  if (!dependencias.puedeEliminar) return false;
  return !dependencias.dependencias.some((dependencia) => dependencia.cantidad > 0);
}

/**
 * Todo `catch` pasa por aquí: deja la traza en el servidor y devuelve una
 * frase que una persona entiende. `Error("No autorizado")` (el que lanza
 * `requireCapacidad`) se traduce siempre igual.
 */
function manejarError<T = undefined>(
  nombre: string,
  error: unknown,
  mensaje: string
): ActionResult<T> {
  console.error(`[actions/fabricacion] ${nombre}:`, error);
  if (error instanceof Error && error.message === "No autorizado") {
    return { ok: false, error: SIN_PERMISO };
  }
  return { ok: false, error: mensaje };
}

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

function esIdValido(valor: unknown): valor is string {
  return typeof valor === "string" && Types.ObjectId.isValid(valor.trim());
}

function aObjectId(valor: unknown): Types.ObjectId | null {
  return esIdValido(valor) ? new Types.ObjectId(valor.trim()) : null;
}

function idsValidos(valores: unknown): Types.ObjectId[] {
  if (!Array.isArray(valores)) return [];
  const vistos = new Set<string>();
  const salida: Types.ObjectId[] = [];
  for (const valor of valores) {
    const id = aObjectId(valor);
    if (id && !vistos.has(String(id))) {
      vistos.add(String(id));
      salida.push(id);
    }
  }
  return salida;
}

function booleano(valor: unknown, porDefecto: boolean): boolean {
  return typeof valor === "boolean" ? valor : porDefecto;
}

function numero(valor: unknown, porDefecto: number, minimo = 0): number {
  const n = typeof valor === "number" ? valor : Number(valor);
  if (!Number.isFinite(n)) return porDefecto;
  return n < minimo ? minimo : n;
}

/** ISO → `Date`, y cualquier cosa rara → `null` (sin fecha). */
function fechaDesde(valor: unknown): Date | null {
  if (valor === null || valor === undefined || valor === "") return null;
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor;
  if (typeof valor !== "string" && typeof valor !== "number") return null;
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/** El valor si está en la lista; si no, `null` (para poder exigirlo o ignorarlo). */
function opcion<T extends string>(valor: unknown, lista: readonly T[]): T | null {
  return typeof valor === "string" && (lista as readonly string[]).includes(valor)
    ? (valor as T)
    : null;
}

/** "Corte de madera" → "corte_de_madera". Las claves del módulo van con guion bajo. */
function aClave(entrada: string): string {
  return entrada
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Igual, pero pasando cada elemento a clave (roles permitidos de un paso). */
function listaClaves(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  const vistos = new Set<string>();
  for (const item of valor) {
    const clave = aClave(texto(item));
    if (clave !== "") vistos.add(clave);
  }
  return [...vistos];
}

function revalidarPanel(...sufijos: string[]): void {
  revalidatePath(RUTA_PANEL);
  for (const sufijo of sufijos) revalidatePath(`${RUTA_PANEL}${sufijo}`);
}

function revalidarTaller(codigo?: string): void {
  revalidatePath("/fabrica");
  if (codigo && codigo !== "") {
    revalidatePath(`/fabrica/u/${codigo}`);
    revalidatePath(`/f/${codigo}`);
    revalidatePath(`/seguimiento/${codigo}`);
    revalidatePath(`${RUTA_PANEL}/unidades/${codigo}`);
  }
}

/** `{ carpintero: "Carpintero" }` — para que los mensajes no enseñen claves. */
async function nombresDeRoles(): Promise<Record<string, string>> {
  const roles = await obtenerRoles();
  const mapa: Record<string, string> = {};
  for (const rol of roles) mapa[rol.clave] = rol.nombre;
  return mapa;
}

/* ── BITÁCORA DE TALLER ──────────────────────────────────────────────────── */

interface EntradaEvento {
  unidadId: unknown;
  unidadCodigo: string;
  tipo: TipoEvento;
  descripcion: string;
  sesion: SesionOperario;
  pasoClave?: string;
  pasoNombre?: string;
  fotos?: string[];
  estacionId?: unknown;
  estacionNombre?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Escribe una línea en la bitácora del taller. **Nunca lanza**: igual que la
 * auditoría, una bitácora rota no puede deshacer un trabajo ya hecho ni parar
 * la fábrica. Si falla, queda en los logs del servidor.
 */
async function registrarEvento(entrada: EntradaEvento): Promise<void> {
  try {
    await EventoUnidadModel.create({
      unidadId: entrada.unidadId,
      unidadCodigo: entrada.unidadCodigo,
      tipo: entrada.tipo,
      pasoClave: entrada.pasoClave ?? "",
      pasoNombre: entrada.pasoNombre ?? "",
      operarioId: entrada.sesion.uid,
      operarioNombre: entrada.sesion.nombre,
      operarioRol: entrada.sesion.rolClave,
      descripcion: entrada.descripcion,
      fotos: entrada.fotos ?? [],
      metadata: entrada.metadata,
      estacionId: entrada.estacionId ?? null,
      estacionNombre: entrada.estacionNombre ?? "",
    });
  } catch (error) {
    console.error("[actions/fabricacion] registrarEvento:", error);
  }
}

/* ── CAMPOS QUE SE AUDITAN ───────────────────────────────────────────────── */

const CAMPOS_ROL: CampoAuditoria[] = [
  { campo: "nombre", etiqueta: "Nombre" },
  { campo: "descripcion", etiqueta: "Descripción" },
  { campo: "color", etiqueta: "Color" },
  { campo: "icono", etiqueta: "Icono" },
  { campo: "capacidades", etiqueta: "Permisos", formato: formatoCapacidades },
  { campo: "activo", etiqueta: "Activo", formato: formatoSiNo },
  { campo: "orden", etiqueta: "Orden en la lista" },
];

function camposOperario(nombresRoles: Record<string, string>): CampoAuditoria[] {
  return [
    { campo: "nombre", etiqueta: "Nombre" },
    { campo: "codigoEmpleado", etiqueta: "Código de empleado" },
    {
      campo: "rolClave",
      etiqueta: "Rol",
      formato: (valor) =>
        typeof valor === "string" ? (nombresRoles[valor] ?? valor) : "",
    },
    { campo: "telefono", etiqueta: "Teléfono" },
    { campo: "estacionesIds", etiqueta: "Áreas de trabajo", formato: formatoLista },
    { campo: "colorAvatar", etiqueta: "Color" },
    { campo: "fotoUrl", etiqueta: "Foto" },
    { campo: "activo", etiqueta: "Puede entrar", formato: formatoSiNo },
  ];
}

const CAMPOS_ESTACION: CampoAuditoria[] = [
  { campo: "nombre", etiqueta: "Nombre" },
  { campo: "tipo", etiqueta: "Tipo de área" },
  { campo: "direccion", etiqueta: "Dirección" },
  { campo: "telefono", etiqueta: "Teléfono" },
  { campo: "activa", etiqueta: "Activa", formato: formatoSiNo },
  { campo: "orden", etiqueta: "Orden en la lista" },
];

const CAMPOS_PASO: CampoAuditoria[] = [
  { campo: "nombre", etiqueta: "Nombre" },
  { campo: "instrucciones", etiqueta: "Instrucciones" },
  { campo: "icono", etiqueta: "Icono" },
  { campo: "color", etiqueta: "Color" },
  { campo: "tipo", etiqueta: "Tipo de paso" },
  { campo: "estacionId", etiqueta: "Área donde se hace" },
  { campo: "rolesPermitidos", etiqueta: "Quién puede hacerlo", formato: formatoLista },
  { campo: "requiereFoto", etiqueta: "Pide foto", formato: formatoSiNo },
  { campo: "minFotos", etiqueta: "Fotos mínimas" },
  { campo: "requiereEscaneo", etiqueta: "Pide escanear el código", formato: formatoSiNo },
  { campo: "requiereFirma", etiqueta: "Pide firma", formato: formatoSiNo },
  { campo: "requiereNota", etiqueta: "Pide una nota", formato: formatoSiNo },
  { campo: "checklist", etiqueta: "Lista de comprobación", formato: formatoLista },
  { campo: "horasEstimadas", etiqueta: "Horas estimadas" },
  { campo: "permiteParalelo", etiqueta: "Se puede adelantar", formato: formatoSiNo },
  { campo: "permiteOmitir", etiqueta: "Se puede saltar", formato: formatoSiNo },
  { campo: "notificaCliente", etiqueta: "Avisa al cliente", formato: formatoSiNo },
  { campo: "activo", etiqueta: "Activo", formato: formatoSiNo },
  { campo: "orden", etiqueta: "Orden en la lista" },
];

/** Los pasos de una ruta se resumen como "Corte → Armado → Lijado". */
function formatoPasos(valor: unknown): string {
  if (!Array.isArray(valor) || valor.length === 0) return "Sin pasos";
  return valor
    .map((paso) => {
      if (typeof paso === "object" && paso !== null) {
        const nombre = (paso as { nombre?: unknown }).nombre;
        if (typeof nombre === "string" && nombre.trim() !== "") return nombre.trim();
      }
      return "";
    })
    .filter((nombre) => nombre !== "")
    .join(" → ");
}

const CAMPOS_RUTA: CampoAuditoria[] = [
  { campo: "nombre", etiqueta: "Nombre" },
  { campo: "descripcion", etiqueta: "Descripción" },
  { campo: "categoriaSugerida", etiqueta: "Categoría sugerida" },
  { campo: "activa", etiqueta: "Activa", formato: formatoSiNo },
  { campo: "esPredeterminada", etiqueta: "Ruta predeterminada", formato: formatoSiNo },
  { campo: "archivada", etiqueta: "Archivada", formato: formatoSiNo },
  { campo: "pasos", etiqueta: "Pasos", formato: formatoPasos },
];

const CAMPOS_PEDIDO: CampoAuditoria[] = [
  { campo: "cliente.nombre", etiqueta: "Cliente" },
  { campo: "cliente.telefono", etiqueta: "Teléfono del cliente" },
  { campo: "cliente.cedula", etiqueta: "Cédula" },
  { campo: "cliente.direccion", etiqueta: "Dirección" },
  { campo: "cliente.ciudad", etiqueta: "Ciudad" },
  { campo: "cliente.email", etiqueta: "Correo" },
  { campo: "canal", etiqueta: "Por dónde llegó" },
  { campo: "prioridad", etiqueta: "Prioridad" },
  { campo: "fechaPrometida", etiqueta: "Fecha prometida", formato: formatoFecha },
  { campo: "notas", etiqueta: "Notas" },
  { campo: "estado", etiqueta: "Estado" },
];

const CAMPOS_UNIDAD: CampoAuditoria[] = [
  { campo: "prioridad", etiqueta: "Prioridad" },
  { campo: "fechaPrometida", etiqueta: "Fecha prometida", formato: formatoFecha },
  { campo: "notas", etiqueta: "Notas" },
  { campo: "asignadoANombre", etiqueta: "Responsable" },
  { campo: "ubicacionActualNombre", etiqueta: "Dónde está" },
  { campo: "estado", etiqueta: "Estado" },
  { campo: "rutaNombre", etiqueta: "Ruta de fabricación" },
  { campo: "producto.titulo", etiqueta: "Mueble" },
  { campo: "producto.tela", etiqueta: "Tela" },
  { campo: "producto.acabado", etiqueta: "Acabado" },
  { campo: "producto.configuracion", etiqueta: "Configuración" },
  { campo: "producto.medidas", etiqueta: "Medidas" },
  { campo: "producto.precio", etiqueta: "Precio" },
];

const CAMPOS_INCIDENCIA: CampoAuditoria[] = [
  { campo: "motivo", etiqueta: "Motivo" },
  { campo: "descripcion", etiqueta: "Descripción" },
  { campo: "severidad", etiqueta: "Gravedad" },
  { campo: "fotos", etiqueta: "Fotos", formato: formatoLista },
  { campo: "estado", etiqueta: "Estado" },
  { campo: "resolucion", etiqueta: "Cómo se resolvió" },
];

/* ── LECTURAS INTERNAS (tipos derivados, sin repetir el esquema) ─────────── */

async function leerUnidad(codigo: string) {
  return UnidadFabricacionModel.findOne({ codigo }).lean();
}
type UnidadLean = NonNullable<Awaited<ReturnType<typeof leerUnidad>>>;

async function leerRuta(id: Types.ObjectId) {
  return RutaFabricacionModel.findById(id).lean();
}
type RutaLean = NonNullable<Awaited<ReturnType<typeof leerRuta>>>;

/** Busca un rol por su clave o por su `_id`, para que el panel pueda usar el que tenga. */
async function buscarRol(claveOId: string) {
  const limpio = texto(claveOId);
  if (limpio === "") return null;
  if (Types.ObjectId.isValid(limpio)) {
    const porId = await RolModel.findById(limpio).lean();
    if (porId) return porId;
  }
  return RolModel.findOne({ clave: limpio.toLowerCase() }).lean();
}

/** Igual para el catálogo de pasos: acepta la clave (`corte_madera`) o el `_id`. */
async function buscarPasoCatalogo(claveOId: string) {
  const limpio = texto(claveOId);
  if (limpio === "") return null;
  if (Types.ObjectId.isValid(limpio)) {
    const porId = await CatalogoPasoModel.findById(limpio).lean();
    if (porId) return porId;
  }
  return CatalogoPasoModel.findOne({ clave: limpio.toLowerCase() }).lean();
}

/** Busca el pedido por `PED-100248` o por su `_id`. */
async function buscarPedido(codigoOId: string) {
  const limpio = texto(codigoOId);
  if (limpio === "") return null;
  const canonico = normalizarCodigo(limpio);
  if (canonico) {
    const porCodigo = await PedidoModel.findOne({ codigo: canonico }).lean();
    if (porCodigo) return porCodigo;
  }
  if (Types.ObjectId.isValid(limpio)) {
    return PedidoModel.findById(limpio).lean();
  }
  return null;
}

/** Busca el mueble por `COD-949473` (o por cualquier forma que acepte el escáner). */
async function buscarUnidad(codigoOId: string) {
  const limpio = texto(codigoOId);
  if (limpio === "") return null;
  const canonico = normalizarCodigo(limpio);
  if (canonico) {
    const porCodigo = await leerUnidad(canonico);
    if (porCodigo) return porCodigo;
  }
  if (Types.ObjectId.isValid(limpio)) {
    return UnidadFabricacionModel.findById(limpio).lean();
  }
  return null;
}

/** El nombre de un área, para mantener los campos denormalizados en sincronía. */
async function nombreDeEstacion(id: unknown): Promise<string> {
  const objectId = aObjectId(id instanceof Types.ObjectId ? String(id) : id);
  if (!objectId) return "";
  const estacion = await EstacionModel.findById(objectId).select("nombre").lean();
  return estacion?.nombre ?? "";
}

/**
 * Vuelve a leer el mueble y lo devuelve ya serializado, o el fallo en español
 * si desapareció mientras tanto. Lo usan todas las actions de taller para
 * contestar con el estado recién recalculado.
 */
async function respuestaConUnidad(codigo: string): Promise<ActionResult<UnidadDTO>> {
  const doc = await UnidadFabricacionModel.findOne({ codigo }).lean();
  if (!doc) return fallo("No encontramos ese mueble. Revisa el código.");
  return exito(serializarUnidad(doc));
}

/** Los pasos del mueble como DTO plano, que es lo que comen las reglas puras. */
function pasosComoDTO(unidad: UnidadLean): PasoUnidadDTO[] {
  return (unidad.pasos ?? []).map((paso) => serializarPasoUnidad(paso));
}

/** ¿Hay un problema sin resolver que frene este mueble? */
async function tieneIncidenciaAbierta(unidadId: unknown): Promise<boolean> {
  const abiertas = await IncidenciaModel.countDocuments({
    unidadId,
    estado: "ABIERTA",
  });
  return abiertas > 0;
}

/* ── SNAPSHOTS DE PASOS ──────────────────────────────────────────────────── */

/** Los campos de un paso tal y como se guardan (sin progreso). */
type PasoPlano = Record<string, unknown>;

/**
 * Normaliza un paso venido del formulario (constructor de rutas o catálogo).
 * Devuelve `null` si le falta lo mínimo: nombre.
 */
function construirPasoPlantilla(entrada: PasoPlantillaInput): PasoPlano | null {
  const nombre = texto(entrada?.nombre);
  if (nombre === "") return null;

  const clave = aClave(texto(entrada?.clave) !== "" ? texto(entrada.clave) : nombre);
  if (clave === "") return null;

  const checklist: ChecklistItemDTO[] = Array.isArray(entrada.checklist)
    ? entrada.checklist
        .map((item) => ({
          texto: texto(item?.texto),
          obligatorio: item?.obligatorio !== false,
        }))
        .filter((item) => item.texto !== "")
    : [];

  return {
    clave,
    nombre,
    instrucciones: texto(entrada.instrucciones),
    icono: texto(entrada.icono) !== "" ? texto(entrada.icono) : "clipboard-list",
    color: texto(entrada.color) !== "" ? texto(entrada.color) : "#E8511A",
    tipo: opcion<TipoPaso>(entrada.tipo, TIPOS_PASO) ?? "TRABAJO",
    estacionId: aObjectId(entrada.estacionId),
    rolesPermitidos: listaClaves(entrada.rolesPermitidos),
    requiereFoto: booleano(entrada.requiereFoto, false),
    minFotos: Math.round(numero(entrada.minFotos, 1, 0)),
    requiereEscaneo: booleano(entrada.requiereEscaneo, false),
    requiereFirma: booleano(entrada.requiereFirma, false),
    requiereNota: booleano(entrada.requiereNota, false),
    checklist,
    horasEstimadas: numero(entrada.horasEstimadas, 0, 0),
    permiteParalelo: booleano(entrada.permiteParalelo, false),
    permiteOmitir: booleano(entrada.permiteOmitir, false),
    notificaCliente: booleano(entrada.notificaCliente, false),
  };
}

/**
 * Convierte la lista de pasos del formulario en la que guarda la ruta.
 * Rechaza claves repetidas: dos pasos con la misma clave romperían el
 * seguimiento del mueble (todo el taller identifica el paso por su clave).
 */
function construirPasosPlantilla(
  entradas: PasoPlantillaInput[] | undefined
): { ok: true; pasos: PasoPlano[] } | { ok: false; error: string } {
  if (!Array.isArray(entradas) || entradas.length === 0) {
    return {
      ok: false,
      error: "Añade al menos un paso a la ruta. Sin pasos el mueble no puede avanzar.",
    };
  }

  const pasos: PasoPlano[] = [];
  const vistas = new Set<string>();

  for (const entrada of entradas) {
    const paso = construirPasoPlantilla(entrada);
    if (!paso) {
      return { ok: false, error: "Hay un paso sin nombre. Ponle nombre a todos los pasos." };
    }
    const clave = String(paso.clave);
    if (vistas.has(clave)) {
      return {
        ok: false,
        error: `El paso «${String(paso.nombre)}» está dos veces en la ruta. Quita el repetido.`,
      };
    }
    vistas.add(clave);
    pasos.push(paso);
  }

  return { ok: true, pasos };
}

/**
 * SNAPSHOT CONGELADO: copia PROFUNDA de los pasos de la ruta (checklist
 * anidado incluido) con los campos de progreso a cero.
 *
 * Se copia y no se referencia a propósito: editar la ruta mañana NO cambia los
 * muebles que ya salieron. Es la garantía de que un mueble se fabrica como se
 * decidió el día que se pidió.
 */
function congelarPasosDeRuta(ruta: RutaLean): PasoPlano[] {
  const pasos: PasoPlano[] = (ruta.pasos ?? []).map((paso) => ({
    clave: paso.clave,
    nombre: paso.nombre,
    instrucciones: paso.instrucciones ?? "",
    icono: paso.icono ?? "clipboard-list",
    color: paso.color ?? "#E8511A",
    tipo: paso.tipo ?? "TRABAJO",
    estacionId: paso.estacionId ?? null,
    rolesPermitidos: [...(paso.rolesPermitidos ?? [])],
    requiereFoto: paso.requiereFoto ?? false,
    minFotos: paso.minFotos ?? 1,
    requiereEscaneo: paso.requiereEscaneo ?? false,
    requiereFirma: paso.requiereFirma ?? false,
    requiereNota: paso.requiereNota ?? false,
    // Copia profunda: el mueble no comparte objetos con la ruta.
    checklist: (paso.checklist ?? []).map((item) => ({
      texto: item.texto,
      obligatorio: item.obligatorio ?? true,
    })),
    horasEstimadas: paso.horasEstimadas ?? 0,
    permiteParalelo: paso.permiteParalelo ?? false,
    permiteOmitir: paso.permiteOmitir ?? false,
    notificaCliente: paso.notificaCliente ?? false,
    // Progreso inicial.
    estado: "BLOQUEADO",
    iniciadoAt: null,
    completadoAt: null,
    iniciadoPorId: "",
    iniciadoPorNombre: "",
    completadoPorId: "",
    completadoPorNombre: "",
    fotos: [],
    nota: "",
    firmaUrl: "",
    checklistRespuestas: [],
    duracionMs: 0,
    motivoOmision: "",
    escaneadoAt: null,
    escaneadoPorId: "",
  }));

  // El primero queda LISTO (y los que permitan adelantarse, también): lo decide
  // `recalcularEstados`, la misma regla que usa el taller, para no divergir.
  const estados = recalcularEstados(pasos.map((paso) => serializarPasoUnidad(paso)));
  estados.forEach((paso, indice) => {
    pasos[indice].estado = paso.estado;
  });

  return pasos;
}

/* ── ACTUALIZACIÓN CONDICIONAL DE UN PASO (concurrencia) ─────────────────── */

/**
 * ESTRATEGIA ANTI-DOBLE-CLIC, y la razón de que exista este helper.
 *
 * Dos operarios pueden tocar el botón del mismo paso en el mismo segundo desde
 * dos móviles. Si leyéramos, decidiéramos y escribiéramos, los dos ganarían y
 * el paso quedaría contado dos veces (o con la evidencia de uno pisando la del
 * otro).
 *
 * Aquí la condición viaja DENTRO de la escritura: `findOneAndUpdate` sólo
 * toca el documento si el paso está TODAVÍA en uno de los estados esperados
 * (`$elemMatch`), y escribe con el operador posicional `pasos.$.`, que apunta
 * exactamente al elemento que cumplió la condición. MongoDB garantiza que esa
 * operación es atómica sobre el documento: de dos intentos simultáneos, uno
 * devuelve el documento y el otro devuelve `null`.
 *
 * Quien recibe `null` es el perdedor y se le dice, en español, que otra
 * persona se le adelantó.
 */
async function actualizarPasoCondicional(params: {
  codigo: string;
  clave: string;
  estadosEsperados: EstadoPaso[];
  cambios: Record<string, unknown>;
}): Promise<UnidadLean | null> {
  const set: Record<string, unknown> = {};
  for (const [campo, valor] of Object.entries(params.cambios)) {
    set[`pasos.$.${campo}`] = valor;
  }

  return UnidadFabricacionModel.findOneAndUpdate(
    {
      codigo: params.codigo,
      eliminada: false,
      pasos: {
        $elemMatch: {
          clave: params.clave,
          estado:
            params.estadosEsperados.length === 1
              ? params.estadosEsperados[0]
              : { $in: params.estadosEsperados },
        },
      },
    },
    { $set: set },
    { new: true }
  ).lean();
}

/* ── RECÁLCULO DEL MUEBLE Y DEL PEDIDO ───────────────────────────────────── */

interface ResultadoSincronizacion {
  estadoAnterior: EstadoUnidad;
  estadoNuevo: EstadoUnidad;
  progreso: number;
  pasos: PasoUnidadDTO[];
}

/** Cuántas veces se reintenta la sincronización si otro móvil se cruza. */
const INTENTOS_SINCRONIZACION = 3;

/**
 * Segundo golpe tras una transición: recalcula bloqueos, progreso, paso actual,
 * estado del mueble y dónde está.
 *
 * **No pisa el trabajo de nadie**, y esta vez de verdad: cada cambio de estado
 * de un paso viaja en su PROPIA escritura condicional, que sólo entra si el
 * paso sigue en el estado que leímos (`$elemMatch` por `clave` + `$set`
 * posicional `pasos.$.estado`). Si entre la lectura y la escritura otro
 * operario empezó otro paso desde su móvil, su cambio manda: aquí no se
 * escribe nada sobre él, se relee el mueble y se vuelve a calcular sobre la
 * foto buena. Nunca se direcciona un paso por su índice con datos viejos, que
 * era como se colaba un «EMPEZAR» ajeno debajo de un BLOQUEADO.
 *
 * La evidencia (fotos, nota, firma) de cualquier paso no se toca jamás.
 */
async function sincronizarUnidad(unidad: UnidadLean): Promise<ResultadoSincronizacion> {
  let foto = unidad;
  let recalculados = pasosComoDTO(foto);

  for (let intento = 1; intento <= INTENTOS_SINCRONIZACION; intento += 1) {
    const actuales = pasosComoDTO(foto);
    recalculados = recalcularEstados(actuales);

    let alguienSeCruzo = false;
    for (let indice = 0; indice < recalculados.length; indice += 1) {
      const estadoLeido = actuales[indice].estado;
      const estadoNuevoPaso = recalculados[indice].estado;
      if (estadoNuevoPaso === estadoLeido) continue;

      const escritura = await UnidadFabricacionModel.updateOne(
        {
          _id: foto._id,
          pasos: { $elemMatch: { clave: recalculados[indice].clave, estado: estadoLeido } },
        },
        { $set: { "pasos.$.estado": estadoNuevoPaso } }
      );
      if (escritura.matchedCount === 0) alguienSeCruzo = true;
    }

    if (!alguienSeCruzo || intento === INTENTOS_SINCRONIZACION) break;

    const recargada = await UnidadFabricacionModel.findById(foto._id).lean();
    if (!recargada) break;
    foto = recargada;
  }

  // Los campos derivados se calculan sobre la foto más fresca que tenemos.
  const estadoAnterior = unidad.estado as EstadoUnidad;
  const estadoNuevo = estadoUnidadDesdePasos(recalculados, foto.estado as EstadoUnidad);
  const progreso = calcularProgreso(recalculados);
  const indiceActual = indicePasoActual(recalculados);

  const set: Record<string, unknown> = {
    estado: estadoNuevo,
    progreso,
    pasoActualIndex: indiceActual,
  };

  // Dónde está el mueble: el área del paso en el que va ahora mismo.
  const pasoActual = recalculados[indiceActual];
  if (pasoActual && pasoActual.estacionId) {
    if (String(foto.ubicacionActualId ?? "") !== pasoActual.estacionId) {
      set.ubicacionActualId = new Types.ObjectId(pasoActual.estacionId);
      set.ubicacionActualNombre = await nombreDeEstacion(pasoActual.estacionId);
    }
  }

  const ahora = new Date();
  if (!foto.iniciadoAt && estadoNuevo !== "PENDIENTE" && progreso > 0) {
    set.iniciadoAt = ahora;
  }
  if (estadoNuevo === "TERMINADA" && !foto.terminadoAt) {
    set.terminadoAt = ahora;
  }
  if (estadoNuevo !== "TERMINADA" && estadoNuevo !== "ENTREGADA" && foto.terminadoAt) {
    // Se deshizo un paso: el mueble ya no está terminado.
    set.terminadoAt = null;
  }

  await UnidadFabricacionModel.updateOne({ _id: unidad._id }, { $set: set });

  return { estadoAnterior, estadoNuevo, progreso, pasos: recalculados };
}

/**
 * Recuenta el pedido a partir de sus muebles y cierra el pedido si ya están
 * todos.
 *
 * Se RECUENTA en vez de ir sumando de uno en uno a propósito: un `$inc` se
 * descuadra en cuanto alguien deshace un paso, cancela un mueble o añade
 * unidades, y el número del panel dejaría de coincidir con la realidad. Los
 * pedidos tienen pocas unidades, así que contar es barato y siempre acierta.
 */
async function recalcularPedido(pedidoId: unknown): Promise<void> {
  try {
    const pedido = await PedidoModel.findById(pedidoId).lean();
    if (!pedido) return;
    if (pedido.estado === "CANCELADO") return;

    const unidades = await UnidadFabricacionModel.find({
      pedidoId,
      eliminada: false,
    })
      .select("estado")
      .lean();

    const total = unidades.length;
    const entregadas = unidades.filter((u) => u.estado === "ENTREGADA").length;
    const canceladas = unidades.filter((u) => u.estado === "CANCELADA").length;
    const completadas = unidades.filter(
      (u) => u.estado === "TERMINADA" || u.estado === "ENTREGADA"
    ).length;
    const arrancadas = unidades.filter((u) => u.estado !== "PENDIENTE").length;

    let estado: EstadoPedido = pedido.estado as EstadoPedido;
    if (total === 0) {
      estado = "ABIERTO";
    } else if (canceladas === total) {
      estado = "CANCELADO";
    } else if (entregadas + canceladas === total) {
      estado = "ENTREGADO";
    } else if (completadas + canceladas === total) {
      estado = "COMPLETADO";
    } else if (arrancadas > 0) {
      estado = "EN_PROCESO";
    } else {
      estado = "ABIERTO";
    }

    await PedidoModel.updateOne(
      { _id: pedidoId },
      { $set: { totalUnidades: total, unidadesCompletadas: completadas, estado } }
    );
  } catch (error) {
    console.error("[actions/fabricacion] recalcularPedido:", error);
  }
}

/* ── SEGURO: QUE NUNCA FALTE QUIEN PUEDA GESTIONAR USUARIOS ──────────────── */

/**
 * Simulación de un cambio antes de aplicarlo, para poder preguntar "y si hago
 * esto, ¿queda alguien que pueda dar de alta a la gente?".
 */
interface SimulacionGestores {
  /** Este rol pasaría a tener exactamente estas capacidades. */
  rolClave?: string;
  capacidades?: string[];
  /** Este rol se desactiva o se elimina. */
  rolFuera?: string;
  /** Las personas de este rol pasan a este otro (reasignación al eliminar). */
  reasignarDe?: string;
  reasignarA?: string;
  /** Esta persona se elimina o se desactiva. */
  operarioFuera?: string;
  /** Esta persona pasa a este rol. */
  operarioId?: string;
  rolNuevo?: string;
}

/**
 * Cuenta cuántas personas activas podrían gestionar usuarios DESPUÉS del
 * cambio que se está simulando. El rol `admin` cuenta siempre: es el seguro.
 */
async function contarGestoresDeUsuarios(sim: SimulacionGestores = {}): Promise<number> {
  const roles = await RolModel.find({}).select("clave capacidades activo").lean();

  const puedeGestionar = new Map<string, boolean>();
  for (const rol of roles) {
    const clave = rol.clave ?? "";
    if (clave === "") continue;

    if (clave === sim.rolFuera) {
      puedeGestionar.set(clave, false);
      continue;
    }

    const capacidades =
      clave === sim.rolClave && Array.isArray(sim.capacidades)
        ? sim.capacidades
        : (rol.capacidades ?? []);

    const activo = rol.activo !== false;
    puedeGestionar.set(
      clave,
      clave === CLAVE_ROL_ADMIN || (activo && capacidades.includes("gestionar_usuarios"))
    );
  }

  const operarios = await OperarioModel.find({ activo: true, eliminado: false })
    .select("rolClave")
    .lean();

  let gestores = 0;
  for (const operario of operarios) {
    const id = String(operario._id);
    if (id === sim.operarioFuera) continue;

    let rolClave = operario.rolClave ?? "";
    if (id === sim.operarioId && sim.rolNuevo) rolClave = sim.rolNuevo;
    if (sim.reasignarDe && sim.reasignarA && rolClave === sim.reasignarDe) {
      rolClave = sim.reasignarA;
    }

    if (puedeGestionar.get(rolClave) === true) gestores += 1;
  }

  return gestores;
}

/**
 * ¿Este cambio dejaría al sistema sin nadie que pueda crear personas?
 *
 * Sólo frena cuando AHORA MISMO sí hay alguien y después no quedaría nadie: si
 * ya no había ninguno (una instalación recién sembrada donde el dueño entra
 * con la cookie del panel) no tiene sentido bloquear nada.
 */
async function dejaSinGestoresDeUsuarios(sim: SimulacionGestores): Promise<boolean> {
  const antes = await contarGestoresDeUsuarios();
  if (antes === 0) return false;
  const despues = await contarGestoresDeUsuarios(sim);
  return despues === 0;
}

/**
 * Lo que se estaba intentando hacer cuando saltó el seguro del §7 ("no se
 * puede dejar al sistema sin nadie que pueda dar de alta personas").
 */
type MotivoUltimoGestor =
  | { que: "PERMISO_ROL"; rol: string }
  | { que: "DESACTIVAR_ROL"; rol: string }
  | { que: "ELIMINAR_ROL"; rol: string }
  | { que: "REASIGNAR_ROL"; rol: string; destino: string }
  | { que: "CAMBIAR_ROL_PERSONA"; persona: string; propio: boolean }
  | { que: "DESACTIVAR_PERSONA"; persona: string }
  | { que: "ELIMINAR_PERSONA"; persona: string };

/** La salida real, que es lo que el §9 exige que todo error diga. */
const SALIDA_ULTIMO_GESTOR =
  "Dale el permiso «Crear, editar y eliminar personas» a otra persona (o a otro rol) y vuelve a intentarlo.";

/**
 * El aviso del último gestor de usuarios, contado según lo que se intentaba
 * hacer. Una sola frase para las ocho situaciones mentía en casi todas: quien
 * elimina a otra persona no se está quitando ningún permiso a sí mismo, y con
 * la cookie del panel ni siquiera es una de las personas del taller.
 */
function avisoUltimoGestor(motivo: MotivoUltimoGestor): string {
  switch (motivo.que) {
    case "PERMISO_ROL":
      return `Si le quitas «Crear, editar y eliminar personas» al rol «${motivo.rol}», ya no quedaría nadie que pueda dar de alta usuarios. ${SALIDA_ULTIMO_GESTOR}`;
    case "DESACTIVAR_ROL":
      return `No puedes desactivar el rol «${motivo.rol}» porque es el único que deja dar de alta usuarios y hay gente que lo tiene. ${SALIDA_ULTIMO_GESTOR}`;
    case "ELIMINAR_ROL":
      return `No puedes eliminar el rol «${motivo.rol}» porque es el único que deja dar de alta usuarios. ${SALIDA_ULTIMO_GESTOR}`;
    case "REASIGNAR_ROL":
      return `Si pasas a esas personas del rol «${motivo.rol}» al rol «${motivo.destino}», ya no quedaría nadie que pueda dar de alta usuarios. Elige un rol que también tenga el permiso «Crear, editar y eliminar personas», o dáselo antes a otra persona.`;
    case "CAMBIAR_ROL_PERSONA":
      return motivo.propio
        ? "Eres la única persona que puede dar de alta usuarios. Si te cambias de rol te quedas sin ese permiso y nadie podría volver a dártelo. Nombra antes a otra persona."
        : `No puedes cambiarle el rol a «${motivo.persona}» porque es la única persona activa que puede dar de alta usuarios. ${SALIDA_ULTIMO_GESTOR}`;
    case "DESACTIVAR_PERSONA":
      return `No puedes desactivar a «${motivo.persona}» porque es la única persona activa que puede dar de alta usuarios. ${SALIDA_ULTIMO_GESTOR}`;
    case "ELIMINAR_PERSONA":
      return `No puedes eliminar a «${motivo.persona}» porque es la única persona activa que puede dar de alta usuarios. ${SALIDA_ULTIMO_GESTOR}`;
  }
}

/* ════════════════════════════════════════════════════════════════════════════
 * ROLES  —  capacidad `gestionar_roles`
 *
 * Los roles son DATOS, no un enum: se crean, se editan, se duplican, se
 * activan, se desactivan y se eliminan desde el panel, con las capacidades
 * marcadas por casillas. `Rol` no tiene bandera de borrado lógico, así que un
 * rol con gente o con pasos que lo exigen NO se borra: se explica qué hay.
 *
 * Toda action de esta sección llama a `invalidarCacheRoles()` para que un
 * cambio de permisos se note en el siguiente clic y no dentro de medio minuto.
 * ════════════════════════════════════════════════════════════════════════════ */

/** Busca una clave libre: `tapicero`, `tapicero_2`, `tapicero_3`… */
async function claveLibreDeRol(base: string): Promise<string> {
  const raiz = base === "" ? "rol" : base;
  for (let intento = 1; intento <= 50; intento += 1) {
    const candidata = intento === 1 ? raiz : `${raiz}_${intento}`;
    const existe = await RolModel.exists({ clave: candidata });
    if (!existe) return candidata;
  }
  return `${raiz}_${Date.now()}`;
}

export async function crearRol(input: RolInput): Promise<ActionResult<RolDTO>> {
  try {
    const sesion = await requireCapacidad("gestionar_roles");
    await connectDB();

    const nombre = texto(input?.nombre);
    if (nombre === "") {
      return fallo("Ponle un nombre al rol, por ejemplo «Tapicero».");
    }

    const claveDeseada = aClave(texto(input?.clave) !== "" ? texto(input.clave) : nombre);
    if (claveDeseada === "") {
      return fallo("El nombre del rol tiene que llevar alguna letra o número.");
    }

    const ocupada = await RolModel.exists({ clave: claveDeseada });
    if (ocupada) {
      return fallo(
        `Ya existe un rol con la clave «${claveDeseada}». Ponle otro nombre o edita el que ya hay.`
      );
    }

    const capacidades = filtrarCapacidades(input?.capacidades);

    const doc = await RolModel.create({
      clave: claveDeseada,
      nombre,
      descripcion: texto(input?.descripcion),
      color: texto(input?.color) !== "" ? texto(input.color) : "#E8511A",
      icono: texto(input?.icono) !== "" ? texto(input.icono) : "user",
      capacidades,
      // Un rol creado a mano nunca es del sistema: eso lo decide sólo el seed.
      esSistema: false,
      activo: booleano(input?.activo, true),
      orden: Math.round(numero(input?.orden, 0, 0)),
    });

    invalidarCacheRoles();

    const plano = doc.toObject();
    await registrarAuditoria({
      entidad: "ROL",
      entidadId: String(doc._id),
      entidadNombre: nombre,
      accion: "CREAR",
      actor: sesion,
      descripcion: "",
      cambios: calcularCambios({}, plano, CAMPOS_ROL),
      metadata: { clave: claveDeseada },
    });

    revalidarPanel("/roles", "/equipo");
    return exito(serializarRol(plano));
  } catch (error) {
    return manejarError("crearRol", error, "No pudimos crear el rol. Vuelve a intentarlo.");
  }
}

/**
 * Edita un rol. La `clave` NO se cambia nunca: es lo que guardan las personas
 * y los pasos; renombrar el rol es seguro, cambiarle la clave dejaría a todos
 * apuntando al vacío.
 */
export async function actualizarRol(
  claveOId: string,
  input: RolInput
): Promise<ActionResult<RolDTO>> {
  try {
    const sesion = await requireCapacidad("gestionar_roles");
    await connectDB();

    const antes = await buscarRol(claveOId);
    if (!antes) return fallo("No encontramos ese rol. Puede que ya lo hayan eliminado.");

    const clave = antes.clave ?? "";
    const nombre = texto(input?.nombre) !== "" ? texto(input.nombre) : (antes.nombre ?? "");
    if (nombre === "") return fallo("El rol necesita un nombre.");

    const esAdmin = clave === CLAVE_ROL_ADMIN || antes.esSistema === true;

    // Seguro anti-bloqueo: el rol del dueño conserva SIEMPRE todos sus permisos.
    const capacidades =
      input?.capacidades === undefined ? undefined : filtrarCapacidades(input.capacidades);

    if (clave === CLAVE_ROL_ADMIN) {
      if (capacidades !== undefined && capacidades.length < CAPACIDADES.length) {
        return fallo(
          `El rol «${nombre}» tiene que conservar todos los permisos. Es el seguro para que nunca te quedes fuera del sistema.`
        );
      }
      if (input?.activo === false) {
        return fallo(`El rol «${nombre}» no se puede desactivar: es el rol del sistema.`);
      }
    }

    // Si este cambio deja al sistema sin nadie que pueda dar de alta personas, se frena.
    if (capacidades !== undefined && !capacidades.includes("gestionar_usuarios")) {
      if (await dejaSinGestoresDeUsuarios({ rolClave: clave, capacidades })) {
        return fallo(avisoUltimoGestor({ que: "PERMISO_ROL", rol: nombre }));
      }
    }
    if (input?.activo === false && (await dejaSinGestoresDeUsuarios({ rolFuera: clave }))) {
      return fallo(avisoUltimoGestor({ que: "DESACTIVAR_ROL", rol: nombre }));
    }

    const cambios: Record<string, unknown> = { nombre };
    if (input?.descripcion !== undefined) cambios.descripcion = texto(input.descripcion);
    if (input?.color !== undefined) cambios.color = texto(input.color);
    if (input?.icono !== undefined) cambios.icono = texto(input.icono);
    if (capacidades !== undefined) cambios.capacidades = capacidades;
    if (input?.activo !== undefined && !esAdmin) cambios.activo = input.activo;
    if (input?.orden !== undefined) cambios.orden = Math.round(numero(input.orden, 0, 0));

    const despues = await RolModel.findByIdAndUpdate(
      antes._id,
      { $set: cambios },
      { new: true }
    ).lean();
    if (!despues) return fallo("No encontramos ese rol. Puede que ya lo hayan eliminado.");

    invalidarCacheRoles();

    await registrarAuditoria({
      entidad: "ROL",
      entidadId: String(antes._id),
      entidadNombre: nombre,
      accion: "EDITAR",
      actor: sesion,
      descripcion: "",
      cambios: calcularCambios(antes, cambios, CAMPOS_ROL),
    });

    revalidarPanel("/roles", "/equipo");
    return exito(serializarRol(despues));
  } catch (error) {
    return manejarError(
      "actualizarRol",
      error,
      "No pudimos guardar los cambios del rol. Vuelve a intentarlo."
    );
  }
}

/**
 * Elimina un rol.
 *
 * `Rol` no tiene borrado lógico, así que aquí el criterio es estricto:
 *  · El rol del sistema nunca se toca.
 *  · Si hay personas con ese rol y viene `reasignarA`, se les cambia el rol EN
 *    LA MISMA OPERACIÓN y cada cambio queda auditado; si no viene, se rechaza
 *    diciendo cuántas personas son.
 *  · Si además queda alguna otra dependencia (pasos del catálogo o de rutas que
 *    exigen ese rol), se rechaza: eso hay que resolverlo a mano.
 */
export async function eliminarRol(
  claveOId: string,
  reasignarA?: string
): Promise<ActionResult<ResultadoEliminacion>> {
  try {
    const sesion = await requireCapacidad("gestionar_roles");
    await connectDB();

    const rol = await buscarRol(claveOId);
    if (!rol) return fallo("No encontramos ese rol. Puede que ya lo hayan eliminado.");

    const clave = rol.clave ?? "";
    const nombre = rol.nombre ?? clave;

    if (clave === CLAVE_ROL_ADMIN || rol.esSistema === true) {
      return fallo(
        `El rol «${nombre}» es del sistema y no se puede eliminar. Es el seguro para que siempre haya alguien que pueda entrar a configurar todo.`
      );
    }

    const personas = await OperarioModel.countDocuments({ rolClave: clave, eliminado: false });
    const destino = texto(reasignarA);

    if (personas > 0) {
      if (destino === "") {
        return fallo(
          `No se puede eliminar el rol «${nombre}» porque ${personas} ${
            personas === 1 ? "persona lo tiene" : "personas lo tienen"
          }. Cámbiales el rol primero o elige a cuál pasarlas.`
        );
      }

      const rolDestino = await buscarRol(destino);
      if (!rolDestino || (rolDestino.clave ?? "") === clave) {
        return fallo("Elige un rol distinto al que vas a eliminar para pasar a esas personas.");
      }
      if (rolDestino.activo === false) {
        return fallo(
          `El rol «${rolDestino.nombre}» está desactivado. Actívalo antes de pasarle personas.`
        );
      }

      if (
        await dejaSinGestoresDeUsuarios({
          rolFuera: clave,
          reasignarDe: clave,
          reasignarA: rolDestino.clave ?? "",
        })
      ) {
        return fallo(
          avisoUltimoGestor({
            que: "REASIGNAR_ROL",
            rol: nombre,
            destino: rolDestino.nombre ?? rolDestino.clave ?? "",
          })
        );
      }

      // Se reasigna DENTRO de la misma operación y se anota persona a persona.
      const afectados = await OperarioModel.find({ rolClave: clave, eliminado: false })
        .select("nombre rolClave")
        .lean();

      await OperarioModel.updateMany(
        { rolClave: clave, eliminado: false },
        { $set: { rolClave: rolDestino.clave } }
      );

      for (const persona of afectados) {
        await registrarAuditoria({
          entidad: "OPERARIO",
          entidadId: String(persona._id),
          entidadNombre: persona.nombre ?? "",
          accion: "EDITAR",
          actor: sesion,
          descripcion: `${sesion.nombre} cambió a «${persona.nombre}» del rol «${nombre}» al rol «${rolDestino.nombre}» al eliminar el rol`,
          cambios: [
            {
              campo: "rolClave",
              etiqueta: "Rol",
              antes: nombre,
              despues: rolDestino.nombre ?? "",
            },
          ],
          metadata: { motivo: "el rol anterior se eliminó" },
        });
      }
    } else if (await dejaSinGestoresDeUsuarios({ rolFuera: clave })) {
      return fallo(avisoUltimoGestor({ que: "ELIMINAR_ROL", rol: nombre }));
    }

    // Con las personas ya reasignadas, se vuelve a mirar qué queda colgando.
    const dependencias = await dependenciasDeRol(clave);
    if (!dependencias.puedeEliminar) {
      const detalle = dependencias.dependencias
        .filter((dep) => dep.cantidad > 0)
        .map((dep) => `${dep.cantidad} ${dep.etiqueta}`)
        .join(", ");
      const motivo =
        dependencias.motivo ??
        `No se puede eliminar el rol «${nombre}»${detalle === "" ? "" : ` porque hay ${detalle}`}.`;
      const sugerencia =
        dependencias.sugerencia ??
        "Quita ese rol de los pasos que lo exigen y vuelve a intentarlo.";
      return fallo(`${motivo} ${sugerencia}`.trim());
    }

    // Se anota ANTES de borrar: después ya no habría nada que describir.
    await registrarAuditoria({
      entidad: "ROL",
      entidadId: String(rol._id),
      entidadNombre: nombre,
      accion: "ELIMINAR",
      actor: sesion,
      descripcion: "",
      cambios: calcularCambios(rol, {}, CAMPOS_ROL),
      metadata: {
        clave,
        capacidades: rol.capacidades ?? [],
        personasReasignadas: personas,
      },
    });

    await RolModel.deleteOne({ _id: rol._id });
    invalidarCacheRoles();

    revalidarPanel("/roles", "/equipo");
    return exito<ResultadoEliminacion>({
      modo: "FISICO",
      mensaje:
        personas > 0
          ? `Se eliminó el rol «${nombre}» y se pasaron ${personas} ${
              personas === 1 ? "persona" : "personas"
            } al rol elegido.`
          : `Se eliminó el rol «${nombre}».`,
    });
  } catch (error) {
    return manejarError(
      "eliminarRol",
      error,
      "No pudimos eliminar el rol. Vuelve a intentarlo."
    );
  }
}

export async function activarRol(claveOId: string): Promise<ActionResult<RolDTO>> {
  try {
    const sesion = await requireCapacidad("gestionar_roles");
    await connectDB();

    const rol = await buscarRol(claveOId);
    if (!rol) return fallo("No encontramos ese rol. Puede que ya lo hayan eliminado.");
    if (rol.activo === true) return exito(serializarRol(rol));

    const despues = await RolModel.findByIdAndUpdate(
      rol._id,
      { $set: { activo: true } },
      { new: true }
    ).lean();
    if (!despues) return fallo("No encontramos ese rol.");

    invalidarCacheRoles();
    await registrarAuditoria({
      entidad: "ROL",
      entidadId: String(rol._id),
      entidadNombre: rol.nombre ?? "",
      accion: "ACTIVAR",
      actor: sesion,
      descripcion: "",
    });

    revalidarPanel("/roles", "/equipo");
    return exito(serializarRol(despues));
  } catch (error) {
    return manejarError("activarRol", error, "No pudimos activar el rol. Vuelve a intentarlo.");
  }
}

export async function desactivarRol(claveOId: string): Promise<ActionResult<RolDTO>> {
  try {
    const sesion = await requireCapacidad("gestionar_roles");
    await connectDB();

    const rol = await buscarRol(claveOId);
    if (!rol) return fallo("No encontramos ese rol. Puede que ya lo hayan eliminado.");

    const clave = rol.clave ?? "";
    const nombre = rol.nombre ?? clave;

    if (clave === CLAVE_ROL_ADMIN || rol.esSistema === true) {
      return fallo(`El rol «${nombre}» no se puede desactivar: es el rol del sistema.`);
    }
    if (await dejaSinGestoresDeUsuarios({ rolFuera: clave })) {
      return fallo(avisoUltimoGestor({ que: "DESACTIVAR_ROL", rol: nombre }));
    }

    const personas = await OperarioModel.countDocuments({
      rolClave: clave,
      eliminado: false,
      activo: true,
    });

    const despues = await RolModel.findByIdAndUpdate(
      rol._id,
      { $set: { activo: false } },
      { new: true }
    ).lean();
    if (!despues) return fallo("No encontramos ese rol.");

    invalidarCacheRoles();
    await registrarAuditoria({
      entidad: "ROL",
      entidadId: String(rol._id),
      entidadNombre: nombre,
      accion: "DESACTIVAR",
      actor: sesion,
      descripcion: "",
      metadata: { personasConEsteRol: personas },
    });

    revalidarPanel("/roles", "/equipo");
    return exito(serializarRol(despues));
  } catch (error) {
    return manejarError(
      "desactivarRol",
      error,
      "No pudimos desactivar el rol. Vuelve a intentarlo."
    );
  }
}

/** Copia un rol con todos sus permisos, para partir de algo parecido. */
export async function duplicarRol(claveOId: string): Promise<ActionResult<RolDTO>> {
  try {
    const sesion = await requireCapacidad("gestionar_roles");
    await connectDB();

    const rol = await buscarRol(claveOId);
    if (!rol) return fallo("No encontramos ese rol. Puede que ya lo hayan eliminado.");

    const clave = await claveLibreDeRol(`${rol.clave ?? "rol"}_copia`);
    const nombre = `${rol.nombre ?? "Rol"} (copia)`;

    const doc = await RolModel.create({
      clave,
      nombre,
      descripcion: rol.descripcion ?? "",
      color: rol.color ?? "#E8511A",
      icono: rol.icono ?? "user",
      capacidades: filtrarCapacidades(rol.capacidades),
      esSistema: false,
      activo: true,
      orden: Math.round(numero(rol.orden, 0, 0)) + 1,
    });

    invalidarCacheRoles();
    await registrarAuditoria({
      entidad: "ROL",
      entidadId: String(doc._id),
      entidadNombre: nombre,
      accion: "DUPLICAR",
      actor: sesion,
      descripcion: `${sesion.nombre} duplicó el rol «${rol.nombre}» como «${nombre}»`,
      metadata: { copiadoDe: rol.clave ?? "" },
    });

    revalidarPanel("/roles");
    return exito(serializarRol(doc.toObject()));
  } catch (error) {
    return manejarError(
      "duplicarRol",
      error,
      "No pudimos duplicar el rol. Vuelve a intentarlo."
    );
  }
}

/* ════════════════════════════════════════════════════════════════════════════
 * PERSONAS  —  capacidad `gestionar_usuarios`
 *
 * Decisión del dueño (§1): las personas SÓLO las crea quien tiene la capacidad
 * `gestionar_usuarios`. Nadie se da de alta solo.
 *
 * El PIN nunca sale de aquí en claro: se guarda derivado con `hashPin` y jamás
 * se escribe en la auditoría ni en la bitácora.
 * ════════════════════════════════════════════════════════════════════════════ */

/** Comprueba que el rol elegido exista y esté activo. */
async function validarRolAsignable(rolClave: string): Promise<string | null> {
  const rol = await buscarRol(rolClave);
  if (!rol) return "Elige un rol de la lista. Si falta, créalo primero en Roles.";
  if (rol.activo === false) {
    return `El rol «${rol.nombre}» está desactivado. Actívalo o elige otro.`;
  }
  return null;
}

export async function crearOperario(
  input: OperarioInput
): Promise<ActionResult<OperarioDTO>> {
  try {
    const sesion = await requireCapacidad("gestionar_usuarios");
    await connectDB();

    const nombre = texto(input?.nombre);
    if (nombre === "") return fallo("Escribe el nombre y el apellido de la persona.");

    const pin = texto(input?.pin);
    if (!esPinValido(pin)) {
      return fallo("El PIN debe tener entre 4 y 6 números. Por ejemplo: 1234.");
    }

    const rolClave = aClave(texto(input?.rolClave));
    if (rolClave === "") return fallo("Elige el rol de esta persona.");
    const problemaRol = await validarRolAsignable(rolClave);
    if (problemaRol) return fallo(problemaRol);

    const codigoEmpleado = texto(input?.codigoEmpleado).toUpperCase();
    if (codigoEmpleado !== "") {
      const repetido = await OperarioModel.exists({ codigoEmpleado });
      if (repetido) {
        return fallo(`Ya hay alguien con el código de empleado «${codigoEmpleado}».`);
      }
    }

    const { pinHash, pinSalt } = hashPin(pin);

    const doc = await OperarioModel.create({
      nombre,
      codigoEmpleado: codigoEmpleado === "" ? undefined : codigoEmpleado,
      pinHash,
      pinSalt,
      rolClave,
      estacionesIds: idsValidos(input?.estacionesIds),
      telefono: texto(input?.telefono),
      colorAvatar: texto(input?.colorAvatar) !== "" ? texto(input.colorAvatar) : "#E8511A",
      fotoUrl: texto(input?.fotoUrl),
      activo: booleano(input?.activo, true),
      eliminado: false,
    });

    const plano = doc.toObject();
    await registrarAuditoria({
      entidad: "OPERARIO",
      entidadId: String(doc._id),
      entidadNombre: nombre,
      accion: "CREAR",
      actor: sesion,
      descripcion: "",
      // El PIN no aparece por ningún lado: sólo se anota que se le puso uno.
      cambios: calcularCambios({}, plano, camposOperario(await nombresDeRoles())),
      metadata: { conPin: true },
    });

    revalidarPanel("/equipo");
    revalidatePath("/fabrica/login");
    return exito(serializarOperario(plano));
  } catch (error) {
    return manejarError(
      "crearOperario",
      error,
      "No pudimos crear a la persona. Vuelve a intentarlo."
    );
  }
}

export async function actualizarOperario(
  id: string,
  input: OperarioInput
): Promise<ActionResult<OperarioDTO>> {
  try {
    const sesion = await requireCapacidad("gestionar_usuarios");
    await connectDB();

    if (!esIdValido(id)) return fallo("No encontramos a esa persona.");
    const antes = await OperarioModel.findById(id).lean();
    if (!antes) return fallo("No encontramos a esa persona. Puede que ya la hayan eliminado.");

    const cambios: Record<string, unknown> = {};

    if (input?.nombre !== undefined) {
      const nombre = texto(input.nombre);
      if (nombre === "") return fallo("La persona necesita un nombre.");
      cambios.nombre = nombre;
    }

    if (input?.rolClave !== undefined) {
      const rolClave = aClave(texto(input.rolClave));
      if (rolClave === "") return fallo("Elige el rol de esta persona.");
      const problemaRol = await validarRolAsignable(rolClave);
      if (problemaRol) return fallo(problemaRol);
      if (
        rolClave !== antes.rolClave &&
        (await dejaSinGestoresDeUsuarios({ operarioId: String(antes._id), rolNuevo: rolClave }))
      ) {
        return fallo(
          avisoUltimoGestor({
            que: "CAMBIAR_ROL_PERSONA",
            persona: antes.nombre ?? "",
            propio: String(antes._id) === sesion.uid,
          })
        );
      }
      cambios.rolClave = rolClave;
    }

    if (input?.codigoEmpleado !== undefined) {
      const codigoEmpleado = texto(input.codigoEmpleado).toUpperCase();
      if (codigoEmpleado !== "" && codigoEmpleado !== antes.codigoEmpleado) {
        const repetido = await OperarioModel.exists({
          codigoEmpleado,
          _id: { $ne: antes._id },
        });
        if (repetido) {
          return fallo(`Ya hay alguien con el código de empleado «${codigoEmpleado}».`);
        }
      }
      cambios.codigoEmpleado = codigoEmpleado === "" ? undefined : codigoEmpleado;
    }

    if (input?.activo === false) {
      if (String(antes._id) === sesion.uid) {
        return fallo("No puedes desactivar tu propia cuenta.");
      }
      if (await dejaSinGestoresDeUsuarios({ operarioFuera: String(antes._id) })) {
        return fallo(
          avisoUltimoGestor({ que: "DESACTIVAR_PERSONA", persona: antes.nombre ?? "" })
        );
      }
    }
    if (input?.activo !== undefined) cambios.activo = input.activo;

    if (input?.estacionesIds !== undefined) {
      cambios.estacionesIds = idsValidos(input.estacionesIds);
    }
    if (input?.telefono !== undefined) cambios.telefono = texto(input.telefono);
    if (input?.colorAvatar !== undefined) cambios.colorAvatar = texto(input.colorAvatar);
    if (input?.fotoUrl !== undefined) cambios.fotoUrl = texto(input.fotoUrl);

    // El PIN sólo se cambia por `resetearPin`, nunca de refilón en una edición.
    const despues = await OperarioModel.findByIdAndUpdate(
      antes._id,
      { $set: cambios },
      { new: true }
    ).lean();
    if (!despues) return fallo("No encontramos a esa persona.");

    await registrarAuditoria({
      entidad: "OPERARIO",
      entidadId: String(antes._id),
      entidadNombre: despues.nombre ?? "",
      accion: "EDITAR",
      actor: sesion,
      descripcion: "",
      cambios: calcularCambios(antes, cambios, camposOperario(await nombresDeRoles())),
    });

    // La sesión de esta persona deja de fiarse del token en el acto (§4).
    invalidarCacheOperarios(String(antes._id));

    revalidarPanel("/equipo");
    revalidatePath("/fabrica/login");
    return exito(serializarOperario(despues));
  } catch (error) {
    return manejarError(
      "actualizarOperario",
      error,
      "No pudimos guardar los cambios. Vuelve a intentarlo."
    );
  }
}

/**
 * Elimina a una persona.
 *
 * Con historial (eventos, muebles asignados, incidencias) el borrado es
 * LÓGICO: si se destruyera, la bitácora dejaría de decir quién hizo cada cosa,
 * que es justo lo que el dueño pidió conservar. Sin nada colgando se borra de
 * verdad.
 *
 * Los muebles que tuviera asignados NO se tocan: se deja constancia de quién
 * los llevaba. Para repartirlos de nuevo está `asignarUnidad`.
 */
export async function eliminarOperario(
  id: string
): Promise<ActionResult<ResultadoEliminacion>> {
  try {
    const sesion = await requireCapacidad("gestionar_usuarios");
    await connectDB();

    if (!esIdValido(id)) return fallo("No encontramos a esa persona.");
    const operario = await OperarioModel.findById(id).lean();
    if (!operario) return fallo("No encontramos a esa persona. Puede que ya la hayan eliminado.");

    const nombre = operario.nombre ?? "";

    if (String(operario._id) === sesion.uid) {
      return fallo("No puedes eliminar tu propia cuenta.");
    }
    if (await dejaSinGestoresDeUsuarios({ operarioFuera: String(operario._id) })) {
      return fallo(avisoUltimoGestor({ que: "ELIMINAR_PERSONA", persona: nombre }));
    }

    const dependencias = await dependenciasDeOperario(String(operario._id));
    const nombresRoles = await nombresDeRoles();

    // Se anota SIEMPRE antes de tocar nada.
    await registrarAuditoria({
      entidad: "OPERARIO",
      entidadId: String(operario._id),
      entidadNombre: nombre,
      accion: "ELIMINAR",
      actor: sesion,
      descripcion: "",
      cambios: calcularCambios(operario, {}, camposOperario(nombresRoles)),
      metadata: {
        modo: permiteBorradoFisico(dependencias) ? "FISICO" : "LOGICO",
        dependencias: dependencias.dependencias,
      },
    });

    if (permiteBorradoFisico(dependencias)) {
      await OperarioModel.deleteOne({ _id: operario._id });
      invalidarCacheOperarios(String(operario._id));
      revalidarPanel("/equipo");
      revalidatePath("/fabrica/login");
      return exito<ResultadoEliminacion>({
        modo: "FISICO",
        mensaje: `Se eliminó a «${nombre}».`,
      });
    }

    await OperarioModel.updateOne(
      { _id: operario._id },
      { $set: { eliminado: true, eliminadoAt: new Date(), activo: false } }
    );
    invalidarCacheOperarios(String(operario._id));

    revalidarPanel("/equipo");
    revalidatePath("/fabrica/login");
    return exito<ResultadoEliminacion>({
      modo: "LOGICO",
      mensaje: `«${nombre}» ya no aparece en el equipo, pero su historial de trabajo se conserva. Puedes recuperarla desde «Ver eliminados».`,
    });
  } catch (error) {
    return manejarError(
      "eliminarOperario",
      error,
      "No pudimos eliminar a la persona. Vuelve a intentarlo."
    );
  }
}

export async function restaurarOperario(id: string): Promise<ActionResult<OperarioDTO>> {
  try {
    const sesion = await requireCapacidad("gestionar_usuarios");
    await connectDB();

    if (!esIdValido(id)) return fallo("No encontramos a esa persona.");
    const operario = await OperarioModel.findById(id).lean();
    if (!operario) return fallo("No encontramos a esa persona.");

    // Si su rol se eliminó mientras tanto, hay que elegirle uno nuevo.
    const rol = await buscarRol(operario.rolClave ?? "");
    if (!rol) {
      return fallo(
        `El rol que tenía «${operario.nombre}» ya no existe. Restáurala y asígnale un rol nuevo desde la ficha, o crea otra vez ese rol.`
      );
    }

    const despues = await OperarioModel.findByIdAndUpdate(
      operario._id,
      { $set: { eliminado: false, eliminadoAt: null, activo: true } },
      { new: true }
    ).lean();
    if (!despues) return fallo("No encontramos a esa persona.");

    await registrarAuditoria({
      entidad: "OPERARIO",
      entidadId: String(operario._id),
      entidadNombre: despues.nombre ?? "",
      accion: "RESTAURAR",
      actor: sesion,
      descripcion: "",
    });

    // La sesión de esta persona deja de fiarse del token en el acto (§4).
    invalidarCacheOperarios(String(operario._id));

    revalidarPanel("/equipo");
    revalidatePath("/fabrica/login");
    return exito(serializarOperario(despues));
  } catch (error) {
    return manejarError(
      "restaurarOperario",
      error,
      "No pudimos restaurar a la persona. Vuelve a intentarlo."
    );
  }
}

export async function activarOperario(id: string): Promise<ActionResult<OperarioDTO>> {
  try {
    const sesion = await requireCapacidad("gestionar_usuarios");
    await connectDB();

    if (!esIdValido(id)) return fallo("No encontramos a esa persona.");
    const operario = await OperarioModel.findById(id).lean();
    if (!operario) return fallo("No encontramos a esa persona.");
    if (operario.eliminado === true) {
      return fallo(
        `«${operario.nombre}» está eliminada. Restáurala primero desde «Ver eliminados».`
      );
    }

    const despues = await OperarioModel.findByIdAndUpdate(
      operario._id,
      { $set: { activo: true } },
      { new: true }
    ).lean();
    if (!despues) return fallo("No encontramos a esa persona.");

    await registrarAuditoria({
      entidad: "OPERARIO",
      entidadId: String(operario._id),
      entidadNombre: despues.nombre ?? "",
      accion: "ACTIVAR",
      actor: sesion,
      descripcion: "",
    });

    // La sesión de esta persona deja de fiarse del token en el acto (§4).
    invalidarCacheOperarios(String(operario._id));

    revalidarPanel("/equipo");
    revalidatePath("/fabrica/login");
    return exito(serializarOperario(despues));
  } catch (error) {
    return manejarError(
      "activarOperario",
      error,
      "No pudimos activar a la persona. Vuelve a intentarlo."
    );
  }
}

export async function desactivarOperario(id: string): Promise<ActionResult<OperarioDTO>> {
  try {
    const sesion = await requireCapacidad("gestionar_usuarios");
    await connectDB();

    if (!esIdValido(id)) return fallo("No encontramos a esa persona.");
    const operario = await OperarioModel.findById(id).lean();
    if (!operario) return fallo("No encontramos a esa persona.");

    if (String(operario._id) === sesion.uid) {
      return fallo("No puedes desactivar tu propia cuenta.");
    }
    if (await dejaSinGestoresDeUsuarios({ operarioFuera: String(operario._id) })) {
      return fallo(
        avisoUltimoGestor({ que: "DESACTIVAR_PERSONA", persona: operario.nombre ?? "" })
      );
    }

    const despues = await OperarioModel.findByIdAndUpdate(
      operario._id,
      { $set: { activo: false } },
      { new: true }
    ).lean();
    if (!despues) return fallo("No encontramos a esa persona.");

    await registrarAuditoria({
      entidad: "OPERARIO",
      entidadId: String(operario._id),
      entidadNombre: despues.nombre ?? "",
      accion: "DESACTIVAR",
      actor: sesion,
      descripcion: "",
    });

    // La sesión de esta persona deja de fiarse del token en el acto (§4).
    invalidarCacheOperarios(String(operario._id));

    revalidarPanel("/equipo");
    revalidatePath("/fabrica/login");
    return exito(serializarOperario(despues));
  } catch (error) {
    return manejarError(
      "desactivarOperario",
      error,
      "No pudimos desactivar a la persona. Vuelve a intentarlo."
    );
  }
}

/** Le pone un PIN nuevo a una persona que olvidó el suyo. */
export async function resetearPin(id: string, nuevoPin: string): Promise<ActionResult> {
  try {
    const sesion = await requireCapacidad("gestionar_usuarios");
    await connectDB();

    if (!esIdValido(id)) return fallo("No encontramos a esa persona.");
    const operario = await OperarioModel.findById(id).select("nombre").lean();
    if (!operario) return fallo("No encontramos a esa persona.");

    const pin = texto(nuevoPin);
    if (!esPinValido(pin)) {
      return fallo("El PIN debe tener entre 4 y 6 números. Por ejemplo: 1234.");
    }

    const { pinHash, pinSalt } = hashPin(pin);
    await OperarioModel.updateOne({ _id: operario._id }, { $set: { pinHash, pinSalt } });

    // Se anota QUE se cambió, nunca A QUÉ se cambió.
    await registrarAuditoria({
      entidad: "OPERARIO",
      entidadId: String(operario._id),
      entidadNombre: operario.nombre ?? "",
      accion: "RESET_PIN",
      actor: sesion,
      descripcion: `${sesion.nombre} reinició el PIN de «${operario.nombre}»`,
    });

    revalidarPanel("/equipo");
    return { ok: true };
  } catch (error) {
    return manejarError("resetearPin", error, "No pudimos cambiar el PIN. Vuelve a intentarlo.");
  }
}

/** Atajo del listado: cambiar de rol sin abrir la ficha entera. */
export async function cambiarRolOperario(
  id: string,
  rolClave: string
): Promise<ActionResult<OperarioDTO>> {
  try {
    const sesion = await requireCapacidad("gestionar_usuarios");
    await connectDB();

    if (!esIdValido(id)) return fallo("No encontramos a esa persona.");
    const antes = await OperarioModel.findById(id).lean();
    if (!antes) return fallo("No encontramos a esa persona.");

    const clave = aClave(texto(rolClave));
    if (clave === "") return fallo("Elige un rol de la lista.");
    const problemaRol = await validarRolAsignable(clave);
    if (problemaRol) return fallo(problemaRol);

    if (clave === antes.rolClave) return exito(serializarOperario(antes));

    if (
      await dejaSinGestoresDeUsuarios({ operarioId: String(antes._id), rolNuevo: clave })
    ) {
      return fallo(
        avisoUltimoGestor({
          que: "CAMBIAR_ROL_PERSONA",
          persona: antes.nombre ?? "",
          propio: String(antes._id) === sesion.uid,
        })
      );
    }

    const despues = await OperarioModel.findByIdAndUpdate(
      antes._id,
      { $set: { rolClave: clave } },
      { new: true }
    ).lean();
    if (!despues) return fallo("No encontramos a esa persona.");

    const nombresRoles = await nombresDeRoles();
    await registrarAuditoria({
      entidad: "OPERARIO",
      entidadId: String(antes._id),
      entidadNombre: despues.nombre ?? "",
      accion: "EDITAR",
      actor: sesion,
      descripcion: `${sesion.nombre} cambió a «${despues.nombre}» al rol «${
        nombresRoles[clave] ?? clave
      }»`,
      cambios: calcularCambios(antes, { rolClave: clave }, camposOperario(nombresRoles)),
    });

    // La sesión de esta persona deja de fiarse del token en el acto (§4).
    invalidarCacheOperarios(String(antes._id));

    revalidarPanel("/equipo");
    return exito(serializarOperario(despues));
  } catch (error) {
    return manejarError(
      "cambiarRolOperario",
      error,
      "No pudimos cambiar el rol. Vuelve a intentarlo."
    );
  }
}

/* ════════════════════════════════════════════════════════════════════════════
 * ÁREAS DE TRABAJO  —  capacidad `gestionar_estaciones`
 *
 * Un área en uso (personas asignadas, pasos que la usan, muebles que están
 * allí) no se destruye: se marca `eliminada` y se puede restaurar.
 * ════════════════════════════════════════════════════════════════════════════ */

export async function crearEstacion(
  input: EstacionInput
): Promise<ActionResult<EstacionDTO>> {
  try {
    const sesion = await requireCapacidad("gestionar_estaciones");
    await connectDB();

    const nombre = texto(input?.nombre);
    if (nombre === "") {
      return fallo("Ponle un nombre al área, por ejemplo «Taller de carpintería».");
    }

    const tipo = opcion<TipoEstacion>(input?.tipo, TIPOS_ESTACION);
    if (!tipo) {
      return fallo("Elige qué tipo de área es: taller, almacén, transporte o tienda.");
    }

    const doc = await EstacionModel.create({
      nombre,
      tipo,
      direccion: texto(input?.direccion),
      telefono: texto(input?.telefono),
      activa: booleano(input?.activa, true),
      eliminada: false,
      orden: Math.round(numero(input?.orden, 0, 0)),
    });

    const plano = doc.toObject();
    await registrarAuditoria({
      entidad: "ESTACION",
      entidadId: String(doc._id),
      entidadNombre: nombre,
      accion: "CREAR",
      actor: sesion,
      descripcion: "",
      cambios: calcularCambios({}, plano, CAMPOS_ESTACION),
    });

    revalidarPanel("/estaciones", "/catalogo");
    return exito(serializarEstacion(plano));
  } catch (error) {
    return manejarError("crearEstacion", error, "No pudimos crear el área. Vuelve a intentarlo.");
  }
}

export async function actualizarEstacion(
  id: string,
  input: EstacionInput
): Promise<ActionResult<EstacionDTO>> {
  try {
    const sesion = await requireCapacidad("gestionar_estaciones");
    await connectDB();

    if (!esIdValido(id)) return fallo("No encontramos esa área.");
    const antes = await EstacionModel.findById(id).lean();
    if (!antes) return fallo("No encontramos esa área. Puede que ya la hayan eliminado.");

    const cambios: Record<string, unknown> = {};

    if (input?.nombre !== undefined) {
      const nombre = texto(input.nombre);
      if (nombre === "") return fallo("El área necesita un nombre.");
      cambios.nombre = nombre;
    }
    if (input?.tipo !== undefined) {
      const tipo = opcion<TipoEstacion>(input.tipo, TIPOS_ESTACION);
      if (!tipo) return fallo("Elige un tipo de área válido.");
      cambios.tipo = tipo;
    }
    if (input?.direccion !== undefined) cambios.direccion = texto(input.direccion);
    if (input?.telefono !== undefined) cambios.telefono = texto(input.telefono);
    if (input?.activa !== undefined) cambios.activa = input.activa;
    if (input?.orden !== undefined) cambios.orden = Math.round(numero(input.orden, 0, 0));

    const despues = await EstacionModel.findByIdAndUpdate(
      antes._id,
      { $set: cambios },
      { new: true }
    ).lean();
    if (!despues) return fallo("No encontramos esa área.");

    // El nombre está denormalizado en los muebles: si cambió, se propaga.
    if (cambios.nombre !== undefined && cambios.nombre !== antes.nombre) {
      await UnidadFabricacionModel.updateMany(
        { ubicacionActualId: antes._id },
        { $set: { ubicacionActualNombre: cambios.nombre } }
      );
    }

    await registrarAuditoria({
      entidad: "ESTACION",
      entidadId: String(antes._id),
      entidadNombre: despues.nombre ?? "",
      accion: "EDITAR",
      actor: sesion,
      descripcion: "",
      cambios: calcularCambios(antes, cambios, CAMPOS_ESTACION),
    });

    revalidarPanel("/estaciones", "/catalogo", "/unidades");
    return exito(serializarEstacion(despues));
  } catch (error) {
    return manejarError(
      "actualizarEstacion",
      error,
      "No pudimos guardar el área. Vuelve a intentarlo."
    );
  }
}

export async function eliminarEstacion(
  id: string
): Promise<ActionResult<ResultadoEliminacion>> {
  try {
    const sesion = await requireCapacidad("gestionar_estaciones");
    await connectDB();

    if (!esIdValido(id)) return fallo("No encontramos esa área.");
    const estacion = await EstacionModel.findById(id).lean();
    if (!estacion) return fallo("No encontramos esa área. Puede que ya la hayan eliminado.");

    const nombre = estacion.nombre ?? "";
    const dependencias = await dependenciasDeEstacion(String(estacion._id));

    await registrarAuditoria({
      entidad: "ESTACION",
      entidadId: String(estacion._id),
      entidadNombre: nombre,
      accion: permiteBorradoFisico(dependencias) ? "ELIMINAR" : "ARCHIVAR",
      actor: sesion,
      descripcion: "",
      cambios: calcularCambios(estacion, {}, CAMPOS_ESTACION),
      metadata: { dependencias: dependencias.dependencias },
    });

    if (permiteBorradoFisico(dependencias)) {
      await EstacionModel.deleteOne({ _id: estacion._id });
      revalidarPanel("/estaciones", "/catalogo");
      return exito<ResultadoEliminacion>({
        modo: "FISICO",
        mensaje: `Se eliminó el área «${nombre}».`,
      });
    }

    await EstacionModel.updateOne(
      { _id: estacion._id },
      { $set: { eliminada: true, eliminadaAt: new Date(), activa: false } }
    );

    const detalle = dependencias.dependencias
      .filter((dep) => dep.cantidad > 0)
      .map((dep) => `${dep.cantidad} ${dep.etiqueta}`)
      .join(", ");

    revalidarPanel("/estaciones", "/catalogo");
    return exito<ResultadoEliminacion>({
      modo: "LOGICO",
      mensaje: `El área «${nombre}» está en uso${
        detalle === "" ? "" : ` (${detalle})`
      }, así que se guardó como eliminada en vez de borrarse. Nada del historial se pierde y puedes recuperarla desde «Ver eliminadas».`,
    });
  } catch (error) {
    return manejarError(
      "eliminarEstacion",
      error,
      "No pudimos eliminar el área. Vuelve a intentarlo."
    );
  }
}

export async function restaurarEstacion(id: string): Promise<ActionResult<EstacionDTO>> {
  try {
    const sesion = await requireCapacidad("gestionar_estaciones");
    await connectDB();

    if (!esIdValido(id)) return fallo("No encontramos esa área.");
    const despues = await EstacionModel.findByIdAndUpdate(
      id,
      { $set: { eliminada: false, eliminadaAt: null, activa: true } },
      { new: true }
    ).lean();
    if (!despues) return fallo("No encontramos esa área.");

    await registrarAuditoria({
      entidad: "ESTACION",
      entidadId: String(despues._id),
      entidadNombre: despues.nombre ?? "",
      accion: "RESTAURAR",
      actor: sesion,
      descripcion: "",
    });

    revalidarPanel("/estaciones");
    return exito(serializarEstacion(despues));
  } catch (error) {
    return manejarError(
      "restaurarEstacion",
      error,
      "No pudimos restaurar el área. Vuelve a intentarlo."
    );
  }
}

export async function activarEstacion(id: string): Promise<ActionResult<EstacionDTO>> {
  try {
    const sesion = await requireCapacidad("gestionar_estaciones");
    await connectDB();

    if (!esIdValido(id)) return fallo("No encontramos esa área.");
    const despues = await EstacionModel.findByIdAndUpdate(
      id,
      { $set: { activa: true } },
      { new: true }
    ).lean();
    if (!despues) return fallo("No encontramos esa área.");

    await registrarAuditoria({
      entidad: "ESTACION",
      entidadId: String(despues._id),
      entidadNombre: despues.nombre ?? "",
      accion: "ACTIVAR",
      actor: sesion,
      descripcion: "",
    });

    revalidarPanel("/estaciones");
    return exito(serializarEstacion(despues));
  } catch (error) {
    return manejarError("activarEstacion", error, "No pudimos activar el área.");
  }
}

export async function desactivarEstacion(id: string): Promise<ActionResult<EstacionDTO>> {
  try {
    const sesion = await requireCapacidad("gestionar_estaciones");
    await connectDB();

    if (!esIdValido(id)) return fallo("No encontramos esa área.");
    const despues = await EstacionModel.findByIdAndUpdate(
      id,
      { $set: { activa: false } },
      { new: true }
    ).lean();
    if (!despues) return fallo("No encontramos esa área.");

    await registrarAuditoria({
      entidad: "ESTACION",
      entidadId: String(despues._id),
      entidadNombre: despues.nombre ?? "",
      accion: "DESACTIVAR",
      actor: sesion,
      descripcion: "",
    });

    revalidarPanel("/estaciones");
    return exito(serializarEstacion(despues));
  } catch (error) {
    return manejarError("desactivarEstacion", error, "No pudimos desactivar el área.");
  }
}

/* ════════════════════════════════════════════════════════════════════════════
 * CATÁLOGO DE PASOS  —  capacidad `gestionar_catalogo`
 *
 * Los pasos reutilizables con los que se arman las rutas. Los sembrados
 * (`esSistema`) se pueden editar y desactivar, pero no eliminar. Un paso que
 * alguna ruta usa tampoco se borra: se desactiva y deja de ofrecerse.
 * ════════════════════════════════════════════════════════════════════════════ */

async function claveLibreDePaso(base: string): Promise<string> {
  const raiz = base === "" ? "paso" : base;
  for (let intento = 1; intento <= 50; intento += 1) {
    const candidata = intento === 1 ? raiz : `${raiz}_${intento}`;
    const existe = await CatalogoPasoModel.exists({ clave: candidata });
    if (!existe) return candidata;
  }
  return `${raiz}_${Date.now()}`;
}

export async function crearPasoCatalogo(
  input: PasoCatalogoInput
): Promise<ActionResult<CatalogoPasoDTO>> {
  try {
    const sesion = await requireCapacidad("gestionar_catalogo");
    await connectDB();

    const base = construirPasoPlantilla(input);
    if (!base) return fallo("Ponle un nombre al paso, por ejemplo «Lijado».");

    const ocupada = await CatalogoPasoModel.exists({ clave: base.clave });
    if (ocupada) {
      return fallo(
        `Ya existe un paso con la clave «${String(base.clave)}». Ponle otro nombre o edita el que ya hay.`
      );
    }

    const doc = await CatalogoPasoModel.create({
      ...base,
      esSistema: false,
      activo: booleano(input?.activo, true),
      orden: Math.round(numero(input?.orden, 0, 0)),
    });

    const plano = doc.toObject();
    await registrarAuditoria({
      entidad: "CATALOGO_PASO",
      entidadId: String(doc._id),
      entidadNombre: String(base.nombre),
      accion: "CREAR",
      actor: sesion,
      descripcion: "",
      cambios: calcularCambios({}, plano, CAMPOS_PASO),
      metadata: { clave: base.clave },
    });

    revalidarPanel("/catalogo", "/rutas");
    return exito(serializarCatalogoPaso(plano));
  } catch (error) {
    return manejarError("crearPasoCatalogo", error, "No pudimos crear el paso.");
  }
}

/**
 * Edita un paso del catálogo. Igual que con los roles, la `clave` no se toca:
 * es lo que guardan las rutas y los muebles ya lanzados.
 *
 * Editar aquí NO cambia las rutas ya armadas ni los muebles en marcha: cada
 * uno lleva su propia copia. Es a propósito.
 */
export async function actualizarPasoCatalogo(
  claveOId: string,
  input: PasoCatalogoInput
): Promise<ActionResult<CatalogoPasoDTO>> {
  try {
    const sesion = await requireCapacidad("gestionar_catalogo");
    await connectDB();

    const antes = await buscarPasoCatalogo(claveOId);
    if (!antes) return fallo("No encontramos ese paso. Puede que ya lo hayan eliminado.");

    const base = construirPasoPlantilla({
      ...input,
      nombre: texto(input?.nombre) !== "" ? input.nombre : (antes.nombre ?? ""),
      clave: antes.clave ?? "",
    });
    if (!base) return fallo("El paso necesita un nombre.");

    // La clave nunca se cambia.
    delete base.clave;

    const cambios: Record<string, unknown> = { ...base };
    if (input?.activo !== undefined) cambios.activo = input.activo;
    if (input?.orden !== undefined) cambios.orden = Math.round(numero(input.orden, 0, 0));

    const despues = await CatalogoPasoModel.findByIdAndUpdate(
      antes._id,
      { $set: cambios },
      { new: true }
    ).lean();
    if (!despues) return fallo("No encontramos ese paso.");

    await registrarAuditoria({
      entidad: "CATALOGO_PASO",
      entidadId: String(antes._id),
      entidadNombre: despues.nombre ?? "",
      accion: "EDITAR",
      actor: sesion,
      descripcion: "",
      cambios: calcularCambios(antes, cambios, CAMPOS_PASO),
    });

    revalidarPanel("/catalogo", "/rutas");
    return exito(serializarCatalogoPaso(despues));
  } catch (error) {
    return manejarError("actualizarPasoCatalogo", error, "No pudimos guardar el paso.");
  }
}

export async function eliminarPasoCatalogo(
  claveOId: string
): Promise<ActionResult<ResultadoEliminacion>> {
  try {
    const sesion = await requireCapacidad("gestionar_catalogo");
    await connectDB();

    const paso = await buscarPasoCatalogo(claveOId);
    if (!paso) return fallo("No encontramos ese paso. Puede que ya lo hayan eliminado.");

    const nombre = paso.nombre ?? "";
    const clave = paso.clave ?? "";

    if (paso.esSistema === true) {
      return fallo(
        `El paso «${nombre}» viene con el sistema y no se puede eliminar. Si no lo usas, desactívalo: dejará de ofrecerse al armar rutas.`
      );
    }

    const dependencias = await dependenciasDePasoCatalogo(clave);

    await registrarAuditoria({
      entidad: "CATALOGO_PASO",
      entidadId: String(paso._id),
      entidadNombre: nombre,
      accion: permiteBorradoFisico(dependencias) ? "ELIMINAR" : "ARCHIVAR",
      actor: sesion,
      descripcion: "",
      cambios: calcularCambios(paso, {}, CAMPOS_PASO),
      metadata: { clave, dependencias: dependencias.dependencias },
    });

    if (permiteBorradoFisico(dependencias)) {
      await CatalogoPasoModel.deleteOne({ _id: paso._id });
      revalidarPanel("/catalogo", "/rutas");
      return exito<ResultadoEliminacion>({
        modo: "FISICO",
        mensaje: `Se eliminó el paso «${nombre}».`,
      });
    }

    await CatalogoPasoModel.updateOne({ _id: paso._id }, { $set: { activo: false } });

    const detalle = dependencias.dependencias
      .filter((dep) => dep.cantidad > 0)
      .map((dep) => `${dep.cantidad} ${dep.etiqueta}`)
      .join(", ");

    revalidarPanel("/catalogo", "/rutas");
    return exito<ResultadoEliminacion>({
      modo: "LOGICO",
      mensaje: `El paso «${nombre}» se está usando${
        detalle === "" ? "" : ` en ${detalle}`
      }, así que se desactivó en vez de borrarse. Las rutas que ya lo tienen siguen funcionando igual y puedes volver a activarlo cuando quieras.`,
    });
  } catch (error) {
    return manejarError("eliminarPasoCatalogo", error, "No pudimos eliminar el paso.");
  }
}

export async function duplicarPasoCatalogo(
  claveOId: string
): Promise<ActionResult<CatalogoPasoDTO>> {
  try {
    const sesion = await requireCapacidad("gestionar_catalogo");
    await connectDB();

    const paso = await buscarPasoCatalogo(claveOId);
    if (!paso) return fallo("No encontramos ese paso.");

    const clave = await claveLibreDePaso(`${paso.clave ?? "paso"}_copia`);
    const nombre = `${paso.nombre ?? "Paso"} (copia)`;

    const doc = await CatalogoPasoModel.create({
      clave,
      nombre,
      instrucciones: paso.instrucciones ?? "",
      icono: paso.icono ?? "clipboard-list",
      color: paso.color ?? "#E8511A",
      tipo: paso.tipo ?? "TRABAJO",
      estacionId: paso.estacionId ?? null,
      rolesPermitidos: [...(paso.rolesPermitidos ?? [])],
      requiereFoto: paso.requiereFoto ?? false,
      minFotos: paso.minFotos ?? 1,
      requiereEscaneo: paso.requiereEscaneo ?? false,
      requiereFirma: paso.requiereFirma ?? false,
      requiereNota: paso.requiereNota ?? false,
      checklist: (paso.checklist ?? []).map((item) => ({
        texto: item.texto,
        obligatorio: item.obligatorio ?? true,
      })),
      horasEstimadas: paso.horasEstimadas ?? 0,
      permiteParalelo: paso.permiteParalelo ?? false,
      permiteOmitir: paso.permiteOmitir ?? false,
      notificaCliente: paso.notificaCliente ?? false,
      esSistema: false,
      activo: true,
      orden: Math.round(numero(paso.orden, 0, 0)) + 1,
    });

    await registrarAuditoria({
      entidad: "CATALOGO_PASO",
      entidadId: String(doc._id),
      entidadNombre: nombre,
      accion: "DUPLICAR",
      actor: sesion,
      descripcion: `${sesion.nombre} duplicó el paso «${paso.nombre}» como «${nombre}»`,
      metadata: { copiadoDe: paso.clave ?? "" },
    });

    revalidarPanel("/catalogo");
    return exito(serializarCatalogoPaso(doc.toObject()));
  } catch (error) {
    return manejarError("duplicarPasoCatalogo", error, "No pudimos duplicar el paso.");
  }
}

export async function activarPasoCatalogo(
  claveOId: string
): Promise<ActionResult<CatalogoPasoDTO>> {
  try {
    const sesion = await requireCapacidad("gestionar_catalogo");
    await connectDB();

    const paso = await buscarPasoCatalogo(claveOId);
    if (!paso) return fallo("No encontramos ese paso.");

    const despues = await CatalogoPasoModel.findByIdAndUpdate(
      paso._id,
      { $set: { activo: true } },
      { new: true }
    ).lean();
    if (!despues) return fallo("No encontramos ese paso.");

    await registrarAuditoria({
      entidad: "CATALOGO_PASO",
      entidadId: String(paso._id),
      entidadNombre: despues.nombre ?? "",
      accion: "ACTIVAR",
      actor: sesion,
      descripcion: "",
    });

    revalidarPanel("/catalogo");
    return exito(serializarCatalogoPaso(despues));
  } catch (error) {
    return manejarError("activarPasoCatalogo", error, "No pudimos activar el paso.");
  }
}

export async function desactivarPasoCatalogo(
  claveOId: string
): Promise<ActionResult<CatalogoPasoDTO>> {
  try {
    const sesion = await requireCapacidad("gestionar_catalogo");
    await connectDB();

    const paso = await buscarPasoCatalogo(claveOId);
    if (!paso) return fallo("No encontramos ese paso.");

    const despues = await CatalogoPasoModel.findByIdAndUpdate(
      paso._id,
      { $set: { activo: false } },
      { new: true }
    ).lean();
    if (!despues) return fallo("No encontramos ese paso.");

    await registrarAuditoria({
      entidad: "CATALOGO_PASO",
      entidadId: String(paso._id),
      entidadNombre: despues.nombre ?? "",
      accion: "DESACTIVAR",
      actor: sesion,
      descripcion: "",
    });

    revalidarPanel("/catalogo");
    return exito(serializarCatalogoPaso(despues));
  } catch (error) {
    return manejarError("desactivarPasoCatalogo", error, "No pudimos desactivar el paso.");
  }
}

/* ════════════════════════════════════════════════════════════════════════════
 * RUTAS DE FABRICACIÓN  —  capacidad `gestionar_rutas`
 *
 * El camino de pasos que sigue un tipo de mueble. Una ruta que ya lanzó
 * muebles NO se borra: se archiva. Editarla no cambia los muebles en marcha,
 * porque cada uno lleva su copia congelada.
 * ════════════════════════════════════════════════════════════════════════════ */

/** Deja una sola ruta marcada como predeterminada. */
async function quitarPredeterminadaSalvo(id: Types.ObjectId): Promise<void> {
  await RutaFabricacionModel.updateMany(
    { _id: { $ne: id }, esPredeterminada: true },
    { $set: { esPredeterminada: false } }
  );
}

export async function crearRuta(input: RutaInput): Promise<ActionResult<RutaDTO>> {
  try {
    const sesion = await requireCapacidad("gestionar_rutas");
    await connectDB();

    const nombre = texto(input?.nombre);
    if (nombre === "") {
      return fallo("Ponle un nombre a la ruta, por ejemplo «Sofá tapizado completo».");
    }

    const pasos = construirPasosPlantilla(input?.pasos);
    if (!pasos.ok) return fallo(pasos.error);

    const doc = await RutaFabricacionModel.create({
      nombre,
      descripcion: texto(input?.descripcion),
      categoriaSugerida: texto(input?.categoriaSugerida),
      version: 1,
      activa: booleano(input?.activa, true),
      archivada: false,
      esPredeterminada: booleano(input?.esPredeterminada, false),
      pasos: pasos.pasos,
      creadaPorId: sesion.uid,
      creadaPorNombre: sesion.nombre,
    });

    if (doc.esPredeterminada) await quitarPredeterminadaSalvo(doc._id);

    const plano = doc.toObject();
    await registrarAuditoria({
      entidad: "RUTA",
      entidadId: String(doc._id),
      entidadNombre: nombre,
      accion: "CREAR",
      actor: sesion,
      descripcion: "",
      cambios: calcularCambios({}, plano, CAMPOS_RUTA),
      metadata: { cantidadPasos: pasos.pasos.length },
    });

    revalidarPanel("/rutas");
    return exito(serializarRuta(plano));
  } catch (error) {
    return manejarError("crearRuta", error, "No pudimos crear la ruta. Vuelve a intentarlo.");
  }
}

/**
 * Edita la ruta. Si cambian los pasos sube la `version`, para que se pueda
 * distinguir con qué versión salió cada mueble.
 */
export async function actualizarRuta(
  id: string,
  input: RutaInput
): Promise<ActionResult<RutaDTO>> {
  try {
    const sesion = await requireCapacidad("gestionar_rutas");
    await connectDB();

    if (!esIdValido(id)) return fallo("No encontramos esa ruta.");
    const antes = await RutaFabricacionModel.findById(id).lean();
    if (!antes) return fallo("No encontramos esa ruta. Puede que ya la hayan eliminado.");

    const cambios: Record<string, unknown> = {};

    if (input?.nombre !== undefined) {
      const nombre = texto(input.nombre);
      if (nombre === "") return fallo("La ruta necesita un nombre.");
      cambios.nombre = nombre;
    }
    if (input?.descripcion !== undefined) cambios.descripcion = texto(input.descripcion);
    if (input?.categoriaSugerida !== undefined) {
      cambios.categoriaSugerida = texto(input.categoriaSugerida);
    }
    if (input?.activa !== undefined) cambios.activa = input.activa;

    if (input?.pasos !== undefined) {
      const pasos = construirPasosPlantilla(input.pasos);
      if (!pasos.ok) return fallo(pasos.error);
      cambios.pasos = pasos.pasos;
      cambios.version = Math.round(numero(antes.version, 1, 1)) + 1;
    }

    if (input?.esPredeterminada !== undefined) {
      cambios.esPredeterminada = input.esPredeterminada;
    }

    const despues = await RutaFabricacionModel.findByIdAndUpdate(
      antes._id,
      { $set: cambios },
      { new: true }
    ).lean();
    if (!despues) return fallo("No encontramos esa ruta.");

    if (despues.esPredeterminada === true) await quitarPredeterminadaSalvo(antes._id);

    // El nombre está denormalizado en los muebles en marcha.
    if (cambios.nombre !== undefined && cambios.nombre !== antes.nombre) {
      await UnidadFabricacionModel.updateMany(
        { rutaId: antes._id },
        { $set: { rutaNombre: cambios.nombre } }
      );
    }

    await registrarAuditoria({
      entidad: "RUTA",
      entidadId: String(antes._id),
      entidadNombre: despues.nombre ?? "",
      accion: "EDITAR",
      actor: sesion,
      descripcion: "",
      cambios: calcularCambios(antes, cambios, CAMPOS_RUTA),
      metadata:
        cambios.pasos === undefined
          ? undefined
          : {
              // Se deja claro que los muebles ya lanzados NO cambian.
              aviso: "Los muebles que ya estaban en marcha siguen con la ruta que tenían.",
              versionNueva: cambios.version,
            },
    });

    revalidarPanel("/rutas");
    return exito(serializarRuta(despues));
  } catch (error) {
    return manejarError(
      "actualizarRuta",
      error,
      "No pudimos guardar la ruta. Vuelve a intentarlo."
    );
  }
}

export async function duplicarRuta(id: string): Promise<ActionResult<RutaDTO>> {
  try {
    const sesion = await requireCapacidad("gestionar_rutas");
    await connectDB();

    if (!esIdValido(id)) return fallo("No encontramos esa ruta.");
    const ruta = await RutaFabricacionModel.findById(id).lean();
    if (!ruta) return fallo("No encontramos esa ruta.");

    const nombre = `${ruta.nombre ?? "Ruta"} (copia)`;
    const doc = await RutaFabricacionModel.create({
      nombre,
      descripcion: ruta.descripcion ?? "",
      categoriaSugerida: ruta.categoriaSugerida ?? "",
      version: 1,
      activa: true,
      archivada: false,
      // La copia nunca hereda el ser predeterminada: sólo puede haber una.
      esPredeterminada: false,
      pasos: (ruta.pasos ?? []).map((paso) => ({
        ...paso,
        checklist: (paso.checklist ?? []).map((item) => ({
          texto: item.texto,
          obligatorio: item.obligatorio ?? true,
        })),
        rolesPermitidos: [...(paso.rolesPermitidos ?? [])],
      })),
      creadaPorId: sesion.uid,
      creadaPorNombre: sesion.nombre,
    });

    await registrarAuditoria({
      entidad: "RUTA",
      entidadId: String(doc._id),
      entidadNombre: nombre,
      accion: "DUPLICAR",
      actor: sesion,
      descripcion: `${sesion.nombre} duplicó la ruta «${ruta.nombre}» como «${nombre}»`,
      metadata: { copiadaDe: String(ruta._id) },
    });

    revalidarPanel("/rutas");
    return exito(serializarRuta(doc.toObject()));
  } catch (error) {
    return manejarError("duplicarRuta", error, "No pudimos duplicar la ruta.");
  }
}

export async function archivarRuta(id: string): Promise<ActionResult<RutaDTO>> {
  try {
    const sesion = await requireCapacidad("gestionar_rutas");
    await connectDB();

    if (!esIdValido(id)) return fallo("No encontramos esa ruta.");
    const despues = await RutaFabricacionModel.findByIdAndUpdate(
      id,
      {
        $set: {
          archivada: true,
          archivadaAt: new Date(),
          activa: false,
          esPredeterminada: false,
        },
      },
      { new: true }
    ).lean();
    if (!despues) return fallo("No encontramos esa ruta.");

    await registrarAuditoria({
      entidad: "RUTA",
      entidadId: String(despues._id),
      entidadNombre: despues.nombre ?? "",
      accion: "ARCHIVAR",
      actor: sesion,
      descripcion: "",
    });

    revalidarPanel("/rutas");
    return exito(serializarRuta(despues));
  } catch (error) {
    return manejarError("archivarRuta", error, "No pudimos archivar la ruta.");
  }
}

export async function restaurarRuta(id: string): Promise<ActionResult<RutaDTO>> {
  try {
    const sesion = await requireCapacidad("gestionar_rutas");
    await connectDB();

    if (!esIdValido(id)) return fallo("No encontramos esa ruta.");
    const despues = await RutaFabricacionModel.findByIdAndUpdate(
      id,
      { $set: { archivada: false, archivadaAt: null, activa: true } },
      { new: true }
    ).lean();
    if (!despues) return fallo("No encontramos esa ruta.");

    await registrarAuditoria({
      entidad: "RUTA",
      entidadId: String(despues._id),
      entidadNombre: despues.nombre ?? "",
      accion: "RESTAURAR",
      actor: sesion,
      descripcion: "",
    });

    revalidarPanel("/rutas");
    return exito(serializarRuta(despues));
  } catch (error) {
    return manejarError("restaurarRuta", error, "No pudimos restaurar la ruta.");
  }
}

export async function eliminarRuta(id: string): Promise<ActionResult<ResultadoEliminacion>> {
  try {
    const sesion = await requireCapacidad("gestionar_rutas");
    await connectDB();

    if (!esIdValido(id)) return fallo("No encontramos esa ruta.");
    const ruta = await RutaFabricacionModel.findById(id).lean();
    if (!ruta) return fallo("No encontramos esa ruta. Puede que ya la hayan eliminado.");

    const nombre = ruta.nombre ?? "";
    const dependencias = await dependenciasDeRuta(String(ruta._id));

    await registrarAuditoria({
      entidad: "RUTA",
      entidadId: String(ruta._id),
      entidadNombre: nombre,
      accion: permiteBorradoFisico(dependencias) ? "ELIMINAR" : "ARCHIVAR",
      actor: sesion,
      descripcion: "",
      cambios: calcularCambios(ruta, {}, CAMPOS_RUTA),
      metadata: { dependencias: dependencias.dependencias },
    });

    if (permiteBorradoFisico(dependencias)) {
      await RutaFabricacionModel.deleteOne({ _id: ruta._id });
      revalidarPanel("/rutas");
      return exito<ResultadoEliminacion>({
        modo: "FISICO",
        mensaje: `Se eliminó la ruta «${nombre}».`,
      });
    }

    await RutaFabricacionModel.updateOne(
      { _id: ruta._id },
      {
        $set: {
          archivada: true,
          archivadaAt: new Date(),
          activa: false,
          esPredeterminada: false,
        },
      }
    );

    const detalle = dependencias.dependencias
      .filter((dep) => dep.cantidad > 0)
      .map((dep) => `${dep.cantidad} ${dep.etiqueta}`)
      .join(", ");

    revalidarPanel("/rutas");
    return exito<ResultadoEliminacion>({
      modo: "LOGICO",
      mensaje: `La ruta «${nombre}» ya se está usando${
        detalle === "" ? "" : ` en ${detalle}`
      }, así que se archivó en vez de borrarse. Los muebles en marcha siguen igual y puedes recuperarla desde «Ver archivadas».`,
    });
  } catch (error) {
    return manejarError("eliminarRuta", error, "No pudimos eliminar la ruta.");
  }
}

/** La que se propone sola al crear un mueble sin elegir ruta. */
export async function marcarRutaPredeterminada(id: string): Promise<ActionResult<RutaDTO>> {
  try {
    const sesion = await requireCapacidad("gestionar_rutas");
    await connectDB();

    if (!esIdValido(id)) return fallo("No encontramos esa ruta.");
    const ruta = await RutaFabricacionModel.findById(id).lean();
    if (!ruta) return fallo("No encontramos esa ruta.");
    if (ruta.archivada === true) {
      return fallo(
        `La ruta «${ruta.nombre}» está archivada. Restáurala antes de ponerla como predeterminada.`
      );
    }

    await quitarPredeterminadaSalvo(ruta._id);
    const despues = await RutaFabricacionModel.findByIdAndUpdate(
      ruta._id,
      { $set: { esPredeterminada: true, activa: true } },
      { new: true }
    ).lean();
    if (!despues) return fallo("No encontramos esa ruta.");

    await registrarAuditoria({
      entidad: "RUTA",
      entidadId: String(ruta._id),
      entidadNombre: despues.nombre ?? "",
      accion: "EDITAR",
      actor: sesion,
      descripcion: `${sesion.nombre} puso «${despues.nombre}» como ruta predeterminada`,
      cambios: [
        {
          campo: "esPredeterminada",
          etiqueta: "Ruta predeterminada",
          antes: "No",
          despues: "Sí",
        },
      ],
    });

    revalidarPanel("/rutas");
    return exito(serializarRuta(despues));
  } catch (error) {
    return manejarError("marcarRutaPredeterminada", error, "No pudimos marcar la ruta.");
  }
}

/* ════════════════════════════════════════════════════════════════════════════
 * PEDIDOS  —  capacidad `gestionar_pedidos` (borrar: `eliminar_pedidos`)
 *
 * El alta es el corazón del módulo: un pedido con N muebles crea N unidades
 * INDEPENDIENTES, cada una con su código `COD-XXXXXX`, su QR y su copia
 * congelada de la ruta. Dos sofás iguales del mismo pedido se fabrican y se
 * siguen por separado.
 * ════════════════════════════════════════════════════════════════════════════ */

/** Máximo de muebles por línea, para que un cero de más no cree 500 unidades. */
const MAX_CANTIDAD_LINEA = 50;

function limpiarProducto(entrada: ProductoSnapshotInput): Record<string, unknown> {
  const precio = entrada?.precio;
  return {
    titulo: texto(entrada?.titulo),
    categoria: texto(entrada?.categoria),
    imagen: texto(entrada?.imagen),
    tela: texto(entrada?.tela),
    acabado: texto(entrada?.acabado),
    configuracion: texto(entrada?.configuracion),
    medidas: texto(entrada?.medidas),
    precio:
      precio === null || precio === undefined || !Number.isFinite(Number(precio))
        ? null
        : Number(precio),
  };
}

interface CabeceraPedido {
  _id: Types.ObjectId;
  codigo: string;
  clienteNombre: string;
  prioridad: Prioridad;
  fechaPrometida: Date | null;
}

/**
 * Crea las unidades de una lista de líneas: `cantidad` unidades por línea,
 * cada una con su propio código y el SNAPSHOT CONGELADO de la ruta.
 * Deja un evento CREADA por unidad.
 */
async function crearUnidadesDeLineas(
  pedido: CabeceraPedido,
  lineas: LineaPedidoInput[],
  sesion: SesionOperario
): Promise<{ ok: true; unidades: UnidadLean[] } | { ok: false; error: string }> {
  // Se resuelven las rutas una sola vez, aunque haya diez líneas iguales.
  const rutasPorId = new Map<string, RutaLean>();
  let predeterminada: RutaLean | null | undefined;

  const creadas: UnidadLean[] = [];

  for (const linea of lineas) {
    const titulo = texto(linea?.producto?.titulo);
    if (titulo === "") {
      return { ok: false, error: "Escribe qué mueble es en todas las líneas del pedido." };
    }

    const cantidad = Math.round(numero(linea?.cantidad, 1, 1));
    if (cantidad < 1 || cantidad > MAX_CANTIDAD_LINEA) {
      return {
        ok: false,
        error: `La cantidad de «${titulo}» tiene que estar entre 1 y ${MAX_CANTIDAD_LINEA}.`,
      };
    }

    let ruta: RutaLean | null = null;
    const rutaId = aObjectId(linea?.rutaId);
    if (rutaId) {
      const cacheada = rutasPorId.get(String(rutaId));
      if (cacheada) {
        ruta = cacheada;
      } else {
        ruta = await leerRuta(rutaId);
        if (ruta) rutasPorId.set(String(rutaId), ruta);
      }
      if (!ruta) {
        return {
          ok: false,
          error: `No encontramos la ruta elegida para «${titulo}». Elige otra de la lista.`,
        };
      }
    } else {
      if (predeterminada === undefined) {
        predeterminada = await RutaFabricacionModel.findOne({
          esPredeterminada: true,
          archivada: false,
        }).lean();
      }
      ruta = predeterminada;
      if (!ruta) {
        return {
          ok: false,
          error: `Elige una ruta de fabricación para «${titulo}». Si todavía no hay ninguna, créala primero en Rutas.`,
        };
      }
    }

    if ((ruta.pasos ?? []).length === 0) {
      return {
        ok: false,
        error: `La ruta «${ruta.nombre}» no tiene pasos. Añádele pasos antes de usarla.`,
      };
    }

    for (let numeroUnidad = 0; numeroUnidad < cantidad; numeroUnidad += 1) {
      const codigo = await generarCodigoUnidad();
      const pasos = congelarPasosDeRuta(ruta);

      // El mueble arranca donde se hace su primer paso.
      const primeroConArea = pasos.find((paso) => paso.estacionId);
      const ubicacionActualId = primeroConArea?.estacionId ?? null;
      const ubicacionActualNombre = ubicacionActualId
        ? await nombreDeEstacion(ubicacionActualId)
        : "";

      const doc = await UnidadFabricacionModel.create({
        codigo,
        pedidoId: pedido._id,
        pedidoCodigo: pedido.codigo,
        clienteNombre: pedido.clienteNombre,
        productoId: aObjectId(linea?.productoId),
        producto: limpiarProducto(linea.producto),
        rutaId: ruta._id,
        rutaNombre: ruta.nombre ?? "",
        rutaVersion: ruta.version ?? 1,
        pasos,
        estado: "PENDIENTE",
        pasoActualIndex: 0,
        progreso: 0,
        asignadoAId: null,
        asignadoANombre: "",
        ubicacionActualId,
        ubicacionActualNombre,
        prioridad: pedido.prioridad,
        fechaPrometida: pedido.fechaPrometida,
        notas: "",
        eliminada: false,
      });

      await registrarEvento({
        unidadId: doc._id,
        unidadCodigo: codigo,
        tipo: "CREADA",
        sesion,
        descripcion: `${sesion.nombre} creó el mueble «${titulo}» (${codigo}) del pedido ${pedido.codigo}`,
        estacionId: ubicacionActualId,
        estacionNombre: ubicacionActualNombre,
        metadata: {
          ruta: ruta.nombre ?? "",
          versionRuta: ruta.version ?? 1,
          unidad: `${numeroUnidad + 1} de ${cantidad}`,
        },
      });

      creadas.push(doc.toObject() as unknown as UnidadLean);
    }
  }

  return { ok: true, unidades: creadas };
}

/**
 * Alta de un pedido con todos sus muebles.
 *
 * Devuelve el pedido CON sus unidades para poder mandar a imprimir las
 * etiquetas con el QR en el mismo momento, sin volver a cargar nada.
 */
export async function crearPedido(input: PedidoInput): Promise<ActionResult<PedidoDTO>> {
  try {
    const sesion = await requireCapacidad("gestionar_pedidos");
    await connectDB();

    const nombreCliente = texto(input?.cliente?.nombre);
    if (nombreCliente === "") return fallo("Escribe el nombre del cliente.");

    const telefono = texto(input?.cliente?.telefono);
    if (telefono === "") {
      return fallo("Escribe el teléfono del cliente: es como se le avisa cuando esté listo.");
    }

    const lineas = Array.isArray(input?.lineas) ? input.lineas : [];
    if (lineas.length === 0) {
      return fallo("Añade al menos un mueble al pedido.");
    }

    const prioridad = opcion<Prioridad>(input?.prioridad, PRIORIDADES) ?? "NORMAL";
    const fechaPrometida = fechaDesde(input?.fechaPrometida);
    const codigo = await generarCodigoPedido();

    const pedidoDoc = await PedidoModel.create({
      codigo,
      cliente: {
        nombre: nombreCliente,
        telefono,
        cedula: texto(input?.cliente?.cedula),
        direccion: texto(input?.cliente?.direccion),
        ciudad: texto(input?.cliente?.ciudad),
        email: texto(input?.cliente?.email),
      },
      canal: opcion<Canal>(input?.canal, CANALES) ?? "WHATSAPP",
      prioridad,
      fechaPrometida,
      notas: texto(input?.notas),
      estado: "ABIERTO",
      creadoPorId: sesion.uid,
      creadoPorNombre: sesion.nombre,
      totalUnidades: 0,
      unidadesCompletadas: 0,
      eliminado: false,
    });

    const resultado = await crearUnidadesDeLineas(
      {
        _id: pedidoDoc._id,
        codigo,
        clienteNombre: nombreCliente,
        prioridad,
        fechaPrometida,
      },
      lineas,
      sesion
    );

    if (!resultado.ok) {
      // El pedido se queda sin muebles: se borra para no dejar basura, y se
      // anota, porque el código del contador ya se consumió.
      await UnidadFabricacionModel.deleteMany({ pedidoId: pedidoDoc._id });
      await PedidoModel.deleteOne({ _id: pedidoDoc._id });
      return fallo(resultado.error);
    }

    await PedidoModel.updateOne(
      { _id: pedidoDoc._id },
      { $set: { totalUnidades: resultado.unidades.length } }
    );

    const plano = await PedidoModel.findById(pedidoDoc._id).lean();

    await registrarAuditoria({
      entidad: "PEDIDO",
      entidadId: String(pedidoDoc._id),
      entidadNombre: codigo,
      accion: "CREAR",
      actor: sesion,
      descripcion: `${sesion.nombre} creó el pedido ${codigo} de «${nombreCliente}» con ${
        resultado.unidades.length
      } ${resultado.unidades.length === 1 ? "mueble" : "muebles"}`,
      cambios: calcularCambios({}, plano ?? {}, CAMPOS_PEDIDO),
      metadata: {
        codigosUnidades: resultado.unidades.map((unidad) => unidad.codigo),
      },
    });

    revalidarPanel("/pedidos", "/unidades");
    revalidarTaller();

    const dto = serializarPedido(plano ?? pedidoDoc.toObject());
    dto.unidades = resultado.unidades.map((unidad) => serializarUnidad(unidad));
    return exito(dto);
  } catch (error) {
    return manejarError(
      "crearPedido",
      error,
      "No pudimos crear el pedido. Vuelve a intentarlo."
    );
  }
}

export async function actualizarPedido(
  codigoOId: string,
  input: PedidoEdicionInput
): Promise<ActionResult<PedidoDTO>> {
  try {
    const sesion = await requireCapacidad("gestionar_pedidos");
    await connectDB();

    const antes = await buscarPedido(codigoOId);
    if (!antes) return fallo("No encontramos ese pedido. Puede que ya lo hayan eliminado.");

    const cambios: Record<string, unknown> = {};

    if (input?.cliente !== undefined) {
      const cliente = {
        nombre:
          input.cliente.nombre !== undefined
            ? texto(input.cliente.nombre)
            : (antes.cliente?.nombre ?? ""),
        telefono:
          input.cliente.telefono !== undefined
            ? texto(input.cliente.telefono)
            : (antes.cliente?.telefono ?? ""),
        cedula:
          input.cliente.cedula !== undefined
            ? texto(input.cliente.cedula)
            : (antes.cliente?.cedula ?? ""),
        direccion:
          input.cliente.direccion !== undefined
            ? texto(input.cliente.direccion)
            : (antes.cliente?.direccion ?? ""),
        ciudad:
          input.cliente.ciudad !== undefined
            ? texto(input.cliente.ciudad)
            : (antes.cliente?.ciudad ?? ""),
        email:
          input.cliente.email !== undefined
            ? texto(input.cliente.email)
            : (antes.cliente?.email ?? ""),
      };
      if (cliente.nombre === "") return fallo("El pedido necesita el nombre del cliente.");
      if (cliente.telefono === "") return fallo("El pedido necesita el teléfono del cliente.");
      cambios.cliente = cliente;
    }

    if (input?.canal !== undefined) {
      const canal = opcion<Canal>(input.canal, CANALES);
      if (!canal) return fallo("Elige por dónde llegó el pedido.");
      cambios.canal = canal;
    }
    if (input?.prioridad !== undefined) {
      const prioridad = opcion<Prioridad>(input.prioridad, PRIORIDADES);
      if (!prioridad) return fallo("Elige una prioridad válida.");
      cambios.prioridad = prioridad;
    }
    if (input?.fechaPrometida !== undefined) {
      cambios.fechaPrometida = fechaDesde(input.fechaPrometida);
    }
    if (input?.notas !== undefined) cambios.notas = texto(input.notas);

    const despues = await PedidoModel.findByIdAndUpdate(
      antes._id,
      { $set: cambios },
      { new: true }
    ).lean();
    if (!despues) return fallo("No encontramos ese pedido.");

    // Los muebles llevan copiado el nombre del cliente para pintar el tablero.
    const nombreNuevo = (cambios.cliente as { nombre?: string } | undefined)?.nombre;
    if (nombreNuevo !== undefined && nombreNuevo !== antes.cliente?.nombre) {
      await UnidadFabricacionModel.updateMany(
        { pedidoId: antes._id },
        { $set: { clienteNombre: nombreNuevo } }
      );
    }

    await registrarAuditoria({
      entidad: "PEDIDO",
      entidadId: String(antes._id),
      entidadNombre: antes.codigo ?? "",
      accion: "EDITAR",
      actor: sesion,
      descripcion: "",
      cambios: calcularCambios(antes, cambios, CAMPOS_PEDIDO),
    });

    revalidarPanel("/pedidos", `/pedidos/${antes.codigo}`, "/unidades");
    return exito(serializarPedido(despues));
  } catch (error) {
    return manejarError(
      "actualizarPedido",
      error,
      "No pudimos guardar el pedido. Vuelve a intentarlo."
    );
  }
}

/**
 * Elimina un pedido.
 *
 * Un pedido cuyos muebles ya empezaron NO se elimina: se cancela, que conserva
 * la historia de lo trabajado. Sin nada empezado se marca eliminado junto con
 * sus muebles (borrado lógico, restaurable), o se borra de verdad si no tenía
 * ninguno.
 */
export async function eliminarPedido(
  codigoOId: string
): Promise<ActionResult<ResultadoEliminacion>> {
  try {
    const sesion = await requireCapacidad("eliminar_pedidos");
    await connectDB();

    const pedido = await buscarPedido(codigoOId);
    if (!pedido) return fallo("No encontramos ese pedido. Puede que ya lo hayan eliminado.");

    const codigo = pedido.codigo ?? "";
    const enMarcha = await UnidadFabricacionModel.countDocuments({
      pedidoId: pedido._id,
      eliminada: false,
      estado: { $nin: ["PENDIENTE", "CANCELADA"] },
    });

    if (enMarcha > 0) {
      return fallo(
        `El pedido ${codigo} ya empezó a fabricarse (${enMarcha} ${
          enMarcha === 1 ? "mueble está" : "muebles están"
        } en marcha). No se puede eliminar: usa «Cancelar pedido» para detenerlo sin perder el historial.`
      );
    }

    const dependencias = await dependenciasDePedido(String(pedido._id));

    await registrarAuditoria({
      entidad: "PEDIDO",
      entidadId: String(pedido._id),
      entidadNombre: codigo,
      accion: "ELIMINAR",
      actor: sesion,
      descripcion: "",
      cambios: calcularCambios(pedido, {}, CAMPOS_PEDIDO),
      metadata: { dependencias: dependencias.dependencias },
    });

    if (permiteBorradoFisico(dependencias)) {
      // Sin dependencias no debería quedar ningún mueble, pero si quedara
      // alguno se limpia con su bitácora y sus avisos: nunca se dejan
      // anotaciones huérfanas apuntando a un código que ya no existe.
      const muebles = await UnidadFabricacionModel.find({ pedidoId: pedido._id })
        .select({ _id: 1 })
        .lean();
      const idsMuebles = muebles.map((mueble) => mueble._id);
      if (idsMuebles.length > 0) {
        await EventoUnidadModel.deleteMany({ unidadId: { $in: idsMuebles } });
        await IncidenciaModel.deleteMany({ unidadId: { $in: idsMuebles } });
      }
      await UnidadFabricacionModel.deleteMany({ pedidoId: pedido._id });
      await PedidoModel.deleteOne({ _id: pedido._id });
      revalidarPanel("/pedidos", "/unidades");
      revalidarTaller();
      return exito<ResultadoEliminacion>({
        modo: "FISICO",
        mensaje: `Se eliminó el pedido ${codigo}.`,
      });
    }

    const ahora = new Date();
    await PedidoModel.updateOne(
      { _id: pedido._id },
      { $set: { eliminado: true, eliminadoAt: ahora } }
    );
    // Sólo caen los muebles que seguían en los listados. A uno que ya habían
    // eliminado aparte no se le toca la fecha, para que al restaurar el pedido
    // no resucite (ver el filtro de `restaurarPedido`).
    await UnidadFabricacionModel.updateMany(
      { pedidoId: pedido._id, eliminada: { $ne: true } },
      { $set: { eliminada: true, eliminadaAt: ahora } }
    );

    revalidarPanel("/pedidos", "/unidades");
    revalidarTaller();
    return exito<ResultadoEliminacion>({
      modo: "LOGICO",
      mensaje: `El pedido ${codigo} y sus muebles salieron de los listados, pero su historial se conserva. Puedes recuperarlo desde «Ver eliminados».`,
    });
  } catch (error) {
    return manejarError("eliminarPedido", error, "No pudimos eliminar el pedido.");
  }
}

export async function restaurarPedido(
  codigoOId: string
): Promise<ActionResult<PedidoDTO>> {
  try {
    const sesion = await requireCapacidad("eliminar_pedidos");
    await connectDB();

    const pedido = await buscarPedido(codigoOId);
    if (!pedido) return fallo("No encontramos ese pedido.");

    // Sólo se resucitan los muebles que cayeron CON el pedido (misma marca de
    // tiempo). Uno que alguien eliminó aparte antes sigue eliminado.
    const filtroUnidades = pedido.eliminadoAt
      ? { pedidoId: pedido._id, eliminadaAt: pedido.eliminadoAt }
      : { pedidoId: pedido._id, eliminada: true };

    await PedidoModel.updateOne(
      { _id: pedido._id },
      { $set: { eliminado: false, eliminadoAt: null } }
    );
    await UnidadFabricacionModel.updateMany(filtroUnidades, {
      $set: { eliminada: false, eliminadaAt: null },
    });
    await recalcularPedido(pedido._id);

    await registrarAuditoria({
      entidad: "PEDIDO",
      entidadId: String(pedido._id),
      entidadNombre: pedido.codigo ?? "",
      accion: "RESTAURAR",
      actor: sesion,
      descripcion: "",
    });

    const despues = await PedidoModel.findById(pedido._id).lean();
    revalidarPanel("/pedidos", "/unidades");
    revalidarTaller();
    return exito(serializarPedido(despues ?? pedido));
  } catch (error) {
    return manejarError("restaurarPedido", error, "No pudimos restaurar el pedido.");
  }
}

/** Da el pedido por cancelado y cancela con él todos sus muebles en marcha. */
export async function cancelarPedido(
  codigoOId: string,
  motivo: string
): Promise<ActionResult<PedidoDTO>> {
  try {
    const sesion = await requireCapacidad("cancelar_unidades");
    await connectDB();

    const pedido = await buscarPedido(codigoOId);
    if (!pedido) return fallo("No encontramos ese pedido.");
    if (pedido.estado === "CANCELADO") {
      return fallo(`El pedido ${pedido.codigo} ya estaba cancelado.`);
    }

    const razon = texto(motivo);
    if (razon === "") {
      return fallo("Escribe por qué se cancela el pedido. Queda anotado en el historial.");
    }

    const unidades = await UnidadFabricacionModel.find({
      pedidoId: pedido._id,
      eliminada: false,
      estado: { $nin: ["ENTREGADA", "CANCELADA"] },
    })
      .select("codigo producto")
      .lean();

    await UnidadFabricacionModel.updateMany(
      { pedidoId: pedido._id, eliminada: false, estado: { $nin: ["ENTREGADA", "CANCELADA"] } },
      { $set: { estado: "CANCELADA" } }
    );
    await PedidoModel.updateOne({ _id: pedido._id }, { $set: { estado: "CANCELADO" } });

    for (const unidad of unidades) {
      await registrarEvento({
        unidadId: unidad._id,
        unidadCodigo: unidad.codigo ?? "",
        tipo: "CANCELACION",
        sesion,
        descripcion: `${sesion.nombre} canceló el mueble ${unidad.codigo} al cancelarse el pedido ${pedido.codigo}`,
        metadata: { motivo: razon },
      });
    }

    await registrarAuditoria({
      entidad: "PEDIDO",
      entidadId: String(pedido._id),
      entidadNombre: pedido.codigo ?? "",
      accion: "EDITAR",
      actor: sesion,
      descripcion: `${sesion.nombre} canceló el pedido ${pedido.codigo}`,
      cambios: [
        {
          campo: "estado",
          etiqueta: "Estado",
          antes: String(pedido.estado ?? ""),
          despues: "CANCELADO",
        },
      ],
      metadata: { motivo: razon, unidadesCanceladas: unidades.length },
    });

    const despues = await PedidoModel.findById(pedido._id).lean();
    revalidarPanel("/pedidos", "/unidades");
    revalidarTaller();
    return exito(serializarPedido(despues ?? pedido));
  } catch (error) {
    return manejarError("cancelarPedido", error, "No pudimos cancelar el pedido.");
  }
}

/** Añade muebles a un pedido que ya existe (el cliente pidió uno más). */
export async function agregarUnidadesAPedido(
  codigoOId: string,
  lineas: LineaPedidoInput[]
): Promise<ActionResult<UnidadDTO[]>> {
  try {
    const sesion = await requireCapacidad("gestionar_pedidos");
    await connectDB();

    const pedido = await buscarPedido(codigoOId);
    if (!pedido) return fallo("No encontramos ese pedido.");
    if (pedido.estado === "CANCELADO") {
      return fallo(`El pedido ${pedido.codigo} está cancelado. No se le pueden añadir muebles.`);
    }
    if (!Array.isArray(lineas) || lineas.length === 0) {
      return fallo("Añade al menos un mueble.");
    }

    const resultado = await crearUnidadesDeLineas(
      {
        _id: pedido._id,
        codigo: pedido.codigo ?? "",
        clienteNombre: pedido.cliente?.nombre ?? "",
        prioridad: (pedido.prioridad ?? "NORMAL") as Prioridad,
        fechaPrometida: pedido.fechaPrometida ?? null,
      },
      lineas,
      sesion
    );
    if (!resultado.ok) return fallo(resultado.error);

    await recalcularPedido(pedido._id);

    await registrarAuditoria({
      entidad: "PEDIDO",
      entidadId: String(pedido._id),
      entidadNombre: pedido.codigo ?? "",
      accion: "EDITAR",
      actor: sesion,
      descripcion: `${sesion.nombre} añadió ${resultado.unidades.length} ${
        resultado.unidades.length === 1 ? "mueble" : "muebles"
      } al pedido ${pedido.codigo}`,
      metadata: { codigosUnidades: resultado.unidades.map((unidad) => unidad.codigo) },
    });

    revalidarPanel("/pedidos", `/pedidos/${pedido.codigo}`, "/unidades");
    revalidarTaller();
    return exito(resultado.unidades.map((unidad) => serializarUnidad(unidad)));
  } catch (error) {
    return manejarError("agregarUnidadesAPedido", error, "No pudimos añadir los muebles.");
  }
}

/** Cambia la prioridad del pedido y la baja a todos sus muebles sin terminar. */
export async function cambiarPrioridadPedido(
  codigoOId: string,
  prioridad: Prioridad
): Promise<ActionResult<PedidoDTO>> {
  try {
    const sesion = await requireCapacidad("gestionar_pedidos");
    await connectDB();

    const pedido = await buscarPedido(codigoOId);
    if (!pedido) return fallo("No encontramos ese pedido.");

    const nueva = opcion<Prioridad>(prioridad, PRIORIDADES);
    if (!nueva) return fallo("Elige una prioridad: Normal, Alta o Urgente.");

    await PedidoModel.updateOne({ _id: pedido._id }, { $set: { prioridad: nueva } });

    const unidades = await UnidadFabricacionModel.find({
      pedidoId: pedido._id,
      eliminada: false,
      estado: { $nin: ["ENTREGADA", "CANCELADA"] },
    })
      .select("codigo")
      .lean();

    await UnidadFabricacionModel.updateMany(
      { pedidoId: pedido._id, eliminada: false, estado: { $nin: ["ENTREGADA", "CANCELADA"] } },
      { $set: { prioridad: nueva } }
    );

    for (const unidad of unidades) {
      await registrarEvento({
        unidadId: unidad._id,
        unidadCodigo: unidad.codigo ?? "",
        tipo: "EDICION",
        sesion,
        descripcion: `${sesion.nombre} puso la prioridad ${nueva} al mueble ${unidad.codigo} (cambio del pedido ${pedido.codigo})`,
        metadata: { prioridad: nueva },
      });
    }

    await registrarAuditoria({
      entidad: "PEDIDO",
      entidadId: String(pedido._id),
      entidadNombre: pedido.codigo ?? "",
      accion: "EDITAR",
      actor: sesion,
      descripcion: "",
      cambios: calcularCambios(pedido, { prioridad: nueva }, CAMPOS_PEDIDO),
      metadata: { unidadesAfectadas: unidades.length },
    });

    const despues = await PedidoModel.findById(pedido._id).lean();
    revalidarPanel("/pedidos", "/unidades");
    revalidarTaller();
    return exito(serializarPedido(despues ?? pedido));
  } catch (error) {
    return manejarError("cambiarPrioridadPedido", error, "No pudimos cambiar la prioridad.");
  }
}

/* ════════════════════════════════════════════════════════════════════════════
 * MUEBLES (UNIDADES)  —  capacidad `gestionar_unidades`
 *   · eliminar/restaurar: `eliminar_pedidos`   · cancelar: `cancelar_unidades`
 *
 * Un mueble que ya empezó a fabricarse no se borra: se cancela. Y cada cambio
 * deja su línea en la bitácora del taller, además de la auditoría.
 * ════════════════════════════════════════════════════════════════════════════ */

export async function actualizarUnidad(
  codigo: string,
  input: UnidadInput
): Promise<ActionResult<UnidadDTO>> {
  try {
    const sesion = await requireCapacidad("gestionar_unidades");
    await connectDB();

    const antes = await buscarUnidad(codigo);
    if (!antes) return fallo("No encontramos ese mueble. Revisa el código.");

    const cambios: Record<string, unknown> = {};

    if (input?.prioridad !== undefined) {
      const prioridad = opcion<Prioridad>(input.prioridad, PRIORIDADES);
      if (!prioridad) return fallo("Elige una prioridad: Normal, Alta o Urgente.");
      cambios.prioridad = prioridad;
    }
    if (input?.fechaPrometida !== undefined) {
      cambios.fechaPrometida = fechaDesde(input.fechaPrometida);
    }
    if (input?.notas !== undefined) cambios.notas = texto(input.notas);

    if (input?.asignadoAId !== undefined) {
      const id = aObjectId(input.asignadoAId);
      if (input.asignadoAId !== null && input.asignadoAId !== "" && !id) {
        return fallo("Elige a una persona de la lista.");
      }
      cambios.asignadoAId = id;
      if (id) {
        const persona = await OperarioModel.findById(id).select("nombre").lean();
        if (!persona) return fallo("No encontramos a esa persona.");
        cambios.asignadoANombre = persona.nombre ?? "";
      } else {
        cambios.asignadoANombre = "";
      }
    }

    if (input?.ubicacionActualId !== undefined) {
      const id = aObjectId(input.ubicacionActualId);
      if (input.ubicacionActualId !== null && input.ubicacionActualId !== "" && !id) {
        return fallo("Elige un área de la lista.");
      }
      cambios.ubicacionActualId = id;
      cambios.ubicacionActualNombre = id ? await nombreDeEstacion(id) : "";
    }

    if (input?.producto !== undefined) {
      const producto = {
        ...limpiarProducto({
          titulo: antes.producto?.titulo ?? "",
          categoria: antes.producto?.categoria ?? "",
          imagen: antes.producto?.imagen ?? "",
          tela: antes.producto?.tela ?? "",
          acabado: antes.producto?.acabado ?? "",
          configuracion: antes.producto?.configuracion ?? "",
          medidas: antes.producto?.medidas ?? "",
          precio: antes.producto?.precio ?? null,
        }),
      };
      for (const [campo, valor] of Object.entries(input.producto)) {
        if (valor === undefined) continue;
        producto[campo] = campo === "precio" ? (valor === null ? null : Number(valor)) : texto(valor);
      }
      if (texto(producto.titulo) === "") return fallo("El mueble necesita un nombre.");
      cambios.producto = producto;
    }

    const despues = await UnidadFabricacionModel.findByIdAndUpdate(
      antes._id,
      { $set: cambios },
      { new: true }
    ).lean();
    if (!despues) return fallo("No encontramos ese mueble.");

    const diff = calcularCambios(antes, cambios, CAMPOS_UNIDAD);

    await registrarAuditoria({
      entidad: "UNIDAD",
      entidadId: String(antes._id),
      entidadNombre: antes.codigo ?? "",
      accion: "EDITAR",
      actor: sesion,
      descripcion: "",
      cambios: diff,
    });

    if (diff.length > 0) {
      await registrarEvento({
        unidadId: antes._id,
        unidadCodigo: antes.codigo ?? "",
        tipo: "EDICION",
        sesion,
        descripcion: `${sesion.nombre} cambió ${diff
          .map((cambio) => cambio.etiqueta.toLowerCase())
          .join(", ")} del mueble ${antes.codigo}`,
        metadata: { cambios: diff },
      });
    }

    revalidarPanel("/unidades");
    revalidarTaller(antes.codigo ?? "");
    return exito(serializarUnidad(despues));
  } catch (error) {
    return manejarError("actualizarUnidad", error, "No pudimos guardar el mueble.");
  }
}

export async function eliminarUnidad(
  codigo: string
): Promise<ActionResult<ResultadoEliminacion>> {
  try {
    const sesion = await requireCapacidad("eliminar_pedidos");
    await connectDB();

    const unidad = await buscarUnidad(codigo);
    if (!unidad) return fallo("No encontramos ese mueble. Revisa el código.");

    const cod = unidad.codigo ?? "";
    const empezado = unidad.estado !== "PENDIENTE" && unidad.estado !== "CANCELADA";

    if (empezado) {
      return fallo(
        `El mueble ${cod} ya empezó a fabricarse. No se puede eliminar: usa «Cancelar mueble» para detenerlo sin perder lo que ya se trabajó.`
      );
    }

    const dependencias = await dependenciasDeUnidad(String(unidad._id));

    await registrarAuditoria({
      entidad: "UNIDAD",
      entidadId: String(unidad._id),
      entidadNombre: cod,
      accion: "ELIMINAR",
      actor: sesion,
      descripcion: "",
      cambios: calcularCambios(unidad, {}, CAMPOS_UNIDAD),
      metadata: { dependencias: dependencias.dependencias, pedido: unidad.pedidoCodigo ?? "" },
    });

    if (permiteBorradoFisico(dependencias)) {
      await EventoUnidadModel.deleteMany({ unidadId: unidad._id });
      await UnidadFabricacionModel.deleteOne({ _id: unidad._id });
      await recalcularPedido(unidad.pedidoId);
      revalidarPanel("/unidades", "/pedidos");
      revalidarTaller(cod);
      return exito<ResultadoEliminacion>({
        modo: "FISICO",
        mensaje: `Se eliminó el mueble ${cod}.`,
      });
    }

    await UnidadFabricacionModel.updateOne(
      { _id: unidad._id },
      { $set: { eliminada: true, eliminadaAt: new Date() } }
    );
    await registrarEvento({
      unidadId: unidad._id,
      unidadCodigo: cod,
      tipo: "ELIMINACION",
      sesion,
      descripcion: `${sesion.nombre} eliminó el mueble ${cod} de los listados`,
    });
    await recalcularPedido(unidad.pedidoId);

    revalidarPanel("/unidades", "/pedidos");
    revalidarTaller(cod);
    return exito<ResultadoEliminacion>({
      modo: "LOGICO",
      mensaje: `El mueble ${cod} salió de los listados, pero su historial se conserva. Puedes recuperarlo desde «Ver eliminados».`,
    });
  } catch (error) {
    return manejarError("eliminarUnidad", error, "No pudimos eliminar el mueble.");
  }
}

export async function restaurarUnidad(codigo: string): Promise<ActionResult<UnidadDTO>> {
  try {
    const sesion = await requireCapacidad("eliminar_pedidos");
    await connectDB();

    const unidad = await buscarUnidad(codigo);
    if (!unidad) return fallo("No encontramos ese mueble.");

    const despues = await UnidadFabricacionModel.findByIdAndUpdate(
      unidad._id,
      { $set: { eliminada: false, eliminadaAt: null } },
      { new: true }
    ).lean();
    if (!despues) return fallo("No encontramos ese mueble.");

    await recalcularPedido(unidad.pedidoId);
    await registrarAuditoria({
      entidad: "UNIDAD",
      entidadId: String(unidad._id),
      entidadNombre: unidad.codigo ?? "",
      accion: "RESTAURAR",
      actor: sesion,
      descripcion: "",
    });

    revalidarPanel("/unidades", "/pedidos");
    revalidarTaller(unidad.codigo ?? "");
    return exito(serializarUnidad(despues));
  } catch (error) {
    return manejarError("restaurarUnidad", error, "No pudimos restaurar el mueble.");
  }
}

export async function cancelarUnidad(
  codigo: string,
  motivo: string
): Promise<ActionResult<UnidadDTO>> {
  try {
    const sesion = await requireCapacidad("cancelar_unidades");
    await connectDB();

    const unidad = await buscarUnidad(codigo);
    if (!unidad) return fallo("No encontramos ese mueble. Revisa el código.");
    if (unidad.estado === "CANCELADA") {
      return fallo(`El mueble ${unidad.codigo} ya estaba cancelado.`);
    }
    if (unidad.estado === "ENTREGADA") {
      return fallo(`El mueble ${unidad.codigo} ya se entregó. No se puede cancelar.`);
    }

    const razon = texto(motivo);
    if (razon === "") {
      return fallo("Escribe por qué se cancela el mueble. Queda anotado en el historial.");
    }

    const despues = await UnidadFabricacionModel.findByIdAndUpdate(
      unidad._id,
      { $set: { estado: "CANCELADA" } },
      { new: true }
    ).lean();
    if (!despues) return fallo("No encontramos ese mueble.");

    await registrarEvento({
      unidadId: unidad._id,
      unidadCodigo: unidad.codigo ?? "",
      tipo: "CANCELACION",
      sesion,
      descripcion: `${sesion.nombre} canceló el mueble ${unidad.codigo}`,
      metadata: { motivo: razon, estadoAnterior: unidad.estado },
    });

    await registrarAuditoria({
      entidad: "UNIDAD",
      entidadId: String(unidad._id),
      entidadNombre: unidad.codigo ?? "",
      accion: "EDITAR",
      actor: sesion,
      descripcion: `${sesion.nombre} canceló el mueble ${unidad.codigo}`,
      cambios: [
        {
          campo: "estado",
          etiqueta: "Estado",
          antes: String(unidad.estado ?? ""),
          despues: "CANCELADA",
        },
      ],
      metadata: { motivo: razon },
    });

    await recalcularPedido(unidad.pedidoId);
    revalidarPanel("/unidades", "/pedidos");
    revalidarTaller(unidad.codigo ?? "");
    return exito(serializarUnidad(despues));
  } catch (error) {
    return manejarError("cancelarUnidad", error, "No pudimos cancelar el mueble.");
  }
}

/** Pone (o quita) responsable. Mantiene el nombre denormalizado en sincronía. */
export async function asignarUnidad(
  codigo: string,
  operarioId: string | null
): Promise<ActionResult<UnidadDTO>> {
  try {
    const sesion = await requireCapacidad("gestionar_unidades");
    await connectDB();

    const unidad = await buscarUnidad(codigo);
    if (!unidad) return fallo("No encontramos ese mueble. Revisa el código.");

    let nombre = "";
    let id: Types.ObjectId | null = null;

    if (operarioId !== null && texto(operarioId) !== "") {
      id = aObjectId(operarioId);
      if (!id) return fallo("Elige a una persona de la lista.");
      const persona = await OperarioModel.findById(id).select("nombre activo eliminado").lean();
      if (!persona) return fallo("No encontramos a esa persona.");
      if (persona.eliminado === true || persona.activo !== true) {
        return fallo(`«${persona.nombre}» no está activa. Elige a otra persona.`);
      }
      nombre = persona.nombre ?? "";
    }

    const despues = await UnidadFabricacionModel.findByIdAndUpdate(
      unidad._id,
      { $set: { asignadoAId: id, asignadoANombre: nombre } },
      { new: true }
    ).lean();
    if (!despues) return fallo("No encontramos ese mueble.");

    await registrarEvento({
      unidadId: unidad._id,
      unidadCodigo: unidad.codigo ?? "",
      tipo: "ASIGNACION",
      sesion,
      descripcion:
        nombre === ""
          ? `${sesion.nombre} dejó el mueble ${unidad.codigo} sin responsable`
          : `${sesion.nombre} le dio el mueble ${unidad.codigo} a ${nombre}`,
      metadata: { antes: unidad.asignadoANombre ?? "", despues: nombre },
    });

    await registrarAuditoria({
      entidad: "UNIDAD",
      entidadId: String(unidad._id),
      entidadNombre: unidad.codigo ?? "",
      accion: "EDITAR",
      actor: sesion,
      descripcion: "",
      cambios: calcularCambios(unidad, { asignadoANombre: nombre }, CAMPOS_UNIDAD),
    });

    revalidarPanel("/unidades");
    revalidarTaller(unidad.codigo ?? "");
    return exito(serializarUnidad(despues));
  } catch (error) {
    return manejarError("asignarUnidad", error, "No pudimos asignar el mueble.");
  }
}

export async function cambiarPrioridad(
  codigo: string,
  prioridad: Prioridad
): Promise<ActionResult<UnidadDTO>> {
  try {
    const sesion = await requireCapacidad("gestionar_unidades");
    await connectDB();

    const unidad = await buscarUnidad(codigo);
    if (!unidad) return fallo("No encontramos ese mueble. Revisa el código.");

    const nueva = opcion<Prioridad>(prioridad, PRIORIDADES);
    if (!nueva) return fallo("Elige una prioridad: Normal, Alta o Urgente.");

    const despues = await UnidadFabricacionModel.findByIdAndUpdate(
      unidad._id,
      { $set: { prioridad: nueva } },
      { new: true }
    ).lean();
    if (!despues) return fallo("No encontramos ese mueble.");

    await registrarEvento({
      unidadId: unidad._id,
      unidadCodigo: unidad.codigo ?? "",
      tipo: "EDICION",
      sesion,
      descripcion: `${sesion.nombre} puso la prioridad ${nueva} al mueble ${unidad.codigo}`,
      metadata: { antes: unidad.prioridad, despues: nueva },
    });

    await registrarAuditoria({
      entidad: "UNIDAD",
      entidadId: String(unidad._id),
      entidadNombre: unidad.codigo ?? "",
      accion: "EDITAR",
      actor: sesion,
      descripcion: "",
      cambios: calcularCambios(unidad, { prioridad: nueva }, CAMPOS_UNIDAD),
    });

    revalidarPanel("/unidades");
    revalidarTaller(unidad.codigo ?? "");
    return exito(serializarUnidad(despues));
  } catch (error) {
    return manejarError("cambiarPrioridad", error, "No pudimos cambiar la prioridad.");
  }
}

export async function cambiarFechaPrometida(
  codigo: string,
  fechaIso: string | null
): Promise<ActionResult<UnidadDTO>> {
  try {
    const sesion = await requireCapacidad("gestionar_unidades");
    await connectDB();

    const unidad = await buscarUnidad(codigo);
    if (!unidad) return fallo("No encontramos ese mueble. Revisa el código.");

    const fecha = fechaDesde(fechaIso);
    if (fechaIso !== null && texto(fechaIso) !== "" && !fecha) {
      return fallo("Esa fecha no se entiende. Elígela en el calendario.");
    }

    const despues = await UnidadFabricacionModel.findByIdAndUpdate(
      unidad._id,
      { $set: { fechaPrometida: fecha } },
      { new: true }
    ).lean();
    if (!despues) return fallo("No encontramos ese mueble.");

    await registrarEvento({
      unidadId: unidad._id,
      unidadCodigo: unidad.codigo ?? "",
      tipo: "EDICION",
      sesion,
      descripcion:
        fecha === null
          ? `${sesion.nombre} quitó la fecha de entrega del mueble ${unidad.codigo}`
          : `${sesion.nombre} cambió la fecha de entrega del mueble ${unidad.codigo}`,
      metadata: { fechaPrometida: fecha ? fecha.toISOString() : null },
    });

    await registrarAuditoria({
      entidad: "UNIDAD",
      entidadId: String(unidad._id),
      entidadNombre: unidad.codigo ?? "",
      accion: "EDITAR",
      actor: sesion,
      descripcion: "",
      cambios: calcularCambios(unidad, { fechaPrometida: fecha }, CAMPOS_UNIDAD),
    });

    revalidarPanel("/unidades");
    revalidarTaller(unidad.codigo ?? "");
    return exito(serializarUnidad(despues));
  } catch (error) {
    return manejarError("cambiarFechaPrometida", error, "No pudimos cambiar la fecha.");
  }
}

export async function pausarUnidad(
  codigo: string,
  motivo: string
): Promise<ActionResult<UnidadDTO>> {
  try {
    const sesion = await requireCapacidad("gestionar_unidades");
    await connectDB();

    const unidad = await buscarUnidad(codigo);
    if (!unidad) return fallo("No encontramos ese mueble. Revisa el código.");
    if (unidad.estado === "PAUSADA") {
      return fallo(`El mueble ${unidad.codigo} ya está en pausa.`);
    }
    if (["TERMINADA", "ENTREGADA", "CANCELADA"].includes(String(unidad.estado))) {
      return fallo(`El mueble ${unidad.codigo} ya no está en fabricación. No se puede pausar.`);
    }

    const razon = texto(motivo);
    if (razon === "") {
      return fallo("Escribe por qué se pausa el mueble, por ejemplo «falta la tela».");
    }

    const despues = await UnidadFabricacionModel.findByIdAndUpdate(
      unidad._id,
      { $set: { estado: "PAUSADA" } },
      { new: true }
    ).lean();
    if (!despues) return fallo("No encontramos ese mueble.");

    await registrarEvento({
      unidadId: unidad._id,
      unidadCodigo: unidad.codigo ?? "",
      tipo: "PAUSA",
      sesion,
      descripcion: `${sesion.nombre} puso en pausa el mueble ${unidad.codigo}: ${razon}`,
      metadata: { motivo: razon, estadoAnterior: unidad.estado },
    });

    await registrarAuditoria({
      entidad: "UNIDAD",
      entidadId: String(unidad._id),
      entidadNombre: unidad.codigo ?? "",
      accion: "EDITAR",
      actor: sesion,
      descripcion: `${sesion.nombre} puso en pausa el mueble ${unidad.codigo}`,
      cambios: calcularCambios(unidad, { estado: "PAUSADA" }, CAMPOS_UNIDAD),
      metadata: { motivo: razon },
    });

    await recalcularPedido(unidad.pedidoId);
    revalidarPanel("/unidades");
    revalidarTaller(unidad.codigo ?? "");
    return exito(serializarUnidad(despues));
  } catch (error) {
    return manejarError("pausarUnidad", error, "No pudimos pausar el mueble.");
  }
}

export async function reanudarUnidad(codigo: string): Promise<ActionResult<UnidadDTO>> {
  try {
    const sesion = await requireCapacidad("gestionar_unidades");
    await connectDB();

    const unidad = await buscarUnidad(codigo);
    if (!unidad) return fallo("No encontramos ese mueble. Revisa el código.");
    if (unidad.estado !== "PAUSADA") {
      return fallo(`El mueble ${unidad.codigo} no está en pausa.`);
    }

    // Se recalcula desde los pasos: el estado real lo dicen ellos, no la pausa.
    const pasos = pasosComoDTO(unidad);
    const estado = estadoUnidadDesdePasos(pasos, "PENDIENTE");

    const despues = await UnidadFabricacionModel.findByIdAndUpdate(
      unidad._id,
      { $set: { estado } },
      { new: true }
    ).lean();
    if (!despues) return fallo("No encontramos ese mueble.");

    await registrarEvento({
      unidadId: unidad._id,
      unidadCodigo: unidad.codigo ?? "",
      tipo: "REANUDACION",
      sesion,
      descripcion: `${sesion.nombre} reanudó el mueble ${unidad.codigo}`,
      metadata: { estado },
    });

    await registrarAuditoria({
      entidad: "UNIDAD",
      entidadId: String(unidad._id),
      entidadNombre: unidad.codigo ?? "",
      accion: "EDITAR",
      actor: sesion,
      descripcion: `${sesion.nombre} reanudó el mueble ${unidad.codigo}`,
      cambios: calcularCambios(unidad, { estado }, CAMPOS_UNIDAD),
    });

    await recalcularPedido(unidad.pedidoId);
    revalidarPanel("/unidades");
    revalidarTaller(unidad.codigo ?? "");
    return exito(serializarUnidad(despues));
  } catch (error) {
    return manejarError("reanudarUnidad", error, "No pudimos reanudar el mueble.");
  }
}

/** Una nota suelta en la ficha del mueble. Va a la bitácora, no pisa nada. */
export async function agregarNota(
  codigo: string,
  nota: string
): Promise<ActionResult<UnidadDTO>> {
  try {
    // `trabajar` y no `ver_tablero`: la nota se escribe desde el móvil del
    // taller, y quien está en el banco de trabajo no entra al tablero.
    const sesion = await requireCapacidad("trabajar");
    await connectDB();

    const unidad = await buscarUnidad(codigo);
    if (!unidad) return fallo("No encontramos ese mueble. Revisa el código.");

    const contenido = texto(nota);
    if (contenido === "") return fallo("Escribe la nota antes de guardarla.");

    await registrarEvento({
      unidadId: unidad._id,
      unidadCodigo: unidad.codigo ?? "",
      tipo: "NOTA",
      sesion,
      descripcion: `${sesion.nombre} anotó: ${contenido}`,
      metadata: { nota: contenido },
    });

    // La nota sale en la bitácora de la ficha del panel, así que también se
    // revalida ahí: si no, el supervisor no la vería hasta recargar a mano.
    revalidarPanel("/unidades");
    revalidarTaller(unidad.codigo ?? "");
    return exito(serializarUnidad(unidad));
  } catch (error) {
    return manejarError("agregarNota", error, "No pudimos guardar la nota.");
  }
}

/**
 * Cambia la ruta de un mueble. **Sólo si todavía no ha empezado**: cambiarla a
 * medias tiraría el trabajo ya hecho y dejaría el historial sin sentido.
 */
export async function cambiarRutaDeUnidad(
  codigo: string,
  rutaId: string,
  motivo: string
): Promise<ActionResult<UnidadDTO>> {
  try {
    const sesion = await requireCapacidad("gestionar_unidades");
    await connectDB();

    const unidad = await buscarUnidad(codigo);
    if (!unidad) return fallo("No encontramos ese mueble. Revisa el código.");

    const yaEmpezo =
      unidad.estado !== "PENDIENTE" ||
      (unidad.pasos ?? []).some(
        (paso) => paso.estado !== "BLOQUEADO" && paso.estado !== "LISTO"
      );
    if (yaEmpezo) {
      return fallo(
        `El mueble ${unidad.codigo} ya empezó a fabricarse. No se le puede cambiar la ruta sin perder lo trabajado.`
      );
    }

    const razon = texto(motivo);
    if (razon === "") {
      return fallo("Escribe por qué se cambia la ruta. Queda anotado en el historial.");
    }

    const id = aObjectId(rutaId);
    if (!id) return fallo("Elige una ruta de la lista.");
    const ruta = await RutaFabricacionModel.findById(id).lean();
    if (!ruta) return fallo("No encontramos esa ruta.");
    if ((ruta.pasos ?? []).length === 0) {
      return fallo(`La ruta «${ruta.nombre}» no tiene pasos. Añádele pasos antes de usarla.`);
    }

    const pasos = congelarPasosDeRuta(ruta);
    const primeroConArea = pasos.find((paso) => paso.estacionId);
    const ubicacionActualId = primeroConArea?.estacionId ?? null;

    const despues = await UnidadFabricacionModel.findByIdAndUpdate(
      unidad._id,
      {
        $set: {
          rutaId: ruta._id,
          rutaNombre: ruta.nombre ?? "",
          rutaVersion: ruta.version ?? 1,
          pasos,
          pasoActualIndex: 0,
          progreso: 0,
          estado: "PENDIENTE",
          ubicacionActualId,
          ubicacionActualNombre: ubicacionActualId
            ? await nombreDeEstacion(ubicacionActualId)
            : "",
        },
      },
      { new: true }
    ).lean();
    if (!despues) return fallo("No encontramos ese mueble.");

    await registrarEvento({
      unidadId: unidad._id,
      unidadCodigo: unidad.codigo ?? "",
      tipo: "EDICION",
      sesion,
      descripcion: `${sesion.nombre} cambió la ruta del mueble ${unidad.codigo} de «${unidad.rutaNombre}» a «${ruta.nombre}»`,
      metadata: { motivo: razon, rutaAnterior: unidad.rutaNombre ?? "" },
    });

    await registrarAuditoria({
      entidad: "UNIDAD",
      entidadId: String(unidad._id),
      entidadNombre: unidad.codigo ?? "",
      accion: "EDITAR",
      actor: sesion,
      descripcion: "",
      cambios: calcularCambios(unidad, { rutaNombre: ruta.nombre ?? "" }, CAMPOS_UNIDAD),
      metadata: { motivo: razon },
    });

    revalidarPanel("/unidades");
    revalidarTaller(unidad.codigo ?? "");
    return exito(serializarUnidad(despues));
  } catch (error) {
    return manejarError("cambiarRutaDeUnidad", error, "No pudimos cambiar la ruta del mueble.");
  }
}

/* ════════════════════════════════════════════════════════════════════════════
 * PASOS DE TALLER  —  lo que toca el operario desde el móvil
 *   iniciar/completar/omitir: `trabajar` · deshacer: `revertir_pasos`
 *   escanear: `escanear`      · entregar: `gestionar_unidades`
 *
 * Todas estas actions escriben con condición dentro de la propia escritura
 * (ver `actualizarPasoCondicional`), así dos móviles a la vez no se pisan.
 * ════════════════════════════════════════════════════════════════════════════ */

/** El paso concreto del mueble, ya como DTO, o `null`. */
function pasoDeUnidad(unidad: UnidadLean, clave: string): PasoUnidadDTO | null {
  return pasosComoDTO(unidad).find((paso) => paso.clave === clave) ?? null;
}

export async function iniciarPaso(
  codigo: string,
  clavePaso: string
): Promise<ActionResult<UnidadDTO>> {
  try {
    const sesion = await requireCapacidad("trabajar");
    await connectDB();

    const unidad = await buscarUnidad(codigo);
    if (!unidad) return fallo("No encontramos ese mueble. Revisa el código.");
    if (unidad.eliminada === true) return fallo("Este mueble ya no está en fabricación.");

    const clave = texto(clavePaso).toLowerCase();
    if (clave === "") return fallo(MENSAJES.pasoNoExiste);

    if (unidad.estado === "PAUSADA") {
      return fallo("Este mueble está en pausa. Avisa a tu supervisor para reanudarlo.");
    }
    if (unidad.estado === "CANCELADA") return fallo("Este mueble está cancelado.");
    if (unidad.estado === "ENTREGADA") {
      // Ya salió hacia el cliente: nadie vuelve a trabajar sobre él sin más.
      return fallo(
        `El mueble ${unidad.codigo} ya se entregó al cliente. Si hay que volver a tocarlo, avisa de un problema.`
      );
    }

    // Un problema sin resolver frena el mueble entero.
    if (await tieneIncidenciaAbierta(unidad._id)) {
      return fallo(MENSAJES.incidenciaAbierta);
    }

    const regla = puedeIniciarPaso(
      pasosComoDTO(unidad),
      clave,
      sesion,
      await nombresDeRoles()
    );
    if (!regla.ok) return fallo(regla.motivo ?? MENSAJES.pasoNoEmpezado);

    const paso = pasoDeUnidad(unidad, clave);

    const actualizada = await actualizarPasoCondicional({
      codigo: unidad.codigo ?? "",
      clave,
      estadosEsperados: ["LISTO"],
      cambios: {
        estado: "EN_CURSO",
        iniciadoAt: new Date(),
        iniciadoPorId: sesion.uid,
        iniciadoPorNombre: sesion.nombre,
      },
    });

    // El perdedor de la carrera: otra persona lo empezó en el mismo segundo.
    if (!actualizada) {
      return fallo("Este paso ya lo empezó otra persona. Actualiza la pantalla.");
    }

    await sincronizarUnidad(actualizada);

    const estacionId = paso?.estacionId ?? null;
    await registrarEvento({
      unidadId: unidad._id,
      unidadCodigo: unidad.codigo ?? "",
      tipo: "PASO_INICIADO",
      sesion,
      pasoClave: clave,
      pasoNombre: paso?.nombre ?? "",
      descripcion: `${sesion.nombre} inició «${paso?.nombre ?? clave}»`,
      estacionId,
      estacionNombre: paso?.estacionNombre ?? "",
    });

    await recalcularPedido(unidad.pedidoId);
    revalidarPanel("/unidades");
    revalidarTaller(unidad.codigo ?? "");

    return respuestaConUnidad(unidad.codigo ?? "");
  } catch (error) {
    return manejarError("iniciarPaso", error, "No pudimos empezar el paso. Vuelve a intentarlo.");
  }
}

/**
 * Da un paso por terminado.
 *
 * ── CONCURRENCIA ────────────────────────────────────────────────────────────
 * Dos operarios pueden pulsar "SÍ, YA TERMINÉ ESTE PASO" a la vez. La escritura
 * lleva la condición dentro (`$elemMatch` sobre `{clave, estado:"EN_CURSO"}` +
 * `$set` posicional `pasos.$.`), así que MongoDB deja pasar EXACTAMENTE UNA de
 * las dos: la otra recibe `null` y se le contesta "Este paso ya lo terminó otra
 * persona.".
 *
 * Después se relee y se recalculan bloqueos, progreso, paso actual, estado del
 * mueble y ubicación; ese segundo guardado toca SÓLO los campos calculados y
 * el `estado` de los pasos que cambiaron, nunca la evidencia de otro paso.
 * ──────────────────────────────────────────────────────────────────────────── */
export async function completarPaso(
  codigo: string,
  clavePaso: string,
  evidencia: EvidenciaPaso
): Promise<ActionResult<UnidadDTO>> {
  try {
    const sesion = await requireCapacidad("trabajar");
    await connectDB();

    const unidad = await buscarUnidad(codigo);
    if (!unidad) return fallo("No encontramos ese mueble. Revisa el código.");
    if (unidad.eliminada === true) return fallo("Este mueble ya no está en fabricación.");

    const clave = texto(clavePaso).toLowerCase();
    if (clave === "") return fallo(MENSAJES.pasoNoExiste);

    if (unidad.estado === "PAUSADA") {
      return fallo("Este mueble está en pausa. Avisa a tu supervisor para reanudarlo.");
    }
    if (unidad.estado === "CANCELADA") return fallo("Este mueble está cancelado.");
    if (unidad.estado === "ENTREGADA") {
      // Ya salió hacia el cliente: nadie vuelve a trabajar sobre él sin más.
      return fallo(
        `El mueble ${unidad.codigo} ya se entregó al cliente. Si hay que volver a tocarlo, avisa de un problema.`
      );
    }

    if (await tieneIncidenciaAbierta(unidad._id)) {
      return fallo(MENSAJES.incidenciaAbierta);
    }

    const paso = pasoDeUnidad(unidad, clave);
    const pruebas: EvidenciaPaso = {
      fotos: Array.isArray(evidencia?.fotos) ? evidencia.fotos.filter((f) => texto(f) !== "") : [],
      nota: texto(evidencia?.nota),
      firmaUrl: texto(evidencia?.firmaUrl),
      checklistRespuestas: Array.isArray(evidencia?.checklistRespuestas)
        ? evidencia.checklistRespuestas.map((respuesta) => ({
            texto: texto(respuesta?.texto),
            ok: respuesta?.ok === true,
          }))
        : [],
      escaneoValidado: evidencia?.escaneoValidado === true,
    };

    const regla = puedeCompletarPaso(paso, pruebas, sesion, await nombresDeRoles());
    if (!regla.ok) return fallo(regla.motivo ?? "Falta algo para terminar este paso.");

    const ahora = new Date();
    const inicio = paso?.iniciadoAt ? new Date(paso.iniciadoAt).getTime() : 0;
    const duracionMs = inicio > 0 ? Math.max(0, ahora.getTime() - inicio) : 0;

    const actualizada = await actualizarPasoCondicional({
      codigo: unidad.codigo ?? "",
      clave,
      estadosEsperados: ["EN_CURSO"],
      cambios: {
        estado: "COMPLETADO",
        completadoAt: ahora,
        completadoPorId: sesion.uid,
        completadoPorNombre: sesion.nombre,
        fotos: pruebas.fotos,
        nota: pruebas.nota ?? "",
        firmaUrl: pruebas.firmaUrl ?? "",
        checklistRespuestas: pruebas.checklistRespuestas,
        duracionMs,
        ...(pruebas.escaneoValidado && !paso?.escaneadoAt
          ? { escaneadoAt: ahora, escaneadoPorId: sesion.uid }
          : {}),
      },
    });

    if (!actualizada) return fallo(MENSAJES.pasoYaTerminado);

    const sincronizada = await sincronizarUnidad(actualizada);

    await registrarEvento({
      unidadId: unidad._id,
      unidadCodigo: unidad.codigo ?? "",
      tipo: "PASO_COMPLETADO",
      sesion,
      pasoClave: clave,
      pasoNombre: paso?.nombre ?? "",
      descripcion: `${sesion.nombre} terminó «${paso?.nombre ?? clave}»`,
      fotos: pruebas.fotos,
      estacionId: paso?.estacionId ?? null,
      estacionNombre: paso?.estacionNombre ?? "",
      metadata: {
        duracionMs,
        nota: pruebas.nota ?? "",
        progreso: sincronizada.progreso,
      },
    });

    if (sincronizada.estadoNuevo === "TERMINADA" && sincronizada.estadoAnterior !== "TERMINADA") {
      await registrarEvento({
        unidadId: unidad._id,
        unidadCodigo: unidad.codigo ?? "",
        tipo: "EDICION",
        sesion,
        descripcion: `El mueble ${unidad.codigo} quedó TERMINADO`,
        metadata: { progreso: 100 },
      });
    }

    // Recuenta el pedido y lo cierra solo cuando ya están todos sus muebles.
    await recalcularPedido(unidad.pedidoId);

    revalidarPanel("/unidades", "/pedidos");
    revalidarTaller(unidad.codigo ?? "");

    return respuestaConUnidad(unidad.codigo ?? "");
  } catch (error) {
    return manejarError(
      "completarPaso",
      error,
      "No pudimos terminar el paso. Vuelve a intentarlo."
    );
  }
}

/** Se salta un paso que la ruta permite saltar (por ejemplo, sin pintura). */
export async function omitirPaso(
  codigo: string,
  clavePaso: string,
  motivo: string
): Promise<ActionResult<UnidadDTO>> {
  try {
    const sesion = await requireCapacidad("trabajar");
    await connectDB();

    const unidad = await buscarUnidad(codigo);
    if (!unidad) return fallo("No encontramos ese mueble. Revisa el código.");

    /*
     * Saltar un paso lo cierra igual que terminarlo, así que pasa por las
     * MISMAS guardas que `iniciarPaso` y `completarPaso`: mueble vivo, no en
     * pausa, no cancelado, sin problemas sin resolver y el rol que la ruta
     * exige. Sin esto, cualquiera con «trabajar» podía cerrar el paso del
     * tapicero y sacar el mueble sin forrar.
     */
    if (unidad.eliminada === true) return fallo("Este mueble ya no está en fabricación.");
    if (unidad.estado === "PAUSADA") {
      return fallo("Este mueble está en pausa. Avisa a tu supervisor para reanudarlo.");
    }
    if (unidad.estado === "CANCELADA") return fallo("Este mueble está cancelado.");
    if (unidad.estado === "ENTREGADA") {
      // Ya salió hacia el cliente: nadie vuelve a trabajar sobre él sin más.
      return fallo(
        `El mueble ${unidad.codigo} ya se entregó al cliente. Si hay que volver a tocarlo, avisa de un problema.`
      );
    }

    if (await tieneIncidenciaAbierta(unidad._id)) {
      return fallo(MENSAJES.incidenciaAbierta);
    }

    const clave = texto(clavePaso).toLowerCase();
    const paso = pasoDeUnidad(unidad, clave);
    if (!paso) return fallo(MENSAJES.pasoNoExiste);

    if (!sesion.esAdmin && !rolPuedeHacerPaso(sesion.rolClave, paso)) {
      return fallo(
        `Este paso lo tiene que hacer ${frasePersonasPermitidas(
          paso.rolesPermitidos,
          await nombresDeRoles()
        )}. Avisa a tu supervisor.`
      );
    }

    if (!paso.permiteOmitir) {
      return fallo(
        `El paso «${paso.nombre}» no se puede saltar. Si de verdad hay que saltarlo, avisa a tu supervisor.`
      );
    }
    if (paso.estado === "COMPLETADO") return fallo(MENSAJES.pasoYaTerminado);
    if (paso.estado === "OMITIDO") return fallo(MENSAJES.pasoOmitido);

    const razon = texto(motivo);
    if (razon === "") {
      return fallo("Escribe por qué se salta este paso. Queda anotado en el historial.");
    }

    const actualizada = await actualizarPasoCondicional({
      codigo: unidad.codigo ?? "",
      clave,
      estadosEsperados: ["LISTO", "EN_CURSO"],
      cambios: {
        estado: "OMITIDO",
        motivoOmision: razon,
        completadoAt: new Date(),
        completadoPorId: sesion.uid,
        completadoPorNombre: sesion.nombre,
      },
    });
    if (!actualizada) {
      return fallo("Este paso ya lo cerró otra persona. Actualiza la pantalla.");
    }

    await sincronizarUnidad(actualizada);

    await registrarEvento({
      unidadId: unidad._id,
      unidadCodigo: unidad.codigo ?? "",
      tipo: "PASO_OMITIDO",
      sesion,
      pasoClave: clave,
      pasoNombre: paso.nombre,
      descripcion: `${sesion.nombre} saltó «${paso.nombre}»: ${razon}`,
      metadata: { motivo: razon },
    });

    await recalcularPedido(unidad.pedidoId);
    revalidarPanel("/unidades");
    revalidarTaller(unidad.codigo ?? "");

    return respuestaConUnidad(unidad.codigo ?? "");
  } catch (error) {
    return manejarError("omitirPaso", error, "No pudimos saltar el paso.");
  }
}

/**
 * Deshace un paso ya cerrado (se equivocaron de mueble, hay que rehacerlo).
 *
 * La evidencia (fotos, nota, firma) NO se borra: se conserva para que quede
 * constancia de lo que se había subido. Sólo se reabre el paso.
 */
export async function revertirPaso(
  codigo: string,
  clavePaso: string,
  motivo: string
): Promise<ActionResult<UnidadDTO>> {
  try {
    const sesion = await requireCapacidad("revertir_pasos");
    await connectDB();

    const unidad = await buscarUnidad(codigo);
    if (!unidad) return fallo("No encontramos ese mueble. Revisa el código.");

    // Un mueble cerrado no se reabre por la puerta de atrás: si ya salió hacia
    // el cliente o se canceló, deshacer un paso dejaría el mueble «entregado»
    // con trabajo a medias y a cualquiera trabajando sobre él.
    if (unidad.eliminada === true) {
      return fallo(
        `El mueble ${unidad.codigo} está eliminado. Restáuralo desde «Ver eliminados» antes de tocar sus pasos.`
      );
    }
    if (unidad.estado === "ENTREGADA") {
      return fallo(
        `El mueble ${unidad.codigo} ya se entregó al cliente. No se puede deshacer un paso: crea un aviso de problema para dejar constancia de lo que hay que rehacer.`
      );
    }
    if (unidad.estado === "CANCELADA") {
      return fallo(
        `El mueble ${unidad.codigo} está cancelado. No se puede deshacer un paso de un mueble cancelado.`
      );
    }

    const clave = texto(clavePaso).toLowerCase();
    const paso = pasoDeUnidad(unidad, clave);
    if (!paso) return fallo(MENSAJES.pasoNoExiste);
    if (paso.estado !== "COMPLETADO" && paso.estado !== "OMITIDO") {
      return fallo(`El paso «${paso.nombre}» no está terminado, así que no hay nada que deshacer.`);
    }

    const razon = texto(motivo);
    if (razon === "") {
      return fallo("Escribe por qué se deshace el paso. Queda anotado en el historial.");
    }

    const actualizada = await actualizarPasoCondicional({
      codigo: unidad.codigo ?? "",
      clave,
      estadosEsperados: ["COMPLETADO", "OMITIDO"],
      cambios: {
        estado: "LISTO",
        // Queda como si no se hubiera empezado: quien lo rehaga vuelve a
        // firmarlo con su nombre. Quién lo había hecho antes se conserva en
        // el evento REVERSION que se escribe justo debajo.
        iniciadoAt: null,
        iniciadoPorId: "",
        iniciadoPorNombre: "",
        completadoAt: null,
        completadoPorId: "",
        completadoPorNombre: "",
        duracionMs: 0,
        motivoOmision: "",
      },
    });
    if (!actualizada) {
      return fallo("Ese paso cambió mientras tanto. Actualiza la pantalla y vuelve a mirar.");
    }

    await sincronizarUnidad(actualizada);

    await registrarEvento({
      unidadId: unidad._id,
      unidadCodigo: unidad.codigo ?? "",
      tipo: "REVERSION",
      sesion,
      pasoClave: clave,
      pasoNombre: paso.nombre,
      descripcion: `${sesion.nombre} deshizo «${paso.nombre}»: ${razon}`,
      metadata: {
        motivo: razon,
        estadoAnterior: paso.estado,
        loHabiaTerminado: paso.completadoPorNombre,
      },
    });

    await registrarAuditoria({
      entidad: "UNIDAD",
      entidadId: String(unidad._id),
      entidadNombre: unidad.codigo ?? "",
      accion: "EDITAR",
      actor: sesion,
      descripcion: `${sesion.nombre} deshizo el paso «${paso.nombre}» del mueble ${unidad.codigo}`,
      cambios: [
        {
          campo: `pasos.${clave}.estado`,
          etiqueta: `Paso «${paso.nombre}»`,
          antes: paso.estado,
          despues: "LISTO",
        },
      ],
      metadata: { motivo: razon },
    });

    await recalcularPedido(unidad.pedidoId);
    revalidarPanel("/unidades", "/pedidos");
    revalidarTaller(unidad.codigo ?? "");

    return respuestaConUnidad(unidad.codigo ?? "");
  } catch (error) {
    return manejarError("revertirPaso", error, "No pudimos deshacer el paso.");
  }
}

/**
 * Registra que alguien leyó el código del mueble con la cámara.
 *
 * SIN TOKEN (§1): basta con que el mueble exista y con tener la sesión abierta.
 * Es lo que habilita `escaneoValidado` en los pasos con `requiereEscaneo`
 * (recibir en el almacén, entregar en la tienda...).
 *
 * Si no se dice qué paso, se sella el paso accionable (el que está en curso o
 * el siguiente que está listo).
 */
export async function registrarEscaneo(
  codigo: string,
  clavePaso?: string
): Promise<ActionResult<UnidadDTO>> {
  try {
    const sesion = await requireCapacidad("escanear");
    await connectDB();

    const unidad = await buscarUnidad(codigo);
    if (!unidad) {
      return fallo("No encontramos ningún mueble con ese código. Revísalo o escríbelo a mano.");
    }
    if (unidad.eliminada === true) return fallo("Este mueble ya no está en fabricación.");

    const pasos = pasosComoDTO(unidad);
    const pedida = texto(clavePaso).toLowerCase();
    const objetivo =
      pedida !== ""
        ? (pasos.find((paso) => paso.clave === pedida) ?? null)
        : (pasos.find((paso) => paso.estado === "EN_CURSO") ??
          pasos.find((paso) => paso.estado === "LISTO") ??
          null);

    const ahora = new Date();

    if (objetivo) {
      const indice = pasos.findIndex((paso) => paso.clave === objetivo.clave);
      const set: Record<string, unknown> = {
        [`pasos.${indice}.escaneadoAt`]: ahora,
        [`pasos.${indice}.escaneadoPorId`]: sesion.uid,
      };
      // Escanear en un área también dice dónde está el mueble ahora.
      if (objetivo.estacionId) {
        set.ubicacionActualId = new Types.ObjectId(objetivo.estacionId);
        set.ubicacionActualNombre = await nombreDeEstacion(objetivo.estacionId);
      }
      await UnidadFabricacionModel.updateOne({ _id: unidad._id }, { $set: set });
    }

    await registrarEvento({
      unidadId: unidad._id,
      unidadCodigo: unidad.codigo ?? "",
      tipo: "ESCANEO",
      sesion,
      pasoClave: objetivo?.clave ?? "",
      pasoNombre: objetivo?.nombre ?? "",
      descripcion:
        objetivo === null
          ? `${sesion.nombre} escaneó el mueble ${unidad.codigo}`
          : `${sesion.nombre} escaneó el mueble ${unidad.codigo} en «${objetivo.nombre}»`,
      estacionId: objetivo?.estacionId ?? null,
      estacionNombre: objetivo?.estacionNombre ?? "",
    });

    revalidarTaller(unidad.codigo ?? "");
    return respuestaConUnidad(unidad.codigo ?? "");
  } catch (error) {
    return manejarError("registrarEscaneo", error, "No pudimos registrar el escaneo.");
  }
}

/** Cierra el círculo: el mueble llegó a casa del cliente. */
export async function marcarEntregada(
  codigo: string,
  firmaUrl?: string,
  nota?: string
): Promise<ActionResult<UnidadDTO>> {
  try {
    const sesion = await requireCapacidad("gestionar_unidades");
    await connectDB();

    const unidad = await buscarUnidad(codigo);
    if (!unidad) return fallo("No encontramos ese mueble. Revisa el código.");
    if (unidad.estado === "ENTREGADA") {
      return fallo(`El mueble ${unidad.codigo} ya figura como entregado.`);
    }
    if (unidad.estado === "CANCELADA") return fallo("Este mueble está cancelado.");
    if (unidad.estado !== "TERMINADA") {
      return fallo(
        `El mueble ${unidad.codigo} todavía no está terminado. Termina sus pasos antes de darlo por entregado.`
      );
    }

    const ahora = new Date();
    const despues = await UnidadFabricacionModel.findByIdAndUpdate(
      unidad._id,
      { $set: { estado: "ENTREGADA", entregadoAt: ahora } },
      { new: true }
    ).lean();
    if (!despues) return fallo("No encontramos ese mueble.");

    await registrarEvento({
      unidadId: unidad._id,
      unidadCodigo: unidad.codigo ?? "",
      tipo: "ENTREGA",
      sesion,
      descripcion: `${sesion.nombre} entregó el mueble ${unidad.codigo} a ${unidad.clienteNombre}`,
      metadata: { firmaUrl: texto(firmaUrl), nota: texto(nota) },
    });

    await registrarAuditoria({
      entidad: "UNIDAD",
      entidadId: String(unidad._id),
      entidadNombre: unidad.codigo ?? "",
      accion: "EDITAR",
      actor: sesion,
      descripcion: `${sesion.nombre} dio por entregado el mueble ${unidad.codigo}`,
      cambios: calcularCambios(unidad, { estado: "ENTREGADA" }, CAMPOS_UNIDAD),
    });

    await recalcularPedido(unidad.pedidoId);
    revalidarPanel("/unidades", "/pedidos");
    revalidarTaller(unidad.codigo ?? "");
    return exito(serializarUnidad(despues));
  } catch (error) {
    return manejarError("marcarEntregada", error, "No pudimos marcar la entrega.");
  }
}

/* ════════════════════════════════════════════════════════════════════════════
 * PROBLEMAS (INCIDENCIAS)
 *   avisar: `reportar_incidencias` · resolver/editar/eliminar: `resolver_incidencias`
 *
 * Mientras haya un problema ABIERTO en un mueble, `iniciarPaso` y
 * `completarPaso` se niegan con "Hay un problema reportado sin resolver.
 * Avisa a tu supervisor.". Al resolverlo, el paso vuelve a su estado anterior
 * y todo se recalcula.
 *
 * `Incidencia` no tiene borrado lógico: se resuelve. El borrado físico existe
 * sólo para el aviso hecho por equivocación, y queda auditado antes de borrar.
 * ════════════════════════════════════════════════════════════════════════════ */

/**
 * A qué estado vuelve un paso cuando se cierra su problema. Se deduce de sus
 * propias marcas, así no hace falta guardar el estado anterior en ningún
 * sitio: si se había saltado, vuelve a OMITIDO; si ya se había terminado, a
 * COMPLETADO; si estaba empezado, a EN_CURSO; si no, a LISTO (y
 * `recalcularEstados` afina el resto).
 *
 * El motivo de la omisión se mira PRIMERO y a propósito: `omitirPaso` deja
 * también `completadoAt` puesto para dejar el paso cerrado, así que mirar sólo
 * las fechas haría resucitar como COMPLETADO un paso que en realidad no hizo
 * nadie. Eso borraría trabajo real del historial del mueble.
 */
function estadoPrevioDelPaso(paso: PasoUnidadDTO): EstadoPaso {
  if (paso.motivoOmision.trim() !== "") return "OMITIDO";
  if (paso.completadoAt) return "COMPLETADO";
  if (paso.iniciadoAt) return "EN_CURSO";
  return "LISTO";
}

/** Escribe el estado de un paso por índice, sin tocar los demás. */
async function fijarEstadoDePaso(
  unidad: UnidadLean,
  clave: string,
  estado: EstadoPaso
): Promise<void> {
  const indice = (unidad.pasos ?? []).findIndex((paso) => paso.clave === clave);
  if (indice < 0) return;
  await UnidadFabricacionModel.updateOne(
    { _id: unidad._id },
    { $set: { [`pasos.${indice}.estado`]: estado } }
  );
}

export async function reportarIncidencia(
  codigo: string,
  input: IncidenciaInput
): Promise<ActionResult<IncidenciaDTO>> {
  try {
    const sesion = await requireCapacidad("reportar_incidencias");
    await connectDB();

    const unidad = await buscarUnidad(codigo);
    if (!unidad) return fallo("No encontramos ese mueble. Revisa el código.");

    const motivo = texto(input?.motivo);
    if (motivo === "") {
      return fallo("Escribe en pocas palabras qué pasó, por ejemplo «la tela vino manchada».");
    }

    const clave = texto(input?.pasoClave).toLowerCase();
    const paso = clave === "" ? null : pasoDeUnidad(unidad, clave);

    const doc = await IncidenciaModel.create({
      unidadId: unidad._id,
      unidadCodigo: unidad.codigo ?? "",
      pasoClave: paso?.clave ?? "",
      pasoNombre: paso?.nombre ?? "",
      motivo,
      descripcion: texto(input?.descripcion),
      severidad: opcion<Severidad>(input?.severidad, SEVERIDADES) ?? "MEDIA",
      fotos: Array.isArray(input?.fotos) ? input.fotos.filter((f) => texto(f) !== "") : [],
      reportadaPorId: sesion.uid,
      reportadaPorNombre: sesion.nombre,
      estado: "ABIERTA",
    });

    // El paso concreto queda marcado; si no se dijo cuál, se marca el que va.
    const claveMarcar =
      paso?.clave ??
      pasosComoDTO(unidad).find((p) => p.estado === "EN_CURSO")?.clave ??
      pasosComoDTO(unidad).find((p) => p.estado === "LISTO")?.clave ??
      "";
    if (claveMarcar !== "") {
      await fijarEstadoDePaso(unidad, claveMarcar, "INCIDENCIA");
    }

    const recargada = await UnidadFabricacionModel.findById(unidad._id).lean();
    if (recargada) await sincronizarUnidad(recargada);

    await registrarEvento({
      unidadId: unidad._id,
      unidadCodigo: unidad.codigo ?? "",
      tipo: "INCIDENCIA",
      sesion,
      pasoClave: claveMarcar,
      pasoNombre: paso?.nombre ?? "",
      descripcion: `${sesion.nombre} avisó de un problema en el mueble ${unidad.codigo}: ${motivo}`,
      fotos: Array.isArray(input?.fotos) ? input.fotos : [],
      metadata: { severidad: doc.severidad, incidenciaId: String(doc._id) },
    });

    await registrarAuditoria({
      entidad: "INCIDENCIA",
      entidadId: String(doc._id),
      entidadNombre: motivo,
      accion: "CREAR",
      actor: sesion,
      descripcion: `${sesion.nombre} avisó de un problema en el mueble ${unidad.codigo}: ${motivo}`,
      metadata: { unidad: unidad.codigo ?? "", paso: claveMarcar },
    });

    await recalcularPedido(unidad.pedidoId);
    revalidarPanel("/incidencias", "/unidades");
    revalidarTaller(unidad.codigo ?? "");
    return exito(serializarIncidencia(doc.toObject()));
  } catch (error) {
    return manejarError("reportarIncidencia", error, "No pudimos guardar el aviso.");
  }
}

export async function actualizarIncidencia(
  id: string,
  input: IncidenciaInput
): Promise<ActionResult<IncidenciaDTO>> {
  try {
    const sesion = await requireCapacidad("resolver_incidencias");
    await connectDB();

    if (!esIdValido(id)) return fallo("No encontramos ese problema.");
    const antes = await IncidenciaModel.findById(id).lean();
    if (!antes) return fallo("No encontramos ese problema. Puede que ya lo hayan eliminado.");

    const cambios: Record<string, unknown> = {};
    if (input?.motivo !== undefined) {
      const motivo = texto(input.motivo);
      if (motivo === "") return fallo("El problema necesita un motivo.");
      cambios.motivo = motivo;
    }
    if (input?.descripcion !== undefined) cambios.descripcion = texto(input.descripcion);
    if (input?.severidad !== undefined) {
      const severidad = opcion<Severidad>(input.severidad, SEVERIDADES);
      if (!severidad) return fallo("Elige la gravedad: baja, media o alta.");
      cambios.severidad = severidad;
    }
    if (input?.fotos !== undefined) {
      cambios.fotos = Array.isArray(input.fotos)
        ? input.fotos.filter((foto) => texto(foto) !== "")
        : [];
    }

    const despues = await IncidenciaModel.findByIdAndUpdate(
      antes._id,
      { $set: cambios },
      { new: true }
    ).lean();
    if (!despues) return fallo("No encontramos ese problema.");

    await registrarAuditoria({
      entidad: "INCIDENCIA",
      entidadId: String(antes._id),
      entidadNombre: despues.motivo ?? "",
      accion: "EDITAR",
      actor: sesion,
      descripcion: "",
      cambios: calcularCambios(antes, cambios, CAMPOS_INCIDENCIA),
      metadata: { unidad: antes.unidadCodigo ?? "" },
    });

    revalidarPanel("/incidencias");
    revalidarTaller(antes.unidadCodigo ?? "");
    return exito(serializarIncidencia(despues));
  } catch (error) {
    return manejarError("actualizarIncidencia", error, "No pudimos guardar el problema.");
  }
}

/**
 * Cierra un problema: el paso vuelve a su estado anterior, el mueble se
 * recalcula y el taller puede seguir.
 */
export async function resolverIncidencia(
  id: string,
  resolucion: string
): Promise<ActionResult<IncidenciaDTO>> {
  try {
    const sesion = await requireCapacidad("resolver_incidencias");
    await connectDB();

    if (!esIdValido(id)) return fallo("No encontramos ese problema.");
    const incidencia = await IncidenciaModel.findById(id).lean();
    if (!incidencia) return fallo("No encontramos ese problema.");
    if (incidencia.estado === "RESUELTA") {
      return fallo("Ese problema ya está resuelto.");
    }

    const explicacion = texto(resolucion);
    if (explicacion === "") {
      return fallo("Escribe cómo se solucionó. Así el taller sabe qué se hizo.");
    }

    const ahora = new Date();
    const despues = await IncidenciaModel.findByIdAndUpdate(
      incidencia._id,
      {
        $set: {
          estado: "RESUELTA",
          resolucion: explicacion,
          resueltaPorId: sesion.uid,
          resueltaPorNombre: sesion.nombre,
          resueltaAt: ahora,
        },
      },
      { new: true }
    ).lean();
    if (!despues) return fallo("No encontramos ese problema.");

    const unidad = await UnidadFabricacionModel.findById(incidencia.unidadId).lean();
    if (unidad) {
      const clave = texto(incidencia.pasoClave).toLowerCase();
      const paso = clave === "" ? null : pasoDeUnidad(unidad, clave);

      // Sólo se devuelve el paso si no quedan más problemas abiertos.
      const siguenAbiertas = await IncidenciaModel.countDocuments({
        unidadId: unidad._id,
        estado: "ABIERTA",
      });

      if (siguenAbiertas === 0) {
        if (paso && paso.estado === "INCIDENCIA") {
          await fijarEstadoDePaso(unidad, clave, estadoPrevioDelPaso(paso));
        } else {
          // Por si el problema se marcó en otro paso: se limpian todos.
          for (const otro of pasosComoDTO(unidad)) {
            if (otro.estado === "INCIDENCIA") {
              await fijarEstadoDePaso(unidad, otro.clave, estadoPrevioDelPaso(otro));
            }
          }
        }
      }

      const recargada = await UnidadFabricacionModel.findById(unidad._id).lean();
      if (recargada) await sincronizarUnidad(recargada);

      await registrarEvento({
        unidadId: unidad._id,
        unidadCodigo: unidad.codigo ?? "",
        tipo: "INCIDENCIA_RESUELTA",
        sesion,
        pasoClave: clave,
        pasoNombre: paso?.nombre ?? "",
        descripcion: `${sesion.nombre} resolvió el problema «${incidencia.motivo}» del mueble ${unidad.codigo}: ${explicacion}`,
        metadata: { incidenciaId: String(incidencia._id), resolucion: explicacion },
      });

      await recalcularPedido(unidad.pedidoId);
      revalidarTaller(unidad.codigo ?? "");
    }

    await registrarAuditoria({
      entidad: "INCIDENCIA",
      entidadId: String(incidencia._id),
      entidadNombre: incidencia.motivo ?? "",
      accion: "EDITAR",
      actor: sesion,
      descripcion: `${sesion.nombre} resolvió el problema «${incidencia.motivo}» del mueble ${incidencia.unidadCodigo}`,
      cambios: calcularCambios(
        incidencia,
        { estado: "RESUELTA", resolucion: explicacion },
        CAMPOS_INCIDENCIA
      ),
    });

    revalidarPanel("/incidencias", "/unidades");
    return exito(serializarIncidencia(despues));
  } catch (error) {
    return manejarError("resolverIncidencia", error, "No pudimos resolver el problema.");
  }
}

/**
 * Borra un aviso hecho por equivocación. Queda anotado en la auditoría ANTES
 * de borrarlo, y si estaba abierto se desbloquea el paso.
 */
export async function eliminarIncidencia(
  id: string
): Promise<ActionResult<ResultadoEliminacion>> {
  try {
    const sesion = await requireCapacidad("resolver_incidencias");
    await connectDB();

    if (!esIdValido(id)) return fallo("No encontramos ese problema.");
    const incidencia = await IncidenciaModel.findById(id).lean();
    if (!incidencia) return fallo("No encontramos ese problema. Puede que ya lo hayan eliminado.");

    await registrarAuditoria({
      entidad: "INCIDENCIA",
      entidadId: String(incidencia._id),
      entidadNombre: incidencia.motivo ?? "",
      accion: "ELIMINAR",
      actor: sesion,
      descripcion: `${sesion.nombre} eliminó el aviso «${incidencia.motivo}» del mueble ${incidencia.unidadCodigo}`,
      cambios: calcularCambios(incidencia, {}, CAMPOS_INCIDENCIA),
      metadata: { unidad: incidencia.unidadCodigo ?? "" },
    });

    await IncidenciaModel.deleteOne({ _id: incidencia._id });

    if (incidencia.estado === "ABIERTA") {
      const unidad = await UnidadFabricacionModel.findById(incidencia.unidadId).lean();
      if (unidad) {
        const siguenAbiertas = await IncidenciaModel.countDocuments({
          unidadId: unidad._id,
          estado: "ABIERTA",
        });
        if (siguenAbiertas === 0) {
          for (const paso of pasosComoDTO(unidad)) {
            if (paso.estado === "INCIDENCIA") {
              await fijarEstadoDePaso(unidad, paso.clave, estadoPrevioDelPaso(paso));
            }
          }
        }
        const recargada = await UnidadFabricacionModel.findById(unidad._id).lean();
        if (recargada) await sincronizarUnidad(recargada);

        await registrarEvento({
          unidadId: unidad._id,
          unidadCodigo: unidad.codigo ?? "",
          tipo: "INCIDENCIA_RESUELTA",
          sesion,
          descripcion: `${sesion.nombre} quitó el aviso «${incidencia.motivo}» del mueble ${unidad.codigo} (se avisó por equivocación)`,
          metadata: { eliminado: true },
        });

        await recalcularPedido(unidad.pedidoId);
        revalidarTaller(unidad.codigo ?? "");
      }
    }

    revalidarPanel("/incidencias", "/unidades");
    return exito<ResultadoEliminacion>({
      modo: "FISICO",
      mensaje: `Se eliminó el aviso «${incidencia.motivo}». El historial del mueble conserva que existió.`,
    });
  } catch (error) {
    return manejarError("eliminarIncidencia", error, "No pudimos eliminar el problema.");
  }
}
