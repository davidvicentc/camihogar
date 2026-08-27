/**
 * Constantes del módulo de Fabricación: los datos de arranque (roles, pasos y
 * rutas sugeridas) y todo lo que hace falta para PINTAR el módulo (iconos,
 * colores del semáforo y etiquetas en español).
 *
 * Nada de esto es un enum cerrado del dominio: los roles, los pasos y las rutas
 * se siembran desde aquí una sola vez y a partir de ahí se editan desde el
 * panel. Lo único cerrado son las CAPACIDADES, que viven en
 * `lib/types/fabricacion.ts` porque cada una corresponde a código real.
 */

import {
  AlertOctagon,
  AlertTriangle,
  Archive,
  Armchair,
  Axe,
  Ban,
  Boxes,
  Camera,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Copy,
  Drill,
  Factory,
  Globe,
  Hammer,
  Home,
  Info,
  KeyRound,
  Layers,
  ListChecks,
  Lock,
  LogIn,
  MapPin,
  Package,
  PackageCheck,
  PaintRoller,
  Paintbrush,
  Palette,
  Pencil,
  PenTool,
  Phone,
  Printer,
  Route,
  RotateCcw,
  Ruler,
  ScanLine,
  Scissors,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sofa,
  Sparkles,
  SprayCan,
  Store,
  Tag,
  Trash2,
  Truck,
  User,
  UserCog,
  Users,
  Warehouse,
  Wrench,
  CircleCheck,
  CircleDot,
  CirclePause,
  CirclePlay,
  CirclePlus,
  CircleSlash,
  type LucideIcon,
} from "lucide-react";

import type {
  AccionAuditoria,
  Canal,
  Capacidad,
  ChecklistItemDTO,
  EntidadAuditoria,
  EstadoIncidencia,
  EstadoPaso,
  EstadoPedido,
  EstadoUnidad,
  Prioridad,
  Severidad,
  TipoEstacion,
  TipoPaso,
} from "@/lib/types/fabricacion";
import { CAPACIDADES } from "@/lib/types/fabricacion";

/* ────────────────────────────────────────────────────────────────────────────
 * PALETA DE LOS PASOS
 * ──────────────────────────────────────────────────────────────────────────── */

/** Los 8 colores cálidos de la marca que se ofrecen en el constructor de rutas. */
export const COLORES_PASO: { nombre: string; valor: string }[] = [
  { nombre: "Naranja CamiHogar", valor: "#E8511A" },
  { nombre: "Naranja claro", valor: "#FF7A45" },
  { nombre: "Naranja quemado", valor: "#C63F0C" },
  { nombre: "Ámbar madera", valor: "#D98324" },
  { nombre: "Roble", valor: "#A9714B" },
  { nombre: "Cacao", valor: "#46291B" },
  { nombre: "Taupe", valor: "#6E5748" },
  { nombre: "Café espresso", valor: "#331E14" },
];

/* ────────────────────────────────────────────────────────────────────────────
 * ROLES DE ARRANQUE
 * ──────────────────────────────────────────────────────────────────────────── */

export interface RolSemilla {
  clave: string;
  nombre: string;
  descripcion: string;
  color: string;
  icono: string;
  /** Sólo `admin`: no se puede eliminar ni desactivar y siempre lo puede todo. */
  esSistema: boolean;
  orden: number;
  capacidades: Capacidad[];
}

/** Capacidades de taller que tiene cualquiera que se ensucia las manos. */
const CAPACIDADES_TALLER: Capacidad[] = ["trabajar", "escanear", "reportar_incidencias"];

/**
 * Los 8 roles con los que arranca el sistema. A partir del sembrado son datos
 * editables: se pueden crear más, cambiarles las casillas o desactivarlos.
 */
export const ROLES_SEMILLA: RolSemilla[] = [
  {
    clave: "admin",
    nombre: "Administrador",
    descripcion: "Puede hacer todo: crear personas, cambiar permisos y ver el historial completo.",
    color: "#25160F",
    icono: "escudo",
    esSistema: true,
    orden: 0,
    capacidades: [...CAPACIDADES],
  },
  {
    clave: "supervisor",
    nombre: "Supervisor",
    descripcion: "Reparte el trabajo del taller, resuelve los problemas y vigila el tablero.",
    color: "#E8511A",
    icono: "supervisor",
    esSistema: false,
    orden: 1,
    capacidades: [
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
      "ver_auditoria",
      "ver_precios",
      "imprimir_etiquetas",
    ],
  },
  {
    clave: "carpintero",
    nombre: "Carpintero",
    descripcion: "Corta la madera y arma la estructura del mueble.",
    color: "#A9714B",
    icono: "martillo",
    esSistema: false,
    orden: 2,
    capacidades: [...CAPACIDADES_TALLER],
  },
  {
    clave: "tapicero",
    nombre: "Tapicero",
    descripcion: "Pone la espuma, cose las fundas y forra el mueble.",
    color: "#FF7A45",
    icono: "sillon",
    esSistema: false,
    orden: 3,
    capacidades: [...CAPACIDADES_TALLER],
  },
  {
    clave: "pintor",
    nombre: "Pintor",
    descripcion: "Pinta y barniza los muebles de madera.",
    color: "#D98324",
    icono: "pintura",
    esSistema: false,
    orden: 4,
    capacidades: [...CAPACIDADES_TALLER],
  },
  {
    clave: "almacen",
    nombre: "Almacén",
    descripcion: "Embala, guarda y despacha los muebles terminados.",
    color: "#6E5748",
    icono: "almacen",
    esSistema: false,
    orden: 5,
    capacidades: [...CAPACIDADES_TALLER, "ver_tablero", "imprimir_etiquetas"],
  },
  {
    clave: "delivery",
    nombre: "Repartidor",
    descripcion: "Lleva los muebles hasta la casa del cliente y los entrega.",
    color: "#C63F0C",
    icono: "camion",
    esSistema: false,
    orden: 6,
    capacidades: [...CAPACIDADES_TALLER],
  },
  {
    clave: "tienda",
    nombre: "Tienda",
    descripcion: "Recibe los muebles en la tienda y atiende al cliente que pasa a recogerlos.",
    color: "#46291B",
    icono: "tienda",
    esSistema: false,
    orden: 7,
    capacidades: [...CAPACIDADES_TALLER, "ver_tablero", "ver_precios"],
  },
];

