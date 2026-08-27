/**
 * Datos de demostración del módulo de Fabricación.
 *
 * Uso:
 *   npm run seed:fabrica            → siembra lo que falte (idempotente)
 *   npm run seed:fabrica -- --reset → borra ANTES las colecciones de
 *                                     fabricación y vuelve a sembrar
 *
 * Lo que siembra (§11 del contrato):
 *   · Los 8 roles de `ROLES_SEMILLA` con sus capacidades.
 *   · 5 áreas de trabajo: Carpintería, Tapicería, Pintura, Almacén Central y
 *     Tienda Valencia.
 *   · El catálogo de pasos completo desde `PASOS_SUGERIDOS`, cada paso ya
 *     enganchado a su área.
 *   · 6 personas del equipo, todas con PIN 1234.
 *   · Las 3 rutas de `PLANTILLAS_RUTA`.
 *   · 2 pedidos con 5 muebles en distintos grados de avance, con su bitácora
 *     coherente (eventos con fechas escalonadas) y un problema abierto.
 *
 * ── DECISIONES ──────────────────────────────────────────────────────────────
 *
 *  1. **Nunca toca `products`.** `--reset` sólo limpia las colecciones de
 *     fabricación, una por una y por su nombre explícito.
 *  2. **Escribe con los modelos, no con las Server Actions.** Las actions
 *     necesitan `cookies()` y `revalidatePath()` de Next, que fuera de una
 *     petición no existen; un seed no tiene por qué montar ese andamiaje. Para
 *     que el resultado sea idéntico al que dejaría el taller, los estados de
 *     los pasos y del mueble se calculan con las MISMAS reglas puras que usan
 *     las actions (`recalcularEstados`, `calcularProgreso`,
 *     `estadoUnidadDesdePasos`), y los códigos con `generarCodigoUnidad` /
 *     `generarCodigoPedido` (el contador atómico de verdad).
 *  3. **Idempotente**: cada bloque comprueba si ya existe y lo salta. Los
 *     pedidos de demostración se reconocen por `creadoPorId: "seed"`.
 *  4. La carga de `.env.local` es la misma de `scripts/seed.ts`. El alias `@/`
 *     lo resuelve `tsx` leyendo los `paths` del `tsconfig.json` (comprobado);
 *     por eso aquí se puede importar igual que en el resto del repo.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import mongoose from "mongoose";

// Carga .env.local manualmente (sin depender de dotenv), igual que scripts/seed.ts.
const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^\s*([\w.]+)\s*=\s*"?([^"#]*)"?\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  }
}

import CatalogoPasoModel from "@/lib/models/CatalogoPaso";
import EstacionModel from "@/lib/models/Estacion";
import EventoUnidadModel from "@/lib/models/EventoUnidad";
import IncidenciaModel from "@/lib/models/Incidencia";
import OperarioModel from "@/lib/models/Operario";
import PedidoModel from "@/lib/models/Pedido";
import RegistroAuditoriaModel from "@/lib/models/RegistroAuditoria";
import RolModel from "@/lib/models/Rol";
import RutaFabricacionModel from "@/lib/models/RutaFabricacion";
import UnidadFabricacionModel from "@/lib/models/UnidadFabricacion";
import CounterModel from "@/lib/models/Counter";

import { serializarPasoUnidad } from "@/lib/data/fabricacion";
import {
  PASOS_SUGERIDOS,
  PLANTILLAS_RUTA,
  ROLES_SEMILLA,
  pasosDePlantilla,
  seguimientoPublicoActivo,
} from "@/lib/fabricacion/constantes";
import { registrarAuditoria } from "@/lib/fabricacion/auditoria";
import { generarCodigoPedido, generarCodigoUnidad } from "@/lib/fabricacion/codigos";
import { hashPin } from "@/lib/fabricacion/pin";
import {
  calcularProgreso,
  estadoUnidadDesdePasos,
  indicePasoActual,
  recalcularEstados,
} from "@/lib/fabricacion/reglas";
import { getSiteUrl } from "@/lib/utils";
import type { EstadoUnidad, TipoEstacion } from "@/lib/types/fabricacion";

/* ────────────────────────────────────────────────────────────────────────────
 * SALIDA POR PANTALLA
 * ──────────────────────────────────────────────────────────────────────────── */

const color = {
  gris: (t: string) => `\x1b[90m${t}\x1b[0m`,
  verde: (t: string) => `\x1b[32m${t}\x1b[0m`,
  ambar: (t: string) => `\x1b[33m${t}\x1b[0m`,
  azul: (t: string) => `\x1b[36m${t}\x1b[0m`,
  fuerte: (t: string) => `\x1b[1m${t}\x1b[0m`,
};

function creado(texto: string): void {
  console.log(`${color.verde("✔")} ${texto}`);
}

function saltado(texto: string): void {
  console.log(`${color.gris("↺")} ${color.gris(texto)}`);
}

function titulo(texto: string): void {
  console.log(`\n${color.fuerte(texto)}`);
}

/* ────────────────────────────────────────────────────────────────────────────
 * TIPOS AUXILIARES (planos, sin Mongoose)
 * ──────────────────────────────────────────────────────────────────────────── */

/** Un paso ya congelado dentro de un mueble. Se guarda tal cual. */
type PasoPlano = Record<string, unknown>;

interface RutaSembrada {
  _id: mongoose.Types.ObjectId;
  nombre: string;
  version: number;
  pasos: PasoPlano[];
}

interface PersonaSembrada {
  _id: mongoose.Types.ObjectId;
  nombre: string;
  rolClave: string;
  rolNombre: string;
}

/* ────────────────────────────────────────────────────────────────────────────
 * ÁREAS DE TRABAJO
 * ──────────────────────────────────────────────────────────────────────────── */

