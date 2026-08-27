/**
 * Contrato de tipos del módulo de Fabricación.
 *
 * Todo lo que cruza la frontera Server → Client vive aquí como DTO PLANO:
 * ids en `string`, fechas en `string` ISO (o `null`), nunca documentos de
 * Mongoose ni objetos `Date`. Mismo criterio que `lib/types.ts`.
 *
 * Dos decisiones del dueño que este archivo hace cumplir:
 *  1. NO existe un enum de roles. Los roles son datos editables (colección
 *     `Rol`); donde iría un rol va `rolClave: string`. Lo único cableado es el
 *     catálogo de CAPACIDADES, porque cada capacidad corresponde a código real.
 *  2. NO existe `qrToken` en ningún sitio: el QR sólo lleva la URL del mueble.
 */

/* ────────────────────────────────────────────────────────────────────────────
 * CAPACIDADES (lo único cableado del sistema de permisos)
 * ──────────────────────────────────────────────────────────────────────────── */

export const CAPACIDADES = [
  "trabajar",
  "escanear",
  "reportar_incidencias",
  "resolver_incidencias",
  "ver_tablero",
  "gestionar_pedidos",
  "eliminar_pedidos",
  "gestionar_unidades",
  "revertir_pasos",
  "cancelar_unidades",
  "gestionar_rutas",
  "gestionar_catalogo",
  "gestionar_estaciones",
  "gestionar_usuarios",
  "gestionar_roles",
  "ver_auditoria",
  "ver_precios",
  "imprimir_etiquetas",
] as const;

export type Capacidad = (typeof CAPACIDADES)[number];

/** Orden en el que se pintan los bloques de casillas del panel de roles. */
export const GRUPOS_CAPACIDADES = [
  "Taller",
  "Supervisión",
  "Configuración",
  "Administración",
] as const;

export type GrupoCapacidad = (typeof GRUPOS_CAPACIDADES)[number];

export interface MetaCapacidad {
  /** Frase llana que se lee al lado de la casilla. Cero jerga. */
  etiqueta: string;
  /** Una frase más que explica qué desbloquea, para el texto de ayuda. */
  ayuda: string;
  grupo: GrupoCapacidad;
  /** Da poder sobre el sistema: la casilla se pinta con aviso. */
  peligrosa?: boolean;
}