/* ────────────────────────────────────────────────────────────────────────────
 * CATÁLOGO DE PASOS SUGERIDOS
 * ──────────────────────────────────────────────────────────────────────────── */

export interface PasoSugerido {
  clave: string;
  nombre: string;
  /** En lenguaje simplísimo: frases cortas que dicen QUÉ HACER. */
  instrucciones: string;
  /** Clave de `ICONOS_PASO`. */
  icono: string;
  color: string;
  tipo: TipoPaso;
  /** Pista para enlazar el paso con una estación al sembrar. */
  tipoEstacion: TipoEstacion;
  /** Claves de `ROLES_SEMILLA`. Vacío = cualquiera que pueda trabajar. */
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
  orden: number;
}

/**
 * Los pasos con los que se siembra `CatalogoPaso` (todos con `esSistema: true`:
 * se pueden editar, pero no eliminar). El admin puede añadir los suyos.
 */
export const PASOS_SUGERIDOS: PasoSugerido[] = [
  {
    clave: "diseno_medidas",
    nombre: "Diseño y medidas",
    instrucciones:
      "Lee la hoja del pedido. Anota el largo, el ancho y el alto del mueble. Si algo no se entiende, pregunta antes de cortar.",
    icono: "regla",
    color: "#D98324",
    tipo: "TRABAJO",
    tipoEstacion: "TALLER",
    rolesPermitidos: ["supervisor", "carpintero"],
    requiereFoto: false,
    minFotos: 0,
    requiereEscaneo: false,
    requiereFirma: false,
    requiereNota: true,
    checklist: [
      { texto: "Anoté el largo, el ancho y el alto", obligatorio: true },
      { texto: "Confirmé la tela y el color del pedido", obligatorio: true },
    ],
    horasEstimadas: 1.5,
    permiteParalelo: false,
    permiteOmitir: false,
    notificaCliente: false,
    orden: 10,
  },
  {
    clave: "corte_madera",
    nombre: "Corte de madera",
    instrucciones:
      "Corta las piezas de madera con las medidas de la hoja. Mide dos veces y corta una sola vez. Ponte las gafas antes de prender la sierra.",
    icono: "sierra",
    color: "#A9714B",
    tipo: "TRABAJO",
    tipoEstacion: "TALLER",
    rolesPermitidos: ["carpintero"],
    requiereFoto: true,
    minFotos: 1,
    requiereEscaneo: false,
    requiereFirma: false,
    requiereNota: false,
    checklist: [
      { texto: "Medí dos veces antes de cortar", obligatorio: true },
      { texto: "Están todas las piezas de la lista", obligatorio: true },
      { texto: "Guardé los recortes grandes", obligatorio: false },
    ],
    horasEstimadas: 3,
    permiteParalelo: false,
    permiteOmitir: false,
    notificaCliente: false,
    orden: 20,
  },
  {
    clave: "armado_estructura",
    nombre: "Armado de estructura",
    instrucciones:
      "Une las piezas y arma el esqueleto del mueble. Revisa que quede derecho. Empuja el mueble con la mano: no se debe mover.",
    icono: "martillo",
    color: "#C63F0C",
    tipo: "TRABAJO",
    tipoEstacion: "TALLER",
    rolesPermitidos: ["carpintero"],
    requiereFoto: true,
    minFotos: 1,
    requiereEscaneo: false,
    requiereFirma: false,
    requiereNota: false,
    checklist: [
      { texto: "El mueble no se mueve al empujarlo", obligatorio: true },
      { texto: "No hay clavos ni tornillos salidos", obligatorio: true },
    ],
    horasEstimadas: 4,
    permiteParalelo: false,
    permiteOmitir: false,
    notificaCliente: false,
    orden: 30,
  },
  {
    clave: "lijado",
    nombre: "Lijado",
    instrucciones:
      "Lija toda la madera hasta que quede suave. Pasa la mano: no se debe enganchar en ningún lado. Limpia el polvo con un trapo antes de seguir.",
    icono: "lija",
    color: "#6E5748",
    tipo: "TRABAJO",
    tipoEstacion: "TALLER",
    rolesPermitidos: ["carpintero"],
    requiereFoto: true,
    minFotos: 1,
    requiereEscaneo: false,
    requiereFirma: false,
    requiereNota: false,
    checklist: [
      { texto: "Paso la mano y no engancha", obligatorio: true },
      { texto: "Quité todo el polvo", obligatorio: true },
    ],
    horasEstimadas: 2,
    permiteParalelo: false,
    permiteOmitir: false,
    notificaCliente: false,
    orden: 40,
  },
  {
    clave: "bases_patas",
    nombre: "Bases y patas",
    instrucciones:
      "Coloca las patas o la base del mueble. Aprieta bien todos los tornillos. Para el mueble en el piso: no debe cojear.",
    icono: "tornillo",
    color: "#A9714B",
    tipo: "TRABAJO",
    tipoEstacion: "TALLER",
    rolesPermitidos: ["carpintero"],
    requiereFoto: true,
    minFotos: 1,
    requiereEscaneo: false,
    requiereFirma: false,
    requiereNota: false,
    checklist: [
      { texto: "Las patas tocan el piso todas por igual", obligatorio: true },
      { texto: "Los tornillos están apretados", obligatorio: true },
    ],
    horasEstimadas: 1.5,
    permiteParalelo: false,
    permiteOmitir: false,
    notificaCliente: false,
    orden: 50,
  },
  {
    clave: "espuma_relleno",
    nombre: "Espuma y relleno",
    instrucciones:
      "Corta la espuma y ponla en el asiento y el espaldar. Usa el grosor que dice el pedido. Aprieta con la mano: no debe quedar ningún hueco.",
    icono: "espuma",
    color: "#FF7A45",
    tipo: "TRABAJO",
    tipoEstacion: "TALLER",
    rolesPermitidos: ["tapicero"],
    requiereFoto: true,
    minFotos: 1,
    requiereEscaneo: false,
    requiereFirma: false,
    requiereNota: false,
    checklist: [
      { texto: "La espuma es la del pedido", obligatorio: true },
      { texto: "No quedan huecos ni bultos", obligatorio: true },
    ],
    horasEstimadas: 2.5,
    permiteParalelo: false,
    permiteOmitir: false,
    notificaCliente: false,
    orden: 60,
  },
  {
    clave: "costura_fundas",
    nombre: "Costura de fundas",
    instrucciones:
      "Corta la tela y cose las fundas. Revisa que la tela sea la del pedido y no otra parecida. Las costuras van derechas y sin hilos sueltos.",
    icono: "tijeras",
    color: "#E8511A",
    tipo: "TRABAJO",
    tipoEstacion: "TALLER",
    rolesPermitidos: ["tapicero"],
    requiereFoto: true,
    minFotos: 1,
    requiereEscaneo: false,
    requiereFirma: false,
    requiereNota: false,
    checklist: [
      { texto: "La tela es la del pedido", obligatorio: true },
      { texto: "Las costuras están derechas", obligatorio: true },
      { texto: "No hay hilos sueltos", obligatorio: false },
    ],
    horasEstimadas: 3,
    permiteParalelo: true,
    permiteOmitir: false,
    notificaCliente: false,
    orden: 70,
  },
  {
    clave: "tapizado",
    nombre: "Tapizado",
    instrucciones:
      "Forra el mueble con la funda y grapa la tela por debajo. Estira bien para que no queden arrugas. Toma 2 fotos: una de frente y otra de atrás.",
    icono: "sillon",
    color: "#E8511A",
    tipo: "TRABAJO",
    tipoEstacion: "TALLER",
    rolesPermitidos: ["tapicero"],
    requiereFoto: true,
    minFotos: 2,
    requiereEscaneo: false,
    requiereFirma: false,
    requiereNota: false,
    checklist: [
      { texto: "La tela quedó estirada, sin arrugas", obligatorio: true },
      { texto: "Las grapas no se ven por fuera", obligatorio: true },
      { texto: "Las esquinas quedaron parejas", obligatorio: true },
    ],
    horasEstimadas: 4,
    permiteParalelo: false,
    permiteOmitir: false,
    notificaCliente: false,
    orden: 80,
  },
  {
    clave: "forrado",
    nombre: "Forrado",
    instrucciones:
      "Coloca el forro final y los cojines. Prueba las cremalleras y los botones. Mira el mueble de lejos: todo debe verse parejo.",
    icono: "sofa",
    color: "#FF7A45",
    tipo: "TRABAJO",
    tipoEstacion: "TALLER",
    rolesPermitidos: ["tapicero"],
    requiereFoto: true,
    minFotos: 1,
    requiereEscaneo: false,
    requiereFirma: false,
    requiereNota: false,
    checklist: [
      { texto: "Las cremalleras y los botones funcionan", obligatorio: true },
      { texto: "El forro quedó parejo", obligatorio: true },
    ],
    horasEstimadas: 2,
    permiteParalelo: false,
    permiteOmitir: true,
    notificaCliente: false,
    orden: 90,
  },
  {
    clave: "pintura_barniz",
    nombre: "Pintura o barniz",
    instrucciones:
      "Aplica la pintura o el barniz del color del pedido. Da manos delgadas y parejas, sin chorreados. Deja secar en un sitio ventilado antes de mover el mueble.",
    icono: "pintura",
    color: "#D98324",
    tipo: "TRABAJO",
    tipoEstacion: "TALLER",
    rolesPermitidos: ["pintor"],
    requiereFoto: true,
    minFotos: 1,
    requiereEscaneo: false,
    requiereFirma: false,
    requiereNota: false,
    checklist: [
      { texto: "Di las manos de pintura indicadas", obligatorio: true },
      { texto: "No hay chorreados ni manchas", obligatorio: true },
      { texto: "Lo dejé secando en un sitio ventilado", obligatorio: true },
    ],
    horasEstimadas: 3,
    permiteParalelo: false,
    permiteOmitir: false,
    notificaCliente: false,
    orden: 100,
  },
  {
    clave: "control_calidad",
    nombre: "Control de calidad",
    instrucciones:
      "Revisa el mueble completo antes de embalarlo. Compáralo con la hoja del pedido: medidas, tela y color. Si algo está mal, avisa de un problema en vez de continuar.",
    icono: "calidad",
    color: "#46291B",
    tipo: "CONTROL",
    tipoEstacion: "TALLER",
    rolesPermitidos: ["supervisor"],
    requiereFoto: true,
    minFotos: 2,
    requiereEscaneo: false,
    requiereFirma: false,
    requiereNota: true,
    checklist: [
      { texto: "Las medidas son las del pedido", obligatorio: true },
      { texto: "La tela y el color son los del pedido", obligatorio: true },
      { texto: "No hay manchas ni rayones", obligatorio: true },
      { texto: "El mueble está firme y no suena", obligatorio: true },
    ],
    horasEstimadas: 0.5,
    permiteParalelo: false,
    permiteOmitir: false,
    notificaCliente: false,
    orden: 110,
  },
  {
    clave: "embalaje",
    nombre: "Embalaje",
    instrucciones:
      "Limpia el mueble y envuélvelo con plástico y esquineros. Pega la etiqueta con el código donde se vea bien. Toma una foto del mueble ya embalado.",
    icono: "caja",
    color: "#6E5748",
    tipo: "TRABAJO",
    tipoEstacion: "ALMACEN",
    rolesPermitidos: ["almacen", "tapicero"],
    requiereFoto: true,
    minFotos: 1,
    requiereEscaneo: false,
    requiereFirma: false,
    requiereNota: false,
    checklist: [
      { texto: "El mueble está limpio", obligatorio: true },
      { texto: "Puse plástico y esquineros", obligatorio: true },
      { texto: "Pegué la etiqueta con el código", obligatorio: true },
    ],
    horasEstimadas: 1,
    permiteParalelo: false,
    permiteOmitir: false,
    notificaCliente: false,
    orden: 120,
  },
  {
    clave: "espera_almacen",
    nombre: "Espera en almacén",
    instrucciones:
      "Guarda el mueble en el almacén hasta el día del despacho. Escanea el código al guardarlo. Escribe en qué estante o rincón lo dejaste.",
    icono: "almacen",
    color: "#331E14",
    tipo: "ESPERA",
    tipoEstacion: "ALMACEN",
    rolesPermitidos: ["almacen"],
    requiereFoto: false,
    minFotos: 0,
    requiereEscaneo: true,
    requiereFirma: false,
    requiereNota: true,
    checklist: [
      { texto: "Escaneé el código al guardarlo", obligatorio: true },
      { texto: "Anoté en qué estante quedó", obligatorio: true },
    ],
    horasEstimadas: 24,
    permiteParalelo: false,
    permiteOmitir: true,
    notificaCliente: false,
    orden: 130,
  },
  {
    clave: "despacho_almacen",
    nombre: "Despacho de almacén",
    instrucciones:
      "Saca el mueble del almacén y súbelo al camión. Escanea el código antes de subirlo. Revisa que vayan también los cojines y las patas.",
    icono: "despacho",
    color: "#A9714B",
    tipo: "TRANSPORTE",
    tipoEstacion: "ALMACEN",
    rolesPermitidos: ["almacen", "delivery"],
    requiereFoto: true,
    minFotos: 1,
    requiereEscaneo: true,
    requiereFirma: false,
    requiereNota: false,
    checklist: [
      { texto: "Escaneé el código al sacarlo", obligatorio: true },
      { texto: "Van los cojines y las patas", obligatorio: true },
    ],
    horasEstimadas: 0.5,
    permiteParalelo: false,
    permiteOmitir: false,
    notificaCliente: true,
    orden: 140,
  },
  {
    clave: "en_camino",
    nombre: "En camino",
    instrucciones:
      "Lleva el mueble hasta la dirección del cliente. Amárralo bien y tápalo con una manta. Si te retrasas, llama al cliente.",
    icono: "camion",
    color: "#C63F0C",
    tipo: "TRANSPORTE",
    tipoEstacion: "TRANSPORTE",
    rolesPermitidos: ["delivery"],
    requiereFoto: false,
    minFotos: 0,
    requiereEscaneo: false,
    requiereFirma: false,
    requiereNota: false,
    checklist: [
      { texto: "El mueble va amarrado y tapado", obligatorio: true },
      { texto: "Llevo la dirección y el teléfono del cliente", obligatorio: true },
    ],
    horasEstimadas: 2,
    permiteParalelo: false,
    permiteOmitir: false,
    notificaCliente: true,
    orden: 150,
  },
  {
    clave: "llegando_destino",
    nombre: "Llegando a destino",
    instrucciones:
      "Avisa que ya estás llegando. Llama al cliente diez minutos antes. Busca dónde estacionar y por dónde va a entrar el mueble.",
    icono: "mapa",
    color: "#D98324",
    tipo: "TRANSPORTE",
    tipoEstacion: "TRANSPORTE",
    rolesPermitidos: ["delivery"],
    requiereFoto: false,
    minFotos: 0,
    requiereEscaneo: false,
    requiereFirma: false,
    requiereNota: false,
    checklist: [{ texto: "Llamé al cliente para avisar", obligatorio: true }],
    horasEstimadas: 0.5,
    permiteParalelo: false,
    permiteOmitir: true,
    notificaCliente: true,
    orden: 160,
  },
  {
    clave: "recibido_tienda",
    nombre: "Recibido en tienda",
    instrucciones:
      "Recibe el mueble en la tienda. Escanea el código para dejar constancia. Míralo por todos lados: si viene golpeado, avisa de un problema.",
    icono: "tienda",
    color: "#46291B",
    tipo: "TRANSPORTE",
    tipoEstacion: "TIENDA",
    rolesPermitidos: ["tienda"],
    requiereFoto: true,
    minFotos: 1,
    requiereEscaneo: true,
    requiereFirma: false,
    requiereNota: false,
    checklist: [
      { texto: "Escaneé el código al recibirlo", obligatorio: true },
      { texto: "Revisé que no venga golpeado", obligatorio: true },
    ],
    horasEstimadas: 0.5,
    permiteParalelo: false,
    permiteOmitir: true,
    notificaCliente: true,
    orden: 170,
  },
  {
    clave: "entregado_cliente",
    nombre: "Entregado al cliente",
    instrucciones:
      "Entrega el mueble y deja que el cliente lo revise con calma. Escanea el código y pide la firma en la pantalla. Toma una foto del mueble ya puesto en su sitio.",
    icono: "casa",
    color: "#E8511A",
    tipo: "ENTREGA",
    tipoEstacion: "TRANSPORTE",
    rolesPermitidos: ["delivery", "tienda"],
    requiereFoto: true,
    minFotos: 1,
    requiereEscaneo: true,
    requiereFirma: true,
    requiereNota: false,
    checklist: [
      { texto: "El cliente revisó el mueble", obligatorio: true },
      { texto: "El cliente firmó la entrega", obligatorio: true },
    ],
    horasEstimadas: 0.5,
    permiteParalelo: false,
    permiteOmitir: false,
    notificaCliente: true,
    orden: 180,
  },
  {
    clave: "instalacion_casa",
    nombre: "Instalación en casa",
    instrucciones:
      "Arma e instala el mueble donde el cliente lo quiere. Nivélalo y revisa que quede firme. Recoge la basura antes de irte y pide la firma del cliente.",
    icono: "destornillador",
    color: "#FF7A45",
    tipo: "ENTREGA",
    tipoEstacion: "TRANSPORTE",
    rolesPermitidos: ["carpintero", "delivery"],
    requiereFoto: true,
    minFotos: 2,
    requiereEscaneo: false,
    requiereFirma: true,
    requiereNota: false,
    checklist: [
      { texto: "El mueble quedó nivelado y firme", obligatorio: true },
      { texto: "Recogí la basura y el plástico", obligatorio: true },
      { texto: "El cliente quedó conforme", obligatorio: true },
    ],
    horasEstimadas: 1.5,
    permiteParalelo: false,
    permiteOmitir: true,
    notificaCliente: true,
    orden: 190,
  },
];

