/**
 * Suite de humo del módulo de Fabricación — los 22 casos del §11 del contrato.
 *
 * Uso:  npm run test:fabrica
 *
 * ── ESTRATEGIA (y por qué esta y no otra) ───────────────────────────────────
 *
 * Lo que hay que probar son las SERVER ACTIONS de verdad: son ellas las que
 * comprueban las capacidades, aplican la política de borrado, escriben la
 * auditoría y resuelven la concurrencia. Un test que reimplementara su lógica
 * no probaría nada (pasaría siempre, aunque las actions estuvieran rotas).
 *
 * El único obstáculo es que una action usa dos cosas que sólo existen dentro de
 * una petición de Next: `cookies()` (de `next/headers`) y `revalidatePath()`
 * (de `next/cache`). Así que se sustituyen ESOS DOS MÓDULOS, y nada más,
 * interceptando `Module._load` ANTES de importar el código del módulo:
 *
 *   · `next/headers` → un almacén de cookies en memoria.
 *   · `next/cache`   → `revalidatePath` que sólo cuenta llamadas.
 *
 * Todo lo demás corre tal cual está escrito, contra MongoDB de verdad:
 *
 *   · La sesión NO se falsea. Se escribe en el almacén de cookies un token
 *     REAL, firmado con `crearTokenOperario`, y `getSesionOperario` hace su
 *     trabajo completo: verifica la firma, lee el rol de la base y resuelve las
 *     capacidades. Por eso el caso 20 (quitar un permiso surte efecto sin
 *     reloguear) prueba de verdad la cadena entera, cache de roles incluida.
 *   · Para el dueño entrando con la cookie del panel se escribe una cookie de
 *     admin real, firmada con `createSessionToken()` de `lib/auth.ts`.
 *   · Las reglas puras (`reglas.ts`), los códigos, el PIN y el seguimiento
 *     público se prueban llamándolos directamente: no necesitan andamiaje.
 *
 * ── BASE DE DATOS ───────────────────────────────────────────────────────────
 *
 * SIEMPRE `camihogar_test` (nunca la de desarrollo): `MONGODB_URI` se
 * sobreescribe ANTES de importar nada que conecte, y el script se niega a
 * arrancar si el nombre de la base no acaba en `_test`. Se limpia al empezar y
 * al terminar.
 */

import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import mongoose from "mongoose";

/* ════════════════════════════════════════════════════════════════════════════
 * 1. ENTORNO — antes de que se cargue una sola línea del módulo
 * ════════════════════════════════════════════════════════════════════════════ */

const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^\s*([\w.]+)\s*=\s*"?([^"#]*)"?\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  }
}

/** Base separada. Se puede apuntar a otra con MONGODB_TEST_URI. */
const URI_PRUEBAS =
  process.env.MONGODB_TEST_URI ?? "mongodb://127.0.0.1:27017/camihogar_test";

if (!/_test(\?|$)/.test(URI_PRUEBAS)) {
  console.error(
    `✖ La base de pruebas tiene que llamarse algo terminado en «_test» y es «${URI_PRUEBAS}». No se ejecuta nada.`
  );
  process.exit(1);
}

process.env.MONGODB_URI = URI_PRUEBAS;
process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? "secreto-de-pruebas-camihogar";
process.env.SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";
// El seguimiento público arranca APAGADO: el caso 15 lo enciende a mano.
process.env.NEXT_PUBLIC_FABRICA_SEGUIMIENTO_PUBLICO = "false";

/* ════════════════════════════════════════════════════════════════════════════
 * 2. SUSTITUTOS DE next/headers Y next/cache
 * ════════════════════════════════════════════════════════════════════════════ */

/** Las cookies del "navegador" de esta suite. */
const cookiesFalsas = new Map<string, string>();

const almacenCookies = {
  get(nombre: string): { name: string; value: string } | undefined {
    const valor = cookiesFalsas.get(nombre);
    return valor === undefined ? undefined : { name: nombre, value: valor };
  },
  getAll(): { name: string; value: string }[] {
    return [...cookiesFalsas].map(([name, value]) => ({ name, value }));
  },
  has(nombre: string): boolean {
    return cookiesFalsas.has(nombre);
  },
  set(nombre: string, valor: string): void {
    cookiesFalsas.set(nombre, valor);
  },
  delete(nombre: string): void {
    cookiesFalsas.delete(nombre);
  },
};

/** Cuántas veces pidió el módulo refrescar una pantalla. */
let revalidaciones = 0;

/**
 * Se sustituyen las DOS funciones que sólo existen dentro de una petición de
 * Next, y nada más.
 *
 * Se hace mutando el `module.exports` de `next/headers` y `next/cache` — que
 * son CommonJS de una línea, con propiedades escribibles — ANTES de que el
 * módulo cargue nada del proyecto. Así vale tanto para el `import` estático de
 * `sesion-fabrica.ts` como para el `await import("next/headers")` de
 * `auth.ts`: los dos acaban leyendo este mismo objeto (la fachada ESM que Node
 * construye para un CommonJS copia sus exportaciones la primera vez que se
 * importa, y para entonces ya están sustituidas).
 *
 * Interceptar `Module._load` NO basta: el `import()` dinámico pasa por el
 * cargador de ESM, que resuelve el especificador a una ruta absoluta antes de
 * pedir el módulo, así que nunca se ve la cadena "next/headers".
 */
interface ModuloHeaders {
  cookies: () => Promise<typeof almacenCookies>;
}
interface ModuloCache {
  revalidatePath: (ruta: string, tipo?: string) => void;
  revalidateTag: (etiqueta: string) => void;
}

// `createRequire` en vez de `require` a secas: el proyecto es TypeScript con
// módulos ESM y el linter no admite `require()` suelto.
const requerir = createRequire(resolve(process.cwd(), "package.json"));

const headersReales = requerir("next/headers") as ModuloHeaders;
headersReales.cookies = async () => almacenCookies;

const cacheReal = requerir("next/cache") as ModuloCache;
cacheReal.revalidatePath = (): void => {
  revalidaciones += 1;
};
cacheReal.revalidateTag = (): void => {
  revalidaciones += 1;
};

/* ════════════════════════════════════════════════════════════════════════════
 * 3. MÓDULOS DEL PROYECTO (se cargan dentro de main, ya con los sustitutos)
 * ════════════════════════════════════════════════════════════════════════════ */

type ModuloAcciones = typeof import("@/lib/actions/fabricacion");
type ModuloSesion = typeof import("@/lib/actions/sesion-fabrica");
type ModuloDatos = typeof import("@/lib/data/fabricacion");
type ModuloReglas = typeof import("@/lib/fabricacion/reglas");
type ModuloCodigos = typeof import("@/lib/fabricacion/codigos");
type ModuloPin = typeof import("@/lib/fabricacion/pin");
type ModuloAuth = typeof import("@/lib/fabricacion/auth");
type ModuloPermisos = typeof import("@/lib/fabricacion/permisos");
type ModuloAuditoria = typeof import("@/lib/fabricacion/auditoria");
type ModuloConstantes = typeof import("@/lib/fabricacion/constantes");
type ModuloAuthAdmin = typeof import("@/lib/auth");

let acciones: ModuloAcciones;
let sesiones: ModuloSesion;
let datos: ModuloDatos;
let reglas: ModuloReglas;
let codigos: ModuloCodigos;
let pines: ModuloPin;
let auth: ModuloAuth;
let permisos: ModuloPermisos;
let auditoria: ModuloAuditoria;
let constantes: ModuloConstantes;
let authAdmin: ModuloAuthAdmin;

let RolModel: (typeof import("@/lib/models/Rol"))["default"];
let UnidadModel: (typeof import("@/lib/models/UnidadFabricacion"))["default"];
let EventoModel: (typeof import("@/lib/models/EventoUnidad"))["default"];
let AuditoriaModel: (typeof import("@/lib/models/RegistroAuditoria"))["default"];

type ActionResult<T> = import("@/lib/types/fabricacion").ActionResult<T>;
type PasoUnidadDTO = import("@/lib/types/fabricacion").PasoUnidadDTO;

async function cargarModulos(): Promise<void> {
  acciones = await import("@/lib/actions/fabricacion");
  sesiones = await import("@/lib/actions/sesion-fabrica");
  datos = await import("@/lib/data/fabricacion");
  reglas = await import("@/lib/fabricacion/reglas");
  codigos = await import("@/lib/fabricacion/codigos");
  pines = await import("@/lib/fabricacion/pin");
  auth = await import("@/lib/fabricacion/auth");
  permisos = await import("@/lib/fabricacion/permisos");
  auditoria = await import("@/lib/fabricacion/auditoria");
  constantes = await import("@/lib/fabricacion/constantes");
  authAdmin = await import("@/lib/auth");

  RolModel = (await import("@/lib/models/Rol")).default;
  UnidadModel = (await import("@/lib/models/UnidadFabricacion")).default;
  EventoModel = (await import("@/lib/models/EventoUnidad")).default;
  AuditoriaModel = (await import("@/lib/models/RegistroAuditoria")).default;
}

/* ════════════════════════════════════════════════════════════════════════════
 * 4. MINI-RUNNER
 * ════════════════════════════════════════════════════════════════════════════ */

const tinta = {
  verde: (t: string) => `\x1b[32m${t}\x1b[0m`,
  rojo: (t: string) => `\x1b[31m${t}\x1b[0m`,
  gris: (t: string) => `\x1b[90m${t}\x1b[0m`,
  ambar: (t: string) => `\x1b[33m${t}\x1b[0m`,
  fuerte: (t: string) => `\x1b[1m${t}\x1b[0m`,
};

interface Prueba {
  nombre: string;
  fn: () => Promise<void>;
}

const pruebas: Prueba[] = [];
let aserciones = 0;

/**
 * Muchos casos comprueban que algo se RECHAZA, y el módulo anota cada rechazo
 * con `console.error` (así está escrito, y así tiene que quedarse). Esos
 * mensajes se guardan en vez de imprimirse: sólo se enseñan cuando el caso
 * falla de verdad, para que la salida se pueda leer.
 */
let ruidoDelModulo: string[] = [];
const consolaError = console.error;

function silenciarModulo(): void {
  console.error = (...partes: unknown[]): void => {
    ruidoDelModulo.push(partes.map((parte) => String(parte)).join(" "));
  };
}

function devolverConsola(): void {
  console.error = consolaError;
}

function test(nombre: string, fn: () => Promise<void>): void {
  pruebas.push({ nombre, fn });
}

function assert(condicion: unknown, mensaje: string): asserts condicion {
  aserciones += 1;
  if (!condicion) throw new Error(mensaje);
}

/** Comprueba que algo salió bien y devuelve el dato para seguir trabajando. */
function assertOk<T>(resultado: ActionResult<T>, que: string): T {
  assert(resultado.ok, `${que} debía salir bien y falló: ${resultado.error ?? "sin motivo"}`);
  return resultado.data as T;
}

/**
 * Comprueba que algo falló Y que el mensaje explica qué pasa. Acepta tanto una
 * action (devuelve `{ok:false}`) como una promesa que lanza.
 */
