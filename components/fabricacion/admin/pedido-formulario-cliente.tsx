"use client";

/**
 * "¿Quién es el cliente?" — los datos del pedido.
 *
 * Es el MISMO formulario para registrar un pedido nuevo (paso 1 del asistente)
 * y para editarlo después (§7: crear y editar comparten formulario). Por eso
 * es controlado: recibe el valor y avisa de cada cambio, sin guardar nada por
 * su cuenta.
 *
 * Etiquetas grandes, una ayuda bajo cada campo y validación que dice qué
 * corregir, no qué falló.
 */

import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ETIQUETAS_CANAL,
  ETIQUETAS_PRIORIDAD,
} from "@/lib/fabricacion/constantes";
import { CANALES, PRIORIDADES, type Canal, type Prioridad } from "@/lib/types/fabricacion";
import { cn } from "@/lib/utils";

/** Todo lo que se guarda de un pedido aparte de sus muebles. */
export interface DatosPedido {
  nombre: string;
  telefono: string;
  cedula: string;
  direccion: string;
  ciudad: string;
  email: string;
  canal: Canal;
  prioridad: Prioridad;
  /** `yyyy-mm-dd` tal como lo devuelve un `<input type="date">`. */
  fechaPrometida: string;
  notas: string;
}

export const PEDIDO_VACIO: DatosPedido = {
  nombre: "",
  telefono: "",
  cedula: "",
  direccion: "",
  ciudad: "",
  email: "",
  canal: "WHATSAPP",
  prioridad: "NORMAL",
  fechaPrometida: "",
  notas: "",
};

/**
 * Devuelve el aviso que hay que enseñar, o `null` si está todo bien. Los
 * mensajes dicen qué escribir, no "campo obligatorio".
 */
export function validarPedido(datos: DatosPedido): string | null {
  if (datos.nombre.trim().length < 2) {
    return "Escribe el nombre del cliente. Con el nombre y el apellido basta.";
  }
  if (datos.telefono.replace(/\D/g, "").length < 7) {
    return "Escribe el teléfono del cliente, por ejemplo 0412-1234567. Sirve para avisarle por WhatsApp.";
  }
  if (datos.email.trim() !== "" && !datos.email.includes("@")) {
    return "Ese correo no parece completo. Revísalo o déjalo vacío.";
  }
  return null;
}

/* ────────────────────────────────────────────────────────────────────────────
 * PIEZAS DEL FORMULARIO
 * ──────────────────────────────────────────────────────────────────────────── */

export function Campo({
  id,
  etiqueta,
  ayuda,
  obligatorio,
  children,
  className,
}: {
  id: string;
  etiqueta: string;
  ayuda?: string;
  obligatorio?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="text-base font-semibold">
        {etiqueta}
        {obligatorio && (
          <span className="ml-1 font-normal text-brand-accent" aria-hidden="true">
            *
          </span>
        )}
        {obligatorio && <span className="sr-only"> (hace falta)</span>}
      </Label>
      {children}
      {ayuda && <p className="text-sm text-brand-taupe">{ayuda}</p>}
    </div>
  );
}

/**
 * Elegir entre pocas opciones con botones grandes en vez de un desplegable:
 * se ven todas de golpe y se aciertan con el dedo.
 */
export function SelectorGrande<T extends string>({
  etiqueta,
  ayuda,
  valor,
  opciones,
  alElegir,
}: {
  etiqueta: string;
  ayuda?: string;
  valor: T;
  opciones: { valor: T; texto: string; icono?: React.ComponentType<{ className?: string }> }[];
  alElegir: (nuevo: T) => void;
}) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-base font-semibold text-brand-dark">{etiqueta}</legend>
      <div className="flex flex-wrap gap-2 pt-1">
        {opciones.map((opcion) => {
          const elegido = valor === opcion.valor;
          const Icono = opcion.icono;
          return (
            <button
              key={opcion.valor}
              type="button"
              aria-pressed={elegido}
              onClick={() => alElegir(opcion.valor)}
              className={cn(
                "inline-flex min-h-[52px] items-center gap-2 rounded-2xl border-2 px-5 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent",
                elegido
                  ? "border-brand-accent bg-brand-accent/10 text-brand-accent"
                  : "border-brand-dark/15 bg-brand-card text-brand-dark hover:border-brand-accent/40"
              )}
            >
              {Icono && <Icono className="h-5 w-5 shrink-0" />}
              {opcion.texto}
            </button>
          );
        })}
      </div>
      {ayuda && <p className="text-sm text-brand-taupe">{ayuda}</p>}
    </fieldset>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * EL FORMULARIO
 * ──────────────────────────────────────────────────────────────────────────── */