/** Busca un paso del catálogo sugerido por su clave. */
export function pasoSugerido(clave: string): PasoSugerido | undefined {
  return PASOS_SUGERIDOS.find((paso) => paso.clave === clave);
}

/* ────────────────────────────────────────────────────────────────────────────
 * RUTAS DE ARRANQUE
 * ──────────────────────────────────────────────────────────────────────────── */

export interface PlantillaRuta {
  nombre: string;
  descripcion: string;
  /** Categoría del catálogo de productos con la que encaja. */
  categoriaSugerida: string;
  esPredeterminada: boolean;
  /** Claves de `PASOS_SUGERIDOS`, en el orden en que se hacen. */
  pasos: string[];
}

/** Las 3 rutas completas con las que arranca el taller. Todas son editables. */
export const PLANTILLAS_RUTA: PlantillaRuta[] = [
  {
    nombre: "Sofá tapizado completo",
    descripcion:
      "El camino completo de un sofá: madera, espuma, tela y entrega en la casa del cliente.",
    categoriaSugerida: "Salas",
    esPredeterminada: true,
    pasos: [
      "diseno_medidas",
      "corte_madera",
      "armado_estructura",
      "lijado",
      "bases_patas",
      "espuma_relleno",
      "costura_fundas",
      "tapizado",
      "forrado",
      "control_calidad",
      "embalaje",
      "espera_almacen",
      "despacho_almacen",
      "en_camino",
      "llegando_destino",
      "entregado_cliente",
    ],
  },
  {
    nombre: "Mueble de madera",
    descripcion:
      "Para repisas, mesas de noche y muebles auxiliares: madera, barniz y montaje en casa.",
    categoriaSugerida: "Muebles Auxiliares",
    esPredeterminada: false,
    pasos: [
      "diseno_medidas",
      "corte_madera",
      "armado_estructura",
      "lijado",
      "bases_patas",
      "pintura_barniz",
      "control_calidad",
      "embalaje",
      "espera_almacen",
      "despacho_almacen",
      "en_camino",
      "entregado_cliente",
      "instalacion_casa",
    ],
  },
  {
    nombre: "Comedor con sillas",
    descripcion:
      "Mesa y sillas: la madera y el tapizado de los asientos van juntos, y se entrega en tienda o en casa.",
    categoriaSugerida: "Comedores",
    esPredeterminada: false,
    pasos: [
      "diseno_medidas",
      "corte_madera",
      "armado_estructura",
      "lijado",
      "bases_patas",
      "espuma_relleno",
      "costura_fundas",
      "forrado",
      "pintura_barniz",
      "control_calidad",
      "embalaje",
      "espera_almacen",
      "despacho_almacen",
      "en_camino",
      "recibido_tienda",
      "entregado_cliente",
    ],
  },
];

