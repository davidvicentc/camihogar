/**
 * Reglas de negocio del taller (§5 del contrato).
 *
 * **Funciones puras**: no importan Mongoose, ni Next, ni React, ni siquiera
 * `constantes.ts`. Sólo tipos. Así las pueden usar por igual las actions del
 * servidor, los componentes de cliente que quieren deshabilitar un botón y el
 * script de pruebas, y son fáciles de probar sin base de datos.
 *
 * Regla de oro de los mensajes: **dicen qué hacer, no qué falló**. Nada de
 * "validación fallida"; sí "Falta la foto. Toma 1 foto del mueble para poder
 * continuar." Los lee gente mayor, con las manos ocupadas, en un móvil.
 */

import type {
  Capacidad,
  EstadoUnidad,
  EvidenciaPaso,
  PasoPlantillaDTO,
  PasoUnidadDTO,
  ResultadoRegla,
  SesionOperario,
} from "@/lib/types/fabricacion";

/* ────────────────────────────────────────────────────────────────────────────
 * MENSAJES
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Los textos fijos, en un solo sitio para que la app del taller y el panel
 * digan exactamente lo mismo.
 */
export const MENSAJES = {
  sinSesion: "Primero entra con tu nombre y tu PIN.",
  sinPermisoTrabajar:
    "No tienes permiso para trabajar en los muebles. Avisa a tu supervisor.",
  pasoNoExiste: "No encontramos ese paso en este mueble. Vuelve atrás y elige otro.",
  pasoYaTerminado: "Este paso ya lo terminó otra persona.",
  pasoOmitido: "Este paso se saltó. No hay nada que hacer aquí.",
  pasoNoEmpezado: "Primero toca el botón grande para empezar este paso.",
  incidenciaAbierta: "Hay un problema reportado sin resolver. Avisa a tu supervisor.",
  faltaEscaneo: "Hay que escanear el código del mueble para recibirlo.",
  faltaChecklist: "Marca todas las casillas de la lista antes de terminar.",
  faltaNota: "Escribe una nota corta explicando cómo quedó.",
  faltaFirma: "Falta la firma. Pide al cliente que firme en la pantalla con el dedo.",
  sinPasos: "Este mueble todavía no tiene pasos. Avisa a tu supervisor.",
} as const;

/** Objetos nuevos siempre: nadie comparte ni muta el resultado de otra regla. */
function aceptar(): ResultadoRegla {
  return { ok: true };
}

function rechazar(motivo: string): ResultadoRegla {
  return { ok: false, motivo };
}

/* ────────────────────────────────────────────────────────────────────────────
 * AYUDAS
 * ──────────────────────────────────────────────────────────────────────────── */

/** Un paso "cerrado" ya no bloquea a los siguientes. */
function estaCerrado(paso: PasoUnidadDTO): boolean {
  return paso.estado === "COMPLETADO" || paso.estado === "OMITIDO";
}

/** Un paso al que ya se le metió mano: no se le recalcula el estado. */
function estaTocado(paso: PasoUnidadDTO): boolean {
  return (
    paso.estado === "EN_CURSO" ||
    paso.estado === "COMPLETADO" ||
    paso.estado === "OMITIDO" ||
    paso.estado === "INCIDENCIA"
  );
}

/**
 * Comprobación local de capacidades para no importar `permisos.ts` (que usa
 * Mongoose y rompería la pureza de este archivo). El admin siempre puede.
 */
function tieneCapacidad(sesion: SesionOperario, capacidad: Capacidad): boolean {
  return sesion.esAdmin || sesion.capacidades.includes(capacidad);
}