async function assertFalla(
  promesa: Promise<ActionResult<unknown>>,
  textoEsperado: string
): Promise<string> {
  aserciones += 1;
  let resultado: ActionResult<unknown>;
  try {
    resultado = await promesa;
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    if (!mensaje.includes(textoEsperado)) {
      throw new Error(`Se esperaba un fallo con «${textoEsperado}» y lanzó «${mensaje}»`);
    }
    return mensaje;
  }
  if (resultado.ok) {
    throw new Error(`Se esperaba que fallara con «${textoEsperado}» y salió bien`);
  }
  const mensaje = resultado.error ?? "";
  if (!mensaje.includes(textoEsperado)) {
    throw new Error(`Se esperaba «${textoEsperado}» y el mensaje fue «${mensaje}»`);
  }
  return mensaje;
}

/* ════════════════════════════════════════════════════════════════════════════
 * 5. SESIONES Y ATAJOS
 * ════════════════════════════════════════════════════════════════════════════ */

interface Persona {
  uid: string;
  nombre: string;
  rolClave: string;
}

/** Entra al sistema como esa persona, con un token firmado de verdad. */
async function entrarComo(persona: Persona): Promise<void> {
  cookiesFalsas.clear();
  const token = await auth.crearTokenOperario({
    uid: persona.uid,
    nombre: persona.nombre,
    rolClave: persona.rolClave,
  });
  cookiesFalsas.set(auth.OPERARIO_COOKIE, token);
}

/** El dueño entrando con la cookie del panel: el admin virtual del §4. */
async function entrarComoDuena(): Promise<void> {
  cookiesFalsas.clear();
  cookiesFalsas.set(authAdmin.ADMIN_COOKIE, await authAdmin.createSessionToken());
}

function salir(): void {
  cookiesFalsas.clear();
}

/** Hace algo como dueña y devuelve la sesión que había antes. */
async function comoDuena<T>(fn: () => Promise<T>): Promise<T> {
  const copia = new Map(cookiesFalsas);
  await entrarComoDuena();
  try {
    return await fn();
  } finally {
    cookiesFalsas.clear();
    for (const [clave, valor] of copia) cookiesFalsas.set(clave, valor);
  }
}

interface Contexto {
  cami: Persona;
  rosa: Persona;
  jose: Persona;
  luis: Persona;
  areaTallerId: string;
  rutaPruebaId: string;
}

let ctx: Contexto;

type PasoInput = import("@/lib/actions/fabricacion").PasoPlantillaInput;

/** Los 4 pasos con los que se prueba todo el taller. */
function pasosDeLaRutaDePrueba(estacionId: string): PasoInput[] {
  return [
    {
      clave: "medir",
      nombre: "Medir",
      instrucciones: "Toma las medidas del mueble y anótalas.",
      estacionId,
      rolesPermitidos: [],
      horasEstimadas: 1,
    },
    {
      clave: "cortar",
      nombre: "Cortar la madera",
      instrucciones: "Corta las piezas y toma una foto.",
      estacionId,
      rolesPermitidos: ["carpintero"],
      requiereFoto: true,
      minFotos: 1,
      horasEstimadas: 2,
    },
    {
      clave: "revisar",
      nombre: "Revisar",
      instrucciones: "Marca la lista y escribe cómo quedó.",
      estacionId,
      rolesPermitidos: [],
      requiereNota: true,
      checklist: [
        { texto: "Quedó derecho", obligatorio: true },
        { texto: "Sin astillas", obligatorio: false },
      ],
      notificaCliente: true,
      horasEstimadas: 1,
    },
    {
      clave: "recibir",
      nombre: "Recibir en el almacén",
      instrucciones: "Escanea el código del mueble al recibirlo.",
      estacionId,
      rolesPermitidos: [],
      requiereEscaneo: true,
      permiteOmitir: true,
      notificaCliente: true,
      horasEstimadas: 0.5,
    },
  ];
}

interface MuebleDePrueba {
  pedidoCodigo: string;
  codigo: string;
}

/** Crea un pedido de una sola pieza sobre la ruta indicada (o la de prueba). */
async function crearMueble(opciones?: {
  rutaId?: string;
  cliente?: { nombre?: string; telefono?: string; cedula?: string; direccion?: string };
  precio?: number;
  notas?: string;
  titulo?: string;
}): Promise<MuebleDePrueba> {
  return comoDuena(async () => {
    const resultado = await acciones.crearPedido({
      cliente: {
        nombre: opciones?.cliente?.nombre ?? "Cliente de prueba",
        telefono: opciones?.cliente?.telefono ?? "0414-0000000",
        cedula: opciones?.cliente?.cedula ?? "",
        direccion: opciones?.cliente?.direccion ?? "",
        ciudad: "Valencia",
        email: "",
      },
      canal: "WHATSAPP",
      prioridad: "NORMAL",
      notas: opciones?.notas ?? "",
      lineas: [
        {
          producto: {
            titulo: opciones?.titulo ?? "Mueble de prueba",
            categoria: "Salas",
            medidas: "100 × 50 × 40 cm",
            precio: opciones?.precio ?? 100,
          },
          cantidad: 1,
          rutaId: opciones?.rutaId ?? ctx.rutaPruebaId,
        },
      ],
    });
    const pedido = assertOk(resultado, "crearPedido");
    const unidad = pedido.unidades?.[0];
    assert(unidad !== undefined, "El pedido tenía que traer su mueble");
    return { pedidoCodigo: pedido.codigo, codigo: unidad.codigo };
  });
}

/** Los pasos de un mueble, tal y como están ahora mismo en la base. */
async function pasosDe(codigo: string): Promise<PasoUnidadDTO[]> {
  const unidad = await datos.getUnidad(codigo);
  assert(unidad !== null, `No encontramos el mueble ${codigo}`);
  return unidad.pasos;
}

/** Termina el paso `medir` con la persona indicada. Atajo de muchos casos. */
async function terminarMedir(codigo: string, persona: Persona): Promise<void> {
  await entrarComo(persona);
  assertOk(await acciones.iniciarPaso(codigo, "medir"), "iniciarPaso(medir)");
  assertOk(
    await acciones.completarPaso(codigo, "medir", { fotos: [], checklistRespuestas: [] }),
    "completarPaso(medir)"
  );
}

/* ════════════════════════════════════════════════════════════════════════════
 * 6. PREPARACIÓN DE LA BASE
 * ════════════════════════════════════════════════════════════════════════════ */

async function prepararBase(): Promise<void> {
  const { connectDB } = await import("@/lib/mongodb");
  await connectDB();
  await mongoose.connection.dropDatabase();

  // Los roles se siembran directamente: son el punto de partida de todo lo
  // demás (la sesión resuelve sus capacidades leyéndolos de aquí).
  await RolModel.insertMany(
    constantes.ROLES_SEMILLA.map((semilla) => ({
      clave: semilla.clave,
      nombre: semilla.nombre,
      descripcion: semilla.descripcion,
      color: semilla.color,
      icono: semilla.icono,
      capacidades: semilla.capacidades,
      esSistema: semilla.esSistema,
      activo: true,
      orden: semilla.orden,
    }))
  );
  permisos.invalidarCacheRoles();

  await entrarComoDuena();

  const area = assertOk(
    await acciones.crearEstacion({ nombre: "Taller de pruebas", tipo: "TALLER" }),
    "crearEstacion(Taller de pruebas)"
  );

  const cami = assertOk(
    await acciones.crearOperario({
      nombre: "Cami Vicent",
      pin: "1234",
      rolClave: "admin",
      codigoEmpleado: "T-001",
    }),
    "crearOperario(Cami)"
  );
  const rosa = assertOk(
    await acciones.crearOperario({
      nombre: "Rosa Medina",
      pin: "1234",
      rolClave: "supervisor",
      codigoEmpleado: "T-002",
    }),
    "crearOperario(Rosa)"
  );
  const jose = assertOk(
    await acciones.crearOperario({
      nombre: "José Rodríguez",
      pin: "1234",
      rolClave: "carpintero",
      codigoEmpleado: "T-003",
    }),
    "crearOperario(José)"
  );
  const luis = assertOk(
    await acciones.crearOperario({
      nombre: "Luis Ortega",
      pin: "1234",
      rolClave: "tapicero",
      codigoEmpleado: "T-004",
    }),
    "crearOperario(Luis)"
  );

  const ruta = assertOk(
    await acciones.crearRuta({
      nombre: "Ruta de prueba",
      descripcion: "Cuatro pasos con todos los requisitos que hay que probar.",
      esPredeterminada: true,
      pasos: pasosDeLaRutaDePrueba(area._id),
    }),
    "crearRuta(Ruta de prueba)"
  );

  ctx = {
    cami: { uid: cami._id, nombre: cami.nombre, rolClave: "admin" },
    rosa: { uid: rosa._id, nombre: rosa.nombre, rolClave: "supervisor" },
    jose: { uid: jose._id, nombre: jose.nombre, rolClave: "carpintero" },
    luis: { uid: luis._id, nombre: luis.nombre, rolClave: "tapicero" },
    areaTallerId: area._id,
    rutaPruebaId: ruta._id,
  };

  salir();
}

/* ════════════════════════════════════════════════════════════════════════════
 * 7. LOS 22 CASOS DEL §11
 * ════════════════════════════════════════════════════════════════════════════ */

/* ── 1 · CÓDIGOS ─────────────────────────────────────────────────────────── */

test("1 · Códigos únicos bajo concurrencia (100 en paralelo)", async () => {
  const generados = await Promise.all(
    Array.from({ length: 100 }, () => codigos.generarCodigoUnidad())
  );
  const unicos = new Set(generados);
  assert(
    unicos.size === 100,
    `Se repitieron ${100 - unicos.size} códigos de mueble bajo concurrencia`
  );
  for (const codigo of generados) {
    assert(/^COD-\d{6,}$/.test(codigo), `Formato inesperado en «${codigo}»`);
  }

  const pedidos = await Promise.all(
    Array.from({ length: 25 }, () => codigos.generarCodigoPedido())
  );
  assert(new Set(pedidos).size === 25, "Se repitieron códigos de pedido");
  for (const codigo of pedidos) {
    assert(/^PED-\d{6,}$/.test(codigo), `Formato inesperado en «${codigo}»`);
  }
});

/* ── 2 · NORMALIZAR CÓDIGO ───────────────────────────────────────────────── */