/** Expande las claves de una plantilla a sus pasos completos, en orden. */
export function pasosDePlantilla(plantilla: PlantillaRuta): PasoSugerido[] {
  return plantilla.pasos
    .map((clave) => pasoSugerido(clave))
    .filter((paso): paso is PasoSugerido => Boolean(paso));
}

/* ────────────────────────────────────────────────────────────────────────────
 * ICONOS
 * ──────────────────────────────────────────────────────────────────────────── */

/** Icono neutro cuando la clave guardada ya no existe. Siempre válido. */
const ICONO_PASO_POR_DEFECTO: LucideIcon = ClipboardList;
const ICONO_ROL_POR_DEFECTO: LucideIcon = User;

/** Nombres de icono que se pueden guardar en `CatalogoPaso.icono`. */
const ICONOS_PASO_BASE: Record<string, LucideIcon> = {
  regla: Ruler,
  sierra: Axe,
  martillo: Hammer,
  lija: Sparkles,
  tornillo: Wrench,
  destornillador: Drill,
  espuma: Layers,
  tijeras: Scissors,
  sillon: Armchair,
  sofa: Sofa,
  pintura: PaintRoller,
  brocha: Paintbrush,
  spray: SprayCan,
  paleta: Palette,
  calidad: ClipboardCheck,
  lista: ClipboardList,
  caja: Package,
  cajas: Boxes,
  despacho: PackageCheck,
  almacen: Warehouse,
  camion: Truck,
  mapa: MapPin,
  tienda: Store,
  casa: Home,
  taller: Factory,
  reloj: Clock,
  escaner: ScanLine,
  foto: Camera,
  firma: PenTool,
  etiqueta: Tag,
  impresora: Printer,
  ruta: Route,
};

