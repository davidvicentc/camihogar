"use client";

/**
 * Una persona del equipo en la lista: avatar de color con su inicial, nombre,
 * código de empleado, rol con el color del rol, áreas, si está activa y cuándo
 * entró por última vez. Debajo, las acciones del §7 con texto además del icono.
 */

import * as React from "react";
import {
  Eye,
  EyeOff,
  Info,
  KeyRound,
  MapPin,
  Pencil,
  RotateCcw,
  Shuffle,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { OperarioDTO, RolDTO } from "@/lib/types/fabricacion";
import { iconoDeRol } from "@/lib/fabricacion/constantes";
import { cn } from "@/lib/utils";
import { Avatar, BotonFila, fechaConHora, textoSobre } from "./config-compartido";

export interface PropsTarjetaEquipo {
  operario: OperarioDTO;
  /** El rol completo, para pintar su color y su dibujo. */
  rol?: RolDTO;
  ocupado: boolean;
  /** `true` si es la cuenta de quien está mirando: no puede tocarse a sí misma. */
  esMiCuenta: boolean;
  onEditar: () => void;
  onCambiarRol: () => void;
  onCambiarPin: () => void;
  onCambiarActivo: () => void;
  onEliminar: () => void;
  onRestaurar: () => void;
}

export function TarjetaEquipo({
  operario,
  rol,
  ocupado,
  esMiCuenta,
  onEditar,
  onCambiarRol,
  onCambiarPin,
  onCambiarActivo,
  onEliminar,
  onRestaurar,
}: PropsTarjetaEquipo) {
  const IconoRol = iconoDeRol(rol?.icono || operario.rolClave);
  const colorRol = rol?.color ?? "#6E5748";

  return (
    <Card className={cn("p-6", (!operario.activo || operario.eliminado) && "opacity-75")}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <Avatar
            nombre={operario.nombre}
            color={operario.colorAvatar}
            className="h-16 w-16 text-2xl"
          />

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-2xl font-bold tracking-tight text-brand-dark">
                {operario.nombre}
              </h2>
              {esMiCuenta ? (
                <Badge variant="soft" className="text-sm">
                  Eres tú
                </Badge>
              ) : null}
              {operario.eliminado ? (
                <Badge variant="destructive" className="text-sm">
                  Eliminada
                </Badge>
              ) : operario.activo ? (
                <Badge variant="success" className="text-sm">
                  Activa
                </Badge>
              ) : (
                <Badge variant="muted" className="text-sm">
                  Desactivada
                </Badge>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-base font-bold"
                style={{ backgroundColor: colorRol, color: textoSobre(colorRol) }}
              >
                <IconoRol className="h-5 w-5" aria-hidden="true" />
                {operario.rolNombre}
              </span>
              {operario.codigoEmpleado !== "" ? (
                <span className="rounded-full bg-brand-sand px-3 py-1 font-mono text-base font-semibold text-brand-taupe">
                  {operario.codigoEmpleado}
                </span>
              ) : null}
            </div>

            {operario.estacionesNombres.length > 0 ? (
              <p className="mt-3 flex items-start gap-2 text-base text-brand-dark">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-taupe" aria-hidden="true" />
                Trabaja en: {operario.estacionesNombres.join(", ")}
              </p>
            ) : null}

            {operario.telefono !== "" ? (
              <p className="mt-1 text-base text-brand-taupe">
                Teléfono: {operario.telefono}
              </p>
            ) : null}

            <p className="mt-1 text-base text-brand-taupe">
              {operario.ultimoAccesoAt
                ? `Entró por última vez el ${fechaConHora(operario.ultimoAccesoAt)}`
                : "Todavía no ha entrado nunca a la app del taller"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          {operario.eliminado ? (
            <BotonFila icono={RotateCcw} onClick={onRestaurar} disabled={ocupado}>
              Restaurar
            </BotonFila>
          ) : (
            <>
              <BotonFila icono={Pencil} onClick={onEditar} disabled={ocupado}>
                Editar
              </BotonFila>
              <BotonFila icono={Shuffle} onClick={onCambiarRol} disabled={ocupado}>
                Cambiar rol
              </BotonFila>
              <BotonFila icono={KeyRound} onClick={onCambiarPin} disabled={ocupado}>
                Cambiar PIN
              </BotonFila>
              <BotonFila
                icono={operario.activo ? EyeOff : Eye}
                onClick={onCambiarActivo}
                disabled={ocupado || (esMiCuenta && operario.activo)}
                titulo={
                  esMiCuenta && operario.activo
                    ? "No puedes desactivar tu propia cuenta."
                    : undefined
                }
              >
                {operario.activo ? "Desactivar" : "Activar"}
              </BotonFila>
              <BotonFila
                icono={Trash2}
                tono="peligro"
                onClick={onEliminar}
                disabled={ocupado || esMiCuenta}
                titulo={esMiCuenta ? "No puedes eliminar tu propia cuenta." : undefined}
              >
                Eliminar
              </BotonFila>
            </>
          )}
        </div>
      </div>

      {/*
        El motivo del bloqueo se LEE en la pantalla. En una tablet no existe el
        `title` del ratón, y un botón apagado sin explicación se interpreta como
        que la aplicación está rota (§9: todo error dice qué hacer).
      */}
      {esMiCuenta && !operario.eliminado ? (
        <p className="mt-4 flex items-start gap-2 rounded-2xl bg-brand-sand/60 p-3 text-base text-brand-taupe">
          <Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <span>
            Esta es tu propia cuenta: no puedes desactivarla ni eliminarla, para que
            nunca te quedes fuera del sistema. Si hay que darla de baja, pídeselo a
            otra persona que pueda gestionar usuarios.
          </span>
        </p>
      ) : null}

      {operario.eliminado ? (
        <p className="mt-4 rounded-2xl bg-brand-sand/60 p-3 text-base text-brand-taupe">
          Esta persona ya no aparece en el equipo, pero todo lo que trabajó sigue anotado
          en la bitácora de cada mueble. Puedes recuperarla con «Restaurar».
        </p>
      ) : null}
    </Card>
  );
}