interface EstacionSemilla {
  nombre: string;
  tipo: TipoEstacion;
  direccion: string;
  telefono: string;
  orden: number;
}

const ESTACIONES_SEMILLA: EstacionSemilla[] = [
  {
    nombre: "Carpintería",
    tipo: "TALLER",
    direccion: "Galpón 1, Zona Industrial Castillito",
    telefono: "0241-8000001",
    orden: 1,
  },
  {
    nombre: "Tapicería",
    tipo: "TALLER",
    direccion: "Galpón 2, Zona Industrial Castillito",
    telefono: "0241-8000002",
    orden: 2,
  },
  {
    nombre: "Pintura",
    tipo: "TALLER",
    direccion: "Galpón 3, Zona Industrial Castillito",
    telefono: "0241-8000003",
    orden: 3,
  },
  {
    nombre: "Almacén Central",
    tipo: "ALMACEN",
    direccion: "Av. Bolívar Norte, depósito trasero",
    telefono: "0241-8000004",
    orden: 4,
  },
  {
    nombre: "Tienda Valencia",
    tipo: "TIENDA",
    direccion: "C.C. Metrópolis, local 24",
    telefono: "0241-8000005",
    orden: 5,
  },
];

/** Dónde se hace cada paso del catálogo. Lo que no esté aquí va por su tipo. */
const AREA_DE_PASO: Record<string, string> = {
  diseno_medidas: "Carpintería",
  corte_madera: "Carpintería",
  armado_estructura: "Carpintería",
  lijado: "Carpintería",
  bases_patas: "Carpintería",
  espuma_relleno: "Tapicería",
  costura_fundas: "Tapicería",
  tapizado: "Tapicería",
  forrado: "Tapicería",
  pintura_barniz: "Pintura",
  control_calidad: "Carpintería",
  embalaje: "Almacén Central",
  espera_almacen: "Almacén Central",
  despacho_almacen: "Almacén Central",
  recibido_tienda: "Tienda Valencia",
};

/* ────────────────────────────────────────────────────────────────────────────
 * EQUIPO
 * ──────────────────────────────────────────────────────────────────────────── */

interface PersonaSemilla {
  nombre: string;
  codigoEmpleado: string;
  rolClave: string;
  telefono: string;
  colorAvatar: string;
  areas: string[];
  nota: string;
}

/** Las 6 personas del taller. Todas entran con el PIN 1234. */
const PERSONAS_SEMILLA: PersonaSemilla[] = [
  {
    nombre: "Cami Vicent",
    codigoEmpleado: "E-001",
    rolClave: "admin",
    telefono: "0414-1000001",
    colorAvatar: "#25160F",
    areas: [],
    nota: "la dueña: puede hacerlo todo",
  },
  {
    nombre: "Rosa Medina",
    codigoEmpleado: "E-002",
    rolClave: "supervisor",
    telefono: "0414-1000002",
    colorAvatar: "#E8511A",
    areas: ["Carpintería", "Tapicería", "Pintura"],
    nota: "reparte el trabajo y resuelve los problemas",
  },
  {
    nombre: "José Rodríguez",
    codigoEmpleado: "E-003",
    rolClave: "carpintero",
    telefono: "0414-1000003",
    colorAvatar: "#A9714B",
    areas: ["Carpintería"],
    nota: "62 años, letra grande y botones enormes",
  },
  {
    nombre: "Luis Ortega",
    codigoEmpleado: "E-004",
    rolClave: "tapicero",
    telefono: "0414-1000004",
    colorAvatar: "#FF7A45",
    areas: ["Tapicería"],
    nota: "espuma, costura y tapizado",
  },
  {
    nombre: "Marta Gil",
    codigoEmpleado: "E-005",
    rolClave: "almacen",
    telefono: "0414-1000005",
    colorAvatar: "#6E5748",
    areas: ["Almacén Central"],
    nota: "embala, guarda y despacha",
  },
  {
    nombre: "Pedro Sánchez",
    codigoEmpleado: "E-006",
    rolClave: "delivery",
    telefono: "0414-1000006",
    colorAvatar: "#C63F0C",
    areas: ["Almacén Central", "Tienda Valencia"],
    nota: "lleva los muebles a casa del cliente",
  },
];

/* ────────────────────────────────────────────────────────────────────────────
 * AYUDAS
 * ──────────────────────────────────────────────────────────────────────────── */

/** Fecha relativa a hoy, en días (negativo = pasado). */
function dias(cantidad: number): Date {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + cantidad);
  return fecha;
}

/** Fecha relativa a hoy, en horas. */
function horas(cantidad: number): Date {
  return new Date(Date.now() + cantidad * 60 * 60 * 1000);
}

/**
 * Copia congelada de los pasos de una ruta con el progreso a cero, igual que
 * hace `congelarPasosDeRuta` en las actions: el mueble NO comparte objetos con
 * la ruta, así editarla mañana no le cambia nada.
 */
function congelarPasos(ruta: RutaSembrada): PasoPlano[] {
  return ruta.pasos.map((paso) => ({
    clave: paso.clave,
    nombre: paso.nombre,
    instrucciones: paso.instrucciones ?? "",
    icono: paso.icono ?? "clipboard-list",
    color: paso.color ?? "#E8511A",
    tipo: paso.tipo ?? "TRABAJO",
    estacionId: paso.estacionId ?? null,
    rolesPermitidos: [...((paso.rolesPermitidos as string[]) ?? [])],
    requiereFoto: paso.requiereFoto ?? false,
    minFotos: paso.minFotos ?? 1,
    requiereEscaneo: paso.requiereEscaneo ?? false,
    requiereFirma: paso.requiereFirma ?? false,
    requiereNota: paso.requiereNota ?? false,
    checklist: ((paso.checklist as { texto: string; obligatorio?: boolean }[]) ?? []).map(
      (item) => ({ texto: item.texto, obligatorio: item.obligatorio !== false })
    ),
    horasEstimadas: paso.horasEstimadas ?? 0,
    permiteParalelo: paso.permiteParalelo ?? false,
    permiteOmitir: paso.permiteOmitir ?? false,
    notificaCliente: paso.notificaCliente ?? false,
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
  }));
}