/**
 * Mapa clave → icono para los pasos. Incluye los nombres de icono de arriba y,
 * como alias, la clave de cada paso sembrado: así funcionan igual
 * `iconoDePaso(paso.icono)` y `iconoDePaso(paso.clave)`.
 */
export const ICONOS_PASO: Record<string, LucideIcon> = {
  ...ICONOS_PASO_BASE,
  ...Object.fromEntries(
    PASOS_SUGERIDOS.map((paso) => [
      paso.clave,
      ICONOS_PASO_BASE[paso.icono] ?? ICONO_PASO_POR_DEFECTO,
    ])
  ),
};

/** Mapa clave → icono para los roles. Acepta la clave del rol o su `icono`. */
export const ICONOS_ROL: Record<string, LucideIcon> = {
  escudo: ShieldCheck,
  supervisor: UserCog,
  martillo: Hammer,
  sillon: Armchair,
  pintura: PaintRoller,
  almacen: Warehouse,
  camion: Truck,
  tienda: Store,
  equipo: Users,
  llave: KeyRound,
  usuario: User,
  user: User,
  admin: ShieldCheck,
  carpintero: Hammer,
  tapicero: Armchair,
  pintor: PaintRoller,
  delivery: Truck,
};

/** Icono de un paso. Nunca devuelve `undefined`. */
export function iconoDePaso(clave: string | null | undefined): LucideIcon {
  if (!clave) return ICONO_PASO_POR_DEFECTO;
  return ICONOS_PASO[clave] ?? ICONO_PASO_POR_DEFECTO;
}