test("2 · normalizarCodigo acepta todas las formas de escribirlo", async () => {
  const esperados: [string, string | null][] = [
    ["949473", "COD-949473"],
    ["cod949473", "COD-949473"],
    ["COD 949473", "COD-949473"],
    ["cod-949473", "COD-949473"],
    ["   Cod-949473   ", "COD-949473"],
    ["http://localhost:3000/f/COD-949473", "COD-949473"],
    ["https://camihogar.com/f/cod-949473/", "COD-949473"],
    ["/f/COD-949473?copias=2#hoja", "COD-949473"],
    ["El mueble COD-949473 está listo", "COD-949473"],
    ["PED-100248", "PED-100248"],
    ["ped100248", "PED-100248"],
    ["hola", null],
    ["", null],
    ["123", null],
  ];

  for (const [entrada, esperado] of esperados) {
    const obtenido = codigos.normalizarCodigo(entrada);
    assert(
      obtenido === esperado,
      `normalizarCodigo("${entrada}") dio «${obtenido}» y se esperaba «${esperado}»`
    );
  }

  assert(codigos.esCodigoUnidad("949473"), "«949473» tenía que ser un mueble");
  assert(codigos.esCodigoUnidad("cod-949473"), "«cod-949473» tenía que ser un mueble");
  assert(!codigos.esCodigoUnidad("PED-100248"), "Un pedido no es un mueble");
  assert(codigos.esCodigoPedido("PED-100248"), "«PED-100248» tenía que ser un pedido");
  assert(!codigos.esCodigoPedido("949473"), "Sin prefijo no es un pedido");
});

/* ── 3 · SNAPSHOT CONGELADO ──────────────────────────────────────────────── */

test("3 · Cambiar la ruta después NO cambia los muebles ya lanzados", async () => {
  const ruta = await comoDuena(async () =>
    assertOk(
      await acciones.crearRuta({
        nombre: "Ruta que va a cambiar",
        pasos: [
          { clave: "uno", nombre: "Paso uno", estacionId: ctx.areaTallerId },
          { clave: "dos", nombre: "Paso dos", estacionId: ctx.areaTallerId },
        ],
      }),
      "crearRuta(Ruta que va a cambiar)"
    )
  );

  const mueble = await crearMueble({ rutaId: ruta._id });
  const antes = await pasosDe(mueble.codigo);
  assert(antes.length === 2, "El mueble tenía que salir con 2 pasos");
  assert(antes[0].nombre === "Paso uno", "El primer paso tenía que llamarse «Paso uno»");

  await comoDuena(async () => {
    assertOk(
      await acciones.actualizarRuta(ruta._id, {
        nombre: "Ruta que va a cambiar",
        pasos: [
          { clave: "uno", nombre: "PASO UNO CAMBIADO", estacionId: ctx.areaTallerId },
          { clave: "tres", nombre: "Paso tres nuevo", estacionId: ctx.areaTallerId },
          { clave: "cuatro", nombre: "Paso cuatro nuevo", estacionId: ctx.areaTallerId },
        ],
      }),
      "actualizarRuta"
    );
  });

  const despues = await pasosDe(mueble.codigo);
  assert(despues.length === 2, "El mueble no podía cambiar de número de pasos");
  assert(
    despues[0].nombre === "Paso uno",
    `El mueble cambió de pasos al editar la ruta: ahora dice «${despues[0].nombre}»`
  );
  assert(despues[1].clave === "dos", "El segundo paso del mueble no podía desaparecer");

  const rutaAhora = await datos.getRuta(ruta._id);
  assert(rutaAhora !== null && rutaAhora.pasos.length === 3, "La ruta sí tenía que cambiar");
  assert(rutaAhora.version === 2, "Cambiar los pasos tenía que subir la versión de la ruta");
});

/* ── 4 · BLOQUEO SECUENCIAL ──────────────────────────────────────────────── */

test("4 · No se puede empezar el paso 3 sin terminar el 2", async () => {
  const mueble = await crearMueble();
  await entrarComo(ctx.jose);

  const mensaje = await assertFalla(
    acciones.iniciarPaso(mueble.codigo, "revisar"),
    "Primero hay que terminar"
  );
  assert(mensaje.includes("Medir"), `El mensaje tenía que nombrar el paso que falta: «${mensaje}»`);

  // Y el primero sí se puede.
  assertOk(await acciones.iniciarPaso(mueble.codigo, "medir"), "iniciarPaso(medir)");
});

/* ── 5 · EVIDENCIA: FOTOS ────────────────────────────────────────────────── */

test("5 · Sin fotos no se cierra el paso; con fotos sí", async () => {
  const mueble = await crearMueble();
  await terminarMedir(mueble.codigo, ctx.jose);

  assertOk(await acciones.iniciarPaso(mueble.codigo, "cortar"), "iniciarPaso(cortar)");

  await assertFalla(
    acciones.completarPaso(mueble.codigo, "cortar", { fotos: [], checklistRespuestas: [] }),
    "foto"
  );

  assertOk(
    await acciones.completarPaso(mueble.codigo, "cortar", {
      fotos: ["/products/sofa-modular-1.jpg"],
      checklistRespuestas: [],
    }),
    "completarPaso(cortar) con foto"
  );

  const pasos = await pasosDe(mueble.codigo);
  const cortar = pasos.find((paso) => paso.clave === "cortar");
  assert(cortar?.estado === "COMPLETADO", "El paso tenía que quedar COMPLETADO");
  assert(cortar?.fotos.length === 1, "La foto tenía que quedar guardada");
});

/* ── 6 · EVIDENCIA: LISTA Y NOTA ─────────────────────────────────────────── */

test("6 · La lista obligatoria y la nota se exigen antes de terminar", async () => {
  const mueble = await crearMueble();
  await terminarMedir(mueble.codigo, ctx.jose);
  assertOk(await acciones.iniciarPaso(mueble.codigo, "cortar"), "iniciarPaso(cortar)");
  assertOk(
    await acciones.completarPaso(mueble.codigo, "cortar", {
      fotos: ["/products/sofa-lino-1.jpg"],
      checklistRespuestas: [],
    }),
    "completarPaso(cortar)"
  );

  assertOk(await acciones.iniciarPaso(mueble.codigo, "revisar"), "iniciarPaso(revisar)");

  await assertFalla(
    acciones.completarPaso(mueble.codigo, "revisar", {
      fotos: [],
      nota: "Quedó bien",
      checklistRespuestas: [{ texto: "Quedó derecho", ok: false }],
    }),
    reglas.MENSAJES.faltaChecklist
  );

  await assertFalla(
    acciones.completarPaso(mueble.codigo, "revisar", {
      fotos: [],
      nota: "",
      checklistRespuestas: [{ texto: "Quedó derecho", ok: true }],
    }),
    reglas.MENSAJES.faltaNota
  );

  assertOk(
    await acciones.completarPaso(mueble.codigo, "revisar", {
      fotos: [],
      nota: "Quedó derecho y sin astillas.",
      checklistRespuestas: [
        { texto: "Quedó derecho", ok: true },
        { texto: "Sin astillas", ok: false },
      ],
    }),
    "completarPaso(revisar) con la lista marcada y la nota"
  );
});

/* ── 7 · ROLES EN LOS PASOS ──────────────────────────────────────────────── */

test("7 · El rol equivocado no puede; el correcto y el admin sí", async () => {
  const mueble = await crearMueble();
  await terminarMedir(mueble.codigo, ctx.jose);

  await entrarComo(ctx.luis);
  const mensaje = await assertFalla(
    acciones.iniciarPaso(mueble.codigo, "cortar"),
    "lo tiene que hacer"
  );
  assert(
    mensaje.includes("Carpintero"),
    `El mensaje tenía que decir qué oficio hace falta: «${mensaje}»`
  );

  await entrarComo(ctx.jose);
  assertOk(await acciones.iniciarPaso(mueble.codigo, "cortar"), "El carpintero sí puede");

  // El admin siempre puede, aunque el paso pida otro oficio.
  const otro = await crearMueble();
  await terminarMedir(otro.codigo, ctx.jose);
  await entrarComoDuena();
  assertOk(await acciones.iniciarPaso(otro.codigo, "cortar"), "El admin siempre puede");
});

/* ── 8 · HANDOFF CON ESCANEO ─────────────────────────────────────────────── */

test("8 · El paso que exige escaneo no se cierra hasta escanear", async () => {
  const mueble = await crearMueble();
  await terminarMedir(mueble.codigo, ctx.jose);
  assertOk(await acciones.iniciarPaso(mueble.codigo, "cortar"), "iniciarPaso(cortar)");
  assertOk(
    await acciones.completarPaso(mueble.codigo, "cortar", {
      fotos: ["/products/comedor-nogal-1.jpg"],
      checklistRespuestas: [],
    }),
    "completarPaso(cortar)"
  );
  assertOk(await acciones.iniciarPaso(mueble.codigo, "revisar"), "iniciarPaso(revisar)");
  assertOk(
    await acciones.completarPaso(mueble.codigo, "revisar", {
      fotos: [],
      nota: "Todo derecho.",
      checklistRespuestas: [{ texto: "Quedó derecho", ok: true }],
    }),
    "completarPaso(revisar)"
  );

  assertOk(await acciones.iniciarPaso(mueble.codigo, "recibir"), "iniciarPaso(recibir)");
  await assertFalla(
    acciones.completarPaso(mueble.codigo, "recibir", { fotos: [], checklistRespuestas: [] }),
    reglas.MENSAJES.faltaEscaneo
  );

  assertOk(await acciones.registrarEscaneo(mueble.codigo), "registrarEscaneo");

  assertOk(
    await acciones.completarPaso(mueble.codigo, "recibir", { fotos: [], checklistRespuestas: [] }),
    "completarPaso(recibir) después de escanear"
  );
});

/* ── 9 · FLUJO FELIZ COMPLETO ────────────────────────────────────────────── */

/** El mueble del flujo feliz: lo reutilizan los casos 10 y 15. */
let muebleFeliz: MuebleDePrueba;

test("9 · Flujo feliz: el mueble queda TERMINADO al 100 % y el pedido cerrado", async () => {
  muebleFeliz = await crearMueble({
    titulo: "Sofá Capri Terracota",
    precio: 4321.5,
    notas: "Nota interna: el cliente siempre regatea, no bajar del precio.",
    cliente: {
      nombre: "María Fernández",
      telefono: "0414-9998877",
      cedula: "V-99887766",
      direccion: "Calle Secreta 42, Prebo",
    },
  });

  await terminarMedir(muebleFeliz.codigo, ctx.jose);
  assertOk(await acciones.iniciarPaso(muebleFeliz.codigo, "cortar"), "iniciarPaso(cortar)");
  assertOk(
    await acciones.completarPaso(muebleFeliz.codigo, "cortar", {
      fotos: ["/products/sofa-modular-1.jpg"],
      checklistRespuestas: [],
    }),
    "completarPaso(cortar)"
  );

  await entrarComo(ctx.rosa);
  assertOk(await acciones.iniciarPaso(muebleFeliz.codigo, "revisar"), "iniciarPaso(revisar)");
  assertOk(
    await acciones.completarPaso(muebleFeliz.codigo, "revisar", {
      fotos: [],
      nota: "Revisado y aprobado.",
      checklistRespuestas: [
        { texto: "Quedó derecho", ok: true },
        { texto: "Sin astillas", ok: true },
      ],
    }),
    "completarPaso(revisar)"
  );

  assertOk(await acciones.iniciarPaso(muebleFeliz.codigo, "recibir"), "iniciarPaso(recibir)");
  assertOk(await acciones.registrarEscaneo(muebleFeliz.codigo, "recibir"), "registrarEscaneo");
  assertOk(
    await acciones.completarPaso(muebleFeliz.codigo, "recibir", {
      fotos: [],
      checklistRespuestas: [],
    }),
    "completarPaso(recibir)"
  );

  const unidad = await datos.getUnidad(muebleFeliz.codigo);
  assert(unidad !== null, "El mueble tenía que existir");
  assert(unidad.estado === "TERMINADA", `El mueble quedó en ${unidad.estado} y no TERMINADA`);
  assert(unidad.progreso === 100, `El progreso quedó en ${unidad.progreso} y no en 100`);
  assert(unidad.terminadoAt !== null, "Tenía que quedar la fecha de terminado");

  const pedido = await datos.getPedido(muebleFeliz.pedidoCodigo);
  assert(pedido !== null, "El pedido tenía que existir");
  assert(
    pedido.unidadesCompletadas === 1,
    `El pedido dice ${pedido.unidadesCompletadas} muebles terminados y era 1`
  );
  assert(pedido.estado === "COMPLETADO", `El pedido quedó ${pedido.estado} y no COMPLETADO`);
});

