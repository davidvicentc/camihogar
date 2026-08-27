import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { camposPasoPlantilla } from "@/lib/models/CatalogoPaso";
import { ESTADOS_PASO, ESTADOS_UNIDAD, PRIORIDADES } from "@/lib/types/fabricacion";

/** Una casilla de la lista de comprobación, ya marcada (o no) por el operario. */
const ChecklistRespuestaSchema = new Schema(
  {
    texto: { type: String, required: true },
    ok: { type: Boolean, default: false },
  },
  { _id: false }
);

/**
 * Copia congelada del producto en el momento de lanzar el mueble a fábrica.
 * Si mañana cambian el precio o el título en el catálogo de la tienda, la
 * ficha de este mueble sigue diciendo lo que se le prometió al cliente.
 */
const ProductoSnapshotSchema = new Schema(
  {
    titulo: { type: String, required: true, trim: true },
    categoria: { type: String, default: "" },
    imagen: { type: String, default: "" },
    tela: { type: String, default: "" },
    acabado: { type: String, default: "" },
    configuracion: { type: String, default: "" },
    medidas: { type: String, default: "" },
    /** Se oculta (null en el DTO) a quien no tenga la capacidad `ver_precios`. */
    precio: { type: Number, default: null },
  },
  { _id: false }
);

/**
 * SNAPSHOT CONGELADO de un paso dentro de un mueble concreto: TODOS los campos
 * de la plantilla (instrucciones, requisitos, roles permitidos...) MÁS el
 * progreso real (quién lo empezó, quién lo terminó, las fotos, la nota).
 *
 * Se copia entero a propósito: editar la ruta después NO cambia los muebles ya
 * lanzados. Es la garantía de que un mueble se fabrica como se decidió el día
 * que se pidió.
 */
export const PasoUnidadSchema = new Schema(
  {
    ...camposPasoPlantilla,
    estado: { type: String, enum: [...ESTADOS_PASO], default: "BLOQUEADO" },
    iniciadoAt: { type: Date, default: null },
    completadoAt: { type: Date, default: null },
    iniciadoPorId: { type: String, default: "" },
    iniciadoPorNombre: { type: String, default: "" },
    completadoPorId: { type: String, default: "" },
    completadoPorNombre: { type: String, default: "" },
    fotos: { type: [String], default: [] },
    nota: { type: String, default: "" },
    firmaUrl: { type: String, default: "" },
    checklistRespuestas: { type: [ChecklistRespuestaSchema], default: [] },
    /** Milisegundos entre iniciar y terminar: alimenta el tiempo medio por paso. */
    duracionMs: { type: Number, default: 0, min: 0 },
    motivoOmision: { type: String, default: "" },
    escaneadoAt: { type: Date, default: null },
    escaneadoPorId: { type: String, default: "" },
  },
  { _id: false }
);

/**
 * COLECCIÓN CENTRAL: un mueble concreto en fabricación, `COD-949473`.
 *
 * El QR de su etiqueta lleva sólo `{siteUrl}/f/COD-949473`. Decisión del
 * dueño: NO hay `qrToken` ni nada parecido; la seguridad es tener la sesión
 * iniciada más la auditoría completa.
 *
 * Campos denormalizados a propósito (`pedidoCodigo`, `clienteNombre`,
 * `rutaNombre`, `asignadoANombre`, `ubicacionActualNombre`): el tablero pinta
 * cientos de fichas y no puede resolver un nombre por consulta. Quien cambie
 * el id DEBE actualizar el nombre en la misma operación.
 *
 * Borrado (§7): un mueble que ya empezó no se destruye, se CANCELA o se marca
 * `eliminada` (borrado lógico) y se puede restaurar.
 */
