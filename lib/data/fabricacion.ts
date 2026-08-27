/**
 * CAPA DE LECTURA DEL MÓDULO DE FABRICACIÓN (§6 del contrato).
 *
 * Mismo patrón que `lib/data/products.ts`:
 *  · serializadores que convierten documentos de Mongoose en DTO PLANOS
 *    (ids en `string`, fechas en `string` ISO o `null`, nunca `Date`);
 *  · toda lectura envuelta en `try/catch` que DEGRADA a vacío/`null` en vez de
 *    reventar el render: si Mongo no responde, las páginas pintan su estado
 *    vacío amable en lugar de un 500.
 *
 * Reglas de la casa que este archivo cumple:
 *  · `.lean()` siempre, proyecciones para no traer lo que no se pinta.
 *  · CERO N+1: los nombres de roles y de áreas se resuelven con un mapa
 *    construido de una vez, y los contadores (personas por rol, muebles por
 *    ruta, problemas por mueble...) salen de UNA aggregation agrupada.
 *  · `serializarOperario` JAMÁS copia `pinHash` ni `pinSalt`.
 *  · NO existe `getUnidadPorToken`: el QR no lleva token (decisión del dueño).
 *  · `getSeguimientoPublico` empieza preguntando por `seguimientoPublicoActivo()`
 *    y devuelve `null` ANTES de leer un solo dato del cliente.
 *
 * Sobre los PRECIOS: `ProductoSnapshotDTO.precio` sale en `null` para quien no
 * tenga la capacidad `ver_precios`. Las lecturas de muebles aceptan un
 * parámetro `sesion` opcional con este criterio:
 *   · `sesion` presente  → se respeta su capacidad `ver_precios`.
 *   · `sesion` omitida   → se muestra el precio (quien llama es código de
 *     servidor que ya comprobó los permisos: actions, scripts, etiquetas).
 *   · `sesion` en `null` → se oculta el precio.
 */

import { Types, type FilterQuery, type PipelineStage } from "mongoose";

import { connectDB } from "@/lib/mongodb";

import CatalogoPasoModel from "@/lib/models/CatalogoPaso";
import EstacionModel from "@/lib/models/Estacion";
import EventoUnidadModel from "@/lib/models/EventoUnidad";
import IncidenciaModel from "@/lib/models/Incidencia";
import OperarioModel from "@/lib/models/Operario";
import PedidoModel from "@/lib/models/Pedido";
import RegistroAuditoriaModel from "@/lib/models/RegistroAuditoria";
import RolModel from "@/lib/models/Rol";
import RutaFabricacionModel from "@/lib/models/RutaFabricacion";
import UnidadFabricacionModel from "@/lib/models/UnidadFabricacion";

import type { Estacion } from "@/lib/models/Estacion";
import type { Incidencia } from "@/lib/models/Incidencia";
import type { Operario } from "@/lib/models/Operario";
import type { Pedido } from "@/lib/models/Pedido";
import type { RegistroAuditoria } from "@/lib/models/RegistroAuditoria";
import type { CatalogoPaso } from "@/lib/models/CatalogoPaso";
import type { RutaFabricacion } from "@/lib/models/RutaFabricacion";
import type { UnidadFabricacion } from "@/lib/models/UnidadFabricacion";

import { META_ESTADO_UNIDAD, seguimientoPublicoActivo } from "@/lib/fabricacion/constantes";
import { normalizarCodigo } from "@/lib/fabricacion/codigos";
import { filtrarCapacidades, obtenerRoles, tiene } from "@/lib/fabricacion/permisos";
import { indicePasoActual, rolPuedeHacerPaso } from "@/lib/fabricacion/reglas";

import {
  ACCIONES_AUDITORIA,
  CANALES,
  ESTADOS_INCIDENCIA,
  ESTADOS_PASO,
  ESTADOS_PEDIDO,
  ESTADOS_UNIDAD,
  ENTIDADES_AUDITORIA,
  PRIORIDADES,
  SEVERIDADES,
  TIPOS_ESTACION,
  TIPOS_EVENTO,
  TIPOS_PASO,
  type CambioAuditoria,
  type CatalogoPasoDTO,
  type ChecklistItemDTO,
  type ChecklistRespuestaDTO,
  type ClienteDTO,
  type ColumnaKanban,
  type DependenciasEliminacion,
  type EntidadAuditoria,
  type EstacionDTO,
  type EstadoUnidad,
  type EventoDTO,
  type FiltrosAuditoria,
  type FiltrosIncidencias,
  type FiltrosPedidos,
  type FiltrosUnidades,
  type IncidenciaDTO,
  type OperarioDTO,
  type PasoPlantillaDTO,
  type PasoUnidadDTO,
  type PedidoDTO,
  type ProductoSnapshotDTO,
  type RegistroAuditoriaDTO,
  type ResumenFabricacion,
  type RolDTO,
  type RutaDTO,
  type SesionOperario,
  type UnidadDTO,
} from "@/lib/types/fabricacion";

/* ────────────────────────────────────────────────────────────────────────────
 * AYUDAS DE SERIALIZACIÓN
 *
 * Los documentos llegan de `.lean()`, de un `.toObject()` o de una aggregation:
 * formas parecidas pero no idénticas. En vez de esparcir `any` por todo el
 * archivo (el repo lo hace con un `eslint-disable` en `products.ts`), se leen
 * los campos por estas funciones, que aceptan `unknown` y siempre devuelven un
 * valor del tipo que pide el DTO. Cero `any`, cero `undefined` colándose.
 * ──────────────────────────────────────────────────────────────────────────── */

type Doc = Record<string, unknown>;

function comoDoc(valor: unknown): Doc {
  return typeof valor === "object" && valor !== null ? (valor as Doc) : {};
}

/** Texto seguro: nunca `null`, nunca `undefined` (el DTO usa `""`). */
function cadena(valor: unknown, porDefecto = ""): string {
  if (typeof valor === "string") return valor;
  if (typeof valor === "number" && Number.isFinite(valor)) return String(valor);
  if (valor instanceof Date) return valor.toISOString();
  return porDefecto;
}

function numero(valor: unknown, porDefecto = 0): number {
  if (typeof valor === "number" && Number.isFinite(valor)) return valor;
  if (typeof valor === "string" && valor.trim() !== "") {
    const convertido = Number(valor);
    if (Number.isFinite(convertido)) return convertido;
  }
  return porDefecto;
}

function bandera(valor: unknown, porDefecto = false): boolean {
  return typeof valor === "boolean" ? valor : porDefecto;
}

/** ObjectId (o lo que sea) a texto. Cadena vacía cuando no hay nada. */
function idTexto(valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "";
  return String(valor);
}

/** Igual, pero para los campos que el DTO declara `string | null`. */
function idOpcional(valor: unknown): string | null {
  const id = idTexto(valor);
  return id === "" ? null : id;
}

function fechaIso(valor: unknown): string | null {
  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? null : valor.toISOString();
  }
  if (typeof valor === "string" && valor.trim() !== "") {
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString();
  }
  if (typeof valor === "number" && Number.isFinite(valor)) {
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString();
  }
  return null;
}

/** Para `createdAt`/`updatedAt`, que el DTO declara `string` a secas. */
function fechaTexto(valor: unknown): string {
  return fechaIso(valor) ?? "";
}

function listaDeTextos(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  return valor.map((item) => cadena(item)).filter((item) => item !== "");
}

function listaDeIds(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  return valor.map(idTexto).filter((item) => item !== "");
}

function listaDeDocs(valor: unknown): Doc[] {
  return Array.isArray(valor) ? valor.map(comoDoc) : [];
}

/** Encaja un valor suelto dentro de un catálogo cerrado, con red de seguridad. */
function unaDe<T extends string>(
  valor: unknown,
  opciones: readonly T[],
  porDefecto: T
): T {
  const catalogo: readonly string[] = opciones;
  return typeof valor === "string" && catalogo.includes(valor) ? (valor as T) : porDefecto;
}

/** `metadata` sólo viaja si de verdad es un objeto plano. */
function metadatos(valor: unknown): Record<string, unknown> | undefined {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) return undefined;
  if (valor instanceof Date) return undefined;
  return valor as Record<string, unknown>;
}

/* ────────────────────────────────────────────────────────────────────────────
 * SERIALIZADORES
 *
 * Nombres cerrados por contrato: los importa `lib/actions/fabricacion.ts` para
 * devolver el DTO ya listo después de cada mutación. No renombrar.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Nombres ya resueltos, para no consultar dentro de un `.map()`. */
export interface NombresRelacionados {
  /** `Rol.clave` → nombre bonito ("tapicero" → "Tapicero"). */
  roles?: Record<string, string>;
  /** `Estacion._id` → nombre ("Taller principal"). */
  estaciones?: Record<string, string>;
}

export function serializarRol(doc: unknown): RolDTO {
  const d = comoDoc(doc);
  return {
    _id: idTexto(d._id),
    clave: cadena(d.clave),
    nombre: cadena(d.nombre),
    descripcion: cadena(d.descripcion),
    color: cadena(d.color, "#E8511A"),
    icono: cadena(d.icono, "user"),
    capacidades: filtrarCapacidades(d.capacidades),
    esSistema: bandera(d.esSistema),
    activo: bandera(d.activo, true),
    orden: numero(d.orden),
  };
}

/**
 * Persona del equipo. **Nunca copia `pinHash` ni `pinSalt`**: el PIN no sale
 * del servidor ni por accidente.
 */
export function serializarOperario(
  doc: unknown,
  nombres?: NombresRelacionados
): OperarioDTO {
  const d = comoDoc(doc);
  const rolClave = cadena(d.rolClave);
  const estacionesIds = listaDeIds(d.estacionesIds);

  return {
    _id: idTexto(d._id),
    nombre: cadena(d.nombre),
    codigoEmpleado: cadena(d.codigoEmpleado),
    rolClave,
    rolNombre: nombres?.roles?.[rolClave] ?? rolClave,
    estacionesIds,
    estacionesNombres: estacionesIds
      .map((id) => nombres?.estaciones?.[id] ?? "")
      .filter((nombre) => nombre !== ""),
    telefono: cadena(d.telefono),
    colorAvatar: cadena(d.colorAvatar, "#E8511A"),
    fotoUrl: cadena(d.fotoUrl),
    activo: bandera(d.activo, true),
    eliminado: bandera(d.eliminado),
    ultimoAccesoAt: fechaIso(d.ultimoAccesoAt),
    createdAt: fechaTexto(d.createdAt),
  };
}

export function serializarEstacion(doc: unknown): EstacionDTO {
  const d = comoDoc(doc);
  return {
    _id: idTexto(d._id),
    nombre: cadena(d.nombre),
    tipo: unaDe(d.tipo, TIPOS_ESTACION, "TALLER"),
    direccion: cadena(d.direccion),
    telefono: cadena(d.telefono),
    activa: bandera(d.activa, true),
    eliminada: bandera(d.eliminada),
    orden: numero(d.orden),
    createdAt: fechaTexto(d.createdAt),
  };
}

function serializarChecklist(valor: unknown): ChecklistItemDTO[] {
  return listaDeDocs(valor).map((item) => ({
    texto: cadena(item.texto),
    obligatorio: bandera(item.obligatorio, true),
  }));
}

function serializarRespuestas(valor: unknown): ChecklistRespuestaDTO[] {
  return listaDeDocs(valor).map((item) => ({
    texto: cadena(item.texto),
    ok: bandera(item.ok),
  }));
}

/** Un paso tal y como vive dentro de una ruta (sin progreso). */
export function serializarPasoPlantilla(
  doc: unknown,
  nombres?: NombresRelacionados
): PasoPlantillaDTO {
  const d = comoDoc(doc);
  const estacionId = idOpcional(d.estacionId);
  const nombreEstacion = estacionId ? nombres?.estaciones?.[estacionId] : undefined;

  const paso: PasoPlantillaDTO = {
    clave: cadena(d.clave),
    nombre: cadena(d.nombre),
    instrucciones: cadena(d.instrucciones),
    icono: cadena(d.icono, "clipboard-list"),
    color: cadena(d.color, "#E8511A"),
    tipo: unaDe(d.tipo, TIPOS_PASO, "TRABAJO"),
    estacionId,
    rolesPermitidos: listaDeTextos(d.rolesPermitidos),
    requiereFoto: bandera(d.requiereFoto),
    minFotos: numero(d.minFotos, 1),
    requiereEscaneo: bandera(d.requiereEscaneo),
    requiereFirma: bandera(d.requiereFirma),
    requiereNota: bandera(d.requiereNota),
    checklist: serializarChecklist(d.checklist),
    horasEstimadas: numero(d.horasEstimadas),
    permiteParalelo: bandera(d.permiteParalelo),
    permiteOmitir: bandera(d.permiteOmitir),
    notificaCliente: bandera(d.notificaCliente),
  };

  if (nombreEstacion) paso.estacionNombre = nombreEstacion;
  return paso;
}