/** Icono de un rol. Nunca devuelve `undefined`. */
export function iconoDeRol(clave: string | null | undefined): LucideIcon {
  if (!clave) return ICONO_ROL_POR_DEFECTO;
  return ICONOS_ROL[clave] ?? ICONO_ROL_POR_DEFECTO;
}

/* ────────────────────────────────────────────────────────────────────────────
 * SEMÁFORO DE ESTADOS
 * gris = bloqueado · azul = listo · ámbar = en curso · verde = terminado ·
 * rojo = problema. El mismo código de color en toda la aplicación.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface MetaEstado {
  label: string;
  /** Una frase que explica el estado a quien no sabe de software. */
  descripcion: string;
  /** Clases del chip (Tailwind). */
  clases: string;
  /** Color del punto, en CSS: sirve también para gráficas. */
  punto: string;
  icono: LucideIcon;
}

export const META_ESTADO_UNIDAD: Record<EstadoUnidad, MetaEstado> = {
  PENDIENTE: {
    label: "Sin empezar",
    descripcion: "El mueble está en la lista, pero todavía nadie ha empezado a trabajarlo.",
    clases: "bg-slate-100 text-slate-700 border border-slate-300",
    punto: "#94A3B8",
    icono: Clock,
  },
  EN_PROCESO: {
    label: "En fabricación",
    descripcion: "Alguien está trabajando en este mueble ahora mismo.",
    clases: "bg-amber-100 text-amber-900 border border-amber-300",
    punto: "#F59E0B",
    icono: Hammer,
  },
  PAUSADA: {
    label: "En pausa",
    descripcion: "El trabajo está detenido a propósito. Se puede reanudar cuando se quiera.",
    // Gris, nunca azul: en el semáforo del §9 el azul significa "se puede
    // empezar". Un mueble parado no se distinguiría de uno listo para arrancar.
    clases: "bg-stone-200 text-stone-700 border border-stone-400",
    punto: "#78716C",
    icono: CirclePause,
  },
  INCIDENCIA: {
    label: "Con problema",
    descripcion: "Hay un problema sin resolver. El mueble no avanza hasta que se arregle.",
    clases: "bg-red-100 text-red-800 border border-red-300",
    punto: "#DC2626",
    icono: AlertTriangle,
  },
  TERMINADA: {
    label: "Terminado",
    descripcion: "El mueble está listo. Falta llevarlo al cliente.",
    clases: "bg-green-100 text-green-800 border border-green-300",
    punto: "#16A34A",
    icono: CircleCheck,
  },
  ENTREGADA: {
    label: "Entregado",
    descripcion: "El mueble ya está en casa del cliente y él lo recibió.",
    clases: "bg-teal-100 text-teal-800 border border-teal-300",
    punto: "#0D9488",
    icono: PackageCheck,
  },
  CANCELADA: {
    label: "Cancelado",
    descripcion: "Este mueble ya no se va a fabricar. Su historial se conserva.",
    clases: "bg-slate-200 text-slate-600 border border-slate-400",
    punto: "#64748B",
    icono: Ban,
  },
};

export const META_ESTADO_PASO: Record<EstadoPaso, MetaEstado> = {
  BLOQUEADO: {
    label: "Todavía no",
    descripcion: "Primero hay que terminar el paso anterior.",
    clases: "bg-slate-100 text-slate-700 border border-slate-300",
    punto: "#94A3B8",
    icono: Lock,
  },
  LISTO: {
    label: "Se puede empezar",
    descripcion: "Este paso está libre. Puedes empezarlo cuando quieras.",
    clases: "bg-sky-100 text-sky-800 border border-sky-300",
    punto: "#0284C7",
    icono: CirclePlay,
  },
  EN_CURSO: {
    label: "Trabajando",
    descripcion: "Alguien lo está haciendo en este momento.",
    clases: "bg-amber-100 text-amber-900 border border-amber-300",
    punto: "#F59E0B",
    icono: Hammer,
  },
  COMPLETADO: {
    label: "Terminado",
    descripcion: "Este paso ya está hecho.",
    clases: "bg-green-100 text-green-800 border border-green-300",
    punto: "#16A34A",
    icono: CircleCheck,
  },
  OMITIDO: {
    label: "Saltado",
    descripcion: "Este paso no hizo falta y se saltó a propósito.",
    clases: "bg-slate-200 text-slate-600 border border-slate-400",
    punto: "#64748B",
    icono: CircleSlash,
  },
  INCIDENCIA: {
    label: "Con problema",
    descripcion: "Hay un problema en este paso. Avisa a tu supervisor.",
    clases: "bg-red-100 text-red-800 border border-red-300",
    punto: "#DC2626",
    icono: AlertTriangle,
  },
};