const UnidadFabricacionSchema = new Schema(
  {
    /** `COD-` + 6 dígitos, del contador atómico. `unique` ya crea su índice. */
    codigo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    pedidoId: { type: Schema.Types.ObjectId, ref: "Pedido", required: true },
    pedidoCodigo: { type: String, default: "", trim: true, uppercase: true },
    clienteNombre: { type: String, default: "" },
    productoId: { type: Schema.Types.ObjectId, ref: "Product", default: null },
    producto: { type: ProductoSnapshotSchema, required: true },
    rutaId: {
      type: Schema.Types.ObjectId,
      ref: "RutaFabricacion",
      default: null,
    },
    rutaNombre: { type: String, default: "" },
    rutaVersion: { type: Number, default: 1, min: 1 },
    /** El camino congelado del mueble, con su progreso paso a paso. */
    pasos: { type: [PasoUnidadSchema], default: [] },
    estado: { type: String, enum: [...ESTADOS_UNIDAD], default: "PENDIENTE" },
    pasoActualIndex: { type: Number, default: 0, min: 0 },
    /** 0..100, recalculado en cada transición. */
    progreso: { type: Number, default: 0, min: 0, max: 100 },
    asignadoAId: { type: Schema.Types.ObjectId, ref: "Operario", default: null },
    /** Denormalizado: mantener en sincronía con `asignadoAId`. */
    asignadoANombre: { type: String, default: "" },
    ubicacionActualId: {
      type: Schema.Types.ObjectId,
      ref: "Estacion",
      default: null,
    },
    /** Denormalizado: mantener en sincronía con `ubicacionActualId`. */
    ubicacionActualNombre: { type: String, default: "" },
    prioridad: { type: String, enum: [...PRIORIDADES], default: "NORMAL" },
    fechaPrometida: { type: Date, default: null },
    iniciadoAt: { type: Date, default: null },
    terminadoAt: { type: Date, default: null },
    entregadoAt: { type: Date, default: null },
    notas: { type: String, default: "" },
    /** Borrado lógico: fuera de los listados, dentro del historial. */
    eliminada: { type: Boolean, default: false },
    eliminadaAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "unidades_fabricacion" }
);

// Cola principal del tablero: por estado, lo más urgente y lo que vence antes.
UnidadFabricacionSchema.index({ estado: 1, prioridad: -1, fechaPrometida: 1 });
// Columnas del kanban: "qué muebles están en el paso X y cómo van".
UnidadFabricacionSchema.index({ "pasos.clave": 1, "pasos.estado": 1 });
// "Mi trabajo": lo que tiene asignado una persona.
UnidadFabricacionSchema.index({ asignadoAId: 1, estado: 1 });
// Los muebles de un pedido, en el orden en que se crearon.
UnidadFabricacionSchema.index({ pedidoId: 1, createdAt: 1 });
// Búsqueda desde el mostrador.
UnidadFabricacionSchema.index({ pedidoCodigo: 1 });
UnidadFabricacionSchema.index({ clienteNombre: 1 });
// "Qué hay ahora mismo en esta área" y dependencia al eliminarla.
UnidadFabricacionSchema.index({ ubicacionActualId: 1, estado: 1 });
// Listado general y vista "Ver eliminados".
UnidadFabricacionSchema.index({ eliminada: 1, estado: 1, updatedAt: -1 });
// Orden por prioridad y por fecha de entrega (muebles retrasados).
UnidadFabricacionSchema.index({ prioridad: -1, fechaPrometida: 1 });
UnidadFabricacionSchema.index({ fechaPrometida: 1, estado: 1 });
// "¿Alguna unidad usa esta ruta?" — dependencia al archivarla o eliminarla.
UnidadFabricacionSchema.index({ rutaId: 1 });

export type UnidadFabricacion = InferSchemaType<typeof UnidadFabricacionSchema>;
export type PasoUnidad = InferSchemaType<typeof PasoUnidadSchema>;
export type ProductoSnapshot = InferSchemaType<typeof ProductoSnapshotSchema>;

const UnidadFabricacionModel: Model<UnidadFabricacion> =
  (mongoose.models.UnidadFabricacion as Model<UnidadFabricacion>) ??
  mongoose.model<UnidadFabricacion>(
    "UnidadFabricacion",
    UnidadFabricacionSchema
  );

export default UnidadFabricacionModel;