export const META_CAPACIDADES: Record<Capacidad, MetaCapacidad> = {
  trabajar: {
    etiqueta: "Trabajar en los muebles (empezar y terminar pasos)",
    ayuda: "Deja marcar un paso como empezado y como terminado desde la app del taller.",
    grupo: "Taller",
  },
  escanear: {
    etiqueta: "Escanear muebles con la cámara",
    ayuda: "Deja abrir la cámara para leer el código del mueble y registrar que lo recibió.",
    grupo: "Taller",
  },
  reportar_incidencias: {
    etiqueta: "Avisar de un problema",
    ayuda: "Deja reportar que un mueble salió mal o que falta material, con foto.",
    grupo: "Taller",
  },
  resolver_incidencias: {
    etiqueta: "Resolver problemas que otros avisaron",
    ayuda: "Deja cerrar un problema explicando cómo se solucionó, para desbloquear el mueble.",
    grupo: "Supervisión",
  },
  ver_tablero: {
    etiqueta: "Ver el tablero de fabricación y las fichas",
    ayuda: "Deja entrar al tablero, ver en qué paso va cada mueble y abrir su ficha.",
    grupo: "Supervisión",
  },
  gestionar_pedidos: {
    etiqueta: "Crear y editar pedidos de clientes",
    ayuda: "Deja registrar un pedido nuevo, cambiar sus datos y añadirle muebles.",
    grupo: "Supervisión",
  },
  eliminar_pedidos: {
    etiqueta: "Eliminar pedidos",
    ayuda: "Deja quitar un pedido de los listados. Los que ya empezaron sólo se cancelan.",
    grupo: "Administración",
    peligrosa: true,
  },
  gestionar_unidades: {
    etiqueta: "Cambiar prioridad, asignar responsable, pausar muebles",
    ayuda: "Deja repartir el trabajo: quién hace qué, qué corre más y qué queda en pausa.",
    grupo: "Supervisión",
  },
  revertir_pasos: {
    etiqueta: "Deshacer un paso ya terminado",
    ayuda: "Deja devolver un paso terminado al estado anterior cuando hubo una equivocación.",
    grupo: "Supervisión",
    peligrosa: true,
  },
  cancelar_unidades: {
    etiqueta: "Cancelar un mueble",
    ayuda: "Deja dar por cancelado un mueble. Su historial se conserva siempre.",
    grupo: "Supervisión",
    peligrosa: true,
  },
  gestionar_rutas: {
    etiqueta: "Crear y editar las rutas de fabricación",
    ayuda: "Deja armar el camino de pasos que sigue cada tipo de mueble.",
    grupo: "Configuración",
  },
  gestionar_catalogo: {
    etiqueta: "Crear y editar los pasos reutilizables",
    ayuda: "Deja añadir pasos nuevos al catálogo y cambiar sus instrucciones y requisitos.",
    grupo: "Configuración",
  },
  gestionar_estaciones: {
    etiqueta: "Crear y editar las áreas de trabajo",
    ayuda: "Deja mantener la lista de talleres, almacenes, transportes y tiendas.",
    grupo: "Configuración",
  },
  gestionar_usuarios: {
    etiqueta: "Crear, editar y eliminar personas",
    ayuda: "Deja dar de alta al equipo, cambiarle el rol y reiniciar su PIN de entrada.",
    grupo: "Administración",
    peligrosa: true,
  },
  gestionar_roles: {
    etiqueta: "Crear y editar los roles y sus permisos",
    ayuda: "Deja crear roles nuevos y marcar qué puede hacer cada uno con estas mismas casillas.",
    grupo: "Administración",
    peligrosa: true,
  },
  ver_auditoria: {
    etiqueta: "Ver el historial de cambios",
    ayuda: "Deja consultar quién cambió qué y cuándo, en todo el módulo.",
    grupo: "Administración",
  },
  ver_precios: {
    etiqueta: "Ver los precios de los muebles",
    ayuda: "Muestra el precio en las fichas y los listados. Sin esto, aparece oculto.",
    grupo: "Supervisión",
  },
  imprimir_etiquetas: {
    etiqueta: "Imprimir las etiquetas con el código QR",
    ayuda: "Deja abrir la hoja imprimible con el QR y el código de barras del mueble.",
    grupo: "Supervisión",
  },
};

/* ────────────────────────────────────────────────────────────────────────────
 * ESTADOS Y CATÁLOGOS CERRADOS
 * ──────────────────────────────────────────────────────────────────────────── */

export const ESTADOS_UNIDAD = [
  "PENDIENTE",
  "EN_PROCESO",
  "PAUSADA",
  "INCIDENCIA",
  "TERMINADA",
  "ENTREGADA",
  "CANCELADA",
] as const;
export type EstadoUnidad = (typeof ESTADOS_UNIDAD)[number];

export const ESTADOS_PASO = [
  "BLOQUEADO",
  "LISTO",
  "EN_CURSO",
  "COMPLETADO",
  "OMITIDO",
  "INCIDENCIA",
] as const;
export type EstadoPaso = (typeof ESTADOS_PASO)[number];

export const TIPOS_PASO = [
  "TRABAJO",
  "CONTROL",
  "TRANSPORTE",
  "ESPERA",
  "ENTREGA",
] as const;
export type TipoPaso = (typeof TIPOS_PASO)[number];