/* ────────────────────────────────────────────────────────────────────────────
 * ETIQUETAS EN ESPAÑOL
 * ──────────────────────────────────────────────────────────────────────────── */

export interface MetaEtiqueta {
  label: string;
  icono: LucideIcon;
  /** Color en CSS, para puntos y gráficas. */
  color: string;
  /** Clases del chip (Tailwind). */
  clases: string;
}

export const ETIQUETAS_PRIORIDAD: Record<Prioridad, MetaEtiqueta> = {
  NORMAL: {
    label: "Normal",
    icono: CircleDot,
    color: "#6E5748",
    clases: "bg-slate-100 text-slate-700 border border-slate-300",
  },
  ALTA: {
    label: "Corre prisa",
    icono: AlertTriangle,
    color: "#E8511A",
    clases: "bg-orange-100 text-orange-800 border border-orange-300",
  },
  URGENTE: {
    label: "Urgente",
    icono: AlertOctagon,
    color: "#DC2626",
    clases: "bg-red-100 text-red-800 border border-red-300",
  },
};

export const ETIQUETAS_TIPO_ESTACION: Record<TipoEstacion, MetaEtiqueta> = {
  TALLER: {
    label: "Taller",
    icono: Factory,
    color: "#E8511A",
    clases: "bg-orange-100 text-orange-800 border border-orange-300",
  },
  ALMACEN: {
    label: "Almacén",
    icono: Warehouse,
    color: "#6E5748",
    clases: "bg-stone-100 text-stone-700 border border-stone-300",
  },
  TRANSPORTE: {
    label: "Transporte",
    icono: Truck,
    color: "#C63F0C",
    clases: "bg-amber-100 text-amber-900 border border-amber-300",
  },
  TIENDA: {
    label: "Tienda",
    icono: Store,
    color: "#46291B",
    clases: "bg-teal-100 text-teal-800 border border-teal-300",
  },
};

export const ETIQUETAS_TIPO_PASO: Record<TipoPaso, MetaEtiqueta> = {
  TRABAJO: {
    label: "Trabajo en el mueble",
    icono: Hammer,
    color: "#E8511A",
    clases: "bg-orange-100 text-orange-800 border border-orange-300",
  },
  CONTROL: {
    label: "Revisión",
    icono: ClipboardCheck,
    color: "#46291B",
    clases: "bg-indigo-100 text-indigo-800 border border-indigo-300",
  },
  TRANSPORTE: {
    label: "Traslado",
    icono: Truck,
    color: "#C63F0C",
    clases: "bg-amber-100 text-amber-900 border border-amber-300",
  },
  ESPERA: {
    label: "Espera",
    icono: Clock,
    color: "#6E5748",
    clases: "bg-slate-100 text-slate-700 border border-slate-300",
  },
  ENTREGA: {
    label: "Entrega al cliente",
    icono: Home,
    color: "#0D9488",
    clases: "bg-teal-100 text-teal-800 border border-teal-300",
  },
};

export const ETIQUETAS_ESTADO_PEDIDO: Record<EstadoPedido, MetaEtiqueta> = {
  ABIERTO: {
    label: "Abierto",
    icono: CircleDot,
    color: "#0284C7",
    clases: "bg-sky-100 text-sky-800 border border-sky-300",
  },
  EN_PROCESO: {
    label: "En fabricación",
    icono: Hammer,
    color: "#F59E0B",
    clases: "bg-amber-100 text-amber-900 border border-amber-300",
  },
  COMPLETADO: {
    label: "Muebles terminados",
    icono: CircleCheck,
    color: "#16A34A",
    clases: "bg-green-100 text-green-800 border border-green-300",
  },
  ENTREGADO: {
    label: "Entregado",
    icono: Home,
    color: "#0D9488",
    clases: "bg-teal-100 text-teal-800 border border-teal-300",
  },
  CANCELADO: {
    label: "Cancelado",
    icono: Ban,
    color: "#64748B",
    clases: "bg-slate-200 text-slate-600 border border-slate-400",
  },
};

export const ETIQUETAS_CANAL: Record<Canal, MetaEtiqueta> = {
  WHATSAPP: {
    label: "WhatsApp",
    icono: Phone,
    color: "#16A34A",
    clases: "bg-green-100 text-green-800 border border-green-300",
  },
  TIENDA: {
    label: "En la tienda",
    icono: Store,
    color: "#E8511A",
    clases: "bg-orange-100 text-orange-800 border border-orange-300",
  },
  WEB: {
    label: "Página web",
    icono: Globe,
    color: "#0284C7",
    clases: "bg-sky-100 text-sky-800 border border-sky-300",
  },
  OTRO: {
    label: "Otro",
    icono: CircleDot,
    color: "#6E5748",
    clases: "bg-slate-100 text-slate-700 border border-slate-300",
  },
};

export const ETIQUETAS_SEVERIDAD: Record<Severidad, MetaEtiqueta> = {
  BAJA: {
    label: "Poca cosa",
    icono: Info,
    color: "#0284C7",
    clases: "bg-sky-100 text-sky-800 border border-sky-300",
  },
  MEDIA: {
    label: "Importante",
    icono: AlertTriangle,
    color: "#F59E0B",
    clases: "bg-amber-100 text-amber-900 border border-amber-300",
  },
  ALTA: {
    label: "Grave, para todo",
    icono: AlertOctagon,
    color: "#DC2626",
    clases: "bg-red-100 text-red-800 border border-red-300",
  },
};

