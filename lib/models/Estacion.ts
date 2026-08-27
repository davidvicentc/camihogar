import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { TIPOS_ESTACION } from "@/lib/types/fabricacion";

/**
 * Área de trabajo: un taller, un almacén, un camión o una tienda. Los pasos
 * apuntan a la estación donde se hacen y los muebles guardan dónde están.
 *
 * Borrado lógico (§7): una estación con historial no se destruye, se marca
 * `eliminada` y se puede restaurar. Sólo se borra de verdad si nadie la usa.
 */
const EstacionSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true },
    tipo: { type: String, enum: [...TIPOS_ESTACION], required: true },
    direccion: { type: String, default: "" },
    telefono: { type: String, default: "" },
    activa: { type: Boolean, default: true },
    /** Borrado lógico: desaparece de los listados, conserva la trazabilidad. */
    eliminada: { type: Boolean, default: false },
    eliminadaAt: { type: Date, default: null },
    orden: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "estaciones" }
);

// Listado normal y vista "Ver eliminados".
EstacionSchema.index({ eliminada: 1, activa: 1, orden: 1 });
// Selector de áreas por tipo (TALLER, ALMACEN, TRANSPORTE, TIENDA).
EstacionSchema.index({ tipo: 1, activa: 1 });
// Sólo las activas, en orden, para los desplegables.
EstacionSchema.index({ activa: 1, orden: 1 });

export type Estacion = InferSchemaType<typeof EstacionSchema>;

const EstacionModel: Model<Estacion> =
  (mongoose.models.Estacion as Model<Estacion>) ??
  mongoose.model<Estacion>("Estacion", EstacionSchema);

export default EstacionModel;