/* ── 10 · BITÁCORA ───────────────────────────────────────────────────────── */

test("10 · La bitácora tiene al menos un evento por transición", async () => {
  const eventos = await datos.getEventosUnidad(muebleFeliz.codigo);
  const tipos = new Set<string>(eventos.map((evento) => String(evento.tipo)));

  // 1 CREADA + 4 pasos × (iniciado + completado) = 9 como mínimo.
  assert(eventos.length >= 9, `Sólo hay ${eventos.length} anotaciones y se esperaban 9 o más`);
  for (const esperado of ["CREADA", "PASO_INICIADO", "PASO_COMPLETADO", "ESCANEO"]) {
    assert(tipos.has(esperado), `Falta el tipo de evento ${esperado} en la bitácora`);
  }

  const conNombre = eventos.filter((evento) => evento.operarioNombre.trim() !== "");
  assert(
    conNombre.length >= 8,
    "Casi todas las anotaciones tenían que decir quién lo hizo (§1: todo auditado)"
  );

  const iniciados = eventos.filter((evento) => evento.tipo === "PASO_INICIADO");
  assert(iniciados.length === 4, `Se anotaron ${iniciados.length} inicios de paso y eran 4`);
});

/* ── 11 · CONCURRENCIA ───────────────────────────────────────────────────── */

test("11 · Cinco «ya terminé» a la vez: gana exactamente uno", async () => {
  const mueble = await crearMueble();
  await terminarMedir(mueble.codigo, ctx.jose);
  assertOk(await acciones.iniciarPaso(mueble.codigo, "cortar"), "iniciarPaso(cortar)");

  const intentos = await Promise.all(
    Array.from({ length: 5 }, () =>
      acciones.completarPaso(mueble.codigo, "cortar", {
        fotos: ["/products/sofa-lino-2.jpg"],
        checklistRespuestas: [],
      })
    )
  );

  const ganadores = intentos.filter((intento) => intento.ok);
  assert(
    ganadores.length === 1,
    `Ganaron ${ganadores.length} de 5 y tenía que ganar exactamente 1`
  );
  for (const perdedor of intentos.filter((intento) => !intento.ok)) {
    assert(
      (perdedor.error ?? "").includes("ya lo terminó otra persona"),
      `El perdedor tenía que leer «ya lo terminó otra persona» y leyó «${perdedor.error}»`
    );
  }
});

/* ── 12 · INCIDENCIAS ────────────────────────────────────────────────────── */

test("12 · Un problema abierto bloquea el mueble; al resolverlo se desbloquea", async () => {
  const mueble = await crearMueble();
  await terminarMedir(mueble.codigo, ctx.jose);

  const incidencia = assertOk(
    await acciones.reportarIncidencia(mueble.codigo, {
      motivo: "La madera vino torcida",
      descripcion: "Dos tablones no sirven.",
      severidad: "ALTA",
      pasoClave: "cortar",
    }),
    "reportarIncidencia"
  );

  const conProblema = await datos.getUnidad(mueble.codigo);
  assert(conProblema?.estado === "INCIDENCIA", "El mueble tenía que quedar en INCIDENCIA");

  await assertFalla(
    acciones.iniciarPaso(mueble.codigo, "cortar"),
    reglas.MENSAJES.incidenciaAbierta
  );

  // Resolver es cosa del supervisor.
  await entrarComo(ctx.jose);
  await assertFalla(
    acciones.resolverIncidencia(incidencia._id, "Ya se cambió la madera"),
    "No tienes permiso"
  );

  await entrarComo(ctx.rosa);
  assertOk(
    await acciones.resolverIncidencia(incidencia._id, "Se cambiaron los dos tablones."),
    "resolverIncidencia"
  );

  const libre = await datos.getUnidad(mueble.codigo);
  assert(libre?.estado !== "INCIDENCIA", "Al resolverlo el mueble tenía que desbloquearse");

  await entrarComo(ctx.jose);
  assertOk(
    await acciones.iniciarPaso(mueble.codigo, "cortar"),
    "Tras resolver el problema el paso tenía que poder empezarse"
  );
});

/* ── 13 · REVERTIR PASOS ─────────────────────────────────────────────────── */

test("13 · Deshacer un paso: sin permiso no; con permiso sí y queda anotado", async () => {
  const mueble = await crearMueble();
  await terminarMedir(mueble.codigo, ctx.jose);

  // El carpintero no tiene `revertir_pasos`.
  await assertFalla(
    acciones.revertirPaso(mueble.codigo, "medir", "Se midió mal"),
    "No tienes permiso"
  );

  await entrarComo(ctx.rosa);
  assertOk(
    await acciones.revertirPaso(mueble.codigo, "medir", "Las medidas estaban mal tomadas."),
    "revertirPaso"
  );

  const pasos = await pasosDe(mueble.codigo);
  const medir = pasos.find((paso) => paso.clave === "medir");
  assert(medir?.estado === "LISTO", `El paso quedó ${medir?.estado} y tenía que quedar LISTO`);
  assert(medir?.completadoPorNombre === "", "Al deshacer se limpia quién lo había terminado");

  const eventos = await datos.getEventosUnidad(mueble.codigo);
  const reversion = eventos.find((evento) => evento.tipo === "REVERSION");
  assert(reversion !== undefined, "Tenía que quedar un evento REVERSION en la bitácora");
  assert(
    reversion.descripcion.includes("Rosa Medina"),
    "El evento tenía que decir quién deshizo el paso"
  );
});

/* ── 14 · PIN ────────────────────────────────────────────────────────────── */

test("14 · PIN: formato, hash, verificación y entrada real al taller", async () => {
  assert(!pines.esPinValido("123"), "Un PIN de 3 números no vale");
  assert(pines.esPinValido("1234"), "Un PIN de 4 números sí vale");
  assert(pines.esPinValido("123456"), "Un PIN de 6 números sí vale");
  assert(!pines.esPinValido("1234567"), "Un PIN de 7 números no vale");
  assert(!pines.esPinValido("12a4"), "Un PIN con letras no vale");
  assert(!pines.esPinValido(""), "Un PIN vacío no vale");

  const { pinHash, pinSalt } = pines.hashPin("4321");
  assert(pinHash.length > 20 && pinSalt.length > 8, "El hash y la sal tienen que ser de verdad");
  assert(!pinHash.includes("4321"), "El PIN no puede aparecer en claro en el hash");
  assert(pines.verificarPin("4321", pinHash, pinSalt), "El PIN correcto tenía que valer");
  assert(!pines.verificarPin("1234", pinHash, pinSalt), "Un PIN equivocado no puede valer");
  assert(!pines.verificarPin("", pinHash, pinSalt), "Un PIN vacío no puede valer");

  let lanzo = false;
  try {
    pines.hashPin("no-es-un-pin");
  } catch {
    lanzo = true;
  }
  assert(lanzo, "hashPin tenía que negarse a guardar un PIN con formato inválido");

  // Y la entrada de verdad, con la action y la cookie.
  salir();
  await assertFalla(sesiones.iniciarSesionOperario(ctx.jose.uid, "9999"), "Clave incorrecta");

  const entrada = assertOk(
    await sesiones.iniciarSesionOperario(ctx.jose.uid, "1234"),
    "iniciarSesionOperario"
  );
  assert(entrada.nombre === "José Rodríguez", "Entró con el nombre equivocado");
  assert(cookiesFalsas.has(auth.OPERARIO_COOKIE), "La entrada tenía que dejar la cookie puesta");

  const sesion = await auth.getSesionOperario();
  assert(sesion?.rolClave === "carpintero", "La sesión tenía que resolver el rol de la base");

  assertOk(await sesiones.cerrarSesionOperario(), "cerrarSesionOperario");
  assert(!cookiesFalsas.has(auth.OPERARIO_COOKIE), "Al salir se borra la cookie");
});

/* ── 15 · SEGUIMIENTO PÚBLICO ────────────────────────────────────────────── */

test("15 · El seguimiento del cliente está apagado y, encendido, no filtra nada", async () => {
  assert(
    !constantes.seguimientoPublicoActivo(),
    "El seguimiento público tiene que estar APAGADO salvo que la variable valga «true»"
  );
  assert(
    (await datos.getSeguimientoPublico(muebleFeliz.codigo)) === null,
    "Apagado, getSeguimientoPublico tiene que devolver null antes de leer un solo dato"
  );

  process.env.NEXT_PUBLIC_FABRICA_SEGUIMIENTO_PUBLICO = "true";
  try {
    assert(constantes.seguimientoPublicoActivo(), "Con «true» tenía que encenderse");
    const seguimiento = await datos.getSeguimientoPublico(muebleFeliz.codigo);
    assert(seguimiento !== null, "Encendido tenía que devolver el seguimiento del mueble");

    const json = JSON.stringify(seguimiento);
    const prohibido = [
      "0414-9998877", // teléfono
      "V-99887766", // cédula
      "Calle Secreta", // dirección
      "4321.5", // precio
      "regatea", // nota interna
      "José Rodríguez", // operario
      "Rosa Medina", // operario
      "Fernández", // apellido del cliente
    ];
    for (const secreto of prohibido) {
      assert(
        !json.includes(secreto),
        `El seguimiento público filtró «${secreto}». JSON: ${json}`
      );
    }

    assert(json.includes("María"), "Sí tiene que saludar al cliente por su primer nombre");
    assert(seguimiento.progreso === 100, "El progreso sí es información del cliente");
    assert(
      seguimiento.hitos.length === 2,
      `Sólo los pasos con «avisar al cliente» son hitos y salieron ${seguimiento.hitos.length}`
    );
    assert(
      seguimiento.hitos.every((hito) => hito.hecho),
      "Los hitos del mueble terminado tenían que estar todos hechos"
    );
    assert(
      (await datos.getSeguimientoPublico("COD-000001")) === null,
      "Un código que no existe devuelve null, no un error"
    );
  } finally {
    process.env.NEXT_PUBLIC_FABRICA_SEGUIMIENTO_PUBLICO = "false";
  }
});

/* ── 16 · AUDITORÍA ──────────────────────────────────────────────────────── */

