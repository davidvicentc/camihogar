import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { TIPOS_EVENTO } from "@/lib/types/fabricacion";

/**
 * BITÁCORA DEL PISO DE TALLER — sólo se añade, nunca se edita ni se borra.
 *
 * Decisión del dueño: "deja anotado siempre quién edita algo". Cada cosa que
 * le pasa a un mueble deja aquí una línea legible ("David inició «Armado de
 * estructura»"), con quién, cuándo, dónde y con qué fotos.
 *
 * Los datos de la persona y del paso se copian (no se referencian) para que la
 * historia siga contando lo mismo aunque después se renombre un paso o se dé
 * de baja a una persona.
 */
const EventoUnidadSchema = new Schema(
  {
    // `unidadId` queda indexado como prefijo del compuesto de más abajo; no se
    // declara `index: true` aparte para no duplicar el índice.
    unidadId: {
      type: Schema.Types.ObjectId,
      ref: "UnidadFabricacion",
      required: true,
    },
    unidadCodigo: { type: String, default: "", trim: true, uppercase: true },
    tipo: { type: String, enum: [...TIPOS_EVENTO], required: true },
    pasoClave: { type: String, default: "" },
    pasoNombre: { type: String, default: "" },
    operarioId: { type: String, default: "" },
    operarioNombre: { type: String, default: "" },
    /** Clave del rol que tenía en ese momento, congelada. */
    operarioRol: { type: String, default: "" },
    /** Frase completa en español, lista para pintar en la línea de tiempo. */
    descripcion: { type: String, required: true },
    fotos: { type: [String], default: [] },
    /** Datos sueltos del evento (motivo, valores anteriores...). Sin forma fija. */
    metadata: { type: Schema.Types.Mixed },
    estacionId: { type: Schema.Types.ObjectId, ref: "Estacion", default: null },
    estacionNombre: { type: String, default: "" },
  },
  { timestamps: true, collection: "eventos_unidad" }
);

// Línea de tiempo de un mueble: lo más reciente arriba.
EventoUnidadSchema.index({ unidadId: 1, createdAt: -1 });
// La misma línea de tiempo llegando por el código del QR.
EventoUnidadSchema.index({ unidadCodigo: 1, createdAt: -1 });
// Filtro por tipo de evento.
EventoUnidadSchema.index({ tipo: 1, createdAt: -1 });
// "Qué ha hecho hoy esta persona".
EventoUnidadSchema.index({ operarioId: 1, createdAt: -1 });
// Actividad reciente de toda la fábrica.
EventoUnidadSchema.index({ createdAt: -1 });

/**
 * `metadata` es `Mixed` en la base (forma libre), pero fuera se expone como
 * `Record<string, unknown>` para no arrastrar un `any` por todo el módulo.
 */
export type EventoUnidad = Omit<
  InferSchemaType<typeof EventoUnidadSchema>,
  "metadata"
> & { metadata?: Record<string, unknown> };

const EventoUnidadModel: Model<EventoUnidad> =
  (mongoose.models.EventoUnidad as Model<EventoUnidad>) ??
  mongoose.model<EventoUnidad>("EventoUnidad", EventoUnidadSchema);

export default EventoUnidadModel;