/** Aplica las reglas puras del taller a los pasos ya tocados. */
function recalcular(pasos: PasoPlano[]): void {
  const estados = recalcularEstados(pasos.map((paso) => serializarPasoUnidad(paso)));
  estados.forEach((paso, indice) => {
    pasos[indice].estado = paso.estado;
  });
}

/** Fotos de ejemplo (placeholders locales, como en scripts/seed.ts). */
const FOTOS_EJEMPLO = [
  "/products/sofa-modular-1.jpg",
  "/products/sofa-lino-2.jpg",
  "/products/comedor-nogal-1.jpg",
];

/**
 * Deja los primeros `cuantos` pasos como terminados por la persona que
 * corresponda, con su evidencia (fotos, lista marcada, nota) y devuelve la
 * bitácora que hay que escribir.
 */
interface AnotacionBitacora {
  tipo: "PASO_INICIADO" | "PASO_COMPLETADO";
  pasoClave: string;
  pasoNombre: string;
  persona: PersonaSembrada;
  descripcion: string;
  fotos: string[];
  fecha: Date;
  estacionId: mongoose.Types.ObjectId | null;
}

function completarPrimerosPasos(
  pasos: PasoPlano[],
  cuantos: number,
  equipo: Map<string, PersonaSembrada>,
  desde: Date
): AnotacionBitacora[] {
  const bitacora: AnotacionBitacora[] = [];
  let reloj = new Date(desde);

  for (let indice = 0; indice < Math.min(cuantos, pasos.length); indice += 1) {
    const paso = pasos[indice];
    const roles = (paso.rolesPermitidos as string[]) ?? [];
    const persona =
      equipo.get(roles[roles.length - 1] ?? "") ??
      equipo.get(roles[0] ?? "") ??
      equipo.get("supervisor")!;

    const inicio = new Date(reloj);
    const fin = new Date(reloj.getTime() + 90 * 60 * 1000);
    reloj = new Date(fin.getTime() + 30 * 60 * 1000);

    const fotos = paso.requiereFoto === true ? [FOTOS_EJEMPLO[indice % FOTOS_EJEMPLO.length]] : [];

    paso.estado = "COMPLETADO";
    paso.iniciadoAt = inicio;
    paso.completadoAt = fin;
    paso.iniciadoPorId = String(persona._id);
    paso.iniciadoPorNombre = persona.nombre;
    paso.completadoPorId = String(persona._id);
    paso.completadoPorNombre = persona.nombre;
    paso.fotos = fotos;
    paso.duracionMs = fin.getTime() - inicio.getTime();
    paso.nota = paso.requiereNota === true ? "Quedó como pedía el cliente." : "";
    paso.checklistRespuestas = (
      (paso.checklist as { texto: string }[]) ?? []
    ).map((item) => ({ texto: item.texto, ok: true }));
    if (paso.requiereEscaneo === true) {
      paso.escaneadoAt = inicio;
      paso.escaneadoPorId = String(persona._id);
    }

    const estacionId = (paso.estacionId as mongoose.Types.ObjectId | null) ?? null;
    bitacora.push({
      tipo: "PASO_INICIADO",
      pasoClave: String(paso.clave),
      pasoNombre: String(paso.nombre),
      persona,
      descripcion: `${persona.nombre} inició «${String(paso.nombre)}»`,
      fotos: [],
      fecha: inicio,
      estacionId,
    });
    bitacora.push({
      tipo: "PASO_COMPLETADO",
      pasoClave: String(paso.clave),
      pasoNombre: String(paso.nombre),
      persona,
      descripcion: `${persona.nombre} terminó «${String(paso.nombre)}»`,
      fotos,
      fecha: fin,
      estacionId,
    });
  }

  recalcular(pasos);
  return bitacora;
}