test("16 · Crear y editar dejan auditoría con el diff campo a campo", async () => {
  const ruta = await comoDuena(async () =>
    assertOk(
      await acciones.crearRuta({
        nombre: "Ruta auditada",
        pasos: [{ clave: "unico", nombre: "Paso único", estacionId: ctx.areaTallerId }],
      }),
      "crearRuta(Ruta auditada)"
    )
  );

  await comoDuena(async () => {
    assertOk(
      await acciones.actualizarRuta(ruta._id, {
        nombre: "Ruta auditada y renombrada",
        descripcion: "Con descripción nueva",
      }),
      "actualizarRuta"
    );
  });

  const registros = await AuditoriaModel.find({ entidad: "RUTA", entidadId: ruta._id })
    .sort({ createdAt: 1, _id: 1 })
    .lean();

  assert(registros.length === 2, `Se esperaban 2 anotaciones y hay ${registros.length}`);
  assert(registros[0].accion === "CREAR", "La primera anotación tenía que ser CREAR");
  assert(registros[1].accion === "EDITAR", "La segunda anotación tenía que ser EDITAR");
  assert(registros[1].actorNombre.trim() !== "", "Toda anotación dice QUIÉN la hizo");

  const cambio = (registros[1].cambios ?? []).find((c) => c.campo === "nombre");
  assert(cambio !== undefined, "El diff tenía que incluir el cambio de nombre");
  assert(
    cambio.antes === "Ruta auditada" && cambio.despues === "Ruta auditada y renombrada",
    `El diff quedó mal: «${cambio.antes}» → «${cambio.despues}»`
  );
  assert(cambio.etiqueta.trim() !== "", "El diff se lee con etiquetas en español");

  // Nunca lanza, aunque la anotación sea inválida: una bitácora rota no puede
  // tumbar una operación que el usuario ya dio por hecha.
  type EntidadAuditoria = import("@/lib/types/fabricacion").EntidadAuditoria;
  let lanzo = false;
  try {
    await auditoria.registrarAuditoria({
      entidad: "NO_EXISTE" as unknown as EntidadAuditoria,
      entidadId: "x",
      entidadNombre: "x",
      accion: "CREAR",
      actor: { nombre: "Prueba" },
      descripcion: "Esto no se puede guardar",
    });
  } catch {
    lanzo = true;
  }
  assert(!lanzo, "registrarAuditoria no puede lanzar nunca");

  // Y el diff puro ignora lo que no viene en la entrada parcial.
  const cambios = auditoria.calcularCambios(
    { nombre: "Antes", color: "#000000" },
    { nombre: "Después" },
    [
      { campo: "nombre", etiqueta: "Nombre" },
      { campo: "color", etiqueta: "Color" },
    ]
  );
  assert(cambios.length === 1, "Un campo que no viene en la edición no es un cambio");
});

/* ── 17 · QR SIN TOKEN ───────────────────────────────────────────────────── */

test("17 · El QR lleva sólo la URL del mueble y no existe ningún token", async () => {
  const url = codigos.urlQr("COD-949473");
  assert(url.endsWith("/f/COD-949473"), `La URL del QR quedó rara: ${url}`);
  assert(!url.includes("?t="), "El QR no puede llevar token");
  assert(!url.toLowerCase().includes("token"), "El QR no puede llevar token");
  assert(!url.includes("?"), "La URL del QR no lleva parámetros");
  assert(codigos.urlQr("949473") === url, "Cualquier forma del código da la misma URL");

  const nombresExportados = Object.keys(codigos);
  assert(
    !nombresExportados.some((nombre) => nombre.toLowerCase().includes("token")),
    `codigos.ts exporta algo con «token»: ${nombresExportados.join(", ")}`
  );

  const campos = Object.keys(UnidadModel.schema.paths);
  assert(
    !campos.some((campo) => campo.toLowerCase().includes("token")),
    `El esquema del mueble tiene un campo con «token»: ${campos.join(", ")}`
  );
  assert(UnidadModel.schema.path("qrToken") === undefined, "No puede existir «qrToken»");

  const guardado = await UnidadModel.findOne({ codigo: muebleFeliz.codigo }).lean();
  assert(guardado !== null, "El mueble tenía que existir");
  assert(
    !JSON.stringify(guardado).toLowerCase().includes("qrtoken"),
    "El documento guardado no puede tener qrToken"
  );
});

/* ── 18 · CRUD DE ROLES ──────────────────────────────────────────────────── */

test("18 · Roles: crear, leer, editar, reasignar al eliminar y seguros del admin", async () => {
  await entrarComoDuena();

  const rol = assertOk(
    await acciones.crearRol({
      nombre: "Barnizador",
      descripcion: "Pasa el barniz final",
      capacidades: ["trabajar", "escanear", "capacidad_inventada"],
    }),
    "crearRol(Barnizador)"
  );
  assert(rol.clave === "barnizador", `La clave se dedujo mal: «${rol.clave}»`);
  assert(
    rol.capacidades.length === 2,
    "Las capacidades inventadas se descartan al guardar el rol"
  );

  const leido = await datos.getRol("barnizador");
  assert(leido?.nombre === "Barnizador", "El rol tenía que poder leerse por su clave");

  const editado = assertOk(
    await acciones.actualizarRol("barnizador", {
      nombre: "Barnizador jefe",
      clave: "otra-clave",
      capacidades: ["trabajar", "escanear", "ver_tablero"],
    }),
    "actualizarRol"
  );
  assert(editado.nombre === "Barnizador jefe", "El nombre tenía que cambiar");
  assert(editado.clave === "barnizador", "La clave de un rol NO se cambia nunca");
  assert(editado.capacidades.includes("ver_tablero"), "El permiso nuevo tenía que guardarse");

  const persona = assertOk(
    await acciones.crearOperario({
      nombre: "Sofía Barniz",
      pin: "1234",
      rolClave: "barnizador",
      codigoEmpleado: "T-020",
    }),
    "crearOperario(Sofía)"
  );

  const aviso = await assertFalla(acciones.eliminarRol("barnizador"), "1 persona lo tiene");
  assert(
    aviso.includes("Barnizador jefe"),
    `El aviso tenía que nombrar el rol: «${aviso}»`
  );

  const borrado = assertOk(
    await acciones.eliminarRol("barnizador", "carpintero"),
    "eliminarRol con reasignación"
  );
  assert(borrado.modo === "FISICO", "Un rol sin historial se borra de verdad");
  assert(
    (await datos.getRol("barnizador")) === null,
    "El rol tenía que desaparecer después de reasignar"
  );
  const reasignada = await datos.getOperario(persona._id);
  assert(
    reasignada?.rolClave === "carpintero",
    `A la persona había que pasarla al rol elegido y quedó en «${reasignada?.rolClave}»`
  );

  // Seguros del rol del sistema.
  await assertFalla(acciones.eliminarRol("admin"), "es del sistema");
  await assertFalla(acciones.desactivarRol("admin"), "no se puede desactivar");
  await assertFalla(
    acciones.actualizarRol("admin", { nombre: "Administrador", capacidades: ["trabajar"] }),
    "conservar todos los permisos"
  );

  // Y aunque alguien tocara la base a mano, el admin sigue pudiéndolo todo.
  await RolModel.updateOne({ clave: "admin" }, { $set: { capacidades: [] } });
  permisos.invalidarCacheRoles();
  const capacidades = await permisos.capacidadesDeRol("admin");
  assert(
    capacidades.length === constantes.ROLES_SEMILLA[0].capacidades.length,
    "El rol admin siempre tiene TODAS las capacidades, diga lo que diga el documento"
  );
  await entrarComo(ctx.cami);
  assertOk(
    await acciones.crearEstacion({ nombre: "Área del admin", tipo: "TALLER" }),
    "El admin sigue pudiendo aunque su documento diga que no tiene permisos"
  );
  await RolModel.updateOne(
    { clave: "admin" },
    { $set: { capacidades: constantes.ROLES_SEMILLA[0].capacidades } }
  );
  permisos.invalidarCacheRoles();

  // Duplicar, desactivar y activar.
  await entrarComoDuena();
  const copia = assertOk(await acciones.duplicarRol("tapicero"), "duplicarRol");
  assert(copia.clave === "tapicero_copia", `La copia se llamó «${copia.clave}»`);
  assertOk(await acciones.desactivarRol(copia.clave), "desactivarRol");
  assert((await datos.getRol(copia.clave))?.activo === false, "Tenía que quedar desactivado");
  assertOk(await acciones.activarRol(copia.clave), "activarRol");
  assertOk(await acciones.eliminarRol(copia.clave), "eliminarRol(copia)");

  // Sin la capacidad `gestionar_roles` no se toca nada.
  await entrarComo(ctx.jose);
  await assertFalla(acciones.crearRol({ nombre: "Rol pirata" }), "No tienes permiso");
  await assertFalla(acciones.eliminarRol("tapicero"), "No tienes permiso");
});

/* ── 19 · CRUD DE USUARIOS ───────────────────────────────────────────────── */

