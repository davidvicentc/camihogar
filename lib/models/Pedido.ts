import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import {
  CANALES,
  ESTADOS_PEDIDO,
  PRIORIDADES,
} from "@/lib/types/fabricacion";

/**
 * Datos del cliente, embebidos en el pedido. Se guardan aquí y no en una
 * colección aparte porque son los datos DE ESE ENCARGO: si el cliente cambia
 * de teléfono el año que viene, el pedido viejo debe seguir contando lo que
 * pasó entonces.
 */
const ClienteSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true },
    telefono: { type: String, required: true, trim: true },
    cedula: { type: String, default: "" },
    direccion: { type: String, default: "" },
    ciudad: { type: String, default: "" },
    email: { type: String, default: "" },
  },
  { _id: false }
);

/**
 * Pedido de un cliente: `PED-100248`. Agrupa uno o varios muebles
 * (`UnidadFabricacion`), cada uno con su propio código y su propia ruta.
 *
 * Borrado (§7): un pedido que ya empezó a fabricarse no se destruye, se
 * CANCELA o se marca `eliminado` (borrado lógico) y se puede restaurar.
 */
const PedidoSchema = new Schema(
  {
    /** `PED-` + 6 dígitos, del contador atómico. `unique` ya crea su índice. */
    codigo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    cliente: { type: ClienteSchema, required: true },
    canal: { type: String, enum: [...CANALES], default: "WHATSAPP" },
    prioridad: { type: String, enum: [...PRIORIDADES], default: "NORMAL" },
    fechaPrometida: { type: Date, default: null },
    notas: { type: String, default: "" },
    estado: { type: String, enum: [...ESTADOS_PEDIDO], default: "ABIERTO" },
    creadoPorId: { type: String, default: "" },
    creadoPorNombre: { type: String, default: "" },
    totalUnidades: { type: Number, default: 0, min: 0 },
    unidadesCompletadas: { type: Number, default: 0, min: 0 },
    /** Borrado lógico: fuera de los listados, dentro del historial. */
    eliminado: { type: Boolean, default: false },
    eliminadoAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "pedidos" }
);

// Listado de pedidos y vista "Ver eliminados".
PedidoSchema.index({ eliminado: 1, estado: 1, createdAt: -1 });
// Filtro por estado, lo más reciente primero.
PedidoSchema.index({ estado: 1, createdAt: -1 });
// Cola de trabajo: lo más urgente y lo que vence antes.
PedidoSchema.index({ prioridad: -1, fechaPrometida: 1 });
// Entregas próximas y pedidos retrasados.
PedidoSchema.index({ fechaPrometida: 1 });
// Búsqueda por cliente (el caso más habitual en el mostrador).
PedidoSchema.index({ "cliente.telefono": 1 });
PedidoSchema.index({ "cliente.nombre": 1 });

export type Pedido = InferSchemaType<typeof PedidoSchema>;
export type ClientePedido = InferSchemaType<typeof ClienteSchema>;

const PedidoModel: Model<Pedido> =
  (mongoose.models.Pedido as Model<Pedido>) ??
  mongoose.model<Pedido>("Pedido", PedidoSchema);

export default PedidoModel;
