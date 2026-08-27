/**
 * Bitácora de configuración: quién cambió qué, cuándo y de qué a qué.
 *
 * Decisión del dueño (§1 del contrato), textual: *"deja anotado siempre quién
 * edita algo... así si hago cambia algo se sabrá"*. Por eso **toda action que
 * cree, modifique o elimine cualquier entidad escribe aquí su registro con el
 * diff campo a campo**, y esos registros no se editan ni se borran jamás.
 *
 * El diff se guarda YA FORMATEADO en español ("Sin asignar", "Sí"/"No",
 * `14/03/2026`, listas separadas por comas), para que la pantalla de historial
 * sea legible por cualquiera sin traducir nada.
 *
 * Usa Mongoose: sólo para actions, route handlers y scripts.
 */

import { connectDB } from "@/lib/mongodb";
import RegistroAuditoriaModel from "@/lib/models/RegistroAuditoria";
import {
  META_CAPACIDADES,
  type AccionAuditoria,
  type CambioAuditoria,
  type EntidadAuditoria,
  type SesionOperario,
} from "@/lib/types/fabricacion";

/** Un texto muy largo (unas instrucciones enteras) se recorta en el historial. */
const MAX_TEXTO = 300;

/** Lo que se lee cuando un campo está vacío. */
const VACIO = "Sin asignar";

/* ────────────────────────────────────────────────────────────────────────────
 * DIFF CAMPO A CAMPO
 * ──────────────────────────────────────────────────────────────────────────── */

/** Campo que se vigila en una edición. `campo` admite rutas con punto. */
export interface CampoAuditoria {
  /** Nombre del campo, con punto para anidados: `"cliente.telefono"`. */
  campo: string;
  /** Cómo se llama para una persona: "Teléfono del cliente". */
  etiqueta: string;
  /** Cómo se escribe su valor. Por defecto se elige según el tipo. */
  formato?: (valor: unknown) => string;
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null;
}

/** Detecta un ObjectId sin importar Mongoose ni mirar el `_bsontype`. */
function esObjectId(valor: unknown): boolean {
  return (
    esObjeto(valor) &&
    typeof (valor as { toHexString?: unknown }).toHexString === "function"
  );
}

function esFechaIso(valor: unknown): valor is string {
  return typeof valor === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(valor);
}

/** Lee `objeto.a.b.c` sin reventar si algo por el camino no existe. */
function leerCampo(objeto: unknown, ruta: string): unknown {
  return ruta.split(".").reduce<unknown>((actual, parte) => {
    if (!esObjeto(actual)) return undefined;
    return actual[parte];
  }, objeto);
}

/**
 * ¿La versión nueva trae ese campo? Las actions editan con objetos parciales:
 * un campo que el formulario no envió no se tocó, así que no es un cambio.
 */
function tieneCampo(objeto: unknown, ruta: string): boolean {
  const partes = ruta.split(".");
  let actual: unknown = objeto;
  for (const parte of partes) {
    if (!esObjeto(actual)) return false;
    try {
      if (!(parte in actual)) return false;
    } catch {
      return false;
    }
    actual = actual[parte];
  }
  return true;
}

function esVacio(valor: unknown): boolean {
  if (valor === null || valor === undefined) return true;
  if (typeof valor === "string") return valor.trim() === "";
  if (Array.isArray(valor)) return valor.length === 0;
  return false;
}

/** Representación estable de un valor, sólo para comparar. */
function claveComparacion(valor: unknown): string {
  if (esVacio(valor)) return "";
  if (valor instanceof Date) return valor.toISOString();
  if (esObjectId(valor)) return String(valor);
  if (Array.isArray(valor)) {
    return `[${valor.map(claveComparacion).join("|")}]`;
  }
  if (esObjeto(valor)) {
    const claves = Object.keys(valor).sort();
    return `{${claves.map((clave) => `${clave}:${claveComparacion(valor[clave])}`).join(",")}}`;
  }
  return String(valor);
}

/**
 * ¿Cambió de verdad? Un `null` que pasa a `""`, un `undefined` que pasa a
 * `false` o una fecha que sólo cambió de tipo NO son cambios: si entraran,
 * cada edición dejaría un historial lleno de ruido.
 */
function sonIguales(antes: unknown, despues: unknown): boolean {
  if (esVacio(antes) && esVacio(despues)) return true;
  if (esVacio(antes) && despues === false) return true;
  if (esVacio(despues) && antes === false) return true;
  return claveComparacion(antes) === claveComparacion(despues);
}

function recortar(texto: string): string {
  return texto.length > MAX_TEXTO ? `${texto.slice(0, MAX_TEXTO - 1)}…` : texto;
}