test("19 · Personas: crear, leer, editar, PIN, desactivar, eliminar y restaurar", async () => {
  await entrarComoDuena();

  const ana = assertOk(
    await acciones.crearOperario({
      nombre: "Ana Torres",
      pin: "1234",
      rolClave: "tapicero",
      codigoEmpleado: "T-030",
      telefono: "0414-1234567",
    }),
    "crearOperario(Ana)"
  );

  const leida = await datos.getOperario(ana._id);
  assert(leida?.nombre === "Ana Torres", "La ficha tenía que poder leerse");
  assert(leida?.rolNombre === "Tapicero", "La ficha trae el nombre bonito del rol");
  const json = JSON.stringify(leida);
  assert(
    !json.includes("pinHash") && !json.includes("pinSalt"),
    "El PIN JAMÁS puede salir del servidor"
  );

  assertOk(
    await acciones.actualizarOperario(ana._id, {
      nombre: "Ana Torres Gil",
      telefono: "0414-7654321",
    }),
    "actualizarOperario"
  );
  const editada = await datos.getOperario(ana._id);
  assert(editada?.nombre === "Ana Torres Gil", "El nombre tenía que cambiar");

  const conRol = assertOk(
    await acciones.cambiarRolOperario(ana._id, "carpintero"),
    "cambiarRolOperario"
  );
  assert(conRol.rolClave === "carpintero", "El rol tenía que cambiar");

  assertOk(await acciones.resetearPin(ana._id, "5678"), "resetearPin");
  salir();
  await assertFalla(sesiones.iniciarSesionOperario(ana._id, "1234"), "Clave incorrecta");
  assertOk(await sesiones.iniciarSesionOperario(ana._id, "5678"), "Entrar con el PIN nuevo");

  await entrarComoDuena();
  assertOk(await acciones.desactivarOperario(ana._id), "desactivarOperario");
  assert((await datos.getOperario(ana._id))?.activo === false, "Tenía que quedar desactivada");
  assertOk(await acciones.activarOperario(ana._id), "activarOperario");

  // Sin historial: se borra de verdad.
  const borradaAna = assertOk(await acciones.eliminarOperario(ana._id), "eliminarOperario(Ana)");
  assert(
    borradaAna.modo === "FISICO",
    "Una persona sin historial se puede borrar del todo"
  );
  assert((await datos.getOperario(ana._id)) === null, "Ana tenía que desaparecer");

  // Con historial: borrado LÓGICO y se puede restaurar.
  const borradoJose = assertOk(
    await acciones.eliminarOperario(ctx.jose.uid),
    "eliminarOperario(José)"
  );
  assert(
    borradoJose.modo === "LOGICO",
    "Quien tiene historial no se destruye: se marca como eliminado (§7)"
  );
  const joseEliminado = await datos.getOperario(ctx.jose.uid);
  assert(joseEliminado?.eliminado === true, "José tenía que quedar marcado como eliminado");
  assert(joseEliminado?.activo === false, "Y desactivado");

  const eventosDeJose = await EventoModel.countDocuments({ operarioId: ctx.jose.uid });
  assert(eventosDeJose > 0, "Su historial de trabajo se conserva entero");

  assertOk(await acciones.restaurarOperario(ctx.jose.uid), "restaurarOperario");
  const joseVuelto = await datos.getOperario(ctx.jose.uid);
  assert(joseVuelto?.eliminado === false && joseVuelto.activo, "José tenía que volver entero");

  // Nadie se elimina ni se desactiva a sí mismo.
  await entrarComo(ctx.cami);
  await assertFalla(acciones.eliminarOperario(ctx.cami.uid), "tu propia cuenta");
  await assertFalla(acciones.desactivarOperario(ctx.cami.uid), "tu propia cuenta");

  // Y no puede quedarse el sistema sin nadie que gestione usuarios. El aviso
  // nombra a la persona afectada: quien borra desde el panel no se está
  // quitando ningún permiso a sí mismo, así que no se le puede decir eso.
  await entrarComoDuena();
  await assertFalla(acciones.eliminarOperario(ctx.cami.uid), "única persona activa que puede dar de alta usuarios");
  await assertFalla(acciones.desactivarOperario(ctx.cami.uid), "única persona activa que puede dar de alta usuarios");

  // Sin la capacidad `gestionar_usuarios`, todo rechazado.
  await entrarComo(ctx.jose);
  await assertFalla(
    acciones.crearOperario({ nombre: "Colado", pin: "1234", rolClave: "carpintero" }),
    "No tienes permiso"
  );
  await assertFalla(
    acciones.actualizarOperario(ctx.rosa.uid, { nombre: "Otra Rosa" }),
    "No tienes permiso"
  );
  await assertFalla(acciones.eliminarOperario(ctx.rosa.uid), "No tienes permiso");
  await assertFalla(acciones.resetearPin(ctx.rosa.uid, "0000"), "No tienes permiso");
  await assertFalla(acciones.cambiarRolOperario(ctx.rosa.uid, "tapicero"), "No tienes permiso");
});

/* ── 20 · CAPACIDADES EN VIVO ────────────────────────────────────────────── */

test("20 · Quitar un permiso surte efecto sin volver a entrar", async () => {
  const rol = await comoDuena(async () =>
    assertOk(
      await acciones.crearRol({
        nombre: "Jefe de turno",
        capacidades: ["trabajar", "escanear", "reportar_incidencias", "revertir_pasos"],
      }),
      "crearRol(Jefe de turno)"
    )
  );

  const pablo = await comoDuena(async () =>
    assertOk(
      await acciones.crearOperario({
        nombre: "Pablo Turno",
        pin: "1234",
        rolClave: rol.clave,
        codigoEmpleado: "T-040",
      }),
      "crearOperario(Pablo)"
    )
  );

  const persona: Persona = { uid: pablo._id, nombre: pablo.nombre, rolClave: rol.clave };
  const mueble = await crearMueble();

  await terminarMedir(mueble.codigo, persona);
  assertOk(
    await acciones.revertirPaso(mueble.codigo, "medir", "Con el permiso puesto sí puede"),
    "revertirPaso con permiso"
  );

  const tokenAntes = cookiesFalsas.get(auth.OPERARIO_COOKIE);

  // El admin le quita el permiso mientras Pablo sigue con la misma sesión.
  await comoDuena(async () => {
    assertOk(
      await acciones.actualizarRol(rol.clave, {
        nombre: "Jefe de turno",
        capacidades: ["trabajar", "escanear", "reportar_incidencias"],
      }),
      "actualizarRol quitando revertir_pasos"
    );
  });

  assert(
    cookiesFalsas.get(auth.OPERARIO_COOKIE) === tokenAntes,
    "La prueba sólo vale si Pablo NO volvió a entrar: el token tiene que ser el mismo"
  );

  await terminarMedir(mueble.codigo, persona);
  await assertFalla(
    acciones.revertirPaso(mueble.codigo, "medir", "Ahora ya no debería poder"),
    "No tienes permiso"
  );

  // Y devolvérselo también se nota en el acto.
  await comoDuena(async () => {
    assertOk(
      await acciones.actualizarRol(rol.clave, {
        nombre: "Jefe de turno",
        capacidades: ["trabajar", "escanear", "reportar_incidencias", "revertir_pasos"],
      }),
      "actualizarRol devolviendo revertir_pasos"
    );
  });
  assertOk(
    await acciones.revertirPaso(mueble.codigo, "medir", "Con el permiso otra vez puesto"),
    "revertirPaso tras devolver el permiso"
  );
});

/* ── 21 · CRUD DEL RESTO DE ENTIDADES ────────────────────────────────────── */

test("21 · Áreas: crear, editar, activar, eliminar (física y lógica) y restaurar", async () => {
  await entrarComoDuena();

  const area = assertOk(
    await acciones.crearEstacion({ nombre: "Área temporal", tipo: "ALMACEN" }),
    "crearEstacion"
  );
  assertOk(
    await acciones.actualizarEstacion(area._id, {
      nombre: "Área temporal renombrada",
      direccion: "Calle 1, galpón 9",
    }),
    "actualizarEstacion"
  );
  const leida = await datos.getEstacion(area._id);
  assert(leida?.nombre === "Área temporal renombrada", "El nombre tenía que cambiar");

  assertOk(await acciones.desactivarEstacion(area._id), "desactivarEstacion");
  assert((await datos.getEstacion(area._id))?.activa === false, "Tenía que quedar inactiva");
  assertOk(await acciones.activarEstacion(area._id), "activarEstacion");

  // Sin nada colgando: borrado físico.
  const borrada = assertOk(await acciones.eliminarEstacion(area._id), "eliminarEstacion");
  assert(borrada.modo === "FISICO", "Un área que nadie usa se borra de verdad");
  assert((await datos.getEstacion(area._id)) === null, "Y desaparece");

  // En uso por una ruta: se archiva, no se destruye (§7).
  const enUso = assertOk(
    await acciones.crearEstacion({ nombre: "Área en uso", tipo: "TALLER" }),
    "crearEstacion(Área en uso)"
  );
  const ruta = assertOk(
    await acciones.crearRuta({
      nombre: "Ruta que usa el área",
      pasos: [{ clave: "paso_area", nombre: "Paso con área", estacionId: enUso._id }],
    }),
    "crearRuta(Ruta que usa el área)"
  );

  const archivada = assertOk(
    await acciones.eliminarEstacion(enUso._id),
    "eliminarEstacion(en uso)"
  );
  assert(
    archivada.modo === "LOGICO",
    "Un área en uso NO se borra: se marca como eliminada y se conserva (§7)"
  );
  const guardada = await datos.getEstacion(enUso._id);
  assert(guardada !== null, "El área tenía que seguir existiendo");
  assert(guardada.eliminada === true, "Y quedar marcada como eliminada");

  assertOk(await acciones.restaurarEstacion(enUso._id), "restaurarEstacion");
  assert((await datos.getEstacion(enUso._id))?.eliminada === false, "Tenía que volver");

  // Sin la capacidad, nada.
  await entrarComo(ctx.jose);
  await assertFalla(acciones.crearEstacion({ nombre: "Área pirata" }), "No tienes permiso");
  await assertFalla(acciones.eliminarEstacion(enUso._id), "No tienes permiso");

  await comoDuena(async () => {
    assertOk(await acciones.eliminarRuta(ruta._id), "Limpieza: eliminarRuta");
  });
});

test("21 · Pasos del catálogo: crear, editar, duplicar, desactivar y eliminar", async () => {
  await entrarComoDuena();

  const paso = assertOk(
    await acciones.crearPasoCatalogo({
      nombre: "Barnizado extra",
      instrucciones: "Pasa una segunda mano de barniz cuando la primera esté seca.",
      estacionId: ctx.areaTallerId,
      rolesPermitidos: ["carpintero"],
      requiereFoto: true,
      minFotos: 2,
      horasEstimadas: 2,
    }),
    "crearPasoCatalogo"
  );
  assert(paso.clave === "barnizado_extra", `La clave se dedujo mal: «${paso.clave}»`);
  assert(paso.esSistema === false, "Un paso creado a mano no es del sistema");

  const editado = assertOk(
    await acciones.actualizarPasoCatalogo("barnizado_extra", {
      nombre: "Barnizado extra fino",
      horasEstimadas: 3,
    }),
    "actualizarPasoCatalogo"
  );
  assert(editado.nombre === "Barnizado extra fino", "El nombre tenía que cambiar");
  assert(editado.horasEstimadas === 3, "Las horas tenían que cambiar");

  const copia = assertOk(await acciones.duplicarPasoCatalogo("barnizado_extra"), "duplicar");
  assertOk(await acciones.desactivarPasoCatalogo(copia.clave), "desactivarPasoCatalogo");
  assert((await datos.getPasoCatalogo(copia.clave))?.activo === false, "Tenía que desactivarse");
  assertOk(await acciones.activarPasoCatalogo(copia.clave), "activarPasoCatalogo");

  // La copia no la usa nadie: borrado físico.
  const borrada = assertOk(await acciones.eliminarPasoCatalogo(copia.clave), "eliminar copia");
  assert(borrada.modo === "FISICO", "Un paso que nadie usa se borra de verdad");
  assert((await datos.getPasoCatalogo(copia.clave)) === null, "Y desaparece");

  // Usado por una ruta: se desactiva en vez de borrarse.
  const ruta = assertOk(
    await acciones.crearRuta({
      nombre: "Ruta con barnizado",
      pasos: [
        { clave: "barnizado_extra", nombre: "Barnizado extra fino", estacionId: ctx.areaTallerId },
      ],
    }),
    "crearRuta(Ruta con barnizado)"
  );
  const desactivado = assertOk(
    await acciones.eliminarPasoCatalogo("barnizado_extra"),
    "eliminarPasoCatalogo en uso"
  );
  assert(
    desactivado.modo === "LOGICO",
    "Un paso en uso no se borra: se desactiva y las rutas siguen funcionando (§7)"
  );
  const guardado = await datos.getPasoCatalogo("barnizado_extra");
  assert(guardado !== null && guardado.activo === false, "Tenía que quedar desactivado");
  assertOk(await acciones.activarPasoCatalogo("barnizado_extra"), "volver a activarlo");

  // Los pasos del sistema no se eliminan nunca.
  const { default: CatalogoPasoModel } = await import("@/lib/models/CatalogoPaso");
  await CatalogoPasoModel.updateOne(
    { clave: "barnizado_extra" },
    { $set: { esSistema: true } }
  );
  await assertFalla(acciones.eliminarPasoCatalogo("barnizado_extra"), "viene con el sistema");

  await entrarComo(ctx.jose);
  await assertFalla(acciones.crearPasoCatalogo({ nombre: "Paso pirata" }), "No tienes permiso");

  await comoDuena(async () => {
    assertOk(await acciones.eliminarRuta(ruta._id), "Limpieza: eliminarRuta");
  });
});