export const TIPOS_EVENTO = [
  "CREADA",
  "PASO_INICIADO",
  "PASO_COMPLETADO",
  "PASO_OMITIDO",
  "ESCANEO",
  "INCIDENCIA",
  "INCIDENCIA_RESUELTA",
  "PAUSA",
  "REANUDACION",
  "ASIGNACION",
  "NOTA",
  "ENTREGA",
  "CANCELACION",
  "REVERSION",
  "EDICION",
  "ELIMINACION",
] as const;
export type TipoEvento = (typeof TIPOS_EVENTO)[number];

export const TIPOS_ESTACION = ["TALLER", "ALMACEN", "TRANSPORTE", "TIENDA"] as const;
export type TipoEstacion = (typeof TIPOS_ESTACION)[number];

export const PRIORIDADES = ["NORMAL", "ALTA", "URGENTE"] as const;
export type Prioridad = (typeof PRIORIDADES)[number];

export const ESTADOS_PEDIDO = [
  "ABIERTO",
  "EN_PROCESO",
  "COMPLETADO",
  "ENTREGADO",
  "CANCELADO",
] as const;
export type EstadoPedido = (typeof ESTADOS_PEDIDO)[number];

export const CANALES = ["WHATSAPP", "TIENDA", "WEB", "OTRO"] as const;
export type Canal = (typeof CANALES)[number];

export const SEVERIDADES = ["BAJA", "MEDIA", "ALTA"] as const;
export type Severidad = (typeof SEVERIDADES)[number];

/** Estado de un problema reportado en el taller. */
export const ESTADOS_INCIDENCIA = ["ABIERTA", "RESUELTA"] as const;
export type EstadoIncidencia = (typeof ESTADOS_INCIDENCIA)[number];

export const ENTIDADES_AUDITORIA = [
  "ROL",
  "OPERARIO",
  "ESTACION",
  "CATALOGO_PASO",
  "RUTA",
  "PEDIDO",
  "UNIDAD",
  "INCIDENCIA",
  "SESION",
] as const;
export type EntidadAuditoria = (typeof ENTIDADES_AUDITORIA)[number];

export const ACCIONES_AUDITORIA = [
  "CREAR",
  "EDITAR",
  "ELIMINAR",
  "RESTAURAR",
  "ARCHIVAR",
  "ACTIVAR",
  "DESACTIVAR",
  "DUPLICAR",
  "RESET_PIN",
  "INICIO_SESION",
  "INTENTO_FALLIDO",
] as const;
export type AccionAuditoria = (typeof ACCIONES_AUDITORIA)[number];

/* ────────────────────────────────────────────────────────────────────────────
 * SESIÓN Y RESULTADOS DE ACCIÓN
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Quién está usando el módulo ahora mismo. Las capacidades NUNCA vienen del
 * token: se resuelven leyendo el `Rol` en cada comprobación, para que quitar un
 * permiso surta efecto sin volver a entrar.
 */
export interface SesionOperario {
  uid: string;
  nombre: string;
  rolClave: string;
  rolNombre: string;
  capacidades: Capacidad[];
  /** El dueño entrando con la cookie de admin: siempre tiene todo. */
  esAdmin: boolean;
}

/** Misma forma que `ActionResult` de `lib/actions/products.ts`. */
export interface ActionResult<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

/** Respuesta de las reglas de negocio puras: sí/no + por qué, en español. */
export interface ResultadoRegla {
  ok: boolean;
  motivo?: string;
}

/**
 * Comprobación previa a cualquier borrado (§7). Cuando no se puede eliminar,
 * `motivo` lo explica en español llano y `sugerencia` dice qué hacer.
 */
export interface DependenciasEliminacion {
  puedeEliminar: boolean;
  motivo?: string;
  dependencias: { etiqueta: string; cantidad: number }[];
  sugerencia?: string;
}

/* ────────────────────────────────────────────────────────────────────────────
 * CONFIGURACIÓN: ROLES, PERSONAS, ÁREAS
 * ──────────────────────────────────────────────────────────────────────────── */