/** Paso reutilizable del catálogo. */
export function serializarCatalogoPaso(
  doc: unknown,
  nombres?: NombresRelacionados
): CatalogoPasoDTO {
  const d = comoDoc(doc);
  return {
    ...serializarPasoPlantilla(d, nombres),
    _id: idTexto(d._id),
    esSistema: bandera(d.esSistema),
    activo: bandera(d.activo, true),
    orden: numero(d.orden),
    createdAt: fechaTexto(d.createdAt),
  };
}

/** Paso de un mueble concreto: la plantilla congelada + su progreso real. */
export function serializarPasoUnidad(
  doc: unknown,
  nombres?: NombresRelacionados
): PasoUnidadDTO {
  const d = comoDoc(doc);
  return {
    ...serializarPasoPlantilla(d, nombres),
    estado: unaDe(d.estado, ESTADOS_PASO, "BLOQUEADO"),
    iniciadoAt: fechaIso(d.iniciadoAt),
    completadoAt: fechaIso(d.completadoAt),
    iniciadoPorId: idTexto(d.iniciadoPorId),
    iniciadoPorNombre: cadena(d.iniciadoPorNombre),
    completadoPorId: idTexto(d.completadoPorId),
    completadoPorNombre: cadena(d.completadoPorNombre),
    fotos: listaDeTextos(d.fotos),
    nota: cadena(d.nota),
    firmaUrl: cadena(d.firmaUrl),
    checklistRespuestas: serializarRespuestas(d.checklistRespuestas),
    duracionMs: numero(d.duracionMs),
    motivoOmision: cadena(d.motivoOmision),
    escaneadoAt: fechaIso(d.escaneadoAt),
    escaneadoPorId: idTexto(d.escaneadoPorId),
  };
}

export function serializarRuta(doc: unknown, nombres?: NombresRelacionados): RutaDTO {
  const d = comoDoc(doc);
  const pasos = listaDeDocs(d.pasos).map((paso) => serializarPasoPlantilla(paso, nombres));

  return {
    _id: idTexto(d._id),
    nombre: cadena(d.nombre),
    descripcion: cadena(d.descripcion),
    categoriaSugerida: cadena(d.categoriaSugerida),
    version: numero(d.version, 1),
    activa: bandera(d.activa, true),
    archivada: bandera(d.archivada),
    esPredeterminada: bandera(d.esPredeterminada),
    pasos,
    creadaPorId: idTexto(d.creadaPorId),
    creadaPorNombre: cadena(d.creadaPorNombre),
    createdAt: fechaTexto(d.createdAt),
    updatedAt: fechaTexto(d.updatedAt),
    horasEstimadasTotal: Math.round(
      pasos.reduce((total, paso) => total + paso.horasEstimadas, 0) * 100
    ) / 100,
  };
}

function serializarCliente(valor: unknown): ClienteDTO {
  const c = comoDoc(valor);
  return {
    nombre: cadena(c.nombre),
    telefono: cadena(c.telefono),
    cedula: cadena(c.cedula),
    direccion: cadena(c.direccion),
    ciudad: cadena(c.ciudad),
    email: cadena(c.email),
  };
}

export function serializarPedido(doc: unknown): PedidoDTO {
  const d = comoDoc(doc);
  return {
    _id: idTexto(d._id),
    codigo: cadena(d.codigo),
    cliente: serializarCliente(d.cliente),
    canal: unaDe(d.canal, CANALES, "WHATSAPP"),
    prioridad: unaDe(d.prioridad, PRIORIDADES, "NORMAL"),
    fechaPrometida: fechaIso(d.fechaPrometida),
    notas: cadena(d.notas),
    estado: unaDe(d.estado, ESTADOS_PEDIDO, "ABIERTO"),
    creadoPorId: idTexto(d.creadoPorId),
    creadoPorNombre: cadena(d.creadoPorNombre),
    totalUnidades: numero(d.totalUnidades),
    unidadesCompletadas: numero(d.unidadesCompletadas),
    eliminado: bandera(d.eliminado),
    createdAt: fechaTexto(d.createdAt),
    updatedAt: fechaTexto(d.updatedAt),
  };
}

/** Opciones de serialización de un mueble. */
export interface OpcionesUnidad {
  /** `false` deja `producto.precio` en `null` (quien mira no tiene `ver_precios`). */
  verPrecios?: boolean;
  nombres?: NombresRelacionados;
}

function serializarProducto(valor: unknown, verPrecios: boolean): ProductoSnapshotDTO {
  const p = comoDoc(valor);
  const precio = p.precio;
  return {
    titulo: cadena(p.titulo),
    categoria: cadena(p.categoria),
    imagen: cadena(p.imagen),
    tela: cadena(p.tela),
    acabado: cadena(p.acabado),
    configuracion: cadena(p.configuracion),
    medidas: cadena(p.medidas),
    precio: verPrecios && typeof precio === "number" && Number.isFinite(precio) ? precio : null,
  };
}

export function serializarUnidad(doc: unknown, opciones?: OpcionesUnidad): UnidadDTO {
  const d = comoDoc(doc);
  const verPrecios = opciones?.verPrecios ?? true;

  return {
    _id: idTexto(d._id),
    codigo: cadena(d.codigo),
    pedidoId: idTexto(d.pedidoId),
    pedidoCodigo: cadena(d.pedidoCodigo),
    clienteNombre: cadena(d.clienteNombre),
    productoId: idOpcional(d.productoId),
    producto: serializarProducto(d.producto, verPrecios),
    rutaId: idOpcional(d.rutaId),
    rutaNombre: cadena(d.rutaNombre),
    rutaVersion: numero(d.rutaVersion, 1),
    pasos: listaDeDocs(d.pasos).map((paso) => serializarPasoUnidad(paso, opciones?.nombres)),
    estado: unaDe(d.estado, ESTADOS_UNIDAD, "PENDIENTE"),
    pasoActualIndex: numero(d.pasoActualIndex),
    progreso: numero(d.progreso),
    asignadoAId: idOpcional(d.asignadoAId),
    asignadoANombre: cadena(d.asignadoANombre),
    ubicacionActualId: idOpcional(d.ubicacionActualId),
    ubicacionActualNombre: cadena(d.ubicacionActualNombre),
    prioridad: unaDe(d.prioridad, PRIORIDADES, "NORMAL"),
    fechaPrometida: fechaIso(d.fechaPrometida),
    iniciadoAt: fechaIso(d.iniciadoAt),
    terminadoAt: fechaIso(d.terminadoAt),
    entregadoAt: fechaIso(d.entregadoAt),
    notas: cadena(d.notas),
    eliminada: bandera(d.eliminada),
    createdAt: fechaTexto(d.createdAt),
    updatedAt: fechaTexto(d.updatedAt),
  };
}

export function serializarEvento(doc: unknown): EventoDTO {
  const d = comoDoc(doc);
  const evento: EventoDTO = {
    _id: idTexto(d._id),
    unidadId: idTexto(d.unidadId),
    unidadCodigo: cadena(d.unidadCodigo),
    tipo: unaDe(d.tipo, TIPOS_EVENTO, "NOTA"),
    pasoClave: cadena(d.pasoClave),
    pasoNombre: cadena(d.pasoNombre),
    operarioId: idTexto(d.operarioId),
    operarioNombre: cadena(d.operarioNombre),
    operarioRol: cadena(d.operarioRol),
    descripcion: cadena(d.descripcion),
    fotos: listaDeTextos(d.fotos),
    estacionId: idOpcional(d.estacionId),
    estacionNombre: cadena(d.estacionNombre),
    createdAt: fechaTexto(d.createdAt),
  };

  const extra = metadatos(d.metadata);
  if (extra) evento.metadata = extra;
  return evento;
}

export function serializarIncidencia(doc: unknown): IncidenciaDTO {
  const d = comoDoc(doc);
  return {
    _id: idTexto(d._id),
    unidadId: idTexto(d.unidadId),
    unidadCodigo: cadena(d.unidadCodigo),
    pasoClave: cadena(d.pasoClave),
    pasoNombre: cadena(d.pasoNombre),
    motivo: cadena(d.motivo),
    descripcion: cadena(d.descripcion),
    severidad: unaDe(d.severidad, SEVERIDADES, "MEDIA"),
    fotos: listaDeTextos(d.fotos),
    reportadaPorId: idTexto(d.reportadaPorId),
    reportadaPorNombre: cadena(d.reportadaPorNombre),
    estado: unaDe(d.estado, ESTADOS_INCIDENCIA, "ABIERTA"),
    resueltaPorId: idTexto(d.resueltaPorId),
    resueltaPorNombre: cadena(d.resueltaPorNombre),
    resolucion: cadena(d.resolucion),
    resueltaAt: fechaIso(d.resueltaAt),
    createdAt: fechaTexto(d.createdAt),
    updatedAt: fechaTexto(d.updatedAt),
  };
}

function serializarCambios(valor: unknown): CambioAuditoria[] {
  return listaDeDocs(valor).map((cambio) => ({
    campo: cadena(cambio.campo),
    etiqueta: cadena(cambio.etiqueta),
    antes: cadena(cambio.antes),
    despues: cadena(cambio.despues),
  }));
}

export function serializarAuditoria(doc: unknown): RegistroAuditoriaDTO {
  const d = comoDoc(doc);
  const registro: RegistroAuditoriaDTO = {
    _id: idTexto(d._id),
    entidad: unaDe(d.entidad, ENTIDADES_AUDITORIA, "SESION"),
    entidadId: idTexto(d.entidadId),
    entidadNombre: cadena(d.entidadNombre),
    accion: unaDe(d.accion, ACCIONES_AUDITORIA, "EDITAR"),
    actorId: idTexto(d.actorId),
    actorNombre: cadena(d.actorNombre),
    actorRol: cadena(d.actorRol),
    descripcion: cadena(d.descripcion),
    cambios: serializarCambios(d.cambios),
    createdAt: fechaTexto(d.createdAt),
  };

  const extra = metadatos(d.metadata);
  if (extra) registro.metadata = extra;
  return registro;
}

/* ────────────────────────────────────────────────────────────────────────────
 * UTILIDADES DE CONSULTA
 * ──────────────────────────────────────────────────────────────────────────── */

