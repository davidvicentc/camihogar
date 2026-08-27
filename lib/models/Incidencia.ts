import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { ESTADOS_INCIDENCIA, SEVERIDADES } from "@/lib/types/fabricacion";

/**
 * Un problema avisado desde el taller ("la tela vino manchada"). Mientras haya
 * una incidencia ABIERTA sobre un mueble, sus pasos no avanzan: es el freno de
 * mano que evita seguir fabricando sobre un error.
 *
 * No tiene borrado lógico: se resuelve (queda RESUELTA, con quién y cómo). El
 * borrado físico sólo se permite si se avisó por equivocación, y queda anotado
 * en `RegistroAuditoria` antes de borrarla.
 */
const IncidenciaSchema = new Schema(
  {
    // `unidadId`, `estado` y `severidad` van indexados como prefijos de los
    // compuestos de más abajo; no se declaran `index: true` aparte.
    unidadId: {
      type: Schema.Types.ObjectId,
      ref: "UnidadFabricacion",
      required: true,
    },
    unidadCodigo: { type: String, default: "", trim: true, uppercase: true },
    pasoClave: { type: String, default: "" },
    pasoNombre: { type: String, default: "" },
    /** Frase corta que eligió o escribió el operario. */
    motivo: { type: String, required: true, trim: true },
    descripcion: { type: String, default: "" },
    severidad: { type: String, enum: [...SEVERIDADES], default: "MEDIA" },
    fotos: { type: [String], default: [] },
    reportadaPorId: { type: String, default: "" },
    reportadaPorNombre: { type: String, default: "" },
    estado: {
      type: String,
      enum: [...ESTADOS_INCIDENCIA],
      default: "ABIERTA",
    },
    resueltaPorId: { type: String, default: "" },
    resueltaPorNombre: { type: String, default: "" },
    /** Cómo se solucionó, en español llano. Obligatorio al cerrarla. */
    resolucion: { type: String, default: "" },
    resueltaAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "incidencias" }
);

// "¿Este mueble tiene problemas sin resolver?" — la comprobación más frecuente.
IncidenciaSchema.index({ unidadId: 1, estado: 1 });
// Bandeja de problemas: primero los abiertos y los más graves.
IncidenciaSchema.index({ estado: 1, severidad: -1, createdAt: -1 });
// Filtro por gravedad.
IncidenciaSchema.index({ severidad: 1, createdAt: -1 });
// Llegando por el código del QR.
IncidenciaSchema.index({ unidadCodigo: 1, estado: 1 });
// "Qué ha avisado esta persona".
IncidenciaSchema.index({ reportadaPorId: 1, createdAt: -1 });

export type Incidencia = InferSchemaType<typeof IncidenciaSchema>;

const IncidenciaModel: Model<Incidencia> =
  (mongoose.models.Incidencia as Model<Incidencia>) ??
  mongoose.model<Incidencia>("Incidencia", IncidenciaSchema);

export default IncidenciaModel;