export interface RolDTO {
  _id: string;
  /** Slug estable: es lo que guardan `Operario.rolClave` y `paso.rolesPermitidos`. */
  clave: string;
  nombre: string;
  descripcion: string;
  color: string;
  icono: string;
  capacidades: Capacidad[];
  /** El rol `admin`: no se puede eliminar ni desactivar. */
  esSistema: boolean;
  activo: boolean;
  orden: number;
  /** Cuántas personas lo tienen. Se rellena en los listados para el diálogo de borrado. */
  cantidadPersonas?: number;
}

/** Persona del equipo. El PIN (`pinHash`/`pinSalt`) JAMÁS sale del servidor. */
export interface OperarioDTO {
  _id: string;
  nombre: string;
  codigoEmpleado: string;
  rolClave: string;
  rolNombre: string;
  estacionesIds: string[];
  estacionesNombres: string[];
  telefono: string;
  colorAvatar: string;
  fotoUrl: string;
  activo: boolean;
  /** Borrado lógico: la persona desaparece de los listados pero su historial queda. */
  eliminado: boolean;
  ultimoAccesoAt: string | null;
  createdAt: string;
}

export interface EstacionDTO {
  _id: string;
  nombre: string;
  tipo: TipoEstacion;
  direccion: string;
  telefono: string;
  activa: boolean;
  eliminada: boolean;
  orden: number;
  createdAt: string;
  /** Muebles que están ahí ahora mismo. Sólo en los listados. */
  cantidadUnidades?: number;
}

/* ────────────────────────────────────────────────────────────────────────────
 * PASOS: CATÁLOGO, PLANTILLA DE RUTA Y PASO DE UN MUEBLE CONCRETO
 * ──────────────────────────────────────────────────────────────────────────── */

export interface ChecklistItemDTO {
  texto: string;
  obligatorio: boolean;
}

export interface ChecklistRespuestaDTO {
  texto: string;
  ok: boolean;
}

/** Definición de un paso tal y como vive dentro de una ruta. */
export interface PasoPlantillaDTO {
  clave: string;
  nombre: string;
  instrucciones: string;
  icono: string;
  color: string;
  tipo: TipoPaso;
  estacionId: string | null;
  /** Nombre del área, resuelto para pintar sin otra consulta. */
  estacionNombre?: string;
  /** Claves de `Rol` que pueden hacerlo. Vacío = cualquiera con la capacidad `trabajar`. */
  rolesPermitidos: string[];
  requiereFoto: boolean;
  minFotos: number;
  requiereEscaneo: boolean;
  requiereFirma: boolean;
  requiereNota: boolean;
  checklist: ChecklistItemDTO[];
  horasEstimadas: number;
  permiteParalelo: boolean;
  permiteOmitir: boolean;
  notificaCliente: boolean;
}

/** Paso reutilizable del catálogo, el que el admin arrastra a una ruta. */
export interface CatalogoPasoDTO extends PasoPlantillaDTO {
  _id: string;
  /** Sembrado por el sistema: se puede editar, no eliminar. */
  esSistema: boolean;
  activo: boolean;
  orden: number;
  createdAt: string;
  /** En cuántas rutas se está usando. Para el diálogo de borrado. */
  usadoEnRutas?: number;
}

/** Paso de un mueble concreto: la plantilla congelada + su progreso real. */
export interface PasoUnidadDTO extends PasoPlantillaDTO {
  estado: EstadoPaso;
  iniciadoAt: string | null;
  completadoAt: string | null;
  iniciadoPorId: string;
  iniciadoPorNombre: string;
  completadoPorId: string;
  completadoPorNombre: string;
  fotos: string[];
  nota: string;
  firmaUrl: string;
  checklistRespuestas: ChecklistRespuestaDTO[];
  duracionMs: number;
  motivoOmision: string;
  escaneadoAt: string | null;
  escaneadoPorId: string;
}