export function FormularioPedido({
  valor,
  alCambiar,
}: {
  valor: DatosPedido;
  alCambiar: (nuevo: DatosPedido) => void;
}) {
  function cambiar<C extends keyof DatosPedido>(campo: C, nuevo: DatosPedido[C]) {
    alCambiar({ ...valor, [campo]: nuevo });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo
          id="cliente-nombre"
          etiqueta="Nombre del cliente"
          ayuda="Como quiere que le llamemos."
          obligatorio
        >
          <Input
            id="cliente-nombre"
            value={valor.nombre}
            onChange={(evento) => cambiar("nombre", evento.target.value)}
            placeholder="María Rodríguez"
            autoComplete="name"
            className="h-14 text-base"
          />
        </Campo>

        <Campo
          id="cliente-telefono"
          etiqueta="Teléfono"
          ayuda="Con este número se le escribe por WhatsApp."
          obligatorio
        >
          <Input
            id="cliente-telefono"
            value={valor.telefono}
            onChange={(evento) => cambiar("telefono", evento.target.value)}
            placeholder="0412-1234567"
            inputMode="tel"
            autoComplete="tel"
            className="h-14 text-base"
          />
        </Campo>

        <Campo id="cliente-cedula" etiqueta="Cédula" ayuda="Opcional. Para la factura.">
          <Input
            id="cliente-cedula"
            value={valor.cedula}
            onChange={(evento) => cambiar("cedula", evento.target.value)}
            placeholder="V-12345678"
            className="h-14 text-base"
          />
        </Campo>

        <Campo id="cliente-ciudad" etiqueta="Ciudad" ayuda="Dónde hay que entregar.">
          <Input
            id="cliente-ciudad"
            value={valor.ciudad}
            onChange={(evento) => cambiar("ciudad", evento.target.value)}
            placeholder="Valencia"
            className="h-14 text-base"
          />
        </Campo>

        <Campo
          id="cliente-direccion"
          etiqueta="Dirección"
          ayuda="Calle, edificio y punto de referencia."
          className="sm:col-span-2"
        >
          <Input
            id="cliente-direccion"
            value={valor.direccion}
            onChange={(evento) => cambiar("direccion", evento.target.value)}
            placeholder="Av. Bolívar, Res. El Parque, piso 3, apto 3-B"
            className="h-14 text-base"
          />
        </Campo>

        <Campo id="cliente-email" etiqueta="Correo" ayuda="Opcional.">
          <Input
            id="cliente-email"
            type="email"
            value={valor.email}
            onChange={(evento) => cambiar("email", evento.target.value)}
            placeholder="maria@correo.com"
            autoComplete="email"
            className="h-14 text-base"
          />
        </Campo>

        <Campo
          id="pedido-fecha"
          etiqueta="Fecha prometida"
          ayuda="El día que le dijiste al cliente. Se puede cambiar después."
        >
          <Input
            id="pedido-fecha"
            type="date"
            value={valor.fechaPrometida}
            onChange={(evento) => cambiar("fechaPrometida", evento.target.value)}
            className="h-14 text-base"
          />
        </Campo>
      </div>

      <SelectorGrande
        etiqueta="¿Por dónde llegó el pedido?"
        valor={valor.canal}
        alElegir={(nuevo) => cambiar("canal", nuevo)}
        opciones={CANALES.map((canal) => ({
          valor: canal,
          texto: ETIQUETAS_CANAL[canal].label,
          icono: ETIQUETAS_CANAL[canal].icono,
        }))}
      />

      <SelectorGrande
        etiqueta="¿Qué tan urgente es?"
        ayuda="Lo urgente se pone primero en el tablero del taller."
        valor={valor.prioridad}
        alElegir={(nuevo) => cambiar("prioridad", nuevo)}
        opciones={PRIORIDADES.map((prioridad) => ({
          valor: prioridad,
          texto: ETIQUETAS_PRIORIDAD[prioridad].label,
          icono: ETIQUETAS_PRIORIDAD[prioridad].icono,
        }))}
      />

      <Campo
        id="pedido-notas"
        etiqueta="Notas del pedido"
        ayuda="Lo que haya que recordar: un color especial, una entrega a una hora concreta…"
      >
        <Textarea
          id="pedido-notas"
          value={valor.notas}
          onChange={(evento) => cambiar("notas", evento.target.value)}
          placeholder="Entregar después de las 3 de la tarde."
          className="min-h-[110px] text-base"
        />
      </Campo>
    </div>
  );
}
