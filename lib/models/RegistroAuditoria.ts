import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { ACCIONES_AUDITORIA, ENTIDADES_AUDITORIA } from "@/lib/types/fabricacion";

/**
 * Un campo que cambió, con los valores YA formateados como texto legible
 * ("Prioridad: Normal → Urgente"). Se guarda formateado, no en crudo, para que
 * el historial se lea igual dentro de un año aunque el código haya cambiado.
 */
const CambioSchema = new Schema(
  {
    campo: { type: String, required: true },
    /** Nombre del campo en español llano: "Fecha prometida". */
    etiqueta: { type: String, default: "" },
    antes: { type: String, default: "" },
    despues: { type: String, default: "" },
  },
  { _id: false }
);

/**
 * BITÁCORA DE CONFIGURACIÓN — sólo se añade, nunca se edita ni se borra.
 *
 * REGLA DURA del dueño: toda action que cree, modifique o elimine cualquier
 * entidad del módulo escribe aquí su registro con el diff campo a campo. Es lo
 * que permite responder "¿quién cambió esto y cuándo?" sin discusiones.
 */
const RegistroAuditoriaSchema = new Schema(
  {
    // `entidad`, `entidadId` y `actorId` van indexados como prefijos de los
    // compuestos de más abajo; no se declaran `index: true` aparte.
    entidad: { type: String, enum: [...ENTIDADES_AUDITORIA], required: true },
    /** Id de la entidad tocada, como texto (puede no ser un ObjectId). */
    entidadId: { type: String, default: "" },
    entidadNombre: { type: String, default: "" },
    accion: { type: String, enum: [...ACCIONES_AUDITORIA], required: true },
    actorId: { type: String, default: "" },
    actorNombre: { type: String, required: true },
    /** Clave del rol que tenía el actor en ese momento, congelada. */
    actorRol: { type: String, default: "" },
    /** Frase completa: "Cami editó la ruta «Sofá tapizado completo»". */
    descripcion: { type: String, required: true },
    cambios: { type: [CambioSchema], default: [] },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true, collection: "registros_auditoria" }
);

// Historial de una entidad concreta ("todo lo que le pasó a este rol").
RegistroAuditoriaSchema.index({ entidad: 1, entidadId: 1, createdAt: -1 });
// El mismo historial cuando sólo se tiene el id.
RegistroAuditoriaSchema.index({ entidadId: 1, createdAt: -1 });
// "Qué ha tocado esta persona".
RegistroAuditoriaSchema.index({ actorId: 1, createdAt: -1 });
// Filtro por tipo de acción (ELIMINAR, RESET_PIN, INTENTO_FALLIDO...).
RegistroAuditoriaSchema.index({ accion: 1, createdAt: -1 });
// Historial general, lo más reciente primero.
RegistroAuditoriaSchema.index({ createdAt: -1 });

/**
 * `metadata` es `Mixed` en la base (forma libre), pero fuera se expone como
 * `Record<string, unknown>` para no arrastrar un `any` por todo el módulo.
 */
export type RegistroAuditoria = Omit<
  InferSchemaType<typeof RegistroAuditoriaSchema>,
  "metadata"
> & { metadata?: Record<string, unknown> };

export type CambioAuditoriaDoc = InferSchemaType<typeof CambioSchema>;

const RegistroAuditoriaModel: Model<RegistroAuditoria> =
  (mongoose.models.RegistroAuditoria as Model<RegistroAuditoria>) ??
  mongoose.model<RegistroAuditoria>(
    "RegistroAuditoria",
    RegistroAuditoriaSchema
  );

export default RegistroAuditoriaModel;
