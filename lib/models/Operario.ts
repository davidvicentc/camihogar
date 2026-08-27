import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Persona del equipo que entra a la app del taller con su PIN.
 *
 * Dos cosas importantes:
 *  1. `rolClave` es un String que apunta a `Rol.clave`. NO hay enum de roles:
 *     los roles son una colección editable.
 *  2. `pinHash` y `pinSalt` son campos normales (los necesita el inicio de
 *     sesión), pero JAMÁS deben salir del servidor: `serializarOperario`
 *     nunca los copia al DTO y los listados deben proyectarlos fuera.
 *
 * Borrado lógico (§7): una persona con historial nunca se destruye. Se marca
 * `eliminado` y se puede restaurar, para que los eventos y la auditoría sigan
 * diciendo quién hizo cada cosa.
 */
const OperarioSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true },
    /** Opcional, pero único cuando existe: `sparse` deja convivir los vacíos. */
    codigoEmpleado: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },
    /** Hash scrypt del PIN de 4-6 dígitos. Nunca cruza al cliente. */
    pinHash: { type: String, required: true },
    /** Sal propia de esta persona. Nunca cruza al cliente. */
    pinSalt: { type: String, required: true },
    /** Clave del rol, no un enum: apunta a `Rol.clave`. */
    rolClave: { type: String, required: true, trim: true, lowercase: true },
    /** Áreas donde trabaja habitualmente. */
    estacionesIds: {
      type: [Schema.Types.ObjectId],
      ref: "Estacion",
      default: [],
    },
    telefono: { type: String, default: "" },
    colorAvatar: { type: String, default: "#E8511A" },
    fotoUrl: { type: String, default: "" },
    activo: { type: Boolean, default: true },
    /** Borrado lógico: fuera de los listados, dentro del historial. */
    eliminado: { type: Boolean, default: false },
    eliminadoAt: { type: Date, default: null },
    ultimoAccesoAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "operarios" }
);

// Listado del equipo y vista "Ver eliminados".
OperarioSchema.index({ eliminado: 1, activo: 1, nombre: 1 });
// Selector de personas activas (asignar responsable, pantalla de login).
OperarioSchema.index({ activo: 1, nombre: 1 });
// "¿Cuántas personas tienen este rol?" — lo pide el diálogo de borrado de roles.
OperarioSchema.index({ rolClave: 1, eliminado: 1 });
// "¿Alguien trabaja en esta área?" — dependencia al eliminar una estación.
OperarioSchema.index({ estacionesIds: 1 });

export type Operario = InferSchemaType<typeof OperarioSchema>;

const OperarioModel: Model<Operario> =
  (mongoose.models.Operario as Model<Operario>) ??
  mongoose.model<Operario>("Operario", OperarioSchema);

export default OperarioModel;