export const ETIQUETAS_ESTADO_INCIDENCIA: Record<EstadoIncidencia, MetaEtiqueta> = {
  ABIERTA: {
    label: "Sin resolver",
    icono: AlertTriangle,
    color: "#DC2626",
    clases: "bg-red-100 text-red-800 border border-red-300",
  },
  RESUELTA: {
    label: "Resuelta",
    icono: CircleCheck,
    color: "#16A34A",
    clases: "bg-green-100 text-green-800 border border-green-300",
  },
};

export const ETIQUETAS_ENTIDAD_AUDITORIA: Record<EntidadAuditoria, MetaEtiqueta> = {
  ROL: {
    label: "Rol",
    icono: Shield,
    color: "#46291B",
    clases: "bg-stone-100 text-stone-700 border border-stone-300",
  },
  OPERARIO: {
    label: "Persona",
    icono: User,
    color: "#E8511A",
    clases: "bg-orange-100 text-orange-800 border border-orange-300",
  },
  ESTACION: {
    label: "Área de trabajo",
    icono: Factory,
    color: "#6E5748",
    clases: "bg-slate-100 text-slate-700 border border-slate-300",
  },
  CATALOGO_PASO: {
    label: "Paso del catálogo",
    icono: ListChecks,
    color: "#D98324",
    clases: "bg-amber-100 text-amber-900 border border-amber-300",
  },
  RUTA: {
    label: "Ruta de fabricación",
    icono: Route,
    color: "#C63F0C",
    clases: "bg-orange-100 text-orange-800 border border-orange-300",
  },
  PEDIDO: {
    label: "Pedido",
    icono: ClipboardList,
    color: "#0284C7",
    clases: "bg-sky-100 text-sky-800 border border-sky-300",
  },
  UNIDAD: {
    label: "Mueble",
    icono: Sofa,
    color: "#A9714B",
    clases: "bg-stone-100 text-stone-700 border border-stone-300",
  },
  INCIDENCIA: {
    label: "Problema",
    icono: AlertTriangle,
    color: "#DC2626",
    clases: "bg-red-100 text-red-800 border border-red-300",
  },
  SESION: {
    label: "Entrada al sistema",
    icono: LogIn,
    color: "#0D9488",
    clases: "bg-teal-100 text-teal-800 border border-teal-300",
  },
};

export const ETIQUETAS_ACCION_AUDITORIA: Record<AccionAuditoria, MetaEtiqueta> = {
  CREAR: {
    label: "Creó",
    icono: CirclePlus,
    color: "#16A34A",
    clases: "bg-green-100 text-green-800 border border-green-300",
  },
  EDITAR: {
    label: "Editó",
    icono: Pencil,
    color: "#0284C7",
    clases: "bg-sky-100 text-sky-800 border border-sky-300",
  },
  ELIMINAR: {
    label: "Eliminó",
    icono: Trash2,
    color: "#DC2626",
    clases: "bg-red-100 text-red-800 border border-red-300",
  },
  RESTAURAR: {
    label: "Restauró",
    icono: RotateCcw,
    color: "#0D9488",
    clases: "bg-teal-100 text-teal-800 border border-teal-300",
  },
  ARCHIVAR: {
    label: "Archivó",
    icono: Archive,
    color: "#6E5748",
    clases: "bg-slate-100 text-slate-700 border border-slate-300",
  },
  ACTIVAR: {
    label: "Activó",
    icono: CircleCheck,
    color: "#16A34A",
    clases: "bg-green-100 text-green-800 border border-green-300",
  },
  DESACTIVAR: {
    label: "Desactivó",
    icono: CircleSlash,
    color: "#64748B",
    clases: "bg-slate-200 text-slate-600 border border-slate-400",
  },
  DUPLICAR: {
    label: "Duplicó",
    icono: Copy,
    color: "#D98324",
    clases: "bg-amber-100 text-amber-900 border border-amber-300",
  },
  RESET_PIN: {
    label: "Cambió el PIN",
    icono: KeyRound,
    color: "#E8511A",
    clases: "bg-orange-100 text-orange-800 border border-orange-300",
  },
  INICIO_SESION: {
    label: "Entró al sistema",
    icono: LogIn,
    color: "#0D9488",
    clases: "bg-teal-100 text-teal-800 border border-teal-300",
  },
  INTENTO_FALLIDO: {
    label: "Intento fallido de entrar",
    icono: ShieldAlert,
    color: "#DC2626",
    clases: "bg-red-100 text-red-800 border border-red-300",
  },
};

/* ────────────────────────────────────────────────────────────────────────────
 * SEGUIMIENTO PÚBLICO PARA CLIENTES
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Interruptor del seguimiento público (la página que ve el cliente).
 *
 * ESTE ES EL ÚNICO SITIO DE TODO EL MÓDULO QUE LEE
 * `NEXT_PUBLIC_FABRICA_SEGUIMIENTO_PUBLICO`. Nadie más debe tocar esa variable:
 * páginas, actions y componentes preguntan siempre por esta función, para que
 * encender o apagar la función sea un cambio en un solo punto.
 *
 * Está APAGADO salvo que la variable valga exactamente "true" (por decisión del
 * dueño: "solo interno por ahora, pero que la posibilidad de programarlo luego
 * esté"). Al estar apagado, la página pública hace `notFound()` y la capa de
 * datos devuelve `null` ANTES de leer un solo dato del cliente.
 */
export function seguimientoPublicoActivo(): boolean {
  return process.env.NEXT_PUBLIC_FABRICA_SEGUIMIENTO_PUBLICO === "true";
}