export interface RutaDTO {
  _id: string;
  nombre: string;
  descripcion: string;
  categoriaSugerida: string;
  version: number;
  activa: boolean;
  archivada: boolean;
  esPredeterminada: boolean;
  pasos: PasoPlantillaDTO[];
  creadaPorId: string;
  creadaPorNombre: string;
  createdAt: string;
  updatedAt: string;
  /** Suma de `horasEstimadas` de sus pasos. */
  horasEstimadasTotal?: number;
  /** Muebles que la están usando ahora. Para el diálogo de borrado. */
  unidadesEnCurso?: number;
}

/* ────────────────────────────────────────────────────────────────────────────
 * PEDIDOS Y MUEBLES
 * ──────────────────────────────────────────────────────────────────────────── */

export interface ClienteDTO {
  nombre: string;
  telefono: string;
  cedula: string;
  direccion: string;
  ciudad: string;
  email: string;
}

export interface PedidoDTO {
  _id: string;
  /** `PED-100248` */
  codigo: string;
  cliente: ClienteDTO;
  canal: Canal;
  prioridad: Prioridad;
  fechaPrometida: string | null;
  notas: string;
  estado: EstadoPedido;
  creadoPorId: string;
  creadoPorNombre: string;
  totalUnidades: number;
  unidadesCompletadas: number;
  eliminado: boolean;
  createdAt: string;
  updatedAt: string;
  /** Los muebles del pedido, sólo cuando se pide la ficha completa. */
  unidades?: UnidadDTO[];
}

/** Copia congelada del producto en el momento de crear el mueble. */
export interface ProductoSnapshotDTO {
  titulo: string;
  categoria: string;
  imagen: string;
  tela: string;
  acabado: string;
  configuracion: string;
  medidas: string;
  /** `null` cuando quien mira no tiene la capacidad `ver_precios`. */
  precio: number | null;
}

export interface UnidadDTO {
  _id: string;
  /** `COD-949473` — es lo único que lleva el QR, sin token. */
  codigo: string;
  pedidoId: string;
  pedidoCodigo: string;
  clienteNombre: string;
  productoId: string | null;
  producto: ProductoSnapshotDTO;
  rutaId: string | null;
  rutaNombre: string;
  rutaVersion: number;
  pasos: PasoUnidadDTO[];
  estado: EstadoUnidad;
  pasoActualIndex: number;
  /** 0..100 */
  progreso: number;
  asignadoAId: string | null;
  asignadoANombre: string;
  ubicacionActualId: string | null;
  ubicacionActualNombre: string;
  prioridad: Prioridad;
  fechaPrometida: string | null;
  iniciadoAt: string | null;
  terminadoAt: string | null;
  entregadoAt: string | null;
  notas: string;
  eliminada: boolean;
  createdAt: string;
  updatedAt: string;
  /** Problemas sin resolver que bloquean el mueble. */
  incidenciasAbiertas?: number;
}

/* ────────────────────────────────────────────────────────────────────────────
 * BITÁCORAS (append-only) E INCIDENCIAS
 * ──────────────────────────────────────────────────────────────────────────── */