/** Un texto del buscador nunca debe poder romper (ni secuestrar) la expresión. */
function escaparRegex(entrada: string): string {
  return entrada.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function patronBusqueda(entrada: string): RegExp {
  return new RegExp(escaparRegex(entrada.trim()), "i");
}

function esObjectId(valor: string): boolean {
  return Types.ObjectId.isValid(valor) && String(new Types.ObjectId(valor)) === valor;
}

/** Rango de fechas de los filtros (`desde`/`hasta` en ISO). */
function rangoFechas(desde?: string, hasta?: string): Record<string, Date> | null {
  const rango: Record<string, Date> = {};
  if (desde) {
    const fecha = new Date(desde);
    if (!Number.isNaN(fecha.getTime())) rango.$gte = fecha;
  }
  if (hasta) {
    const fecha = new Date(hasta);
    if (!Number.isNaN(fecha.getTime())) rango.$lte = fecha;
  }
  return Object.keys(rango).length > 0 ? rango : null;
}

/** Paginación con topes sensatos: nunca se piden 10.000 filas por accidente. */
function paginacion(
  pagina: number | undefined,
  porPagina: number | undefined,
  porDefecto: number
): { salto: number; limite: number } {
  const limite = Math.min(Math.max(numero(porPagina, porDefecto), 1), 500);
  const numeroPagina = Math.max(numero(pagina, 1), 1);
  return { salto: (numeroPagina - 1) * limite, limite };
}

/**
 * Peso numérico de la prioridad para poder ordenarla de verdad.
 * Ordenar por el texto daría "URGENTE, NORMAL, ALTA" (orden alfabético
 * descendente), que es justo lo contrario de lo que necesita el taller.
 */
const ETAPA_PESO_PRIORIDAD: PipelineStage.AddFields = {
  $addFields: {
    pesoPrioridad: {
      $switch: {
        branches: [
          { case: { $eq: ["$prioridad", "URGENTE"] }, then: 3 },
          { case: { $eq: ["$prioridad", "ALTA"] }, then: 2 },
        ],
        default: 1,
      },
    },
    /** Las fechas vacías van al final en vez de encabezar la lista. */
    sinFecha: { $cond: [{ $eq: [{ $ifNull: ["$fechaPrometida", null] }, null] }, 1, 0] },
  },
};

const CAMPOS_AUXILIARES_ORDEN = ["pesoPrioridad", "sinFecha"];

/**
 * Lo que NO hace falta para pintar una fila o una tarjeta del tablero: las
 * fotos, las instrucciones largas y las respuestas del checklist de cada paso.
 * Los serializadores rellenan esos huecos con `""`/`[]`, así que el DTO sigue
 * siendo válido; simplemente la ficha completa se pide con `getUnidad`.
 */
const CAMPOS_PESADOS_UNIDAD = [
  "pasos.instrucciones",
  "pasos.fotos",
  "pasos.checklist",
  "pasos.checklistRespuestas",
  "pasos.nota",
  "pasos.firmaUrl",
];

const PROYECCION_UNIDAD_LIGERA = CAMPOS_PESADOS_UNIDAD.map((campo) => `-${campo}`).join(" ");

/** Los muebles que siguen "vivos" en el taller. */
const ESTADOS_ACTIVOS: EstadoUnidad[] = [
  "PENDIENTE",
  "EN_PROCESO",
  "PAUSADA",
  "INCIDENCIA",
  "TERMINADA",
];

function pesoPrioridad(prioridad: string): number {
  if (prioridad === "URGENTE") return 3;
  if (prioridad === "ALTA") return 2;
  return 1;
}

/** Mismo criterio que el tablero: lo más urgente y lo que vence antes, arriba. */
function ordenarPorUrgencia(unidades: UnidadDTO[]): UnidadDTO[] {
  return [...unidades].sort((a, b) => {
    const peso = pesoPrioridad(b.prioridad) - pesoPrioridad(a.prioridad);
    if (peso !== 0) return peso;
    if (a.fechaPrometida && b.fechaPrometida) {
      return a.fechaPrometida.localeCompare(b.fechaPrometida);
    }
    if (a.fechaPrometida) return -1;
    if (b.fechaPrometida) return 1;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

/** ¿El precio se puede enseñar a quien está mirando? (Ver cabecera del archivo.) */
function puedeVerPrecios(sesion: SesionOperario | null | undefined): boolean {
  if (sesion === undefined) return true;
  return tiene(sesion, "ver_precios");
}

/* ── Mapas de nombres: una consulta, no una por fila ───────────────────────── */

async function nombresDeEstaciones(): Promise<Record<string, string>> {
  const docs = await EstacionModel.find({}).select({ nombre: 1 }).lean();
  const mapa: Record<string, string> = {};
  for (const doc of docs) mapa[String(doc._id)] = cadena(doc.nombre);
  return mapa;
}

async function nombresDeRoles(): Promise<Record<string, string>> {
  // `obtenerRoles()` va cacheado 30 s: aquí no toca la base casi nunca.
  const roles = await obtenerRoles();
  const mapa: Record<string, string> = {};
  for (const rol of roles) mapa[rol.clave] = rol.nombre;
  return mapa;
}

/** Problemas abiertos por mueble, para una tanda de ids. UNA sola consulta. */
async function incidenciasAbiertasPorUnidad(
  ids: string[]
): Promise<Map<string, number>> {
  const mapa = new Map<string, number>();
  const validos = ids.filter(esObjectId).map((id) => new Types.ObjectId(id));
  if (validos.length === 0) return mapa;

  const filas = await IncidenciaModel.aggregate<{ _id: Types.ObjectId; cantidad: number }>([
    { $match: { unidadId: { $in: validos }, estado: "ABIERTA" } },
    { $group: { _id: "$unidadId", cantidad: { $sum: 1 } } },
  ]);

  for (const fila of filas) mapa.set(String(fila._id), fila.cantidad);
  return mapa;
}

/** Añade `incidenciasAbiertas` a una tanda de muebles sin caer en un N+1. */
async function conIncidencias(unidades: UnidadDTO[]): Promise<UnidadDTO[]> {
  if (unidades.length === 0) return unidades;
  const mapa = await incidenciasAbiertasPorUnidad(unidades.map((unidad) => unidad._id));
  return unidades.map((unidad) => ({
    ...unidad,
    incidenciasAbiertas: mapa.get(unidad._id) ?? 0,
  }));
}

/* ────────────────────────────────────────────────────────────────────────────
 * ROLES
 * ──────────────────────────────────────────────────────────────────────────── */

export interface OpcionesListarRoles {
  /** Por defecto sólo salen los roles activos. */
  incluirInactivos?: boolean;
  busqueda?: string;
}

/**
 * Los roles del panel, con **cuántas personas tiene cada uno** resuelto en una
 * única aggregation agrupada (nada de un `countDocuments` por rol).
 */
export async function listarRoles(opts?: OpcionesListarRoles): Promise<RolDTO[]> {
  try {
    await connectDB();

    const consulta: FilterQuery<{ activo: boolean }> = {};
    if (!opts?.incluirInactivos) consulta.activo = { $ne: false };
    if (opts?.busqueda?.trim()) {
      const patron = patronBusqueda(opts.busqueda);
      consulta.$or = [{ nombre: patron }, { clave: patron }, { descripcion: patron }];
    }

    const [docs, conteos] = await Promise.all([
      RolModel.find(consulta).sort({ orden: 1, nombre: 1 }).lean(),
      OperarioModel.aggregate<{ _id: string; cantidad: number }>([
        { $match: { eliminado: { $ne: true } } },
        { $group: { _id: "$rolClave", cantidad: { $sum: 1 } } },
      ]),
    ]);

    const personas = new Map(conteos.map((fila) => [String(fila._id), fila.cantidad]));

    return docs.map((doc) => {
      const rol = serializarRol(doc);
      return { ...rol, cantidadPersonas: personas.get(rol.clave) ?? 0 };
    });
  } catch (error) {
    console.error("[data/fabricacion] listarRoles:", error);
    return [];
  }
}

/** Un rol por su clave (`"tapicero"`) o por su id. */
export async function getRol(idOClave: string): Promise<RolDTO | null> {
  if (typeof idOClave !== "string" || idOClave.trim() === "") return null;

  try {
    await connectDB();
    const referencia = idOClave.trim();

    const doc =
      (await RolModel.findOne({ clave: referencia.toLowerCase() }).lean()) ??
      (esObjectId(referencia) ? await RolModel.findById(referencia).lean() : null);

    if (!doc) return null;

    const rol = serializarRol(doc);
    const cantidadPersonas = await OperarioModel.countDocuments({
      rolClave: rol.clave,
      eliminado: { $ne: true },
    });

    return { ...rol, cantidadPersonas };
  } catch (error) {
    console.error("[data/fabricacion] getRol:", error);
    return null;
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * PERSONAS
 * ──────────────────────────────────────────────────────────────────────────── */

export interface OpcionesListarOperarios {
  /** Por defecto sólo salen las personas activas. */
  incluirInactivos?: boolean;
  /** Vista "Ver eliminados" (§7). */
  incluirEliminados?: boolean;
  soloEliminados?: boolean;
  rolClave?: string;
  estacionId?: string;
  busqueda?: string;
}

/** Proyección que deja fuera el PIN. El hash no sale de la base ni por error. */
const SIN_PIN = { pinHash: 0, pinSalt: 0 } as const;

export async function listarOperarios(
  opts?: OpcionesListarOperarios
): Promise<OperarioDTO[]> {
  try {
    await connectDB();

    const consulta: FilterQuery<Operario> = {};
    if (opts?.soloEliminados) consulta.eliminado = true;
    else if (!opts?.incluirEliminados) consulta.eliminado = { $ne: true };
    if (!opts?.incluirInactivos) consulta.activo = { $ne: false };
    if (opts?.rolClave) consulta.rolClave = opts.rolClave.toLowerCase();
    if (opts?.estacionId && esObjectId(opts.estacionId)) {
      consulta.estacionesIds = new Types.ObjectId(opts.estacionId);
    }
    if (opts?.busqueda?.trim()) {
      const patron = patronBusqueda(opts.busqueda);
      consulta.$or = [{ nombre: patron }, { codigoEmpleado: patron }, { telefono: patron }];
    }

    const [docs, roles, estaciones] = await Promise.all([
      OperarioModel.find(consulta).select(SIN_PIN).sort({ nombre: 1 }).lean(),
      nombresDeRoles(),
      nombresDeEstaciones(),
    ]);

    return docs.map((doc) => serializarOperario(doc, { roles, estaciones }));
  } catch (error) {
    console.error("[data/fabricacion] listarOperarios:", error);
    return [];
  }
}

export async function getOperario(id: string): Promise<OperarioDTO | null> {
  if (!id || !esObjectId(id)) return null;

  try {
    await connectDB();
    const [doc, roles, estaciones] = await Promise.all([
      OperarioModel.findById(id).select(SIN_PIN).lean(),
      nombresDeRoles(),
      nombresDeEstaciones(),
    ]);

    return doc ? serializarOperario(doc, { roles, estaciones }) : null;
  } catch (error) {
    console.error("[data/fabricacion] getOperario:", error);
    return null;
  }
}

/** Lo mínimo para pintar la pantalla de entrada al taller. Sin datos privados. */
export interface OperarioLoginDTO {
  _id: string;
  nombre: string;
  rolClave: string;
  rolNombre: string;
  colorAvatar: string;
  fotoUrl: string;
  codigoEmpleado: string;
}

/**
 * Las caras que se ven en `/fabrica/login`: sólo personas activas y no
 * eliminadas, y sólo los campos públicos (ni teléfono, ni PIN, ni accesos).
 */
export async function listarOperariosParaLogin(): Promise<OperarioLoginDTO[]> {
  try {
    await connectDB();

    const [docs, roles] = await Promise.all([
      OperarioModel.find({ activo: true, eliminado: { $ne: true } })
        .select({ nombre: 1, rolClave: 1, colorAvatar: 1, fotoUrl: 1, codigoEmpleado: 1 })
        .sort({ nombre: 1 })
        .lean(),
      nombresDeRoles(),
    ]);

    return docs.map((doc) => {
      const rolClave = cadena(doc.rolClave);
      return {
        _id: String(doc._id),
        nombre: cadena(doc.nombre),
        rolClave,
        rolNombre: roles[rolClave] ?? rolClave,
        colorAvatar: cadena(doc.colorAvatar, "#E8511A"),
        fotoUrl: cadena(doc.fotoUrl),
        codigoEmpleado: cadena(doc.codigoEmpleado),
      };
    });
  } catch (error) {
    console.error("[data/fabricacion] listarOperariosParaLogin:", error);
    return [];
  }
}

/**
 * Cuántas personas activas pueden gestionar usuarios ahora mismo, sin contar a
 * `excluirOperarioId`. Es el SEGURO ANTI-BLOQUEO del §7: la action que va a
 * eliminar, desactivar o cambiar de rol a alguien pregunta aquí antes, para no
 * dejar el sistema sin nadie capaz de crear personas.
 *
 * Ante un fallo de base devuelve 0, que es el lado seguro: la action rechaza.
 */
export async function contarPersonasQueGestionanUsuarios(
  excluirOperarioId?: string
): Promise<number> {
  try {
    await connectDB();

    const roles = await obtenerRoles();
    const claves = roles
      .filter(
        (rol) =>
          rol.activo &&
          (rol.clave === "admin" || rol.capacidades.includes("gestionar_usuarios"))
      )
      .map((rol) => rol.clave);

    if (claves.length === 0) return 0;

    const consulta: FilterQuery<Operario> = {
      rolClave: { $in: claves },
      activo: true,
      eliminado: { $ne: true },
    };
    if (excluirOperarioId && esObjectId(excluirOperarioId)) {
      consulta._id = { $ne: new Types.ObjectId(excluirOperarioId) };
    }

    return await OperarioModel.countDocuments(consulta);
  } catch (error) {
    console.error("[data/fabricacion] contarPersonasQueGestionanUsuarios:", error);
    return 0;
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * ÁREAS DE TRABAJO
 * ──────────────────────────────────────────────────────────────────────────── */

export interface OpcionesListarEstaciones {
  incluirInactivas?: boolean;
  incluirEliminadas?: boolean;
  soloEliminadas?: boolean;
  tipo?: string;
  busqueda?: string;
}

/** Las áreas, con cuántos muebles hay ahora en cada una (una aggregation). */
export async function listarEstaciones(
  opts?: OpcionesListarEstaciones
): Promise<EstacionDTO[]> {
  try {
    await connectDB();

    const consulta: FilterQuery<Estacion> = {};
    if (opts?.soloEliminadas) consulta.eliminada = true;
    else if (!opts?.incluirEliminadas) consulta.eliminada = { $ne: true };
    if (!opts?.incluirInactivas) consulta.activa = { $ne: false };
    if (opts?.tipo) consulta.tipo = unaDe(opts.tipo, TIPOS_ESTACION, "TALLER");
    if (opts?.busqueda?.trim()) {
      const patron = patronBusqueda(opts.busqueda);
      consulta.$or = [{ nombre: patron }, { direccion: patron }];
    }

    const [docs, conteos] = await Promise.all([
      EstacionModel.find(consulta).sort({ orden: 1, nombre: 1 }).lean(),
      UnidadFabricacionModel.aggregate<{ _id: Types.ObjectId | null; cantidad: number }>([
        {
          $match: {
            eliminada: { $ne: true },
            ubicacionActualId: { $ne: null },
            estado: { $in: ESTADOS_ACTIVOS },
          },
        },
        { $group: { _id: "$ubicacionActualId", cantidad: { $sum: 1 } } },
      ]),
    ]);

    const unidades = new Map(conteos.map((fila) => [String(fila._id), fila.cantidad]));

    return docs.map((doc) => {
      const estacion = serializarEstacion(doc);
      return { ...estacion, cantidadUnidades: unidades.get(estacion._id) ?? 0 };
    });
  } catch (error) {
    console.error("[data/fabricacion] listarEstaciones:", error);
    return [];
  }
}

export async function getEstacion(id: string): Promise<EstacionDTO | null> {
  if (!id || !esObjectId(id)) return null;

  try {
    await connectDB();
    const doc = await EstacionModel.findById(id).lean();
    if (!doc) return null;

    const cantidadUnidades = await UnidadFabricacionModel.countDocuments({
      ubicacionActualId: new Types.ObjectId(id),
      eliminada: { $ne: true },
      estado: { $in: ESTADOS_ACTIVOS },
    });

    return { ...serializarEstacion(doc), cantidadUnidades };
  } catch (error) {
    console.error("[data/fabricacion] getEstacion:", error);
    return null;
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * CATÁLOGO DE PASOS
 * ──────────────────────────────────────────────────────────────────────────── */

export interface OpcionesListarCatalogo {
  incluirInactivos?: boolean;
  tipo?: string;
  estacionId?: string;
  rolClave?: string;
  busqueda?: string;
}

/**
 * Cuántas rutas usan cada paso del catálogo. UNA aggregation para todas.
 *
 * Cuenta TAMBIÉN las rutas archivadas, a propósito: es el mismo criterio que
 * usa `dependenciasDePasoCatalogo` para decidir si el borrado puede ser físico
 * o tiene que ser lógico. Si aquí se filtraran, la tarjeta diría "no lo usa
 * ninguna ruta" y el diálogo prometería un borrado que el servidor no haría.
 */
async function usoDePasosEnRutas(): Promise<Map<string, number>> {
  const filas = await RutaFabricacionModel.aggregate<{ _id: string; cantidad: number }>([
    { $unwind: "$pasos" },
    { $group: { _id: { ruta: "$_id", clave: "$pasos.clave" } } },
    { $group: { _id: "$_id.clave", cantidad: { $sum: 1 } } },
  ]);
  return new Map(filas.map((fila) => [String(fila._id), fila.cantidad]));
}

export async function listarCatalogoPasos(
  opts?: OpcionesListarCatalogo
): Promise<CatalogoPasoDTO[]> {
  try {
    await connectDB();

    const consulta: FilterQuery<CatalogoPaso> = {};
    if (!opts?.incluirInactivos) consulta.activo = { $ne: false };
    if (opts?.tipo) consulta.tipo = unaDe(opts.tipo, TIPOS_PASO, "TRABAJO");
    if (opts?.estacionId && esObjectId(opts.estacionId)) {
      consulta.estacionId = new Types.ObjectId(opts.estacionId);
    }
    if (opts?.rolClave) consulta.rolesPermitidos = opts.rolClave.toLowerCase();
    if (opts?.busqueda?.trim()) {
      const patron = patronBusqueda(opts.busqueda);
      consulta.$or = [{ nombre: patron }, { clave: patron }, { instrucciones: patron }];
    }

    const [docs, estaciones, usos] = await Promise.all([
      CatalogoPasoModel.find(consulta).sort({ orden: 1, nombre: 1 }).lean(),
      nombresDeEstaciones(),
      usoDePasosEnRutas(),
    ]);

    return docs.map((doc) => {
      const paso = serializarCatalogoPaso(doc, { estaciones });
      return { ...paso, usadoEnRutas: usos.get(paso.clave) ?? 0 };
    });
  } catch (error) {
    console.error("[data/fabricacion] listarCatalogoPasos:", error);
    return [];
  }
}

/** Un paso del catálogo por su id o por su clave (`"corte_madera"`). */
export async function getPasoCatalogo(id: string): Promise<CatalogoPasoDTO | null> {
  if (typeof id !== "string" || id.trim() === "") return null;

  try {
    await connectDB();
    const referencia = id.trim();

    const doc = esObjectId(referencia)
      ? await CatalogoPasoModel.findById(referencia).lean()
      : await CatalogoPasoModel.findOne({ clave: referencia.toLowerCase() }).lean();

    if (!doc) return null;

    const estaciones = await nombresDeEstaciones();
    const paso = serializarCatalogoPaso(doc, { estaciones });

    // Sin filtrar por `archivada`: mismo criterio que `dependenciasDePasoCatalogo`.
    const usadoEnRutas = await RutaFabricacionModel.countDocuments({
      "pasos.clave": paso.clave,
    });

    return { ...paso, usadoEnRutas };
  } catch (error) {
    console.error("[data/fabricacion] getPasoCatalogo:", error);
    return null;
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * RUTAS DE FABRICACIÓN
 * ──────────────────────────────────────────────────────────────────────────── */

export interface OpcionesListarRutas {
  /** Vista "Ver archivadas" (§7). */
  incluirArchivadas?: boolean;
  soloArchivadas?: boolean;
  incluirInactivas?: boolean;
  busqueda?: string;
}

/** Cuántos muebles vivos usan cada ruta. UNA aggregation para todas. */
async function usoDeRutasEnUnidades(): Promise<Map<string, number>> {
  const filas = await UnidadFabricacionModel.aggregate<{
    _id: Types.ObjectId | null;
    cantidad: number;
  }>([
    { $match: { eliminada: { $ne: true }, rutaId: { $ne: null } } },
    { $group: { _id: "$rutaId", cantidad: { $sum: 1 } } },
  ]);
  return new Map(filas.map((fila) => [String(fila._id), fila.cantidad]));
}

export async function listarRutas(opts?: OpcionesListarRutas): Promise<RutaDTO[]> {
  try {
    await connectDB();

    const consulta: FilterQuery<RutaFabricacion> = {};
    if (opts?.soloArchivadas) consulta.archivada = true;
    else if (!opts?.incluirArchivadas) consulta.archivada = { $ne: true };
    if (!opts?.incluirInactivas) consulta.activa = { $ne: false };
    if (opts?.busqueda?.trim()) {
      const patron = patronBusqueda(opts.busqueda);
      consulta.$or = [
        { nombre: patron },
        { descripcion: patron },
        { categoriaSugerida: patron },
      ];
    }

    const [docs, estaciones, usos] = await Promise.all([
      RutaFabricacionModel.find(consulta)
        .sort({ esPredeterminada: -1, nombre: 1 })
        .lean(),
      nombresDeEstaciones(),
      usoDeRutasEnUnidades(),
    ]);

    return docs.map((doc) => {
      const ruta = serializarRuta(doc, { estaciones });
      return { ...ruta, unidadesEnCurso: usos.get(ruta._id) ?? 0 };
    });
  } catch (error) {
    console.error("[data/fabricacion] listarRutas:", error);
    return [];
  }
}

export async function getRuta(id: string): Promise<RutaDTO | null> {
  if (!id || !esObjectId(id)) return null;

  try {
    await connectDB();
    const [doc, estaciones] = await Promise.all([
      RutaFabricacionModel.findById(id).lean(),
      nombresDeEstaciones(),
    ]);
    if (!doc) return null;

    const unidadesEnCurso = await UnidadFabricacionModel.countDocuments({
      rutaId: new Types.ObjectId(id),
      eliminada: { $ne: true },
    });

    return { ...serializarRuta(doc, { estaciones }), unidadesEnCurso };
  } catch (error) {
    console.error("[data/fabricacion] getRuta:", error);
    return null;
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * PEDIDOS
 * ──────────────────────────────────────────────────────────────────────────── */

function construirConsultaPedidos(filtros: FiltrosPedidos): FilterQuery<Pedido> {
  const condiciones: FilterQuery<Pedido>[] = [];

  if (filtros.soloEliminados) condiciones.push({ eliminado: true });
  else if (!filtros.incluirEliminados) condiciones.push({ eliminado: { $ne: true } });

  if (filtros.estado) condiciones.push({ estado: filtros.estado });
  if (filtros.canal) condiciones.push({ canal: filtros.canal });
  if (filtros.prioridad) condiciones.push({ prioridad: filtros.prioridad });

  const rango = rangoFechas(filtros.desde, filtros.hasta);
  if (rango) condiciones.push({ createdAt: rango });

  if (filtros.busqueda?.trim()) {
    const patron = patronBusqueda(filtros.busqueda);
    const alternativas: FilterQuery<Pedido>[] = [
      { codigo: patron },
      { "cliente.nombre": patron },
      { "cliente.telefono": patron },
      { "cliente.cedula": patron },
    ];
    const codigo = normalizarCodigo(filtros.busqueda);
    if (codigo) alternativas.push({ codigo });
    condiciones.push({ $or: alternativas });
  }

  return condiciones.length > 0 ? { $and: condiciones } : {};
}

export async function listarPedidos(filtros: FiltrosPedidos = {}): Promise<PedidoDTO[]> {
  try {
    await connectDB();

    const consulta = construirConsultaPedidos(filtros);
    const { salto, limite } = paginacion(filtros.pagina, filtros.porPagina, 200);

    const orden: Record<string, 1 | -1> =
      filtros.orden === "prioridad"
        ? { pesoPrioridad: -1, sinFecha: 1, fechaPrometida: 1, createdAt: -1 }
        : filtros.orden === "entrega"
          ? { sinFecha: 1, fechaPrometida: 1, createdAt: -1 }
          : { createdAt: -1 };

    const etapas: PipelineStage[] = [
      { $match: consulta },
      ETAPA_PESO_PRIORIDAD,
      { $sort: orden },
      { $skip: salto },
      { $limit: limite },
      { $unset: CAMPOS_AUXILIARES_ORDEN },
    ];

    const docs = await PedidoModel.aggregate<Doc>(etapas);
    return docs.map(serializarPedido);
  } catch (error) {
    console.error("[data/fabricacion] listarPedidos:", error);
    return [];
  }
}

export async function contarPedidos(filtros: FiltrosPedidos = {}): Promise<number> {
  try {
    await connectDB();
    return await PedidoModel.countDocuments(construirConsultaPedidos(filtros));
  } catch (error) {
    console.error("[data/fabricacion] contarPedidos:", error);
    return 0;
  }
}

/** La ficha de un pedido con sus muebles dentro (`PED-100248` o su id). */
export async function getPedido(
  codigo: string,
  sesion?: SesionOperario | null
): Promise<PedidoDTO | null> {
  if (typeof codigo !== "string" || codigo.trim() === "") return null;

  try {
    await connectDB();
    const referencia = codigo.trim();
    const canonico = normalizarCodigo(referencia) ?? referencia.toUpperCase();

    const doc =
      (await PedidoModel.findOne({ codigo: canonico }).lean()) ??
      (esObjectId(referencia) ? await PedidoModel.findById(referencia).lean() : null);

    if (!doc) return null;

    const pedido = serializarPedido(doc);
    const unidades = await getUnidadesDePedido(pedido._id, sesion);
    return { ...pedido, unidades };
  } catch (error) {
    console.error("[data/fabricacion] getPedido:", error);
    return null;
  }
}

/** Los muebles de un pedido, en el orden en que se crearon. */
export async function getUnidadesDePedido(
  pedidoId: string,
  sesion?: SesionOperario | null
): Promise<UnidadDTO[]> {
  if (!pedidoId || !esObjectId(pedidoId)) return [];

  try {
    await connectDB();
    const docs = await UnidadFabricacionModel.find({
      pedidoId: new Types.ObjectId(pedidoId),
      eliminada: { $ne: true },
    })
      .select(PROYECCION_UNIDAD_LIGERA)
      .sort({ createdAt: 1 })
      .lean();

    const verPrecios = puedeVerPrecios(sesion);
    return await conIncidencias(docs.map((doc) => serializarUnidad(doc, { verPrecios })));
  } catch (error) {
    console.error("[data/fabricacion] getUnidadesDePedido:", error);
    return [];
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * MUEBLES (UNIDADES DE FABRICACIÓN)
 * ──────────────────────────────────────────────────────────────────────────── */

function construirConsultaUnidades(
  filtros: FiltrosUnidades
): FilterQuery<UnidadFabricacion> {
  const condiciones: FilterQuery<UnidadFabricacion>[] = [];

  if (filtros.soloEliminadas) condiciones.push({ eliminada: true });
  else if (!filtros.incluirEliminadas) condiciones.push({ eliminada: { $ne: true } });

  if (filtros.estado) condiciones.push({ estado: filtros.estado });
  if (filtros.prioridad) condiciones.push({ prioridad: filtros.prioridad });

  // El paso en el que está ahora mismo: uno de sus pasos, con esa clave y sin
  // cerrar todavía. Se apoya en el índice { "pasos.clave", "pasos.estado" }.
  if (filtros.pasoClave) {
    condiciones.push({
      pasos: {
        $elemMatch: {
          clave: filtros.pasoClave,
          estado: { $in: ["LISTO", "EN_CURSO", "INCIDENCIA"] },
        },
      },
    });
  }

  if (filtros.asignadoAId && esObjectId(filtros.asignadoAId)) {
    condiciones.push({ asignadoAId: new Types.ObjectId(filtros.asignadoAId) });
  }
  if (filtros.estacionId && esObjectId(filtros.estacionId)) {
    condiciones.push({ ubicacionActualId: new Types.ObjectId(filtros.estacionId) });
  }
  if (filtros.rutaId && esObjectId(filtros.rutaId)) {
    condiciones.push({ rutaId: new Types.ObjectId(filtros.rutaId) });
  }
  if (filtros.pedidoCodigo) {
    condiciones.push({
      pedidoCodigo: normalizarCodigo(filtros.pedidoCodigo) ?? filtros.pedidoCodigo.toUpperCase(),
    });
  }

  if (filtros.retrasadas) {
    condiciones.push({
      fechaPrometida: { $ne: null, $lt: new Date() },
      estado: { $nin: ["ENTREGADA", "CANCELADA"] },
    });
  }

  const rango = rangoFechas(filtros.desde, filtros.hasta);
  if (rango) condiciones.push({ createdAt: rango });

  if (filtros.busqueda?.trim()) {
    const patron = patronBusqueda(filtros.busqueda);
    const alternativas: FilterQuery<UnidadFabricacion>[] = [
      { codigo: patron },
      { pedidoCodigo: patron },
      { clienteNombre: patron },
      { "producto.titulo": patron },
    ];
    const codigo = normalizarCodigo(filtros.busqueda);
    if (codigo) {
      alternativas.push({ codigo });
      alternativas.push({ pedidoCodigo: codigo });
    }
    condiciones.push({ $or: alternativas });
  }

  return condiciones.length > 0 ? { $and: condiciones } : {};
}

/**
 * El listado de muebles del panel.
 *
 * Orden por defecto: **lo más urgente primero y, dentro de la misma prioridad,
 * lo que vence antes**. Va por aggregation porque la prioridad es texto y hay
 * que darle un peso numérico para poder ordenarla de verdad.
 */
export async function listarUnidades(
  filtros: FiltrosUnidades = {},
  sesion?: SesionOperario | null
): Promise<UnidadDTO[]> {
  try {
    await connectDB();

    const consulta = construirConsultaUnidades(filtros);
    const { salto, limite } = paginacion(filtros.pagina, filtros.porPagina, 200);

    const orden: Record<string, 1 | -1> =
      filtros.orden === "recientes"
        ? { createdAt: -1 }
        : filtros.orden === "entrega"
          ? { sinFecha: 1, fechaPrometida: 1, pesoPrioridad: -1 }
          : filtros.orden === "progreso"
            ? { progreso: -1, updatedAt: -1 }
            : { pesoPrioridad: -1, sinFecha: 1, fechaPrometida: 1, createdAt: -1 };

    const etapas: PipelineStage[] = [
      { $match: consulta },
      ETAPA_PESO_PRIORIDAD,
      { $sort: orden },
      { $skip: salto },
      { $limit: limite },
      { $unset: [...CAMPOS_PESADOS_UNIDAD, ...CAMPOS_AUXILIARES_ORDEN] },
    ];

    const docs = await UnidadFabricacionModel.aggregate<Doc>(etapas);
    const verPrecios = puedeVerPrecios(sesion);

    return await conIncidencias(docs.map((doc) => serializarUnidad(doc, { verPrecios })));
  } catch (error) {
    console.error("[data/fabricacion] listarUnidades:", error);
    return [];
  }
}

/** Cuántos muebles cumplen el filtro (para la paginación y los contadores). */
export async function contarUnidades(filtros: FiltrosUnidades = {}): Promise<number> {
  try {
    await connectDB();
    return await UnidadFabricacionModel.countDocuments(construirConsultaUnidades(filtros));
  } catch (error) {
    console.error("[data/fabricacion] contarUnidades:", error);
    return 0;
  }
}

/**
 * La ficha completa de un mueble por su código (`COD-949473`).
 *
 * Acepta cualquier forma de escribirlo (`949473`, `cod-949473`, la URL entera
 * del QR) porque pasa por `normalizarCodigo`. **No hay `getUnidadPorToken`: el
 * QR no lleva token.**
 */
export async function getUnidad(
  codigo: string,
  sesion?: SesionOperario | null
): Promise<UnidadDTO | null> {
  if (typeof codigo !== "string" || codigo.trim() === "") return null;

  try {
    await connectDB();
    const referencia = codigo.trim();
    const canonico = normalizarCodigo(referencia) ?? referencia.toUpperCase();

    const doc =
      (await UnidadFabricacionModel.findOne({ codigo: canonico }).lean()) ??
      (esObjectId(referencia)
        ? await UnidadFabricacionModel.findById(referencia).lean()
        : null);

    if (!doc) return null;

    const estaciones = await nombresDeEstaciones();
    const unidad = serializarUnidad(doc, {
      verPrecios: puedeVerPrecios(sesion),
      nombres: { estaciones },
    });

    const incidenciasAbiertas = await IncidenciaModel.countDocuments({
      unidadId: doc._id,
      estado: "ABIERTA",
    });

    return { ...unidad, incidenciasAbiertas };
  } catch (error) {
    console.error("[data/fabricacion] getUnidad:", error);
    return null;
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * TABLERO Y TRABAJO DEL DÍA
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * El tablero: los muebles vivos agrupados por el paso en el que están AHORA.
 *
 * Dos consultas y ni un `findById` dentro de un bucle: los muebles (con
 * proyección ligera) y el catálogo, que sólo se usa para ordenar las columnas
 * como el admin las ordenó. Los muebles ya terminados aparecen en su último
 * paso, que es donde están de verdad hasta que se entregan.
 */
export async function getTableroKanban(
  sesion?: SesionOperario | null
): Promise<ColumnaKanban[]> {
  try {
    await connectDB();

    const [docs, pasosCatalogo] = await Promise.all([
      UnidadFabricacionModel.find({
        eliminada: { $ne: true },
        estado: { $in: ESTADOS_ACTIVOS },
      })
        .select(PROYECCION_UNIDAD_LIGERA)
        .sort({ prioridad: -1, fechaPrometida: 1 })
        .limit(500)
        .lean(),
      CatalogoPasoModel.find({}).select({ clave: 1, orden: 1 }).sort({ orden: 1 }).lean(),
    ]);

    const ordenCatalogo = new Map<string, number>();
    pasosCatalogo.forEach((paso, indice) => {
      ordenCatalogo.set(cadena(paso.clave), numero(paso.orden, indice));
    });

    const verPrecios = puedeVerPrecios(sesion);
    const unidades = docs.map((doc) => serializarUnidad(doc, { verPrecios }));
    const conProblemas = await conIncidencias(unidades);

    const columnas = new Map<string, ColumnaKanban>();
    const pesos = new Map<string, number>();

    for (const unidad of conProblemas) {
      const paso = unidad.pasos[indicePasoActual(unidad.pasos)];
      const clave = paso?.clave ?? "sin_pasos";
      const columna = columnas.get(clave);

      if (columna) {
        columna.unidades.push(unidad);
        columna.cantidad += 1;
        continue;
      }

      columnas.set(clave, {
        clave,
        nombre: paso?.nombre ?? "Sin pasos todavía",
        color: paso?.color ?? "#94A3B8",
        icono: paso?.icono ?? "clipboard-list",
        cantidad: 1,
        unidades: [unidad],
      });
      // Las columnas se pintan en el orden que el admin fijó en el catálogo;
      // lo que no esté en el catálogo (pasos a medida) va al final.
      pesos.set(clave, ordenCatalogo.get(clave) ?? Number.MAX_SAFE_INTEGER);
    }

    return [...columnas.values()]
      .sort(
        (a, b) =>
          (pesos.get(a.clave) ?? 0) - (pesos.get(b.clave) ?? 0) ||
          a.nombre.localeCompare(b.nombre)
      )
      .map((columna) => ({ ...columna, unidades: ordenarPorUrgencia(columna.unidades) }));
  } catch (error) {
    console.error("[data/fabricacion] getTableroKanban:", error);
    return [];
  }
}

/** Lo que tiene entre manos una persona y lo que puede coger ahora mismo. */
export interface MiTrabajo {
  /** Pasos que esta persona empezó y todavía no ha terminado. */
  enCurso: UnidadDTO[];
  /** Muebles cuyo paso actual está libre y le corresponde por rol o asignación. */
  listas: UnidadDTO[];
}

const MI_TRABAJO_VACIO: MiTrabajo = { enCurso: [], listas: [] };

/**
 * La pantalla principal del taller: "lo tuyo".
 *
 * · `enCurso`: muebles con un paso EN_CURSO que empezó ESTA persona.
 * · `listas`: muebles cuyo paso actual está LISTO y su rol puede hacer (o que
 *   están asignados a ella).
 * · Quien tenga `ver_tablero` **y** `gestionar_unidades` (supervisión) lo ve
 *   todo, no sólo lo suyo.
 */
export async function getMiTrabajo(
  sesion: SesionOperario | null | undefined
): Promise<MiTrabajo> {
  if (!sesion) return MI_TRABAJO_VACIO;

  try {
    await connectDB();

    const verTodo = tiene(sesion, "ver_tablero") && tiene(sesion, "gestionar_unidades");
    const verPrecios = puedeVerPrecios(sesion);

    const filtroEnCurso: FilterQuery<UnidadFabricacion> = {
      eliminada: { $ne: true },
      estado: { $in: ["PENDIENTE", "EN_PROCESO", "INCIDENCIA"] },
      pasos: {
        $elemMatch: verTodo
          ? { estado: "EN_CURSO" }
          : { estado: "EN_CURSO", iniciadoPorId: sesion.uid },
      },
    };

    const condicionesListas: FilterQuery<UnidadFabricacion>[] = [
      { eliminada: { $ne: true } },
      { estado: { $in: ["PENDIENTE", "EN_PROCESO"] } },
    ];

    if (verTodo) {
      condicionesListas.push({ pasos: { $elemMatch: { estado: "LISTO" } } });
    } else {
      const alternativas: FilterQuery<UnidadFabricacion>[] = [
        {
          pasos: {
            $elemMatch: {
              estado: "LISTO",
              $or: [{ rolesPermitidos: { $size: 0 } }, { rolesPermitidos: sesion.rolClave }],
            },
          },
        },
      ];
      if (esObjectId(sesion.uid)) {
        alternativas.push({
          asignadoAId: new Types.ObjectId(sesion.uid),
          pasos: { $elemMatch: { estado: "LISTO" } },
        });
      }
      condicionesListas.push({ $or: alternativas });
    }

    const [docsEnCurso, docsListas] = await Promise.all([
      UnidadFabricacionModel.find(filtroEnCurso)
        .select(PROYECCION_UNIDAD_LIGERA)
        .limit(100)
        .lean(),
      UnidadFabricacionModel.find({ $and: condicionesListas })
        .select(PROYECCION_UNIDAD_LIGERA)
        .limit(100)
        .lean(),
    ]);

    const enCurso = docsEnCurso.map((doc) => serializarUnidad(doc, { verPrecios }));
    const yaEstan = new Set(enCurso.map((unidad) => unidad._id));

    /*
     * Segundo filtro en memoria: la consulta encuentra muebles que TIENEN un
     * paso LISTO, pero el que de verdad toca hacer es el paso actual. Sin esto
     * saldrían muebles cuyo paso libre está más adelante en la ruta.
     */
    const listas = docsListas
      .map((doc) => serializarUnidad(doc, { verPrecios }))
      .filter((unidad) => {
        if (yaEstan.has(unidad._id)) return false;
        const paso = unidad.pasos[indicePasoActual(unidad.pasos)];
        if (!paso || paso.estado !== "LISTO") return false;
        if (verTodo) return true;
        if (unidad.asignadoAId && unidad.asignadoAId === sesion.uid) return true;
        return rolPuedeHacerPaso(sesion.rolClave, paso);
      });

    const [enCursoConProblemas, listasConProblemas] = await Promise.all([
      conIncidencias(enCurso),
      conIncidencias(listas),
    ]);

    return {
      enCurso: ordenarPorUrgencia(enCursoConProblemas),
      listas: ordenarPorUrgencia(listasConProblemas),
    };
  } catch (error) {
    console.error("[data/fabricacion] getMiTrabajo:", error);
    return MI_TRABAJO_VACIO;
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * PROBLEMAS (INCIDENCIAS)
 * ──────────────────────────────────────────────────────────────────────────── */

function construirConsultaIncidencias(
  filtros: FiltrosIncidencias
): FilterQuery<Incidencia> {
  const condiciones: FilterQuery<Incidencia>[] = [];

  if (filtros.estado) condiciones.push({ estado: filtros.estado });
  if (filtros.severidad) condiciones.push({ severidad: filtros.severidad });
  if (filtros.unidadCodigo) {
    condiciones.push({
      unidadCodigo:
        normalizarCodigo(filtros.unidadCodigo) ?? filtros.unidadCodigo.toUpperCase(),
    });
  }
  if (filtros.reportadaPorId) condiciones.push({ reportadaPorId: filtros.reportadaPorId });

  const rango = rangoFechas(filtros.desde, filtros.hasta);
  if (rango) condiciones.push({ createdAt: rango });

  if (filtros.busqueda?.trim()) {
    const patron = patronBusqueda(filtros.busqueda);
    condiciones.push({
      $or: [
        { motivo: patron },
        { descripcion: patron },
        { unidadCodigo: patron },
        { reportadaPorNombre: patron },
      ],
    });
  }

  return condiciones.length > 0 ? { $and: condiciones } : {};
}

export async function listarIncidencias(
  filtros: FiltrosIncidencias = {}
): Promise<IncidenciaDTO[]> {
  try {
    await connectDB();

    const { salto, limite } = paginacion(filtros.pagina, filtros.porPagina, 200);

    /*
     * Primero lo abierto y, dentro de eso, lo más grave y lo más reciente.
     * La gravedad va por peso numérico y no por su texto: ordenar "ALTA",
     * "MEDIA" y "BAJA" alfabéticamente al revés daría MEDIA, BAJA, ALTA y
     * dejaría los problemas graves al final de la bandeja.
     */
    const etapas: PipelineStage[] = [
      { $match: construirConsultaIncidencias(filtros) },
      {
        $addFields: {
          pesoSeveridad: {
            $switch: {
              branches: [
                { case: { $eq: ["$severidad", "ALTA"] }, then: 3 },
                { case: { $eq: ["$severidad", "MEDIA"] }, then: 2 },
              ],
              default: 1,
            },
          },
        },
      },
      { $sort: { estado: 1, pesoSeveridad: -1, createdAt: -1, _id: -1 } },
      { $skip: salto },
      { $limit: limite },
      { $unset: "pesoSeveridad" },
    ];

    const docs = await IncidenciaModel.aggregate<Doc>(etapas);
    return docs.map(serializarIncidencia);
  } catch (error) {
    console.error("[data/fabricacion] listarIncidencias:", error);
    return [];
  }
}

export async function contarIncidencias(
  filtros: FiltrosIncidencias = {}
): Promise<number> {
  try {
    await connectDB();
    return await IncidenciaModel.countDocuments(construirConsultaIncidencias(filtros));
  } catch (error) {
    console.error("[data/fabricacion] contarIncidencias:", error);
    return 0;
  }
}

export async function getIncidencia(id: string): Promise<IncidenciaDTO | null> {
  if (!id || !esObjectId(id)) return null;

  try {
    await connectDB();
    const doc = await IncidenciaModel.findById(id).lean();
    return doc ? serializarIncidencia(doc) : null;
  } catch (error) {
    console.error("[data/fabricacion] getIncidencia:", error);
    return null;
  }
}

/** Los problemas sin resolver de un mueble: lo que le impide avanzar. */
export async function getIncidenciasAbiertas(unidadId: string): Promise<IncidenciaDTO[]> {
  if (!unidadId || !esObjectId(unidadId)) return [];

  try {
    await connectDB();
    const docs = await IncidenciaModel.find({
      unidadId: new Types.ObjectId(unidadId),
      estado: "ABIERTA",
    })
      .sort({ createdAt: -1, _id: -1 })
      .lean();

    return docs.map(serializarIncidencia);
  } catch (error) {
    console.error("[data/fabricacion] getIncidenciasAbiertas:", error);
    return [];
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * BITÁCORA DEL TALLER Y AUDITORÍA DE CONFIGURACIÓN
 * ──────────────────────────────────────────────────────────────────────────── */

/** La línea de tiempo de un mueble, lo más reciente arriba. */
export async function getEventosUnidad(
  unidadId: string,
  limite = 200
): Promise<EventoDTO[]> {
  if (!unidadId) return [];

  try {
    await connectDB();

    // Sirve tanto el id como el código del QR, que es lo que suele tenerse a mano.
    const consulta = esObjectId(unidadId)
      ? { unidadId: new Types.ObjectId(unidadId) }
      : { unidadCodigo: normalizarCodigo(unidadId) ?? unidadId.toUpperCase() };

    /*
     * `_id` desempata: en el taller llegan varios eventos dentro del mismo
     * segundo (empezar y terminar un paso corto) y ordenar sólo por fecha
     * dejaría la línea de tiempo en un orden distinto en cada consulta. Los
     * ObjectId crecen con el tiempo, así que sirven de segundo criterio.
     */
    const docs = await EventoUnidadModel.find(consulta)
      .sort({ createdAt: -1, _id: -1 })
      .limit(Math.min(Math.max(limite, 1), 500))
      .lean();

    return docs.map(serializarEvento);
  } catch (error) {
    console.error("[data/fabricacion] getEventosUnidad:", error);
    return [];
  }
}

function construirConsultaAuditoria(
  filtros: FiltrosAuditoria
): FilterQuery<RegistroAuditoria> {
  const condiciones: FilterQuery<RegistroAuditoria>[] = [];

  if (filtros.entidad) condiciones.push({ entidad: filtros.entidad });
  if (filtros.entidadId) condiciones.push({ entidadId: filtros.entidadId });
  if (filtros.accion) condiciones.push({ accion: filtros.accion });
  if (filtros.actorId) condiciones.push({ actorId: filtros.actorId });

  const rango = rangoFechas(filtros.desde, filtros.hasta);
  if (rango) condiciones.push({ createdAt: rango });

  if (filtros.busqueda?.trim()) {
    const patron = patronBusqueda(filtros.busqueda);
    condiciones.push({
      $or: [
        { descripcion: patron },
        { entidadNombre: patron },
        { actorNombre: patron },
      ],
    });
  }

  return condiciones.length > 0 ? { $and: condiciones } : {};
}

/** El historial de cambios de configuración: quién tocó qué y cuándo. */
export async function listarAuditoria(
  filtros: FiltrosAuditoria = {}
): Promise<RegistroAuditoriaDTO[]> {
  try {
    await connectDB();

    const { salto, limite } = paginacion(filtros.pagina, filtros.porPagina, 200);
    const docs = await RegistroAuditoriaModel.find(construirConsultaAuditoria(filtros))
      // `_id` desempata los registros escritos en el mismo instante.
      .sort({ createdAt: -1, _id: -1 })
      .skip(salto)
      .limit(limite)
      .lean();

    return docs.map(serializarAuditoria);
  } catch (error) {
    console.error("[data/fabricacion] listarAuditoria:", error);
    return [];
  }
}

export async function contarAuditoria(filtros: FiltrosAuditoria = {}): Promise<number> {
  try {
    await connectDB();
    return await RegistroAuditoriaModel.countDocuments(construirConsultaAuditoria(filtros));
  } catch (error) {
    console.error("[data/fabricacion] contarAuditoria:", error);
    return 0;
  }
}

/** "Todo lo que le ha pasado a esta ruta / a esta persona / a este rol". */
export async function getAuditoriaDeEntidad(
  entidad: EntidadAuditoria,
  entidadId: string,
  limite = 50
): Promise<RegistroAuditoriaDTO[]> {
  if (!entidadId) return [];

  try {
    await connectDB();
    const docs = await RegistroAuditoriaModel.find({ entidad, entidadId })
      .sort({ createdAt: -1, _id: -1 })
      .limit(Math.min(Math.max(limite, 1), 500))
      .lean();

    return docs.map(serializarAuditoria);
  } catch (error) {
    console.error("[data/fabricacion] getAuditoriaDeEntidad:", error);
    return [];
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * INDICADORES DEL TABLERO (UN SOLO $facet)
 * ──────────────────────────────────────────────────────────────────────────── */

const RESUMEN_VACIO: ResumenFabricacion = {
  totalUnidades: 0,
  enProceso: 0,
  terminadas: 0,
  entregadas: 0,
  conIncidencia: 0,
  retrasadas: 0,
  progresoPromedio: 0,
  porPaso: [],
  porEstado: [],
  entregasProximas: [],
  tiempoPromedioPorPasoHoras: [],
};

interface ResultadoResumen {
  porEstado: { _id: string | null; cantidad: number }[];
  progreso: { promedio: number | null }[];
  retrasadas: { cantidad: number }[];
  porPaso: { _id: string | null; nombre?: string; color?: string; cantidad: number }[];
  entregasProximas: {
    codigo?: string;
    clienteNombre?: string;
    producto?: string;
    fechaPrometida?: Date | null;
    prioridad?: string;
  }[];
  tiempoPorPaso: { _id: string | null; nombre?: string; promedioMs: number }[];
}

const MS_POR_DIA = 1000 * 60 * 60 * 24;

/**
 * Los números de la cabecera del panel. **Una sola ida a la base**: un `$facet`
 * calcula a la vez los totales por estado, el progreso medio, los retrasos, el
 * reparto por paso, las entregas próximas y el tiempo medio por paso (que sale
 * de `$unwind` + `$avg` sobre la `duracionMs` de los pasos ya completados).
 */
export async function getResumenFabricacion(): Promise<ResumenFabricacion> {
  try {
    await connectDB();
    const ahora = new Date();

    const etapas: PipelineStage[] = [
      { $match: { eliminada: { $ne: true } } },
      {
        $facet: {
          porEstado: [{ $group: { _id: "$estado", cantidad: { $sum: 1 } } }],
          progreso: [
            { $match: { estado: { $nin: ["CANCELADA"] } } },
            { $group: { _id: null, promedio: { $avg: "$progreso" } } },
          ],
          retrasadas: [
            {
              $match: {
                fechaPrometida: { $ne: null, $lt: ahora },
                estado: { $nin: ["ENTREGADA", "CANCELADA"] },
              },
            },
            { $count: "cantidad" },
          ],
          porPaso: [
            { $match: { estado: { $in: ["PENDIENTE", "EN_PROCESO", "PAUSADA", "INCIDENCIA"] } } },
            {
              $addFields: {
                pasoActual: {
                  $arrayElemAt: ["$pasos", { $ifNull: ["$pasoActualIndex", 0] }],
                },
              },
            },
            { $match: { "pasoActual.clave": { $exists: true, $ne: null } } },
            {
              $group: {
                _id: "$pasoActual.clave",
                nombre: { $first: "$pasoActual.nombre" },
                color: { $first: "$pasoActual.color" },
                cantidad: { $sum: 1 },
              },
            },
            { $sort: { cantidad: -1 } },
          ],
          entregasProximas: [
            {
              $match: {
                fechaPrometida: { $ne: null },
                estado: { $nin: ["ENTREGADA", "CANCELADA"] },
              },
            },
            { $sort: { fechaPrometida: 1 } },
            { $limit: 8 },
            {
              $project: {
                _id: 0,
                codigo: 1,
                clienteNombre: 1,
                producto: "$producto.titulo",
                fechaPrometida: 1,
                prioridad: 1,
              },
            },
          ],
          tiempoPorPaso: [
            { $unwind: "$pasos" },
            { $match: { "pasos.estado": "COMPLETADO", "pasos.duracionMs": { $gt: 0 } } },
            {
              $group: {
                _id: "$pasos.clave",
                nombre: { $first: "$pasos.nombre" },
                promedioMs: { $avg: "$pasos.duracionMs" },
              },
            },
            { $sort: { promedioMs: -1 } },
            { $limit: 20 },
          ],
        },
      },
    ];

    const [resultado] = await UnidadFabricacionModel.aggregate<ResultadoResumen>(etapas);
    if (!resultado) return RESUMEN_VACIO;

    const conteos = new Map<string, number>(
      resultado.porEstado.map((fila) => [String(fila._id), fila.cantidad])
    );
    const totalUnidades = [...conteos.values()].reduce((total, n) => total + n, 0);

    return {
      totalUnidades,
      enProceso: conteos.get("EN_PROCESO") ?? 0,
      terminadas: conteos.get("TERMINADA") ?? 0,
      entregadas: conteos.get("ENTREGADA") ?? 0,
      conIncidencia: conteos.get("INCIDENCIA") ?? 0,
      retrasadas: resultado.retrasadas[0]?.cantidad ?? 0,
      progresoPromedio: Math.round(resultado.progreso[0]?.promedio ?? 0),
      porPaso: resultado.porPaso
        .filter((fila) => fila._id)
        .map((fila) => ({
          clave: String(fila._id),
          nombre: cadena(fila.nombre, String(fila._id)),
          color: cadena(fila.color, "#E8511A"),
          cantidad: fila.cantidad,
        })),
      porEstado: ESTADOS_UNIDAD.map((estado) => ({
        estado,
        etiqueta: META_ESTADO_UNIDAD[estado].label,
        cantidad: conteos.get(estado) ?? 0,
      })),
      entregasProximas: resultado.entregasProximas.map((fila) => {
        const fecha = fechaIso(fila.fechaPrometida);
        return {
          codigo: cadena(fila.codigo),
          clienteNombre: cadena(fila.clienteNombre),
          producto: cadena(fila.producto),
          fechaPrometida: fecha,
          diasRestantes: fecha
            ? Math.ceil((new Date(fecha).getTime() - ahora.getTime()) / MS_POR_DIA)
            : 0,
          prioridad: unaDe(fila.prioridad, PRIORIDADES, "NORMAL"),
        };
      }),
      tiempoPromedioPorPasoHoras: resultado.tiempoPorPaso
        .filter((fila) => fila._id)
        .map((fila) => ({
          clave: String(fila._id),
          nombre: cadena(fila.nombre, String(fila._id)),
          horas: Math.round((fila.promedioMs / 3_600_000) * 10) / 10,
        })),
    };
  } catch (error) {
    console.error("[data/fabricacion] getResumenFabricacion:", error);
    return RESUMEN_VACIO;
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * DEPENDENCIAS ANTES DE ELIMINAR (§7)
 *
 * Lo que convierte un borrado en algo "pulido" en vez de un error críptico.
 * Contrato para `lib/actions/fabricacion.ts`:
 *
 *   · `puedeEliminar: false` ⇒ NO se toca nada; se enseña `motivo` y
 *     `sugerencia` tal cual, que ya vienen en español llano.
 *   · `puedeEliminar: true` y `dependencias` VACÍO ⇒ no hay historial colgando:
 *     se permite el borrado FÍSICO (auditado antes de borrar).
 *   · `puedeEliminar: true` con dependencias ⇒ hay historial: borrado LÓGICO
 *     (`eliminado`/`archivada`), y el diálogo enseña la lista para que nadie
 *     borre a ciegas.
 *
 * Ante un fallo de conexión devuelven `puedeEliminar: false`: nunca se borra a
 * ciegas por culpa de una consulta que no respondió.
 * ──────────────────────────────────────────────────────────────────────────── */

function bloqueo(motivo: string, sugerencia: string): DependenciasEliminacion {
  return { puedeEliminar: false, motivo, sugerencia, dependencias: [] };
}

const ERROR_DEPENDENCIAS = bloqueo(
  "No pudimos comprobar si algo depende de esto.",
  "Vuelve a intentarlo en un momento."
);

/** "1 persona" / "3 personas" — sin el clásico "3 persona(s)". */
function plural(cantidad: number, singular: string, plural_: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : plural_}`;
}

export async function dependenciasDeRol(clave: string): Promise<DependenciasEliminacion> {
  if (!clave?.trim()) return ERROR_DEPENDENCIAS;

  try {
    await connectDB();
    const referencia = clave.trim().toLowerCase();

    const rol = await RolModel.findOne({ clave: referencia }).lean();
    if (!rol) {
      return bloqueo("Ese rol ya no existe.", "Actualiza la página para ver la lista al día.");
    }

    if (rol.esSistema || referencia === "admin") {
      return bloqueo(
        `El rol «${cadena(rol.nombre, referencia)}» es del sistema y no se puede eliminar.`,
        "Puedes cambiarle el nombre y la descripción, pero no quitarlo: es lo que garantiza que siempre haya alguien que pueda entrar."
      );
    }

    const [personas, pasosCatalogo, rutas] = await Promise.all([
      OperarioModel.countDocuments({ rolClave: referencia, eliminado: { $ne: true } }),
      CatalogoPasoModel.countDocuments({ rolesPermitidos: referencia }),
      RutaFabricacionModel.countDocuments({ "pasos.rolesPermitidos": referencia }),
    ]);

    const dependencias: DependenciasEliminacion["dependencias"] = [];
    if (personas > 0) {
      dependencias.push({
        etiqueta: `${plural(personas, "persona tiene", "personas tienen")} este rol`,
        cantidad: personas,
      });
    }
    if (pasosCatalogo > 0) {
      dependencias.push({
        etiqueta: `${plural(pasosCatalogo, "paso del catálogo lo exige", "pasos del catálogo lo exigen")}`,
        cantidad: pasosCatalogo,
      });
    }
    if (rutas > 0) {
      dependencias.push({
        etiqueta: `${plural(rutas, "ruta lo exige", "rutas lo exigen")} en alguno de sus pasos`,
        cantidad: rutas,
      });
    }

    const nombreRol = cadena(rol.nombre, referencia);

    if (personas > 0) {
      return {
        puedeEliminar: false,
        motivo: `No se puede eliminar el rol «${nombreRol}» porque ${plural(personas, "persona lo tiene", "personas lo tienen")}.`,
        sugerencia: "Cámbiales el rol primero y vuelve a intentarlo.",
        dependencias,
      };
    }

    /*
     * Un rol también se queda «pegado» dentro de `rolesPermitidos`, tanto en
     * los pasos del catálogo como en los de las rutas. Si se borrase el rol
     * dejando esas claves, `rolPuedeHacerPaso` vería una lista de permitidos
     * que ya no coincide con el rol de NADIE y el paso quedaría cerrado para
     * todo el taller. Por eso también frena aquí: primero se quita el rol de
     * esos pasos, después se borra.
     */
    if (pasosCatalogo > 0 || rutas > 0) {
      const partes: string[] = [];
      if (pasosCatalogo > 0) {
        partes.push(plural(pasosCatalogo, "paso del catálogo", "pasos del catálogo"));
      }
      if (rutas > 0) partes.push(plural(rutas, "ruta", "rutas"));

      return {
        puedeEliminar: false,
        motivo: `No se puede eliminar el rol «${nombreRol}» porque ${partes.join(" y ")} lo exigen para poder trabajar.`,
        sugerencia:
          "Quita ese rol de esos pasos (o déjalos abiertos a cualquiera) y vuelve a intentarlo. Si lo borráramos ahora, esos pasos se quedarían sin nadie que pudiera hacerlos.",
        dependencias,
      };
    }

    return { puedeEliminar: true, dependencias };
  } catch (error) {
    console.error("[data/fabricacion] dependenciasDeRol:", error);
    return ERROR_DEPENDENCIAS;
  }
}

export async function dependenciasDeOperario(id: string): Promise<DependenciasEliminacion> {
  if (!id || !esObjectId(id)) return ERROR_DEPENDENCIAS;

  try {
    await connectDB();
    const objectId = new Types.ObjectId(id);

    const [pasosEnCurso, asignadas, eventos] = await Promise.all([
      UnidadFabricacionModel.countDocuments({
        eliminada: { $ne: true },
        pasos: { $elemMatch: { estado: "EN_CURSO", iniciadoPorId: id } },
      }),
      UnidadFabricacionModel.countDocuments({
        asignadoAId: objectId,
        eliminada: { $ne: true },
        estado: { $in: ESTADOS_ACTIVOS },
      }),
      EventoUnidadModel.countDocuments({ operarioId: id }),
    ]);

    const dependencias: DependenciasEliminacion["dependencias"] = [];
    if (pasosEnCurso > 0) {
      dependencias.push({
        etiqueta: `${plural(pasosEnCurso, "mueble tiene", "muebles tienen")} un paso empezado por esta persona`,
        cantidad: pasosEnCurso,
      });
    }
    if (asignadas > 0) {
      dependencias.push({
        etiqueta: `${plural(asignadas, "mueble asignado", "muebles asignados")}`,
        cantidad: asignadas,
      });
    }
    if (eventos > 0) {
      dependencias.push({
        etiqueta: `${plural(eventos, "anotación suya", "anotaciones suyas")} en el historial`,
        cantidad: eventos,
      });
    }

    if (pasosEnCurso > 0) {
      return {
        puedeEliminar: false,
        motivo: `No se puede eliminar todavía: ${plural(pasosEnCurso, "mueble tiene", "muebles tienen")} un paso empezado por esta persona.`,
        sugerencia: "Pídele que lo termine, o deshaz esos pasos, y vuelve a intentarlo.",
        dependencias,
      };
    }

    return {
      puedeEliminar: true,
      dependencias,
      sugerencia:
        eventos > 0
          ? "Se quitará de los listados, pero su historial se conserva entero: seguirá diciendo quién hizo cada cosa."
          : undefined,
    };
  } catch (error) {
    console.error("[data/fabricacion] dependenciasDeOperario:", error);
    return ERROR_DEPENDENCIAS;
  }
}

export async function dependenciasDeEstacion(id: string): Promise<DependenciasEliminacion> {
  if (!id || !esObjectId(id)) return ERROR_DEPENDENCIAS;

  try {
    await connectDB();
    const objectId = new Types.ObjectId(id);

    const [unidadesAqui, pasosCatalogo, rutas, personas] = await Promise.all([
      UnidadFabricacionModel.countDocuments({
        ubicacionActualId: objectId,
        eliminada: { $ne: true },
        estado: { $in: ESTADOS_ACTIVOS },
      }),
      CatalogoPasoModel.countDocuments({ estacionId: objectId }),
      RutaFabricacionModel.countDocuments({ "pasos.estacionId": objectId }),
      OperarioModel.countDocuments({ estacionesIds: objectId, eliminado: { $ne: true } }),
    ]);

    const dependencias: DependenciasEliminacion["dependencias"] = [];
    if (unidadesAqui > 0) {
      dependencias.push({
        etiqueta: `${plural(unidadesAqui, "mueble está", "muebles están")} ahora en esta área`,
        cantidad: unidadesAqui,
      });
    }
    if (pasosCatalogo > 0) {
      dependencias.push({
        etiqueta: `${plural(pasosCatalogo, "paso del catálogo se hace", "pasos del catálogo se hacen")} aquí`,
        cantidad: pasosCatalogo,
      });
    }
    if (rutas > 0) {
      dependencias.push({
        etiqueta: `${plural(rutas, "ruta pasa", "rutas pasan")} por esta área`,
        cantidad: rutas,
      });
    }
    if (personas > 0) {
      dependencias.push({
        etiqueta: `${plural(personas, "persona trabaja", "personas trabajan")} aquí`,
        cantidad: personas,
      });
    }

    if (unidadesAqui > 0) {
      return {
        puedeEliminar: false,
        motivo: `No se puede eliminar el área porque ${plural(unidadesAqui, "mueble está", "muebles están")} ahí ahora mismo.`,
        sugerencia: "Muévelos a otra área o espera a que salgan. Mientras tanto puedes desactivarla para que no aparezca en las listas.",
        dependencias,
      };
    }

    return {
      puedeEliminar: true,
      dependencias,
      sugerencia:
        pasosCatalogo + rutas > 0
          ? "Se quitará de los listados; los pasos que la usaban se quedarán sin área hasta que les pongas otra."
          : undefined,
    };
  } catch (error) {
    console.error("[data/fabricacion] dependenciasDeEstacion:", error);
    return ERROR_DEPENDENCIAS;
  }
}

export async function dependenciasDePasoCatalogo(
  id: string
): Promise<DependenciasEliminacion> {
  if (!id?.trim()) return ERROR_DEPENDENCIAS;

  try {
    await connectDB();
    const referencia = id.trim();

    const doc = esObjectId(referencia)
      ? await CatalogoPasoModel.findById(referencia).lean()
      : await CatalogoPasoModel.findOne({ clave: referencia.toLowerCase() }).lean();

    if (!doc) {
      return bloqueo("Ese paso ya no existe.", "Actualiza la página para ver la lista al día.");
    }

    const clave = cadena(doc.clave);
    const nombre = cadena(doc.nombre, clave);

    const [rutas, unidades] = await Promise.all([
      RutaFabricacionModel.countDocuments({ "pasos.clave": clave }),
      UnidadFabricacionModel.countDocuments({
        "pasos.clave": clave,
        eliminada: { $ne: true },
      }),
    ]);

    const dependencias: DependenciasEliminacion["dependencias"] = [];
    if (rutas > 0) {
      dependencias.push({
        etiqueta: `${plural(rutas, "ruta lo usa", "rutas lo usan")}`,
        cantidad: rutas,
      });
    }
    if (unidades > 0) {
      dependencias.push({
        etiqueta: `${plural(unidades, "mueble lo lleva", "muebles lo llevan")} en su hoja de ruta`,
        cantidad: unidades,
      });
    }

    if (doc.esSistema) {
      return {
        puedeEliminar: false,
        motivo: `El paso «${nombre}» viene con el sistema y no se puede eliminar.`,
        sugerencia: "Puedes editarlo o desactivarlo para que no aparezca al armar rutas nuevas.",
        dependencias,
      };
    }

    if (rutas > 0) {
      return {
        puedeEliminar: false,
        motivo: `No se puede eliminar «${nombre}» porque ${plural(rutas, "ruta lo usa", "rutas lo usan")}.`,
        sugerencia: "Quítalo primero de esas rutas, o desactívalo para que no se pueda añadir a rutas nuevas.",
        dependencias,
      };
    }

    return {
      puedeEliminar: true,
      dependencias,
      sugerencia:
        unidades > 0
          ? "Los muebles que ya lo llevan no cambian: cada mueble guarda su propia copia de los pasos."
          : undefined,
    };
  } catch (error) {
    console.error("[data/fabricacion] dependenciasDePasoCatalogo:", error);
    return ERROR_DEPENDENCIAS;
  }
}

export async function dependenciasDeRuta(id: string): Promise<DependenciasEliminacion> {
  if (!id || !esObjectId(id)) return ERROR_DEPENDENCIAS;

  try {
    await connectDB();
    const objectId = new Types.ObjectId(id);

    const doc = await RutaFabricacionModel.findById(objectId).select({ nombre: 1 }).lean();
    if (!doc) {
      return bloqueo("Esa ruta ya no existe.", "Actualiza la página para ver la lista al día.");
    }

    const [unidades, enCurso] = await Promise.all([
      UnidadFabricacionModel.countDocuments({ rutaId: objectId, eliminada: { $ne: true } }),
      UnidadFabricacionModel.countDocuments({
        rutaId: objectId,
        eliminada: { $ne: true },
        estado: { $in: ["PENDIENTE", "EN_PROCESO", "PAUSADA", "INCIDENCIA"] },
      }),
    ]);

    const dependencias: DependenciasEliminacion["dependencias"] = [];
    if (unidades > 0) {
      dependencias.push({
        etiqueta: `${plural(unidades, "mueble se lanzó", "muebles se lanzaron")} con esta ruta`,
        cantidad: unidades,
      });
    }
    if (enCurso > 0) {
      dependencias.push({
        etiqueta: `${plural(enCurso, "sigue", "siguen")} en fabricación`,
        cantidad: enCurso,
      });
    }

    if (unidades > 0) {
      return {
        puedeEliminar: false,
        motivo: `No se puede eliminar la ruta «${cadena(doc.nombre)}» porque ${plural(unidades, "mueble se fabricó", "muebles se fabricaron")} con ella.`,
        sugerencia: "Archívala: deja de ofrecerse para muebles nuevos y el historial se conserva entero.",
        dependencias,
      };
    }

    return { puedeEliminar: true, dependencias };
  } catch (error) {
    console.error("[data/fabricacion] dependenciasDeRuta:", error);
    return ERROR_DEPENDENCIAS;
  }
}

export async function dependenciasDePedido(id: string): Promise<DependenciasEliminacion> {
  if (!id || !esObjectId(id)) return ERROR_DEPENDENCIAS;

  try {
    await connectDB();
    const objectId = new Types.ObjectId(id);

    // Los muebles que alguien ya eliminó de los listados TAMBIÉN cuentan: se
    // eliminaron en lógico justamente porque conservan historial, así que el
    // pedido nunca puede borrarse de verdad y llevárselos por delante.
    const [total, iniciadas, eliminadas] = await Promise.all([
      UnidadFabricacionModel.countDocuments({ pedidoId: objectId, eliminada: { $ne: true } }),
      UnidadFabricacionModel.countDocuments({
        pedidoId: objectId,
        eliminada: { $ne: true },
        estado: { $nin: ["PENDIENTE", "CANCELADA"] },
      }),
      UnidadFabricacionModel.countDocuments({ pedidoId: objectId, eliminada: true }),
    ]);

    const dependencias: DependenciasEliminacion["dependencias"] = [];
    if (total > 0) {
      dependencias.push({
        etiqueta: `${plural(total, "mueble en este pedido", "muebles en este pedido")}`,
        cantidad: total,
      });
    }
    if (eliminadas > 0) {
      dependencias.push({
        etiqueta: `${plural(
          eliminadas,
          "mueble eliminado que conserva su historial",
          "muebles eliminados que conservan su historial"
        )}`,
        cantidad: eliminadas,
      });
    }
    if (iniciadas > 0) {
      dependencias.push({
        etiqueta: `${plural(iniciadas, "ya empezó", "ya empezaron")} a fabricarse`,
        cantidad: iniciadas,
      });
    }

    if (iniciadas > 0) {
      return {
        puedeEliminar: false,
        motivo: `No se puede eliminar el pedido porque ${plural(iniciadas, "mueble ya empezó", "muebles ya empezaron")} a fabricarse.`,
        sugerencia: "Cancélalo: los muebles quedan cancelados y todo el historial se conserva.",
        dependencias,
      };
    }

    return {
      puedeEliminar: true,
      dependencias,
      sugerencia:
        total > 0
          ? "Se quitará de los listados junto con sus muebles, que todavía no han empezado."
          : eliminadas > 0
            ? "Se quitará de los listados; el historial de sus muebles eliminados se conserva."
            : undefined,
    };
  } catch (error) {
    console.error("[data/fabricacion] dependenciasDePedido:", error);
    return ERROR_DEPENDENCIAS;
  }
}

export async function dependenciasDeUnidad(id: string): Promise<DependenciasEliminacion> {
  if (!id || !esObjectId(id)) return ERROR_DEPENDENCIAS;

  try {
    await connectDB();
    const objectId = new Types.ObjectId(id);

    const doc = await UnidadFabricacionModel.findById(objectId)
      .select({ codigo: 1, estado: 1, progreso: 1 })
      .lean();

    if (!doc) {
      return bloqueo("Ese mueble ya no existe.", "Actualiza la página para ver la lista al día.");
    }

    const [eventos, incidencias] = await Promise.all([
      EventoUnidadModel.countDocuments({ unidadId: objectId }),
      IncidenciaModel.countDocuments({ unidadId: objectId }),
    ]);

    const estado = unaDe(doc.estado, ESTADOS_UNIDAD, "PENDIENTE");
    const progreso = numero(doc.progreso);
    const yaEmpezo = estado !== "PENDIENTE" && estado !== "CANCELADA";

    const dependencias: DependenciasEliminacion["dependencias"] = [];
    if (eventos > 0) {
      dependencias.push({
        etiqueta: `${plural(eventos, "anotación en su historial", "anotaciones en su historial")}`,
        cantidad: eventos,
      });
    }
    if (incidencias > 0) {
      dependencias.push({
        etiqueta: `${plural(incidencias, "problema reportado", "problemas reportados")}`,
        cantidad: incidencias,
      });
    }

    if (yaEmpezo || progreso > 0) {
      return {
        puedeEliminar: false,
        motivo: `El mueble ${cadena(doc.codigo)} ya empezó a fabricarse (${META_ESTADO_UNIDAD[estado].label.toLowerCase()}).`,
        sugerencia: "Cancélalo en vez de eliminarlo: así se conserva todo lo que ya se hizo.",
        dependencias,
      };
    }

    return {
      puedeEliminar: true,
      dependencias,
      sugerencia:
        dependencias.length > 0
          ? "Se quitará de los listados; su historial se conserva por si hay que consultarlo."
          : undefined,
    };
  } catch (error) {
    console.error("[data/fabricacion] dependenciasDeUnidad:", error);
    return ERROR_DEPENDENCIAS;
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * SEGUIMIENTO DEL CLIENTE — APAGADO POR DEFECTO
 * ──────────────────────────────────────────────────────────────────────────── */

/** Un hito visible para el cliente: sólo lo que él tiene que saber. */
export interface HitoSeguimiento {
  nombre: string;
  hecho: boolean;
  fecha: string | null;
}

/**
 * TODO lo que ve un cliente desde fuera. Es un tipo propio y deliberadamente
 * pobre: si un campo no está aquí, no puede filtrarse por accidente.
 */
export interface SeguimientoPublicoDTO {
  codigo: string;
  mueble: string;
  imagen: string;
  /** Sólo el primer nombre: "Hola, María". */
  clienteNombre: string;
  estado: string;
  estadoDescripcion: string;
  /** 0..100 */
  progreso: number;
  fechaPrometida: string | null;
  hitos: HitoSeguimiento[];
}

/**
 * Seguimiento para el cliente. **Apagado salvo que
 * `NEXT_PUBLIC_FABRICA_SEGUIMIENTO_PUBLICO` valga exactamente "true"**, y esa
 * variable sólo se lee en `seguimientoPublicoActivo()`.
 *
 * REGLA DE PRIVACIDAD (se audita): aquí NUNCA salen teléfono, cédula,
 * dirección, correo, precio, notas internas, nombres de operarios ni fotos del
 * taller. La proyección es por INCLUSIÓN a propósito: lo que no se nombra, no
 * se lee de la base. Añadir un campo tiene que costar tocar esta línea.
 */
export async function getSeguimientoPublico(
  codigo: string
): Promise<SeguimientoPublicoDTO | null> {
  if (!seguimientoPublicoActivo()) return null;
  if (typeof codigo !== "string" || codigo.trim() === "") return null;

  try {
    await connectDB();
    const canonico = normalizarCodigo(codigo);
    if (!canonico) return null;

    const doc = await UnidadFabricacionModel.findOne(
      { codigo: canonico, eliminada: { $ne: true } },
      {
        _id: 0,
        codigo: 1,
        estado: 1,
        progreso: 1,
        fechaPrometida: 1,
        clienteNombre: 1,
        "producto.titulo": 1,
        "producto.imagen": 1,
        "pasos.nombre": 1,
        "pasos.estado": 1,
        "pasos.completadoAt": 1,
        "pasos.notificaCliente": 1,
      }
    ).lean();

    if (!doc) return null;

    const d = comoDoc(doc);
    const estado = unaDe(d.estado, ESTADOS_UNIDAD, "PENDIENTE");
    const meta = META_ESTADO_UNIDAD[estado];
    const producto = comoDoc(d.producto);

    const hitos: HitoSeguimiento[] = listaDeDocs(d.pasos)
      .filter((paso) => bandera(paso.notificaCliente))
      .map((paso) => {
        const estadoPaso = unaDe(paso.estado, ESTADOS_PASO, "BLOQUEADO");
        return {
          nombre: cadena(paso.nombre),
          hecho: estadoPaso === "COMPLETADO" || estadoPaso === "OMITIDO",
          fecha: fechaIso(paso.completadoAt),
        };
      });

    return {
      codigo: cadena(d.codigo),
      mueble: cadena(producto.titulo),
      imagen: cadena(producto.imagen),
      // Sólo el primer nombre: ni apellidos ni ningún otro dato del cliente.
      clienteNombre: cadena(d.clienteNombre).trim().split(/\s+/)[0] ?? "",
      estado: meta.label,
      estadoDescripcion: meta.descripcion,
      progreso: numero(d.progreso),
      fechaPrometida: fechaIso(d.fechaPrometida),
      hitos,
    };
  } catch (error) {
    console.error("[data/fabricacion] getSeguimientoPublico:", error);
    return null;
  }
}