test("21 · Rutas: crear, editar, duplicar, predeterminada, archivar y restaurar", async () => {
  await entrarComoDuena();

  const ruta = assertOk(
    await acciones.crearRuta({
      nombre: "Ruta de repisas",
      descripcion: "Tres pasos y listo.",
      pasos: [
        { clave: "cortar_repisa", nombre: "Cortar la repisa", estacionId: ctx.areaTallerId },
        { clave: "lijar_repisa", nombre: "Lijar la repisa", estacionId: ctx.areaTallerId },
      ],
    }),
    "crearRuta"
  );
  assert(ruta.pasos.length === 2, "La ruta tenía que guardar sus 2 pasos");

  await assertFalla(
    acciones.crearRuta({
      nombre: "Ruta rota",
      pasos: [
        { clave: "uno", nombre: "Repetido", estacionId: ctx.areaTallerId },
        { clave: "uno", nombre: "Repetido", estacionId: ctx.areaTallerId },
      ],
    }),
    "está dos veces"
  );
  await assertFalla(acciones.crearRuta({ nombre: "Ruta sin pasos", pasos: [] }), "al menos un paso");

  const copia = assertOk(await acciones.duplicarRuta(ruta._id), "duplicarRuta");
  assert(copia.nombre.includes("copia"), `La copia se llamó «${copia.nombre}»`);

  assertOk(await acciones.marcarRutaPredeterminada(copia._id), "marcarRutaPredeterminada");
  assert((await datos.getRuta(copia._id))?.esPredeterminada === true, "Tenía que quedar marcada");
  assertOk(
    await acciones.marcarRutaPredeterminada(ctx.rutaPruebaId),
    "devolver la predeterminada"
  );

  // Sin muebles: borrado físico.
  const borrada = assertOk(await acciones.eliminarRuta(copia._id), "eliminarRuta(copia)");
  assert(borrada.modo === "FISICO", "Una ruta sin muebles se borra de verdad");

  // Con muebles: se archiva.
  const conMuebles = assertOk(
    await acciones.eliminarRuta(ctx.rutaPruebaId),
    "eliminarRuta(con muebles)"
  );
  assert(conMuebles.modo === "LOGICO", "Una ruta con muebles se archiva, no se borra (§7)");
  const archivada = await datos.getRuta(ctx.rutaPruebaId);
  assert(archivada?.archivada === true, "Tenía que quedar archivada");

  assertOk(await acciones.restaurarRuta(ctx.rutaPruebaId), "restaurarRuta");
  assert((await datos.getRuta(ctx.rutaPruebaId))?.archivada === false, "Tenía que volver");
  assertOk(
    await acciones.marcarRutaPredeterminada(ctx.rutaPruebaId),
    "volver a dejarla predeterminada"
  );

  assertOk(await acciones.archivarRuta(ruta._id), "archivarRuta");
  assertOk(await acciones.restaurarRuta(ruta._id), "restaurarRuta(2)");
  assertOk(await acciones.eliminarRuta(ruta._id), "eliminarRuta(limpieza)");

  await entrarComo(ctx.jose);
  await assertFalla(acciones.crearRuta({ nombre: "Ruta pirata" }), "No tienes permiso");
});

test("21 · Pedidos: crear, editar, añadir muebles, eliminar, restaurar y cancelar", async () => {
  await entrarComoDuena();

  const pedidoDto = assertOk(
    await acciones.crearPedido({
      cliente: { nombre: "Pedro Pruebas", telefono: "0424-1234567", ciudad: "Valencia" },
      canal: "TIENDA",
      prioridad: "NORMAL",
      lineas: [
        {
          producto: { titulo: "Repisa de prueba", categoria: "Muebles Auxiliares", precio: 95 },
          cantidad: 2,
          rutaId: ctx.rutaPruebaId,
        },
      ],
    }),
    "crearPedido"
  );
  assert(pedidoDto.unidades?.length === 2, "Una línea de cantidad 2 crea 2 muebles");
  assert(pedidoDto.totalUnidades === 2, "El pedido tenía que contar sus 2 muebles");

  await assertFalla(
    acciones.crearPedido({
      cliente: { nombre: "Sin teléfono", telefono: "" },
      lineas: [{ producto: { titulo: "Algo" }, cantidad: 1 }],
    }),
    "teléfono"
  );

  assertOk(
    await acciones.actualizarPedido(pedidoDto.codigo, {
      cliente: { nombre: "Pedro Pruebas Gil" },
      notas: "Llamar antes de ir.",
    }),
    "actualizarPedido"
  );
  const editado = await datos.getPedido(pedidoDto.codigo);
  assert(editado?.cliente.nombre === "Pedro Pruebas Gil", "El cliente tenía que cambiar");

  assertOk(
    await acciones.cambiarPrioridadPedido(pedidoDto.codigo, "URGENTE"),
    "cambiarPrioridadPedido"
  );
  assert(
    (await datos.getPedido(pedidoDto.codigo))?.prioridad === "URGENTE",
    "La prioridad tenía que cambiar"
  );

  const nuevas = assertOk(
    await acciones.agregarUnidadesAPedido(pedidoDto.codigo, [
      {
        producto: { titulo: "Mesita añadida", categoria: "Muebles Auxiliares" },
        cantidad: 1,
        rutaId: ctx.rutaPruebaId,
      },
    ]),
    "agregarUnidadesAPedido"
  );
  assert(nuevas.length === 1, "Tenía que crearse 1 mueble más");
  assert(
    (await datos.getPedido(pedidoDto.codigo))?.totalUnidades === 3,
    "El pedido tenía que recontar sus muebles"
  );

  // Todos sus muebles siguen sin empezar: borrado LÓGICO (§7) y se restaura.
  const borrado = assertOk(await acciones.eliminarPedido(pedidoDto.codigo), "eliminarPedido");
  assert(borrado.modo === "LOGICO", "Un pedido con muebles se guarda como eliminado");
  const eliminado = await datos.getPedido(pedidoDto.codigo);
  assert(eliminado?.eliminado === true, "Tenía que quedar marcado como eliminado");

  assertOk(await acciones.restaurarPedido(pedidoDto.codigo), "restaurarPedido");
  assert(
    (await datos.getPedido(pedidoDto.codigo))?.eliminado === false,
    "El pedido tenía que volver"
  );

  // Uno que ya empezó no se elimina: se cancela.
  const enMarcha = pedidoDto.unidades![0].codigo;
  assertOk(await acciones.iniciarPaso(enMarcha, "medir"), "iniciarPaso para arrancarlo");
  await assertFalla(acciones.eliminarPedido(pedidoDto.codigo), "ya empezó a fabricarse");

  assertOk(
    await acciones.cancelarPedido(pedidoDto.codigo, "El cliente se arrepintió."),
    "cancelarPedido"
  );
  const cancelado = await datos.getPedido(pedidoDto.codigo);
  assert(cancelado?.estado === "CANCELADO", "El pedido tenía que quedar CANCELADO");
  const unidadCancelada = await datos.getUnidad(enMarcha);
  assert(
    unidadCancelada?.estado === "CANCELADA",
    "Al cancelar el pedido se cancelan sus muebles en marcha"
  );

  await entrarComo(ctx.jose);
  await assertFalla(
    acciones.crearPedido({
      cliente: { nombre: "X", telefono: "1" },
      lineas: [{ producto: { titulo: "Y" }, cantidad: 1 }],
    }),
    "No tienes permiso"
  );
});

test("21 · Muebles: editar, asignar, pausar, cambiar de ruta, eliminar y restaurar", async () => {
  const mueble = await crearMueble({ titulo: "Mueble editable" });
  await entrarComoDuena();

  assertOk(
    await acciones.actualizarUnidad(mueble.codigo, {
      prioridad: "ALTA",
      notas: "Ojo: la tela va al revés.",
    }),
    "actualizarUnidad"
  );
  const editada = await datos.getUnidad(mueble.codigo);
  assert(editada?.prioridad === "ALTA", "La prioridad tenía que cambiar");
  assert(editada?.notas.includes("al revés"), "La nota tenía que guardarse");

  const asignada = assertOk(
    await acciones.asignarUnidad(mueble.codigo, ctx.jose.uid),
    "asignarUnidad"
  );
  assert(
    asignada.asignadoANombre === "José Rodríguez",
    `El nombre del responsable no se guardó: «${asignada.asignadoANombre}»`
  );
  assertOk(await acciones.asignarUnidad(mueble.codigo, null), "quitar responsable");

  assertOk(await acciones.cambiarPrioridad(mueble.codigo, "URGENTE"), "cambiarPrioridad");
  assertOk(
    await acciones.cambiarFechaPrometida(mueble.codigo, new Date().toISOString()),
    "cambiarFechaPrometida"
  );
  assertOk(await acciones.agregarNota(mueble.codigo, "Nota del taller."), "agregarNota");

  assertOk(await acciones.pausarUnidad(mueble.codigo, "Falta la tela."), "pausarUnidad");
  assert((await datos.getUnidad(mueble.codigo))?.estado === "PAUSADA", "Tenía que quedar pausada");
  await assertFalla(acciones.iniciarPaso(mueble.codigo, "medir"), "en pausa");
  assertOk(await acciones.reanudarUnidad(mueble.codigo), "reanudarUnidad");

  // Cambiar de ruta mientras no ha empezado.
  const otraRuta = assertOk(
    await acciones.crearRuta({
      nombre: "Ruta alternativa",
      pasos: [{ clave: "paso_alterno", nombre: "Paso alterno", estacionId: ctx.areaTallerId }],
    }),
    "crearRuta(alternativa)"
  );
  assertOk(
    await acciones.cambiarRutaDeUnidad(mueble.codigo, otraRuta._id, "Se pidió otro acabado."),
    "cambiarRutaDeUnidad"
  );
  const conRutaNueva = await datos.getUnidad(mueble.codigo);
  assert(conRutaNueva?.pasos.length === 1, "El mueble tenía que quedarse con la ruta nueva");

  // Tiene historial: borrado LÓGICO y se restaura.
  const borrada = assertOk(await acciones.eliminarUnidad(mueble.codigo), "eliminarUnidad");
  assert(borrada.modo === "LOGICO", "Un mueble con historial no se destruye (§7)");
  const eliminada = await datos.getUnidad(mueble.codigo);
  assert(eliminada?.eliminada === true, "Tenía que quedar marcado como eliminado");
  const eventos = await EventoModel.countDocuments({ unidadCodigo: mueble.codigo });
  assert(eventos > 0, "Su bitácora tenía que conservarse entera");

  assertOk(await acciones.restaurarUnidad(mueble.codigo), "restaurarUnidad");
  assert((await datos.getUnidad(mueble.codigo))?.eliminada === false, "Tenía que volver");

  // Ya empezado: no se elimina, se cancela.
  assertOk(await acciones.iniciarPaso(mueble.codigo, "paso_alterno"), "iniciarPaso");
  await assertFalla(acciones.eliminarUnidad(mueble.codigo), "ya empezó a fabricarse");
  assertOk(await acciones.cancelarUnidad(mueble.codigo, "Se rompió."), "cancelarUnidad");
  assert(
    (await datos.getUnidad(mueble.codigo))?.estado === "CANCELADA",
    "Tenía que quedar cancelado"
  );

  await comoDuena(async () => {
    assertOk(await acciones.eliminarRuta(otraRuta._id), "Limpieza");
  });
});