/** Bitácora del piso de taller: qué le pasó a este mueble y quién lo hizo. */
export interface EventoDTO {
  _id: string;
  unidadId: string;
  unidadCodigo: string;
  tipo: TipoEvento;
  pasoClave: string;
  pasoNombre: string;
  operarioId: string;
  operarioNombre: string;
  operarioRol: string;
  descripcion: string;
  fotos: string[];
  estacionId: string | null;
  estacionNombre: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface IncidenciaDTO {
  _id: string;
  unidadId: string;
  unidadCodigo: string;
  pasoClave: string;
  pasoNombre: string;
  motivo: string;
  descripcion: string;
  severidad: Severidad;
  fotos: string[];
  reportadaPorId: string;
  reportadaPorNombre: string;
  estado: EstadoIncidencia;
  resueltaPorId: string;
  resueltaPorNombre: string;
  resolucion: string;
  resueltaAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Un campo que cambió, con los valores YA formateados como texto legible. */
export interface CambioAuditoria {
  campo: string;
  etiqueta: string;
  antes: string;
  despues: string;
}

/** Bitácora de configuración: quién editó qué, con el diff campo a campo. */
export interface RegistroAuditoriaDTO {
  _id: string;
  entidad: EntidadAuditoria;
  entidadId: string;
  entidadNombre: string;
  accion: AccionAuditoria;
  actorId: string;
  actorNombre: string;
  actorRol: string;
  descripcion: string;
  cambios: CambioAuditoria[];
  createdAt: string;
  metadata?: Record<string, unknown>;
}

/* ────────────────────────────────────────────────────────────────────────────
 * TRABAJO EN EL TALLER Y VISTAS AGREGADAS
 * ──────────────────────────────────────────────────────────────────────────── */

/** Lo que el operario adjunta al terminar un paso. */
export interface EvidenciaPaso {
  fotos: string[];
  nota?: string;
  firmaUrl?: string;
  checklistRespuestas: ChecklistRespuestaDTO[];
  /** Se puso en `true` tras leer el código del mueble con la cámara. */
  escaneoValidado?: boolean;
}

/** Una columna del tablero: normalmente un paso de la ruta. */
export interface ColumnaKanban {
  clave: string;
  nombre: string;
  color: string;
  icono: string;
  cantidad: number;
  unidades: UnidadDTO[];
}

export interface ResumenFabricacion {
  totalUnidades: number;
  enProceso: number;
  terminadas: number;
  entregadas: number;
  conIncidencia: number;
  /** Con fecha prometida pasada y sin entregar. */
  retrasadas: number;
  /** 0..100 */
  progresoPromedio: number;
  porPaso: { clave: string; nombre: string; color: string; cantidad: number }[];
  porEstado: { estado: EstadoUnidad; etiqueta: string; cantidad: number }[];
  entregasProximas: {
    codigo: string;
    clienteNombre: string;
    producto: string;
    fechaPrometida: string | null;
    /** Negativo = ya pasó la fecha. */
    diasRestantes: number;
    prioridad: Prioridad;
  }[];
  tiempoPromedioPorPasoHoras: { clave: string; nombre: string; horas: number }[];
}

/* ────────────────────────────────────────────────────────────────────────────
 * FILTROS DE LOS LISTADOS
 * ──────────────────────────────────────────────────────────────────────────── */

export interface FiltrosUnidades {
  /** Código, cliente, producto o pedido. */
  busqueda?: string;
  estado?: EstadoUnidad;
  prioridad?: Prioridad;
  pasoClave?: string;
  asignadoAId?: string;
  estacionId?: string;
  rutaId?: string;
  pedidoCodigo?: string;
  retrasadas?: boolean;
  /** Vista "Ver eliminados" (§7). */
  incluirEliminadas?: boolean;
  soloEliminadas?: boolean;
  desde?: string;
  hasta?: string;
  orden?: "recientes" | "prioridad" | "entrega" | "progreso";
  pagina?: number;
  porPagina?: number;
}

export interface FiltrosPedidos {
  busqueda?: string;
  estado?: EstadoPedido;
  canal?: Canal;
  prioridad?: Prioridad;
  desde?: string;
  hasta?: string;
  incluirEliminados?: boolean;
  soloEliminados?: boolean;
  orden?: "recientes" | "entrega" | "prioridad";
  pagina?: number;
  porPagina?: number;
}

export interface FiltrosAuditoria {
  busqueda?: string;
  entidad?: EntidadAuditoria;
  entidadId?: string;
  accion?: AccionAuditoria;
  actorId?: string;
  desde?: string;
  hasta?: string;
  pagina?: number;
  porPagina?: number;
}

export interface FiltrosIncidencias {
  busqueda?: string;
  estado?: EstadoIncidencia;
  severidad?: Severidad;
  unidadCodigo?: string;
  reportadaPorId?: string;
  desde?: string;
  hasta?: string;
  pagina?: number;
  porPagina?: number;
}