function fechaCorta(fecha: Date): string {
  if (Number.isNaN(fecha.getTime())) return VACIO;
  const dia = String(fecha.getDate()).padStart(2, "0");
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}/${fecha.getFullYear()}`;
}

/** Un valor suelto, ya en español. */
function formatearEscalar(valor: unknown): string {
  if (esVacio(valor)) return VACIO;
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  if (valor instanceof Date) return fechaCorta(valor);
  if (esFechaIso(valor)) return fechaCorta(new Date(valor));
  if (esObjectId(valor)) return String(valor);
  if (typeof valor === "number") return String(valor);
  if (typeof valor === "string") return recortar(valor.trim());
  if (esObjeto(valor)) {
    const texto = (valor as { nombre?: unknown; texto?: unknown; label?: unknown }).nombre
      ?? (valor as { texto?: unknown }).texto
      ?? (valor as { label?: unknown }).label;
    if (typeof texto === "string" && texto.trim() !== "") return recortar(texto.trim());
    try {
      return recortar(JSON.stringify(valor));
    } catch {
      return VACIO;
    }
  }
  return recortar(String(valor));
}

/** El valor tal y como se lee en la pantalla de historial. */
function formatearValor(valor: unknown, formato?: (valor: unknown) => string): string {
  if (formato) {
    try {
      const texto = formato(valor);
      return texto.trim() === "" ? VACIO : recortar(texto);
    } catch {
      return VACIO;
    }
  }
  if (Array.isArray(valor)) {
    if (valor.length === 0) return VACIO;
    return recortar(valor.map(formatearEscalar).join(", "));
  }
  return formatearEscalar(valor);
}

/**
 * Compara dos versiones de una entidad y devuelve SÓLO los campos declarados
 * que cambiaron de verdad, con los valores ya escritos en español.
 *
 * `antes` y `despues` pueden ser documentos de Mongoose (`.toObject()`),
 * documentos `.lean()`, DTOs o el objeto del formulario: se leen por nombre de
 * campo y se normalizan fechas, arrays y ObjectIds antes de comparar.
 */
export function calcularCambios(
  antes: unknown,
  despues: unknown,
  campos: CampoAuditoria[]
): CambioAuditoria[] {
  const cambios: CambioAuditoria[] = [];

  for (const { campo, etiqueta, formato } of campos) {
    // Campo que la edición ni siquiera envió: no es un cambio.
    if (!tieneCampo(despues, campo)) continue;

    const valorAntes = leerCampo(antes, campo);
    const valorDespues = leerCampo(despues, campo);

    if (sonIguales(valorAntes, valorDespues)) continue;

    cambios.push({
      campo,
      etiqueta,
      antes: formatearValor(valorAntes, formato),
      despues: formatearValor(valorDespues, formato),
    });
  }

  return cambios;
}

/* ────────────────────────────────────────────────────────────────────────────
 * FORMATOS LISTOS PARA `calcularCambios`
 * ──────────────────────────────────────────────────────────────────────────── */

/** "Sí" / "No". */
export function formatoSiNo(valor: unknown): string {
  if (esVacio(valor)) return "No";
  return valor ? "Sí" : "No";
}

/** `14/03/2026`. */
export function formatoFecha(valor: unknown): string {
  if (esVacio(valor)) return VACIO;
  if (valor instanceof Date) return fechaCorta(valor);
  if (typeof valor === "string" || typeof valor === "number") {
    return fechaCorta(new Date(valor));
  }
  return VACIO;
}

/** "Uno, Dos, Tres". */
export function formatoLista(valor: unknown): string {
  if (!Array.isArray(valor) || valor.length === 0) return VACIO;
  return valor.map(formatearEscalar).join(", ");
}

/**
 * Traduce las claves de capacidades a las frases llanas del panel, para que el
 * historial de un rol diga qué se le dio o se le quitó de verdad.
 */
export function formatoCapacidades(valor: unknown): string {
  if (!Array.isArray(valor) || valor.length === 0) return "Ningún permiso";
  return valor
    .map((clave) => {
      if (typeof clave === "string" && clave in META_CAPACIDADES) {
        return META_CAPACIDADES[clave as keyof typeof META_CAPACIDADES].etiqueta;
      }
      return String(clave);
    })
    .join(", ");
}

/* ────────────────────────────────────────────────────────────────────────────
 * DESCRIPCIÓN EN ESPAÑOL
 * ──────────────────────────────────────────────────────────────────────────── */

interface NombreEntidad {
  /** Cómo se nombra la cosa: "la ruta", "el rol", "al operario". */
  articulo: string;
  singular: string;
}

const NOMBRES_ENTIDAD: Record<EntidadAuditoria, NombreEntidad> = {
  ROL: { articulo: "el", singular: "rol" },
  // Complemento directo de persona: siempre "al operario".
  OPERARIO: { articulo: "al", singular: "operario" },
  ESTACION: { articulo: "la", singular: "estación" },
  CATALOGO_PASO: { articulo: "el", singular: "paso" },
  RUTA: { articulo: "la", singular: "ruta" },
  PEDIDO: { articulo: "el", singular: "pedido" },
  UNIDAD: { articulo: "el", singular: "mueble" },
  INCIDENCIA: { articulo: "el", singular: "problema" },
  SESION: { articulo: "la", singular: "sesión" },
};

const VERBOS: Record<AccionAuditoria, string> = {
  CREAR: "creó",
  EDITAR: "editó",
  ELIMINAR: "eliminó",
  RESTAURAR: "restauró",
  ARCHIVAR: "archivó",
  ACTIVAR: "activó",
  DESACTIVAR: "desactivó",
  DUPLICAR: "duplicó",
  RESET_PIN: "reinició el PIN",
  INICIO_SESION: "entró",
  INTENTO_FALLIDO: "no pudo entrar",
};

/**
 * La frase que se lee en el historial:
 *  · "Cami editó la ruta «Sofá tapizado completo»"
 *  · "Cami creó al operario «José Rodríguez»"
 *  · "Cami eliminó el rol «Pintor»"
 */
export function describirCambio(
  entidad: EntidadAuditoria,
  accion: AccionAuditoria,
  actorNombre: string,
  entidadNombre: string
): string {
  const quien = actorNombre.trim() === "" ? "Alguien" : actorNombre.trim();
  const nombre = entidadNombre.trim();
  const entrecomillado = nombre === "" ? "" : ` «${nombre}»`;

  if (accion === "INICIO_SESION") {
    return `${quien} entró al sistema`;
  }
  if (accion === "INTENTO_FALLIDO") {
    return `${quien} escribió mal el PIN y no pudo entrar`;
  }
  if (accion === "RESET_PIN") {
    return `${quien} reinició el PIN${entrecomillado === "" ? "" : ` de${entrecomillado}`}`;
  }

  const { articulo, singular } = NOMBRES_ENTIDAD[entidad];
  return `${quien} ${VERBOS[accion]} ${articulo} ${singular}${entrecomillado}`;
}

/* ────────────────────────────────────────────────────────────────────────────
 * ESCRITURA DE LA BITÁCORA
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Quién hizo el cambio. `SesionOperario` encaja tal cual; el formulario de
 * entrada puede pasar un actor suelto para registrar un intento fallido.
 */
export interface ActorAuditoria {
  uid?: string;
  nombre: string;
  rolClave?: string;
  rolNombre?: string;
}

export interface EntradaAuditoria {
  entidad: EntidadAuditoria;
  entidadId: string;
  entidadNombre: string;
  accion: AccionAuditoria;
  actor: ActorAuditoria | SesionOperario;
  descripcion: string;
  cambios?: CambioAuditoria[];
  metadata?: Record<string, unknown>;
}

/**
 * Escribe el registro. **Nunca lanza.**
 *
 * Si la bitácora falla (base caída, validación rara) se anota en la consola y
 * la operación sigue adelante: una auditoría rota no puede parar el taller ni
 * deshacer un cambio que el usuario ya dio por hecho. El registro perdido
 * queda en los logs del servidor.
 */
export async function registrarAuditoria(entrada: EntradaAuditoria): Promise<void> {
  try {
    const { entidad, entidadId, entidadNombre, accion, actor, cambios, metadata } = entrada;

    const descripcion =
      entrada.descripcion.trim() === ""
        ? describirCambio(entidad, accion, actor.nombre, entidadNombre)
        : entrada.descripcion.trim();

    await connectDB();
    await RegistroAuditoriaModel.create({
      entidad,
      entidadId: String(entidadId ?? ""),
      entidadNombre: entidadNombre ?? "",
      accion,
      actorId: actor.uid ?? "",
      actorNombre: actor.nombre,
      // Se guarda el nombre bonito del rol: el historial lo lee una persona.
      actorRol: actor.rolNombre ?? actor.rolClave ?? "",
      descripcion,
      cambios: cambios ?? [],
      metadata: metadata ?? undefined,
    });
  } catch (error) {
    console.error("[fabricacion/auditoria] registrarAuditoria:", error);
  }
}
