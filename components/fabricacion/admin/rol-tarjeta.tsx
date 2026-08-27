"use client";

/**
 * Una tarjeta de la lista de roles: color e icono del rol, nombre, para qué
 * sirve, cuántas personas lo tienen, un resumen legible de sus permisos y las
 * cuatro acciones del patrón CRUD (Editar · Duplicar · Activar/Desactivar ·
 * Eliminar), siempre con texto además del icono.
 */

import * as React from "react";
import { Copy, Eye, EyeOff, Pencil, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  CAPACIDADES,
  META_CAPACIDADES,
  type Capacidad,
  type RolDTO,
} from "@/lib/types/fabricacion";
import { iconoDeRol } from "@/lib/fabricacion/constantes";
import { cn } from "@/lib/utils";
import { BotonFila, textoSobre } from "./config-compartido";

/** Frases cortas para el resumen de la tarjeta. Cero jerga. */
const RESUMEN_CAPACIDAD: Record<Capacidad, string> = {
  trabajar: "trabajar en los muebles",
  escanear: "escanear con la cámara",
  reportar_incidencias: "avisar de problemas",
  resolver_incidencias: "resolver problemas",
  ver_tablero: "ver el tablero",
  gestionar_pedidos: "crear y editar pedidos",
  eliminar_pedidos: "eliminar pedidos",
  gestionar_unidades: "repartir el trabajo",
  revertir_pasos: "deshacer pasos terminados",
  cancelar_unidades: "cancelar muebles",
  gestionar_rutas: "editar las rutas",
  gestionar_catalogo: "editar los pasos",
  gestionar_estaciones: "editar las áreas",
  gestionar_usuarios: "crear y eliminar personas",
  gestionar_roles: "cambiar los permisos",
  ver_auditoria: "ver el historial",
  ver_precios: "ver los precios",
  imprimir_etiquetas: "imprimir etiquetas",
};

/**
 * Redacta en una frase lo que puede hacer el rol: "Puede trabajar en los
 * muebles, escanear con la cámara y avisar de problemas."
 */
export function resumirCapacidades(rol: RolDTO): string {
  if (rol.clave === "admin") return "Puede hacer todo en el sistema.";
  if (rol.capacidades.length === 0) {
    return "Todavía no puede hacer nada. Edítalo y marca al menos un permiso.";
  }
  if (rol.capacidades.length === CAPACIDADES.length) {
    return "Puede hacer todo en el sistema.";
  }

  const frases = rol.capacidades.map((cap) => RESUMEN_CAPACIDAD[cap]).filter(Boolean);
  const visibles = frases.slice(0, 4);
  const restantes = frases.length - visibles.length;

  let listado: string;
  if (visibles.length === 1) listado = visibles[0];
  else listado = `${visibles.slice(0, -1).join(", ")} y ${visibles[visibles.length - 1]}`;

  return restantes > 0
    ? `Puede ${listado}, y ${restantes} ${restantes === 1 ? "cosa más" : "cosas más"}.`
    : `Puede ${listado}.`;
}

export interface PropsTarjetaRol {
  rol: RolDTO;
  ocupado: boolean;
  onEditar: () => void;
  onDuplicar: () => void;
  onCambiarActivo: () => void;
  onEliminar: () => void;
}

export function TarjetaRol({
  rol,
  ocupado,
  onEditar,
  onDuplicar,
  onCambiarActivo,
  onEliminar,
}: PropsTarjetaRol) {
  const Icono = iconoDeRol(rol.icono || rol.clave);
  const personas = rol.cantidadPersonas ?? 0;
  const protegido = rol.esSistema || rol.clave === "admin";
  const peligrosas = rol.capacidades.filter((cap) => META_CAPACIDADES[cap]?.peligrosa);

  return (
    <Card className={cn("p-6", !rol.activo && "opacity-70")}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span
            aria-hidden="true"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: rol.color, color: textoSobre(rol.color) }}
          >
            <Icono className="h-8 w-8" />
          </span>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-2xl font-bold tracking-tight text-brand-dark">
                {rol.nombre}
              </h2>
              {protegido ? (
                <Badge variant="muted" className="text-sm">
                  Del sistema
                </Badge>
              ) : null}
              {!rol.activo ? (
                <Badge variant="destructive" className="text-sm">
                  Desactivado
                </Badge>
              ) : null}
            </div>

            <p className="mt-1 text-lg leading-snug text-brand-taupe">
              {rol.descripcion.trim() === ""
                ? "Sin descripción. Edítalo para explicar qué hace."
                : rol.descripcion}
            </p>

            <p className="mt-3 flex items-center gap-2 text-lg font-semibold text-brand-dark">
              <Users className="h-5 w-5 text-brand-taupe" aria-hidden="true" />
              {personas === 0
                ? "Nadie tiene este rol todavía"
                : `${personas} ${personas === 1 ? "persona lo tiene" : "personas lo tienen"}`}
            </p>

            <p className="mt-2 text-base leading-snug text-brand-dark">
              {resumirCapacidades(rol)}
            </p>

            {peligrosas.length > 0 && rol.clave !== "admin" ? (
              <p className="mt-2 text-base font-semibold text-amber-800">
                Incluye {peligrosas.length}{" "}
                {peligrosas.length === 1 ? "permiso fuerte" : "permisos fuertes"}.
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <BotonFila icono={Pencil} onClick={onEditar} disabled={ocupado}>
            Editar
          </BotonFila>
          <BotonFila icono={Copy} onClick={onDuplicar} disabled={ocupado}>
            Duplicar
          </BotonFila>
          <BotonFila
            icono={rol.activo ? EyeOff : Eye}
            onClick={onCambiarActivo}
            disabled={ocupado || protegido}
            titulo={
              protegido
                ? "Es el rol de administrador. No se puede desactivar para que nunca te quedes fuera del sistema."
                : undefined
            }
          >
            {rol.activo ? "Desactivar" : "Activar"}
          </BotonFila>
          <BotonFila
            icono={Trash2}
            tono="peligro"
            onClick={onEliminar}
            disabled={ocupado || protegido}
            titulo={
              protegido
                ? "Es el rol de administrador. No se puede eliminar para que nunca te quedes fuera del sistema."
                : undefined
            }
          >
            Eliminar
          </BotonFila>
        </div>
      </div>

      {protegido ? (
        <p className="mt-4 rounded-2xl bg-brand-sand/60 p-3 text-base text-brand-taupe">
          Es el rol de administrador. No se puede eliminar ni desactivar para que nunca te
          quedes fuera del sistema, y siempre tiene todos los permisos.
        </p>
      ) : null}
    </Card>
  );
}