test("21 · Problemas: reportar, editar, eliminar y que el mueble se desbloquee", async () => {
  const mueble = await crearMueble();
  await entrarComo(ctx.jose);

  const incidencia = assertOk(
    await acciones.reportarIncidencia(mueble.codigo, {
      motivo: "Falta un tornillo",
      descripcion: "El juego venía incompleto.",
      severidad: "BAJA",
      pasoClave: "medir",
    }),
    "reportarIncidencia"
  );
  assert(incidencia.estado === "ABIERTA", "El problema nace abierto");

  const leida = await datos.getIncidencia(incidencia._id);
  assert(leida?.motivo === "Falta un tornillo", "El problema tenía que poder leerse");

  await entrarComo(ctx.rosa);
  const editada = assertOk(
    await acciones.actualizarIncidencia(incidencia._id, {
      motivo: "Faltan dos tornillos",
      severidad: "MEDIA",
    }),
    "actualizarIncidencia"
  );
  assert(editada.severidad === "MEDIA", "La gravedad tenía que cambiar");

  const abiertas = await datos.getIncidenciasAbiertas(
    (await datos.getUnidad(mueble.codigo))!._id
  );
  assert(abiertas.length === 1, "Tenía que haber 1 problema abierto");

  const borrada = assertOk(await acciones.eliminarIncidencia(incidencia._id), "eliminarIncidencia");
  assert(borrada.modo === "FISICO", "Un aviso equivocado se borra; la bitácora recuerda que existió");
  assert((await datos.getIncidencia(incidencia._id)) === null, "Y desaparece");

  const libre = await datos.getUnidad(mueble.codigo);
  assert(libre?.estado !== "INCIDENCIA", "Al quitar el aviso el mueble tenía que desbloquearse");

  await entrarComo(ctx.luis);
  await assertFalla(acciones.eliminarIncidencia(incidencia._id), "No tienes permiso");
});

/* ── 22 · REGLAS PURAS EN LOS BORDES ─────────────────────────────────────── */

/** Un paso mínimo para probar las reglas sin tocar la base. */
function pasoFalso(clave: string, extra?: Partial<PasoUnidadDTO>): PasoUnidadDTO {
  return {
    clave,
    nombre: clave,
    instrucciones: "",
    icono: "lista",
    color: "#E8511A",
    tipo: "TRABAJO",
    estacionId: null,
    rolesPermitidos: [],
    requiereFoto: false,
    minFotos: 0,
    requiereEscaneo: false,
    requiereFirma: false,
    requiereNota: false,
    checklist: [],
    horasEstimadas: 0,
    permiteParalelo: false,
    permiteOmitir: false,
    notificaCliente: false,
    estado: "BLOQUEADO",
    iniciadoAt: null,
    completadoAt: null,
    iniciadoPorId: "",
    iniciadoPorNombre: "",
    completadoPorId: "",
    completadoPorNombre: "",
    fotos: [],
    nota: "",
    firmaUrl: "",
    checklistRespuestas: [],
    duracionMs: 0,
    motivoOmision: "",
    escaneadoAt: null,
    escaneadoPorId: "",
    ...extra,
  };
}

test("22 · recalcularEstados con pasos en paralelo y progreso en los bordes", async () => {
  // Uno detrás de otro: sólo el primero queda LISTO.
  const enFila = reglas.recalcularEstados([
    pasoFalso("a"),
    pasoFalso("b"),
    pasoFalso("c"),
  ]);
  assert(enFila[0].estado === "LISTO", "El primero siempre está LISTO");
  assert(enFila[1].estado === "BLOQUEADO", "El segundo espera al primero");
  assert(enFila[2].estado === "BLOQUEADO", "Y el tercero también");

  // Con `permiteParalelo`, el de al lado arranca en cuanto el anterior empieza.
  const enParalelo = reglas.recalcularEstados([
    pasoFalso("a", { estado: "EN_CURSO" }),
    pasoFalso("b", { permiteParalelo: true }),
    pasoFalso("c"),
  ]);
  assert(enParalelo[0].estado === "EN_CURSO", "El que está en curso no se toca");
  assert(enParalelo[1].estado === "LISTO", "El paralelo puede adelantarse");
  assert(enParalelo[2].estado === "BLOQUEADO", "El que no es paralelo sigue esperando");

  // No muta la lista original.
  const originales = [pasoFalso("a"), pasoFalso("b")];
  reglas.recalcularEstados(originales);
  assert(originales[0].estado === "BLOQUEADO", "recalcularEstados no puede mutar la entrada");

  // Un paso ya cerrado o con problema se respeta.
  const tocados = reglas.recalcularEstados([
    pasoFalso("a", { estado: "COMPLETADO" }),
    pasoFalso("b", { estado: "INCIDENCIA" }),
    pasoFalso("c"),
  ]);
  assert(tocados[1].estado === "INCIDENCIA", "Un problema no se recalcula solo");
  assert(tocados[2].estado === "BLOQUEADO", "Y bloquea a los siguientes");

  // Progreso en los bordes.
  assert(reglas.calcularProgreso([]) === 0, "Sin pasos el progreso es 0, sin dividir por cero");
  assert(
    reglas.calcularProgreso([pasoFalso("a"), pasoFalso("b")]) === 0,
    "Sin nada hecho el progreso es 0"
  );
  assert(
    reglas.calcularProgreso([
      pasoFalso("a", { estado: "OMITIDO" }),
      pasoFalso("b", { estado: "OMITIDO" }),
    ]) === 100,
    "Todos omitidos cuenta como terminado"
  );
  assert(
    reglas.calcularProgreso([
      pasoFalso("a", { estado: "COMPLETADO" }),
      pasoFalso("b", { estado: "OMITIDO" }),
      pasoFalso("c"),
    ]) === 67,
    "Dos de tres cerrados son el 67 %"
  );

  // Paso actual y estado del mueble.
  assert(reglas.indicePasoActual([]) === 0, "Sin pasos el índice es 0");
  assert(
    reglas.indicePasoActual([pasoFalso("a", { estado: "COMPLETADO" }), pasoFalso("b")]) === 1,
    "El paso actual es el primero sin cerrar"
  );
  assert(
    reglas.estadoUnidadDesdePasos([], "PENDIENTE") === "PENDIENTE",
    "Un mueble sin pasos está PENDIENTE"
  );
  assert(
    reglas.estadoUnidadDesdePasos(
      [pasoFalso("a", { estado: "COMPLETADO" })],
      "PENDIENTE"
    ) === "TERMINADA",
    "Con todo cerrado el mueble está TERMINADO"
  );
  assert(
    reglas.estadoUnidadDesdePasos([pasoFalso("a", { estado: "COMPLETADO" })], "CANCELADA") ===
      "CANCELADA",
    "Un mueble cancelado se queda cancelado, digan lo que digan sus pasos"
  );
  assert(
    reglas.estadoUnidadDesdePasos([pasoFalso("a", { estado: "INCIDENCIA" })], "EN_PROCESO") ===
      "INCIDENCIA",
    "Un problema abierto manda sobre el estado del mueble"
  );

  // Y los mensajes dicen QUÉ HACER.
  const bloqueo = reglas.describirBloqueo(
    [pasoFalso("a", { nombre: "Armado de estructura" }), pasoFalso("b")],
    "b"
  );
  assert(
    bloqueo === "Primero hay que terminar «Armado de estructura».",
    `El aviso de bloqueo quedó raro: «${bloqueo}»`
  );
  assert(
    reglas.describirBloqueo([pasoFalso("a", { estado: "LISTO" })], "a") === "",
    "Si no está bloqueado, no hay nada que avisar"
  );
});

/* ════════════════════════════════════════════════════════════════════════════
 * 8. PRINCIPAL
 * ════════════════════════════════════════════════════════════════════════════ */

async function main(): Promise<void> {
  console.log(tinta.fuerte("\n  PRUEBAS DEL MÓDULO DE FABRICACIÓN"));
  console.log(tinta.gris(`  Base de pruebas: ${URI_PRUEBAS}\n`));

  await cargarModulos();
  silenciarModulo();
  await prepararBase();
  devolverConsola();

  let fallos = 0;
  const inicio = Date.now();

  let ruidoTotal = 0;

  for (const prueba of pruebas) {
    const t0 = Date.now();
    ruidoDelModulo = [];
    silenciarModulo();
    try {
      await prueba.fn();
      devolverConsola();
      console.log(
        `  ${tinta.verde("✓")} ${prueba.nombre} ${tinta.gris(`(${Date.now() - t0} ms)`)}`
      );
    } catch (error) {
      devolverConsola();
      fallos += 1;
      const mensaje = error instanceof Error ? error.message : String(error);
      console.log(`  ${tinta.rojo("✗")} ${prueba.nombre}`);
      console.log(`    ${tinta.rojo(mensaje)}`);
      if (error instanceof Error && error.stack) {
        const linea = error.stack
          .split("\n")
          .find((l) => l.includes("test-fabricacion.ts"));
        if (linea) console.log(`    ${tinta.gris(linea.trim())}`);
      }
      for (const linea of ruidoDelModulo.slice(0, 3)) {
        console.log(`    ${tinta.gris(linea.split("\n")[0])}`);
      }
    }
    ruidoTotal += ruidoDelModulo.length;
  }

  const segundos = ((Date.now() - inicio) / 1000).toFixed(1);
  console.log("");
  console.log(
    `  ${pruebas.length - fallos}/${pruebas.length} casos en verde · ${aserciones} comprobaciones · ${segundos} s`
  );
  console.log(
    tinta.gris(
      `  Las actions pidieron refrescar la pantalla ${revalidaciones} veces · ` +
        `${ruidoTotal} rechazos anotados por el módulo (se esperaban: casi todos son casos que TIENEN que fallar).`
    )
  );

  // Se limpia siempre: la base de pruebas no guarda nada entre ejecuciones.
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();

  if (fallos > 0) {
    console.log(`\n  ${tinta.rojo(`✗ ${fallos} caso${fallos === 1 ? "" : "s"} en rojo`)}\n`);
    process.exit(1);
  }
  console.log(`\n  ${tinta.verde("✓ Todo en verde")}\n`);
}

main().catch(async (error) => {
  console.error(tinta.rojo("\n✖ La suite se rompió antes de terminar:"));
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
