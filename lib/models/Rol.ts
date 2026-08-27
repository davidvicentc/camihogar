import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { CAPACIDADES } from "@/lib/types/fabricacion";

/**
 * Rol del equipo. Decisión del dueño: los roles NO son un enum del código,
 * son DATOS editables desde el panel (crear, editar, duplicar, activar,
 * desactivar, eliminar). Lo único cableado es el catálogo de CAPACIDADES,
 * porque cada capacidad corresponde a código real.
 *
 * `clave` es el identificador estable que guardan `Operario.rolClave` y
 * `paso.rolesPermitidos`. Se puede renombrar el rol sin romper nada; cambiar
 * la clave, no (la action que lo permita tendría que migrar las referencias).
 *
 * Criterio de índices en todos los modelos de fabricación: cuando un campo es
 * la PRIMERA clave de un índice compuesto no se le pone además `index: true`,
 * porque el compuesto ya sirve las consultas por ese campo (prefijo) y
 * declararlo aparte sería un índice de más.
 */
const RolSchema = new Schema(
  {
    /** Slug estable en minúsculas: "carpintero". `unique` ya crea su índice. */
    clave: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, default: "" },
    color: { type: String, default: "#E8511A" },
    /** Nombre de icono que resuelve `iconoDeRol()`. */
    icono: { type: String, default: "user" },
    /** Claves de CAPACIDADES marcadas con las casillas del panel. */
    capacidades: { type: [String], enum: [...CAPACIDADES], default: [] },
    /** El rol `admin`: no se puede eliminar ni desactivar (seguro anti-bloqueo). */
    esSistema: { type: Boolean, default: false },
    activo: { type: Boolean, default: true },
    orden: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "roles" }
);

// Listado del panel: primero los activos, en el orden que fijó el admin.
RolSchema.index({ activo: 1, orden: 1 });
// "¿Qué roles pueden gestionar usuarios?" — lo usa el seguro anti-bloqueo.
RolSchema.index({ capacidades: 1 });

export type Rol = InferSchemaType<typeof RolSchema>;

const RolModel: Model<Rol> =
  (mongoose.models.Rol as Model<Rol>) ?? mongoose.model<Rol>("Rol", RolSchema);

export default RolModel;
