import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { TIPOS_PASO } from "@/lib/types/fabricacion";

/**
 * Punto de una lista de comprobación de un paso ("Revisar que no haya
 * astillas"). Va embebido, sin `_id` propio: es texto, no una entidad.
 */
export const ChecklistItemSchema = new Schema(
  {
    texto: { type: String, required: true, trim: true },
    obligatorio: { type: Boolean, default: true },
  },
  { _id: false }
);

/**
 * DEFINICIÓN COMPARTIDA DE UN PASO — la fuente única de la verdad.
 *
 * Estos mismos campos se usan en tres sitios y por eso viven aquí sueltos, no
 * dentro de un esquema ya construido (un `Schema` de mongoose no se puede
 * "extender" conservando la inferencia de tipos, pero un objeto de campos se
 * esparce con `...` y TypeScript sigue infiriendo bien):
 *
 *  1. `CatalogoPaso`            → el paso reutilizable, editable desde el panel.
 *  2. `RutaFabricacion.pasos[]` → la copia que la ruta guarda de ese paso.
 *  3. `UnidadFabricacion.pasos[]` → el SNAPSHOT CONGELADO del mueble, que
 *     además lleva los campos de progreso. Editar la ruta después NO cambia
 *     los muebles ya lanzados: por eso se copia todo, no se referencia.
 *
 * Ojo: `clave` aquí NO es única (una ruta y un mueble repiten claves del
 * catálogo). La unicidad se declara sólo en `CatalogoPasoSchema`.
 */
export const camposPasoPlantilla = {
  /** Slug estable del paso: "corte_madera". */
  clave: { type: String, required: true, trim: true, lowercase: true },
  nombre: { type: String, required: true, trim: true },
  /** Instrucciones en frases cortas, para leerlas en el móvil del taller. */
  instrucciones: { type: String, default: "" },
  /** Nombre de icono que resuelve `iconoDePaso()`. */
  icono: { type: String, default: "clipboard-list" },
  color: { type: String, default: "#E8511A" },
  tipo: { type: String, enum: [...TIPOS_PASO], default: "TRABAJO" },
  estacionId: { type: Schema.Types.ObjectId, ref: "Estacion", default: null },
  /** Claves de `Rol` que pueden hacerlo. Vacío = cualquiera que pueda trabajar. */
  rolesPermitidos: { type: [String], default: [] },
  requiereFoto: { type: Boolean, default: false },
  minFotos: { type: Number, default: 1, min: 0 },
  /** Handoff: hay que leer el código del mueble con la cámara para continuar. */
  requiereEscaneo: { type: Boolean, default: false },
  requiereFirma: { type: Boolean, default: false },
  requiereNota: { type: Boolean, default: false },
  checklist: { type: [ChecklistItemSchema], default: [] },
  horasEstimadas: { type: Number, default: 0, min: 0 },
  /** Puede empezar cuando el anterior sólo está en curso, sin esperar a que acabe. */
  permiteParalelo: { type: Boolean, default: false },
  permiteOmitir: { type: Boolean, default: false },
  notificaCliente: { type: Boolean, default: false },
};

/**
 * Catálogo de pasos reutilizables. Se siembra desde `PASOS_SUGERIDOS`, pero es
 * editable: se pueden añadir pasos propios y quitar los que no se usen.
 *
 * Los sembrados llevan `esSistema: true`: se pueden editar y desactivar, pero
 * no eliminar, para que las rutas de ejemplo nunca se queden huérfanas.
 */
const CatalogoPasoSchema = new Schema(
  {
    ...camposPasoPlantilla,
    // Aquí sí es único: es el identificador del paso en el catálogo.
    // `unique` ya crea su índice, no hace falta declararlo aparte.
    clave: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    esSistema: { type: Boolean, default: false },
    activo: { type: Boolean, default: true },
    orden: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "catalogo_pasos" }
);

// Listado del catálogo y selector para construir rutas.
CatalogoPasoSchema.index({ activo: 1, orden: 1 });
// Filtro por tipo de paso (TRABAJO, CONTROL, TRANSPORTE, ESPERA, ENTREGA).
CatalogoPasoSchema.index({ tipo: 1, activo: 1 });
// "¿Algún paso usa esta área?" — dependencia al eliminar una estación.
CatalogoPasoSchema.index({ estacionId: 1 });
// "¿Algún paso exige este rol?" — dependencia al eliminar un rol.
CatalogoPasoSchema.index({ rolesPermitidos: 1 });

export type CatalogoPaso = InferSchemaType<typeof CatalogoPasoSchema>;

const CatalogoPasoModel: Model<CatalogoPaso> =
  (mongoose.models.CatalogoPaso as Model<CatalogoPaso>) ??
  mongoose.model<CatalogoPaso>("CatalogoPaso", CatalogoPasoSchema);

export default CatalogoPasoModel;