/** "tapicero" → "Tapicero"; "jefe_taller" → "Jefe taller". */
export function etiquetaRol(clave: string, nombres?: Record<string, string>): string {
  const nombre = nombres?.[clave];
  if (nombre && nombre.trim() !== "") return nombre.trim();
  const limpio = clave.replace(/[_-]+/g, " ").trim();
  if (limpio === "") return "otra persona";
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

/**
 * "un Tapicero" · "un Tapicero o un Pintor".
 *
 * Se exporta para que `omitirPaso` pueda dar exactamente la misma frase que
 * `puedeIniciarPaso` cuando el rol no toca, sin reescribirla.
 */
export function frasePersonasPermitidas(
  roles: string[],
  nombres?: Record<string, string>
): string {
  const etiquetas = roles.map((rol) => etiquetaRol(rol, nombres));
  if (etiquetas.length === 1) return `un ${etiquetas[0]}`;
  const ultima = etiquetas[etiquetas.length - 1];
  return `un ${etiquetas.slice(0, -1).join(", un ")} o un ${ultima}`;
}

function mensajeFotos(minFotos: number, tomadas: number): string {
  if (tomadas === 0) {
    return minFotos === 1
      ? "Falta la foto. Toma 1 foto del mueble para poder continuar."
      : `Faltan las fotos. Toma ${minFotos} fotos del mueble para poder continuar.`;
  }
  const faltan = minFotos - tomadas;
  return faltan === 1
    ? `Falta 1 foto más. Este paso necesita ${minFotos} fotos.`
    : `Faltan ${faltan} fotos más. Este paso necesita ${minFotos} fotos.`;
}

/** El paso de un mueble por su clave, o `null`. */
export function buscarPaso(pasos: PasoUnidadDTO[], clave: string): PasoUnidadDTO | null {
  return pasos.find((paso) => paso.clave === clave) ?? null;
}

/** ¿Hay algún paso con un problema sin resolver? Bloquea todo el mueble. */
export function hayIncidenciaAbierta(pasos: PasoUnidadDTO[]): boolean {
  return pasos.some((paso) => paso.estado === "INCIDENCIA");
}

/* ────────────────────────────────────────────────────────────────────────────
 * RECÁLCULO DE ESTADOS
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Vuelve a calcular qué pasos están BLOQUEADO y cuáles LISTO.
 *
 * · Devuelve una copia nueva: **no muta** el array ni los pasos que recibe.
 * · Respeta lo que ya pasó: EN_CURSO, COMPLETADO, OMITIDO e INCIDENCIA se
 *   quedan como están.
 * · Un paso está LISTO si todos los anteriores están COMPLETADO u OMITIDO.
 * · Un paso con `permiteParalelo` está LISTO en cuanto el anterior arrancó
 *   (EN_CURSO ya vale), o si es el primero. Así el tapicero puede ir cosiendo
 *   las fundas mientras el carpintero termina la estructura.
 */
export function recalcularEstados(pasos: PasoUnidadDTO[]): PasoUnidadDTO[] {
  return pasos.map((paso, indice) => {
    if (estaTocado(paso)) return { ...paso };

    const anteriores = pasos.slice(0, indice);
    if (anteriores.every(estaCerrado)) {
      return { ...paso, estado: "LISTO" as const };
    }

    if (paso.permiteParalelo) {
      const previo = pasos[indice - 1];
      const previoArrancado =
        previo === undefined || estaCerrado(previo) || previo.estado === "EN_CURSO";
      if (previoArrancado) return { ...paso, estado: "LISTO" as const };
    }

    return { ...paso, estado: "BLOQUEADO" as const };
  });
}

/* ────────────────────────────────────────────────────────────────────────────
 * PERMISOS DE PASO
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * ¿Este rol puede hacer este paso?
 *
 * Sin `rolesPermitidos` lo puede hacer cualquiera que tenga la capacidad de
 * trabajar. El rol `admin` siempre puede: es el seguro anti-bloqueo del §7.
 */
export function rolPuedeHacerPaso(rolClave: string, paso: PasoPlantillaDTO): boolean {
  if (rolClave === "admin") return true;
  const permitidos = paso.rolesPermitidos ?? [];
  if (permitidos.length === 0) return true;
  return permitidos.includes(rolClave);
}

/**
 * ¿Puede esta persona empezar este paso ahora mismo?
 *
 * `nombresRoles` es opcional y sólo sirve para que el mensaje diga "un
 * Tapicero" en vez de la clave del rol.
 */
export function puedeIniciarPaso(
  pasos: PasoUnidadDTO[],
  clave: string,
  sesion: SesionOperario | null | undefined,
  nombresRoles?: Record<string, string>
): ResultadoRegla {
  if (!sesion) return rechazar(MENSAJES.sinSesion);

  const paso = buscarPaso(pasos, clave);
  if (!paso) return rechazar(MENSAJES.pasoNoExiste);

  if (!tieneCapacidad(sesion, "trabajar")) {
    return rechazar(MENSAJES.sinPermisoTrabajar);
  }

  if (paso.estado === "COMPLETADO") return rechazar(MENSAJES.pasoYaTerminado);
  if (paso.estado === "OMITIDO") return rechazar(MENSAJES.pasoOmitido);
  if (paso.estado === "INCIDENCIA") return rechazar(MENSAJES.incidenciaAbierta);
  if (paso.estado === "EN_CURSO") {
    const quien = paso.iniciadoPorNombre.trim();
    return rechazar(
      quien === ""
        ? "Este paso ya está empezado."
        : `Este paso ya lo empezó ${quien}. Habla con ${quien} antes de seguir.`
    );
  }

  if (hayIncidenciaAbierta(pasos)) return rechazar(MENSAJES.incidenciaAbierta);

  if (paso.estado !== "LISTO") {
    return rechazar(describirBloqueo(pasos, clave) || MENSAJES.pasoNoEmpezado);
  }

  if (!sesion.esAdmin && !rolPuedeHacerPaso(sesion.rolClave, paso)) {
    return rechazar(
      `Este paso lo tiene que hacer ${frasePersonasPermitidas(
        paso.rolesPermitidos,
        nombresRoles
      )}. Avisa a tu supervisor.`
    );
  }

  return aceptar();
}

/**
 * ¿Puede darse por terminado este paso con la evidencia que trae?
 *
 * El orden de las comprobaciones sigue el del asistente: escaneo → fotos →
 * lista → nota → firma, para que el operario vea siempre lo primero que le
 * falta y no un error distinto en cada intento.
 */
export function puedeCompletarPaso(
  paso: PasoUnidadDTO | null | undefined,
  evidencia: EvidenciaPaso,
  sesion: SesionOperario | null | undefined,
  nombresRoles?: Record<string, string>
): ResultadoRegla {
  if (!sesion) return rechazar(MENSAJES.sinSesion);
  if (!paso) return rechazar(MENSAJES.pasoNoExiste);

  if (!tieneCapacidad(sesion, "trabajar")) {
    return rechazar(MENSAJES.sinPermisoTrabajar);
  }

  if (paso.estado !== "EN_CURSO") {
    if (paso.estado === "COMPLETADO") return rechazar(MENSAJES.pasoYaTerminado);
    if (paso.estado === "OMITIDO") return rechazar(MENSAJES.pasoOmitido);
    if (paso.estado === "INCIDENCIA") return rechazar(MENSAJES.incidenciaAbierta);
    return rechazar(MENSAJES.pasoNoEmpezado);
  }

  if (!sesion.esAdmin && !rolPuedeHacerPaso(sesion.rolClave, paso)) {
    return rechazar(
      `Este paso lo tiene que hacer ${frasePersonasPermitidas(
        paso.rolesPermitidos,
        nombresRoles
      )}. Avisa a tu supervisor.`
    );
  }

  const fotos = evidencia?.fotos ?? [];
  const respuestas = evidencia?.checklistRespuestas ?? [];
  const nota = (evidencia?.nota ?? paso.nota ?? "").trim();
  const firma = (evidencia?.firmaUrl ?? paso.firmaUrl ?? "").trim();

  // El escaneo puede venir del asistente o haberse registrado antes.
  if (paso.requiereEscaneo && !evidencia?.escaneoValidado && !paso.escaneadoAt) {
    return rechazar(MENSAJES.faltaEscaneo);
  }

  if (paso.requiereFoto) {
    const minimo = paso.minFotos > 0 ? paso.minFotos : 1;
    if (fotos.length < minimo) return rechazar(mensajeFotos(minimo, fotos.length));
  }

  const obligatorios = (paso.checklist ?? []).filter((item) => item.obligatorio);
  if (obligatorios.length > 0) {
    /*
     * Se cuentan las casillas, no se comparan textos sueltos.
     *
     * Una lista puede tener la MISMA frase dos veces a propósito («Revisar
     * costuras», una por cada lado del sofá): son dos comprobaciones distintas
     * y hay que marcar las dos. Con un `Set` de textos bastaba con marcar una
     * para dar las dos por buenas, y la evidencia guardada mentía.
     */
    const pedidas = new Map<string, number>();
    for (const item of obligatorios) {
      pedidas.set(item.texto, (pedidas.get(item.texto) ?? 0) + 1);
    }

    const marcadas = new Map<string, number>();
    for (const respuesta of respuestas) {
      if (respuesta.ok) {
        marcadas.set(respuesta.texto, (marcadas.get(respuesta.texto) ?? 0) + 1);
      }
    }

    for (const [textoItem, cuantas] of pedidas) {
      if ((marcadas.get(textoItem) ?? 0) < cuantas) return rechazar(MENSAJES.faltaChecklist);
    }
  }

  if (paso.requiereNota && nota === "") return rechazar(MENSAJES.faltaNota);
  if (paso.requiereFirma && firma === "") return rechazar(MENSAJES.faltaFirma);

  return aceptar();
}

/* ────────────────────────────────────────────────────────────────────────────
 * PROGRESO Y ESTADO DEL MUEBLE
 * ──────────────────────────────────────────────────────────────────────────── */

/** Porcentaje 0..100 de pasos cerrados. Un mueble sin pasos va por 0. */
export function calcularProgreso(pasos: PasoUnidadDTO[]): number {
  if (!Array.isArray(pasos) || pasos.length === 0) return 0;
  const hechos = pasos.filter(estaCerrado).length;
  return Math.round((hechos * 100) / pasos.length);
}

/**
 * En qué paso está el mueble ahora: el que se está haciendo, el que tiene un
 * problema o el primero que queda por hacer. Sirve para el "PASO 3 DE 9".
 */
export function indicePasoActual(pasos: PasoUnidadDTO[]): number {
  if (!Array.isArray(pasos) || pasos.length === 0) return 0;

  const enCurso = pasos.findIndex((paso) => paso.estado === "EN_CURSO");
  if (enCurso >= 0) return enCurso;

  const conProblema = pasos.findIndex((paso) => paso.estado === "INCIDENCIA");
  if (conProblema >= 0) return conProblema;

  const pendiente = pasos.findIndex((paso) => !estaCerrado(paso));
  if (pendiente >= 0) return pendiente;

  return pasos.length - 1;
}

/**
 * El paso sobre el que el operario puede actuar ya: primero el que tiene
 * empezado, si no el primero que esté LISTO. `null` si no hay nada que hacer.
 */
export function siguientePasoAccionable(pasos: PasoUnidadDTO[]): PasoUnidadDTO | null {
  if (!Array.isArray(pasos) || pasos.length === 0) return null;
  return (
    pasos.find((paso) => paso.estado === "EN_CURSO") ??
    pasos.find((paso) => paso.estado === "LISTO") ??
    null
  );
}

/**
 * Estado del mueble deducido de sus pasos.
 *
 * Respeta las decisiones de una persona: si está PAUSADA, CANCELADA o
 * ENTREGADA se queda como está, aunque los pasos digan otra cosa.
 */
export function estadoUnidadDesdePasos(
  pasos: PasoUnidadDTO[],
  estadoActual: EstadoUnidad
): EstadoUnidad {
  if (
    estadoActual === "CANCELADA" ||
    estadoActual === "ENTREGADA" ||
    estadoActual === "PAUSADA"
  ) {
    return estadoActual;
  }

  if (!Array.isArray(pasos) || pasos.length === 0) return "PENDIENTE";
  if (hayIncidenciaAbierta(pasos)) return "INCIDENCIA";
  if (pasos.every(estaCerrado)) return "TERMINADA";
  if (pasos.some((paso) => paso.estado === "EN_CURSO" || estaCerrado(paso))) {
    return "EN_PROCESO";
  }
  return "PENDIENTE";
}

/**
 * Por qué no se puede tocar este paso todavía, en una frase que dice qué hacer.
 * Devuelve **cadena vacía** cuando el paso no está bloqueado, para poder
 * escribir `const aviso = describirBloqueo(...)` y pintarlo sólo si hay algo.
 */
export function describirBloqueo(pasos: PasoUnidadDTO[], clave: string): string {
  const indice = pasos.findIndex((paso) => paso.clave === clave);
  if (indice < 0) return MENSAJES.pasoNoExiste;

  const paso = pasos[indice];
  if (paso.estado === "INCIDENCIA") return MENSAJES.incidenciaAbierta;
  if (paso.estado === "COMPLETADO") return "Este paso ya está terminado.";
  if (paso.estado === "OMITIDO") return MENSAJES.pasoOmitido;
  if (paso.estado === "EN_CURSO" || paso.estado === "LISTO") return "";

  const pendiente = pasos.slice(0, indice).find((anterior) => !estaCerrado(anterior));
  if (pendiente) {
    if (pendiente.estado === "INCIDENCIA") return MENSAJES.incidenciaAbierta;
    return `Primero hay que terminar «${pendiente.nombre}».`;
  }

  return "Este paso todavía no se puede empezar. Avisa a tu supervisor.";
}
