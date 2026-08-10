import mongoose from "mongoose";

/**
 * Conexión a MongoDB Atlas con caché global.
 *
 * En desarrollo, Next.js recarga los módulos en cada cambio (HMR), lo que
 * crearía conexiones nuevas sin cerrar las anteriores. En serverless (Vercel),
 * cada invocación reutiliza el contenedor si está caliente. En ambos casos la
 * solución es cachear la conexión en `globalThis`.
 */

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? {
  conn: null,
  promise: null,
};

global.mongooseCache = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error(
      "Falta la variable de entorno MONGODB_URI. Copia .env.example a .env.local y configúrala."
    );
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      maxPoolSize: 10,
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}
