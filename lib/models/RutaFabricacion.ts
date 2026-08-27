import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { camposPasoPlantilla } from "@/lib/models/CatalogoPaso";

/**
 * Un paso tal y como vive DENTRO de una ruta: la copia de los campos del
 * catálogo, sin `_id` propio. Se copia y no se referencia a propósito, para
 * que retocar un paso del catálogo no cambie el camino de una ruta ya en uso
 * sin que nadie lo decida.
 */
export const PasoPlantillaSchema = new Schema(
  { ...camposPasoPlantilla },
  { _id: false }
);

/**
 * Ruta de fabricación: el camino ordenado de pasos que sigue un tipo de mueble
 * ("Sofá tapizado completo"). El panel la arma con botones subir/bajar/quitar.
 *
 * Borrado (§7): una ruta que ya lanzó muebles no se destruye, se ARCHIVA
 * (`archivada: true`) y se puede restaurar. Sólo se borra de verdad si ninguna
 * unidad la usa.
 */
const RutaFabricacionSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, default: "" },
    /** Categoría de producto para la que se sugiere. */
    categoriaSugerida: { type: String, default: "" },
    /** Sube cada vez que se edita: las unidades guardan con qué versión salieron. */
    version: { type: Number, default: 1, min: 1 },
    activa: { type: Boolean, default: true },
    /** Borrado lógico de las rutas: se archiva, nunca se pierde el histórico. */
    archivada: { type: Boolean, default: false },
    archivadaAt: { type: Date, default: null },
    /** La que se propone sola al crear un mueble sin ruta explícita. */
    esPredeterminada: { type: Boolean, default: false },
    pasos: { type: [PasoPlantillaSchema], default: [] },
    creadaPorId: { type: String, default: "" },
    creadaPorNombre: { type: String, default: "" },
  },
  { timestamps: true, collection: "rutas_fabricacion" }
);

// Listado de rutas y vista "Ver archivadas".
RutaFabricacionSchema.index({ archivada: 1, activa: 1, nombre: 1 });
// Selector al crear un mueble: activas, con la predeterminada arriba.
RutaFabricacionSchema.index({ activa: 1, esPredeterminada: -1, nombre: 1 });
// "¿Qué rutas usan este paso del catálogo?" — dependencia al eliminarlo.
RutaFabricacionSchema.index({ "pasos.clave": 1 });
// "¿Qué rutas pasan por esta área?" — dependencia al eliminar una estación.
RutaFabricacionSchema.index({ "pasos.estacionId": 1 });

export type RutaFabricacion = InferSchemaType<typeof RutaFabricacionSchema>;
export type PasoPlantilla = InferSchemaType<typeof PasoPlantillaSchema>;

const RutaFabricacionModel: Model<RutaFabricacion> =
  (mongoose.models.RutaFabricacion as Model<RutaFabricacion>) ??
  mongoose.model<RutaFabricacion>("RutaFabricacion", RutaFabricacionSchema);

export default RutaFabricacionModel;