/** Escribe un evento de la bitácora con la fecha que le toca (no la de ahora). */
async function anotarEvento(datos: {
  unidadId: mongoose.Types.ObjectId;
  unidadCodigo: string;
  tipo: string;
  pasoClave?: string;
  pasoNombre?: string;
  persona?: PersonaSembrada;
  descripcion: string;
  fotos?: string[];
  fecha: Date;
  estacionId?: mongoose.Types.ObjectId | null;
  estacionNombre?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const doc = await EventoUnidadModel.create({
    unidadId: datos.unidadId,
    unidadCodigo: datos.unidadCodigo,
    tipo: datos.tipo,
    pasoClave: datos.pasoClave ?? "",
    pasoNombre: datos.pasoNombre ?? "",
    operarioId: datos.persona ? String(datos.persona._id) : "",
    operarioNombre: datos.persona?.nombre ?? "",
    operarioRol: datos.persona?.rolNombre ?? "",
    descripcion: datos.descripcion,
    fotos: datos.fotos ?? [],
    estacionId: datos.estacionId ?? null,
    estacionNombre: datos.estacionNombre ?? "",
    metadata: datos.metadata,
  });

  // La bitácora se lee por fecha: se le pone la real, no la del sembrado.
  await EventoUnidadModel.updateOne(
    { _id: doc._id },
    { $set: { createdAt: datos.fecha, updatedAt: datos.fecha } },
    { timestamps: false }
  );
}

/**
 * Deja constancia en el historial de configuración de lo que siembra el
 * script. §1 del contrato: todo lo que se crea queda anotado con quién lo hizo
 * — aquí el actor es «Sembrado», que es exactamente lo que pasó.
 */
async function anotarAuditoria(
  entidad: "ROL" | "OPERARIO" | "ESTACION" | "RUTA" | "PEDIDO",
  entidadId: string,
  entidadNombre: string,
  descripcion: string
): Promise<void> {
  await registrarAuditoria({
    entidad,
    entidadId,
    entidadNombre,
    accion: "CREAR",
    actor: { uid: "seed", nombre: "Sembrado", rolNombre: "Datos de demostración" },
    descripcion,
  });
}

/* ────────────────────────────────────────────────────────────────────────────
 * BLOQUES DEL SEMBRADO
 * ──────────────────────────────────────────────────────────────────────────── */

/** Colecciones que `--reset` puede vaciar. `products` NO está y no estará. */
const COLECCIONES_FABRICACION = [
  "roles",
  "operarios",
  "estaciones",
  "catalogo_pasos",
  "rutas_fabricacion",
  "pedidos",
  "unidades_fabricacion",
  "eventos_unidad",
  "registros_auditoria",
  "incidencias",
];

async function limpiar(): Promise<void> {
  titulo("Limpiando las colecciones de fabricación (products NO se toca)");
  for (const nombre of COLECCIONES_FABRICACION) {
    const resultado = await mongoose.connection.collection(nombre).deleteMany({});
    creado(`${nombre}: ${resultado.deletedCount} documentos borrados`);
  }
  // Los contadores de códigos vuelven a empezar; los demás se quedan.
  const contadores = await CounterModel.deleteMany({ _id: { $in: ["unidad", "pedido"] } });
  creado(`counters (unidad, pedido): ${contadores.deletedCount} reiniciados`);
}

async function sembrarRoles(): Promise<void> {
  titulo("Roles y permisos");
  for (const semilla of ROLES_SEMILLA) {
    const existe = await RolModel.findOne({ clave: semilla.clave }).lean();
    if (existe) {
      saltado(`Ya existe el rol «${semilla.nombre}»`);
      continue;
    }
    await RolModel.create({
      clave: semilla.clave,
      nombre: semilla.nombre,
      descripcion: semilla.descripcion,
      color: semilla.color,
      icono: semilla.icono,
      capacidades: semilla.capacidades,
      esSistema: semilla.esSistema,
      activo: true,
      orden: semilla.orden,
    });
    const rol = await RolModel.findOne({ clave: semilla.clave }).select("_id").lean();
    await anotarAuditoria(
      "ROL",
      String(rol?._id ?? ""),
      semilla.nombre,
      `Se sembró el rol «${semilla.nombre}» con ${semilla.capacidades.length} permisos`
    );
    creado(
      `Rol «${semilla.nombre}» (${semilla.clave}) con ${semilla.capacidades.length} permisos`
    );
  }
}

async function sembrarEstaciones(): Promise<Map<string, mongoose.Types.ObjectId>> {
  titulo("Áreas de trabajo");
  const porNombre = new Map<string, mongoose.Types.ObjectId>();

  for (const semilla of ESTACIONES_SEMILLA) {
    const existe = await EstacionModel.findOne({ nombre: semilla.nombre }).lean();
    if (existe) {
      porNombre.set(semilla.nombre, existe._id);
      saltado(`Ya existe el área «${semilla.nombre}»`);
      continue;
    }
    const doc = await EstacionModel.create({
      nombre: semilla.nombre,
      tipo: semilla.tipo,
      direccion: semilla.direccion,
      telefono: semilla.telefono,
      activa: true,
      eliminada: false,
      orden: semilla.orden,
    });
    porNombre.set(semilla.nombre, doc._id);
    await anotarAuditoria(
      "ESTACION",
      String(doc._id),
      semilla.nombre,
      `Se sembró el área «${semilla.nombre}»`
    );
    creado(`Área «${semilla.nombre}» (${semilla.tipo})`);
  }

  return porNombre;
}

/** El área donde se hace un paso del catálogo, por clave o por tipo. */
function areaDePaso(
  clave: string,
  tipoEstacion: TipoEstacion,
  areas: Map<string, mongoose.Types.ObjectId>
): mongoose.Types.ObjectId | null {
  const porClave = AREA_DE_PASO[clave];
  if (porClave && areas.has(porClave)) return areas.get(porClave)!;

  const semilla = ESTACIONES_SEMILLA.find((estacion) => estacion.tipo === tipoEstacion);
  if (semilla && areas.has(semilla.nombre)) return areas.get(semilla.nombre)!;

  return null;
}

async function sembrarCatalogo(
  areas: Map<string, mongoose.Types.ObjectId>
): Promise<number> {
  titulo("Catálogo de pasos reutilizables");
  let nuevos = 0;

  for (const paso of PASOS_SUGERIDOS) {
    const existe = await CatalogoPasoModel.findOne({ clave: paso.clave }).lean();
    if (existe) continue;

    await CatalogoPasoModel.create({
      clave: paso.clave,
      nombre: paso.nombre,
      instrucciones: paso.instrucciones,
      icono: paso.icono,
      color: paso.color,
      tipo: paso.tipo,
      estacionId: areaDePaso(paso.clave, paso.tipoEstacion, areas),
      rolesPermitidos: paso.rolesPermitidos,
      requiereFoto: paso.requiereFoto,
      minFotos: paso.minFotos,
      requiereEscaneo: paso.requiereEscaneo,
      requiereFirma: paso.requiereFirma,
      requiereNota: paso.requiereNota,
      checklist: paso.checklist,
      horasEstimadas: paso.horasEstimadas,
      permiteParalelo: paso.permiteParalelo,
      permiteOmitir: paso.permiteOmitir,
      notificaCliente: paso.notificaCliente,
      // Sembrado por el sistema: se puede editar, no eliminar.
      esSistema: true,
      activo: true,
      orden: paso.orden,
    });
    nuevos += 1;
  }

  if (nuevos === 0) saltado(`Ya estaban los ${PASOS_SUGERIDOS.length} pasos del catálogo`);
  else creado(`${nuevos} pasos nuevos en el catálogo (de ${PASOS_SUGERIDOS.length})`);

  return nuevos;
}

async function sembrarPersonas(
  areas: Map<string, mongoose.Types.ObjectId>
): Promise<Map<string, PersonaSembrada>> {
  titulo("Equipo (todos entran con el PIN 1234)");
  const equipo = new Map<string, PersonaSembrada>();

  const nombresRol = new Map<string, string>();
  for (const rol of ROLES_SEMILLA) nombresRol.set(rol.clave, rol.nombre);

  for (const semilla of PERSONAS_SEMILLA) {
    const existente = await OperarioModel.findOne({ nombre: semilla.nombre }).lean();
    if (existente) {
      equipo.set(semilla.rolClave, {
        _id: existente._id,
        nombre: existente.nombre,
        rolClave: existente.rolClave,
        rolNombre: nombresRol.get(existente.rolClave) ?? existente.rolClave,
      });
      saltado(`Ya existe «${semilla.nombre}»`);
      continue;
    }

    // El PIN se guarda derivado con scrypt: en claro no se guarda jamás.
    const { pinHash, pinSalt } = hashPin("1234");

    const doc = await OperarioModel.create({
      nombre: semilla.nombre,
      codigoEmpleado: semilla.codigoEmpleado,
      pinHash,
      pinSalt,
      rolClave: semilla.rolClave,
      estacionesIds: semilla.areas
        .map((nombre) => areas.get(nombre))
        .filter((id): id is mongoose.Types.ObjectId => Boolean(id)),
      telefono: semilla.telefono,
      colorAvatar: semilla.colorAvatar,
      activo: true,
      eliminado: false,
    });

    equipo.set(semilla.rolClave, {
      _id: doc._id,
      nombre: semilla.nombre,
      rolClave: semilla.rolClave,
      rolNombre: nombresRol.get(semilla.rolClave) ?? semilla.rolClave,
    });
    await anotarAuditoria(
      "OPERARIO",
      String(doc._id),
      semilla.nombre,
      `Se dio de alta a «${semilla.nombre}» como ${nombresRol.get(semilla.rolClave)}`
    );
    creado(`${semilla.nombre} — ${nombresRol.get(semilla.rolClave)} (${semilla.nota})`);
  }

  return equipo;
}

async function sembrarRutas(
  areas: Map<string, mongoose.Types.ObjectId>,
  equipo: Map<string, PersonaSembrada>
): Promise<Map<string, RutaSembrada>> {
  titulo("Rutas de fabricación");
  const rutas = new Map<string, RutaSembrada>();
  const duena = equipo.get("admin");

  for (const plantilla of PLANTILLAS_RUTA) {
    const existente = await RutaFabricacionModel.findOne({ nombre: plantilla.nombre }).lean();
    if (existente) {
      rutas.set(plantilla.nombre, {
        _id: existente._id,
        nombre: existente.nombre,
        version: existente.version ?? 1,
        pasos: (existente.pasos ?? []) as unknown as PasoPlano[],
      });
      saltado(`Ya existe la ruta «${plantilla.nombre}»`);
      continue;
    }

    const pasos = pasosDePlantilla(plantilla).map((paso) => ({
      clave: paso.clave,
      nombre: paso.nombre,
      instrucciones: paso.instrucciones,
      icono: paso.icono,
      color: paso.color,
      tipo: paso.tipo,
      estacionId: areaDePaso(paso.clave, paso.tipoEstacion, areas),
      rolesPermitidos: paso.rolesPermitidos,
      requiereFoto: paso.requiereFoto,
      minFotos: paso.minFotos,
      requiereEscaneo: paso.requiereEscaneo,
      requiereFirma: paso.requiereFirma,
      requiereNota: paso.requiereNota,
      checklist: paso.checklist,
      horasEstimadas: paso.horasEstimadas,
      permiteParalelo: paso.permiteParalelo,
      permiteOmitir: paso.permiteOmitir,
      notificaCliente: paso.notificaCliente,
    }));

    const doc = await RutaFabricacionModel.create({
      nombre: plantilla.nombre,
      descripcion: plantilla.descripcion,
      categoriaSugerida: plantilla.categoriaSugerida,
      version: 1,
      activa: true,
      archivada: false,
      esPredeterminada: plantilla.esPredeterminada,
      pasos,
      creadaPorId: duena ? String(duena._id) : "seed",
      creadaPorNombre: duena?.nombre ?? "Sembrado",
    });

    rutas.set(plantilla.nombre, {
      _id: doc._id,
      nombre: plantilla.nombre,
      version: 1,
      pasos: doc.toObject().pasos as unknown as PasoPlano[],
    });
    await anotarAuditoria(
      "RUTA",
      String(doc._id),
      plantilla.nombre,
      `Se sembró la ruta «${plantilla.nombre}» con ${pasos.length} pasos`
    );
    creado(
      `Ruta «${plantilla.nombre}» con ${pasos.length} pasos${
        plantilla.esPredeterminada ? " (predeterminada)" : ""
      }`
    );
  }

  return rutas;
}

/* ────────────────────────────────────────────────────────────────────────────
 * PEDIDOS DE DEMOSTRACIÓN
 * ──────────────────────────────────────────────────────────────────────────── */

interface LineaDemo {
  titulo: string;
  categoria: string;
  imagen: string;
  tela: string;
  acabado: string;
  configuracion: string;
  medidas: string;
  precio: number;
  ruta: string;
  /** Cuántos pasos van terminados. */
  avance: number;
  /** Qué hacer con el paso siguiente. */
  siguiente: "nada" | "en_curso" | "problema";
  /** Fuerza el estado final del mueble (entrega ya hecha). */
  estadoForzado?: EstadoUnidad;
}

interface PedidoDemo {
  cliente: {
    nombre: string;
    telefono: string;
    cedula: string;
    direccion: string;
    ciudad: string;
    email: string;
  };
  canal: "WHATSAPP" | "TIENDA" | "WEB" | "OTRO";
  prioridad: "NORMAL" | "ALTA" | "URGENTE";
  diasParaEntrega: number;
  notas: string;
  lineas: LineaDemo[];
}

const PEDIDOS_DEMO: PedidoDemo[] = [
  {
    cliente: {
      nombre: "María Fernández",
      telefono: "0414-3216549",
      cedula: "V-12345678",
      direccion: "Urb. Prebo, calle 132, casa 14",
      ciudad: "Valencia",
      email: "maria.fernandez@ejemplo.com",
    },
    canal: "WHATSAPP",
    prioridad: "ALTA",
    diasParaEntrega: 12,
    notas: "La señora pidió que la tela sea la misma de la muestra que vio en la tienda.",
    lineas: [
      {
        titulo: "Sofá Capri Terracota",
        categoria: "Salas",
        imagen: "/products/sofa-modular-1.jpg",
        tela: "Chenille terracota",
        acabado: "Madera natural",
        configuracion: "3 Puestos",
        medidas: "220 × 85 × 95 cm",
        precio: 780,
        ruta: "Sofá tapizado completo",
        avance: 0,
        siguiente: "nada",
      },
      {
        titulo: "Sofá Roma Lino Natural",
        categoria: "Salas",
        imagen: "/products/sofa-lino-1.jpg",
        tela: "Lino natural",
        acabado: "Madera clara",
        configuracion: "2 Puestos",
        medidas: "200 × 82 × 90 cm",
        precio: 650,
        ruta: "Sofá tapizado completo",
        avance: 7,
        siguiente: "en_curso",
      },
      {
        titulo: "Mesa de Centro Alba",
        categoria: "Muebles Auxiliares",
        imagen: "/products/mesa-centro-1.jpg",
        tela: "",
        acabado: "Nogal",
        configuracion: "110 cm",
        medidas: "110 × 45 × 60 cm",
        precio: 240,
        ruta: "Mueble de madera",
        avance: 13,
        siguiente: "nada",
      },
    ],
  },
  {
    cliente: {
      nombre: "Carlos Pérez",
      telefono: "0424-7778899",
      cedula: "V-87654321",
      direccion: "Av. Andrés Eloy Blanco, edificio Aurora, piso 3",
      ciudad: "Naguanagua",
      email: "carlos.perez@ejemplo.com",
    },
    canal: "TIENDA",
    prioridad: "NORMAL",
    diasParaEntrega: 25,
    notas: "Pasa por la tienda los sábados. Prefiere que le avisen por WhatsApp.",
    lineas: [
      {
        titulo: "Comedor Nórdico 6 Puestos",
        categoria: "Comedores",
        imagen: "/products/comedor-nogal-1.jpg",
        tela: "Pana beige",
        acabado: "Nogal",
        configuracion: "6 Puestos",
        medidas: "180 × 76 × 90 cm",
        precio: 890,
        ruta: "Comedor con sillas",
        avance: 4,
        siguiente: "problema",
      },
      {
        titulo: "Repisa Flotante Kioto",
        categoria: "Muebles Auxiliares",
        imagen: "/products/repisa-flotante-1.jpg",
        tela: "",
        acabado: "Roble",
        configuracion: "Set de 3",
        medidas: "80 × 4 × 20 cm",
        precio: 95,
        ruta: "Mueble de madera",
        avance: 2,
        siguiente: "en_curso",
      },
    ],
  },
];

interface UnidadResumen {
  codigo: string;
  mueble: string;
  estado: string;
  progreso: number;
}

async function sembrarPedidos(
  rutas: Map<string, RutaSembrada>,
  equipo: Map<string, PersonaSembrada>,
  areas: Map<string, mongoose.Types.ObjectId>
): Promise<{ pedidos: { codigo: string; cliente: string }[]; unidades: UnidadResumen[] }> {
  titulo("Pedidos de demostración");

  const nombresArea = new Map<string, string>();
  for (const [nombre, id] of areas) nombresArea.set(String(id), nombre);

  const pedidos: { codigo: string; cliente: string }[] = [];
  const unidades: UnidadResumen[] = [];

  for (const demo of PEDIDOS_DEMO) {
    const existente = await PedidoModel.findOne({
      creadoPorId: "seed",
      "cliente.nombre": demo.cliente.nombre,
    }).lean();

    if (existente) {
      saltado(`Ya existe el pedido de ${demo.cliente.nombre} (${existente.codigo})`);
      pedidos.push({ codigo: existente.codigo, cliente: demo.cliente.nombre });
      const suyas = await UnidadFabricacionModel.find({ pedidoId: existente._id })
        .select("codigo producto.titulo estado progreso")
        .lean();
      for (const unidad of suyas) {
        unidades.push({
          codigo: unidad.codigo,
          mueble: unidad.producto?.titulo ?? "",
          estado: String(unidad.estado),
          progreso: unidad.progreso ?? 0,
        });
      }
      continue;
    }

    const duena = equipo.get("admin");
    const codigoPedido = await generarCodigoPedido();
    const fechaPrometida = dias(demo.diasParaEntrega);

    const pedido = await PedidoModel.create({
      codigo: codigoPedido,
      cliente: demo.cliente,
      canal: demo.canal,
      prioridad: demo.prioridad,
      fechaPrometida,
      notas: demo.notas,
      estado: "ABIERTO",
      creadoPorId: "seed",
      creadoPorNombre: duena?.nombre ?? "Sembrado",
      totalUnidades: 0,
      unidadesCompletadas: 0,
      eliminado: false,
    });

    let completadas = 0;

    for (const linea of demo.lineas) {
      const ruta = rutas.get(linea.ruta);
      if (!ruta) {
        console.error(`  ✖ No encontramos la ruta «${linea.ruta}», se salta ${linea.titulo}`);
        continue;
      }

      const codigo = await generarCodigoUnidad();
      const pasos = congelarPasos(ruta);
      const nacimiento = dias(-Math.max(2, linea.avance));

      const bitacora = completarPrimerosPasos(pasos, linea.avance, equipo, nacimiento);

      // El paso siguiente: empezado, con problema, o simplemente esperando.
      const indiceSiguiente = pasos.findIndex((paso) => paso.estado === "LISTO");
      let problema: { paso: PasoPlano; persona: PersonaSembrada } | null = null;

      if (indiceSiguiente >= 0 && linea.siguiente !== "nada") {
        const paso = pasos[indiceSiguiente];
        const roles = (paso.rolesPermitidos as string[]) ?? [];
        const persona =
          equipo.get(roles[roles.length - 1] ?? "") ?? equipo.get("supervisor")!;

        if (linea.siguiente === "en_curso") {
          paso.estado = "EN_CURSO";
          paso.iniciadoAt = horas(-3);
          paso.iniciadoPorId = String(persona._id);
          paso.iniciadoPorNombre = persona.nombre;
          bitacora.push({
            tipo: "PASO_INICIADO",
            pasoClave: String(paso.clave),
            pasoNombre: String(paso.nombre),
            persona,
            descripcion: `${persona.nombre} inició «${String(paso.nombre)}»`,
            fotos: [],
            fecha: horas(-3),
            estacionId: (paso.estacionId as mongoose.Types.ObjectId | null) ?? null,
          });
        } else {
          paso.estado = "INCIDENCIA";
          problema = { paso, persona };
        }
      }

      const pasosDTO = pasos.map((paso) => serializarPasoUnidad(paso));
      const progreso = calcularProgreso(pasosDTO);
      const estadoCalculado = estadoUnidadDesdePasos(pasosDTO, "PENDIENTE");
      const estado = linea.estadoForzado ?? estadoCalculado;
      const indiceActual = indicePasoActual(pasosDTO);

      const areaActual =
        (pasos[indiceActual]?.estacionId as mongoose.Types.ObjectId | null) ?? null;

      const asignado =
        estado === "EN_PROCESO" || estado === "INCIDENCIA"
          ? (equipo.get(
              ((pasos[indiceActual]?.rolesPermitidos as string[]) ?? [])[0] ?? "supervisor"
            ) ?? null)
          : null;

      const unidad = await UnidadFabricacionModel.create({
        codigo,
        pedidoId: pedido._id,
        pedidoCodigo: codigoPedido,
        clienteNombre: demo.cliente.nombre,
        productoId: null,
        producto: {
          titulo: linea.titulo,
          categoria: linea.categoria,
          imagen: linea.imagen,
          tela: linea.tela,
          acabado: linea.acabado,
          configuracion: linea.configuracion,
          medidas: linea.medidas,
          precio: linea.precio,
        },
        rutaId: ruta._id,
        rutaNombre: ruta.nombre,
        rutaVersion: ruta.version,
        pasos,
        estado,
        pasoActualIndex: indiceActual,
        progreso,
        asignadoAId: asignado?._id ?? null,
        asignadoANombre: asignado?.nombre ?? "",
        ubicacionActualId: areaActual,
        ubicacionActualNombre: areaActual ? (nombresArea.get(String(areaActual)) ?? "") : "",
        prioridad: demo.prioridad,
        fechaPrometida,
        iniciadoAt: linea.avance > 0 ? nacimiento : null,
        terminadoAt: estado === "TERMINADA" ? horas(-6) : null,
        entregadoAt: null,
        notas: "",
        eliminada: false,
      });

      await UnidadFabricacionModel.updateOne(
        { _id: unidad._id },
        { $set: { createdAt: nacimiento } },
        { timestamps: false }
      );

      await anotarEvento({
        unidadId: unidad._id,
        unidadCodigo: codigo,
        tipo: "CREADA",
        persona: duena,
        descripcion: `Se creó el mueble «${linea.titulo}» (${codigo}) del pedido ${codigoPedido}`,
        fecha: nacimiento,
        metadata: { ruta: ruta.nombre, versionRuta: ruta.version },
      });

      for (const anotacion of bitacora) {
        await anotarEvento({
          unidadId: unidad._id,
          unidadCodigo: codigo,
          tipo: anotacion.tipo,
          pasoClave: anotacion.pasoClave,
          pasoNombre: anotacion.pasoNombre,
          persona: anotacion.persona,
          descripcion: anotacion.descripcion,
          fotos: anotacion.fotos,
          fecha: anotacion.fecha,
          estacionId: anotacion.estacionId,
          estacionNombre: anotacion.estacionId
            ? (nombresArea.get(String(anotacion.estacionId)) ?? "")
            : "",
        });
      }

      if (problema) {
        const doc = await IncidenciaModel.create({
          unidadId: unidad._id,
          unidadCodigo: codigo,
          pasoClave: String(problema.paso.clave),
          pasoNombre: String(problema.paso.nombre),
          motivo: "La tela vino manchada",
          descripcion:
            "El rollo que llegó tiene una mancha de aceite de medio metro. Hace falta pedir otro al proveedor.",
          severidad: "ALTA",
          fotos: [FOTOS_EJEMPLO[1]],
          reportadaPorId: String(problema.persona._id),
          reportadaPorNombre: problema.persona.nombre,
          estado: "ABIERTA",
        });

        await anotarEvento({
          unidadId: unidad._id,
          unidadCodigo: codigo,
          tipo: "INCIDENCIA",
          pasoClave: String(problema.paso.clave),
          pasoNombre: String(problema.paso.nombre),
          persona: problema.persona,
          descripcion: `${problema.persona.nombre} avisó de un problema en el mueble ${codigo}: La tela vino manchada`,
          fotos: [FOTOS_EJEMPLO[1]],
          fecha: horas(-5),
          metadata: { severidad: "ALTA", incidenciaId: String(doc._id) },
        });
      }

      if (estado === "TERMINADA" || estado === "ENTREGADA") completadas += 1;

      unidades.push({ codigo, mueble: linea.titulo, estado: String(estado), progreso });
      creado(
        `${codigo} — ${linea.titulo} — ${estado} (${progreso}%) — ruta «${ruta.nombre}»`
      );
    }

    const total = demo.lineas.length;
    const estadoPedido =
      completadas === 0 ? "EN_PROCESO" : completadas === total ? "COMPLETADO" : "EN_PROCESO";

    await PedidoModel.updateOne(
      { _id: pedido._id },
      {
        $set: {
          totalUnidades: total,
          unidadesCompletadas: completadas,
          estado: estadoPedido,
        },
      }
    );

    await anotarAuditoria(
      "PEDIDO",
      String(pedido._id),
      codigoPedido,
      `Se sembró el pedido ${codigoPedido} de «${demo.cliente.nombre}» con ${total} muebles`
    );

    pedidos.push({ codigo: codigoPedido, cliente: demo.cliente.nombre });
    creado(`Pedido ${codigoPedido} de ${demo.cliente.nombre} con ${total} muebles`);
  }

  return { pedidos, unidades };
}

/* ────────────────────────────────────────────────────────────────────────────
 * PRINCIPAL
 * ──────────────────────────────────────────────────────────────────────────── */

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("✖ Falta MONGODB_URI. Copia .env.example a .env.local y configúrala.");
    process.exit(1);
  }

  await mongoose.connect(uri, { bufferCommands: false });
  console.log(`${color.verde("✔")} Conectado a MongoDB (${mongoose.connection.name})`);

  if (process.argv.includes("--reset")) await limpiar();

  await sembrarRoles();
  const areas = await sembrarEstaciones();
  await sembrarCatalogo(areas);
  const equipo = await sembrarPersonas(areas);
  const rutas = await sembrarRutas(areas, equipo);
  const { pedidos, unidades } = await sembrarPedidos(rutas, equipo, areas);

  /* ── Resumen para probar a mano ─────────────────────────────────────────── */

  const sitio = getSiteUrl();
  const conProblema = await IncidenciaModel.countDocuments({ estado: "ABIERTA" });

  titulo("═══════════ TODO LISTO ═══════════");
  console.log(`
${color.fuerte("ENTRAR AL TALLER")}   ${color.azul(`${sitio}/fabrica`)}
  Toca tu nombre en la lista y escribe el PIN ${color.fuerte("1234")}.
  ${PERSONAS_SEMILLA.map((p) => `${p.nombre} (${p.rolClave})`).join(" · ")}

${color.fuerte("PANEL DE FABRICACIÓN")}   ${color.azul(`${sitio}/admin/fabricacion`)}
  Pedidos · Muebles · Rutas · Pasos · Equipo · Roles · Áreas · Problemas · Historial
`);

  console.log(color.fuerte("PEDIDOS"));
  for (const pedido of pedidos) {
    console.log(`  ${pedido.codigo}  ${pedido.cliente}`);
    console.log(`    ${color.gris(`${sitio}/admin/fabricacion/pedidos/${pedido.codigo}`)}`);
  }

  console.log(`\n${color.fuerte("MUEBLES")} (el QR de cada uno lleva a su ficha)`);
  for (const unidad of unidades) {
    console.log(
      `  ${unidad.codigo}  ${unidad.mueble} — ${color.ambar(unidad.estado)} ${unidad.progreso}%`
    );
    console.log(`    QR        ${color.gris(`${sitio}/f/${unidad.codigo}`)}`);
    console.log(
      `    Etiqueta  ${color.gris(`${sitio}/admin/fabricacion/etiquetas/${unidad.codigo}`)}`
    );
  }

  console.log(`\n${color.fuerte("PARA PROBAR")}`);
  console.log(`  Escanear a mano   ${color.gris(`${sitio}/fabrica/escanear`)}`);
  console.log(
    `  Problemas         ${color.gris(`${sitio}/admin/fabricacion/incidencias`)} (${conProblema} sin resolver)`
  );
  console.log(
    `  Historial         ${color.gris(`${sitio}/admin/fabricacion/auditoria`)} ` +
      `(${await RegistroAuditoriaModel.countDocuments({})} anotaciones)`
  );
  console.log(
    `  Seguimiento       ${
      seguimientoPublicoActivo()
        ? color.gris(`${sitio}/seguimiento/${unidades[0]?.codigo ?? "COD-000000"}`)
        : color.gris("apagado (NEXT_PUBLIC_FABRICA_SEGUIMIENTO_PUBLICO no vale \"true\")")
    }`
  );

  await mongoose.disconnect();
  console.log(`\n${color.verde("✔")} Sembrado completado`);
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
