import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Contadores atómicos para los códigos legibles del módulo de Fabricación:
 * `PED-100248` para pedidos y `COD-949473` para muebles.
 *
 * Es la única colección sin `timestamps`: un contador no tiene historia, sólo
 * un número que crece. La unicidad bajo concurrencia la garantiza MongoDB con
 * un único `findOneAndUpdate` + `$inc` (operación atómica sobre el documento),
 * no el código de la aplicación.
 */
const CounterSchema = new Schema({
  /** Nombre del contador: "pedido", "unidad". */
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export type Counter = InferSchemaType<typeof CounterSchema>;

const CounterModel: Model<Counter> =
  (mongoose.models.Counter as Model<Counter>) ??
  mongoose.model<Counter>("Counter", CounterSchema);

/**
 * Devuelve el siguiente número de la secuencia `nombre`, creándola si no
 * existía. Atómico: si cien procesos la piden a la vez, cada uno recibe un
 * número distinto y no hay huecos ni repeticiones.
 *
 * El llamante debe haber hecho `connectDB()` antes (la conexión del repo va
 * con `bufferCommands: false`); los modelos no abren conexiones por su cuenta.
 */
export async function siguienteSecuencia(nombre: string): Promise<number> {
  const contador = await CounterModel.findOneAndUpdate(
    { _id: nombre },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  // Con `upsert` + `new` el documento siempre vuelve; el `?? 1` es sólo el
  // seguro para que el tipo de retorno sea un número de verdad.
  return contador?.seq ?? 1;
}

export default CounterModel;
