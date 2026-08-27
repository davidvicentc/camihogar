"use client";

/**
 * El MISMO formulario para dar de alta a alguien y para editarlo (§7).
 *
 * El rol no se elige en una lista pequeña: se elige en filas grandes que
 * enseñan el color, el dibujo y —lo importante— QUÉ PODRÁ HACER esa persona
 * si le das ese rol. El PIN sólo aparece al crear, con teclado gigante y
 * confirmación; para cambiárselo a alguien que ya existe está «Cambiar PIN».
 */

import * as React from "react";
import { Check, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EstacionDTO, OperarioDTO, RolDTO } from "@/lib/types/fabricacion";
import {
  COLORES_PASO,
  ETIQUETAS_TIPO_ESTACION,
  iconoDeRol,
} from "@/lib/fabricacion/constantes";
import {
  actualizarOperario,
  crearOperario,
  type OperarioInput,
} from "@/lib/actions/fabricacion";
import { cn } from "@/lib/utils";
import {
  Avatar,
  AvisoInfo,
  Campo,
  PieFormulario,
  avisoError,
  avisoExito,
  textoSobre,
} from "./config-compartido";
import { resumirCapacidades } from "./rol-tarjeta";
import { EditorPin, revisarPin } from "./equipo-pin";

/** Lo que hay que enseñar en la tarjeta imprimible después de crear a alguien. */
export interface EntregaPin {
  nombre: string;
  rolNombre: string;
  codigoEmpleado: string;
  colorAvatar: string;
  pin: string;
}

export interface PropsFormularioEquipo {
  abierto: boolean;
  onCerrar: () => void;
  /** Si viene, se está editando. */
  inicial?: OperarioDTO | null;
  roles: RolDTO[];
  estaciones: EstacionDTO[];
  /** Se llama al guardar bien. Con `entrega` cuando hay una tarjeta que imprimir. */
  onGuardado: (entrega?: EntregaPin) => void;
}

export function FormularioEquipo({
  abierto,
  onCerrar,
  inicial,
  roles,
  estaciones,
  onGuardado,
}: PropsFormularioEquipo) {
  const editando = Boolean(inicial);

  const [nombre, setNombre] = React.useState("");
  const [codigoEmpleado, setCodigoEmpleado] = React.useState("");
  const [rolClave, setRolClave] = React.useState("");
  const [estacionesIds, setEstacionesIds] = React.useState<string[]>([]);
  const [telefono, setTelefono] = React.useState("");
  const [colorAvatar, setColorAvatar] = React.useState(COLORES_PASO[0].valor);
  const [pin, setPin] = React.useState("");
  const [confirmacion, setConfirmacion] = React.useState("");

  const [errorNombre, setErrorNombre] = React.useState("");
  const [errorRol, setErrorRol] = React.useState("");
  const [errorPin, setErrorPin] = React.useState("");
  const [guardando, setGuardando] = React.useState(false);

  const rolesElegibles = React.useMemo(
    () => roles.filter((rol) => rol.activo || rol.clave === inicial?.rolClave),
    [roles, inicial]
  );

  const estacionesElegibles = React.useMemo(
    () =>
      estaciones.filter(
        (estacion) =>
          (estacion.activa && !estacion.eliminada) ||
          (inicial?.estacionesIds ?? []).includes(estacion._id)
      ),
    [estaciones, inicial]
  );

  React.useEffect(() => {
    if (!abierto) return;
    setNombre(inicial?.nombre ?? "");
    setCodigoEmpleado(inicial?.codigoEmpleado ?? "");
    setRolClave(inicial?.rolClave ?? "");
    setEstacionesIds(inicial ? [...inicial.estacionesIds] : []);
    setTelefono(inicial?.telefono ?? "");
    setColorAvatar(inicial?.colorAvatar || COLORES_PASO[0].valor);
    setPin("");
    setConfirmacion("");
    setErrorNombre("");
    setErrorRol("");
    setErrorPin("");
    setGuardando(false);
  }, [abierto, inicial]);

  function alternarEstacion(id: string): void {
    setEstacionesIds((previas) =>
      previas.includes(id) ? previas.filter((otro) => otro !== id) : [...previas, id]
    );
  }

  async function alEnviar(evento: React.FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();

    const nombreLimpio = nombre.trim();
    let hayFallo = false;

    if (nombreLimpio.length < 2) {
      setErrorNombre("Escribe el nombre y el apellido de la persona.");
      hayFallo = true;
    } else {
      setErrorNombre("");
    }

    if (rolClave === "") {
      setErrorRol("Elige el rol de esta persona: es lo que decide qué puede hacer.");
      hayFallo = true;
    } else {
      setErrorRol("");
    }

    if (!editando) {
      const problema = revisarPin(pin, confirmacion);
      setErrorPin(problema);
      if (problema !== "") hayFallo = true;
    }

    if (hayFallo) return;

    const datos: OperarioInput = {
      nombre: nombreLimpio,
      codigoEmpleado: codigoEmpleado.trim(),
      rolClave,
      estacionesIds,
      telefono: telefono.trim(),
      colorAvatar,
    };

    setGuardando(true);
    const resultado =
      editando && inicial
        ? await actualizarOperario(inicial._id, datos)
        : await crearOperario({ ...datos, pin });
    setGuardando(false);

    if (!resultado.ok) {
      // Los seguros anti-bloqueo del §7 llegan por aquí: se enseñan en el sitio,
      // pegados al formulario, no en un aviso que se esfuma.
      const mensaje = resultado.error ?? "No pudimos guardar. Vuelve a intentarlo.";
      setErrorRol(mensaje);
      avisoError(mensaje);
      return;
    }

    if (editando) {
      avisoExito(`Se guardaron los cambios de «${nombreLimpio}».`);
      onGuardado();
      onCerrar();
      return;
    }

    const rolElegido = roles.find((rol) => rol.clave === rolClave);
    avisoExito(`Se creó a «${nombreLimpio}». Ya puede entrar a la app del taller.`);
    onGuardado({
      nombre: nombreLimpio,
      rolNombre: rolElegido?.nombre ?? rolClave,
      codigoEmpleado: codigoEmpleado.trim().toUpperCase(),
      colorAvatar,
      pin,
    });
    onCerrar();
  }

  return (
    <Dialog open={abierto} onOpenChange={(valor) => (valor ? undefined : onCerrar())}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-8 font-display text-2xl font-bold">
            {editando ? `Editar a ${inicial?.nombre}` : "Añadir una persona al equipo"}
          </DialogTitle>
          <DialogDescription className="text-base">
            {editando
              ? "Cambia lo que necesites. El PIN no se toca aquí: para eso está el botón «Cambiar PIN»."
              : "Rellena los datos, elige el rol y ponle un PIN de 4 números para que pueda entrar."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={alEnviar} className="space-y-7">
          <Campo
            htmlFor="persona-nombre"
            etiqueta="Nombre y apellido"
            ayuda="Como lo conoce todo el mundo en el taller. Aparecerá en la bitácora de cada mueble."
            error={errorNombre}
            obligatorio
          >
            <Input
              id="persona-nombre"
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
              placeholder="María Rodríguez"
              autoComplete="off"
              className="h-14 text-lg"
            />
          </Campo>

          <div className="grid gap-6 sm:grid-cols-2">
            <Campo
              htmlFor="persona-codigo"
              etiqueta="Código de empleado"
              ayuda="Opcional. Si tu taller usa números de ficha, ponlo aquí."
            >
              <Input
                id="persona-codigo"
                value={codigoEmpleado}
                onChange={(evento) => setCodigoEmpleado(evento.target.value)}
                placeholder="EMP-014"
                autoComplete="off"
                className="h-14 text-lg uppercase"
              />
            </Campo>

            <Campo
              htmlFor="persona-telefono"
              etiqueta="Teléfono"
              ayuda="Opcional. Para llamarle si hace falta."
            >
              <Input
                id="persona-telefono"
                type="tel"
                value={telefono}
                onChange={(evento) => setTelefono(evento.target.value)}
                placeholder="0414 000 0000"
                autoComplete="off"
                className="h-14 text-lg"
              />
            </Campo>
          </div>

          {/* ── Rol ───────────────────────────────────────────────────── */}
          <fieldset className="space-y-2">
            <legend className="text-lg font-bold text-brand-dark">
              ¿Qué rol tiene?
              <span className="ml-1 text-brand-accent" aria-hidden="true">
                *
              </span>
            </legend>
            <p className="text-base text-brand-taupe">
              El rol decide qué puede hacer. Debajo de cada uno está escrito.
            </p>

            <div className="space-y-2 pt-1">
              {rolesElegibles.map((rol) => {
                const Icono = iconoDeRol(rol.icono || rol.clave);
                const elegido = rol.clave === rolClave;
                return (
                  <button
                    key={rol._id}
                    type="button"
                    role="radio"
                    aria-checked={elegido}
                    onClick={() => {
                      setRolClave(rol.clave);
                      setErrorRol("");
                    }}
                    className={cn(
                      "flex w-full min-h-[64px] items-start gap-4 rounded-2xl border-2 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2",
                      elegido
                        ? "border-brand-accent bg-brand-accent/[0.08]"
                        : "border-brand-dark/12 bg-brand-card hover:border-brand-accent/40"
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: rol.color, color: textoSobre(rol.color) }}
                    >
                      <Icono className="h-6 w-6" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg font-bold text-brand-dark">
                        {rol.nombre}
                        {!rol.activo ? (
                          <span className="ml-2 text-base font-semibold text-red-700">
                            (desactivado)
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-base leading-snug text-brand-taupe">
                        {resumirCapacidades(rol)}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2",
                        elegido
                          ? "border-brand-accent bg-brand-accent text-white"
                          : "border-brand-dark/25 bg-white"
                      )}
                    >
                      {elegido ? <Check className="h-4 w-4" strokeWidth={3} /> : null}
                    </span>
                  </button>
                );
              })}
            </div>

            {errorRol ? (
              <p
                role="alert"
                className="rounded-2xl border-2 border-red-300 bg-red-50 p-3 text-base font-semibold text-red-800"
              >
                {errorRol}
              </p>
            ) : null}
          </fieldset>

          {/* ── Áreas ─────────────────────────────────────────────────── */}
          <fieldset className="space-y-2">
            <legend className="text-lg font-bold text-brand-dark">
              ¿En qué áreas trabaja?
            </legend>
            <p className="text-base text-brand-taupe">
              Opcional, y puede ser en varias. Sirve para saber dónde encontrarle.
            </p>

            {estacionesElegibles.length === 0 ? (
              <AvisoInfo mensaje="Todavía no hay áreas de trabajo creadas. Puedes añadirlas después desde «Áreas»." />
            ) : (
              <div className="grid gap-2 pt-1 sm:grid-cols-2">
                {estacionesElegibles.map((estacion) => {
                  const meta = ETIQUETAS_TIPO_ESTACION[estacion.tipo];
                  const IconoArea = meta.icono;
                  const elegida = estacionesIds.includes(estacion._id);
                  return (
                    <button
                      key={estacion._id}
                      type="button"
                      role="checkbox"
                      aria-checked={elegida}
                      onClick={() => alternarEstacion(estacion._id)}
                      className={cn(
                        "flex min-h-[64px] items-center gap-3 rounded-2xl border-2 p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2",
                        elegida
                          ? "border-brand-accent bg-brand-accent/[0.08]"
                          : "border-brand-dark/12 bg-brand-card hover:border-brand-accent/40"
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2",
                          elegida
                            ? "border-brand-accent bg-brand-accent text-white"
                            : "border-brand-dark/25 bg-white"
                        )}
                      >
                        {elegida ? <Check className="h-5 w-5" strokeWidth={3} /> : null}
                      </span>
                      <IconoArea
                        className="h-6 w-6 shrink-0 text-brand-taupe"
                        aria-hidden="true"
                      />
                      <span className="min-w-0">
                        <span className="block text-base font-bold text-brand-dark">
                          {estacion.nombre}
                        </span>
                        <span className="block text-sm text-brand-taupe">{meta.label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </fieldset>

          {/* ── Color del avatar ──────────────────────────────────────── */}
          <fieldset className="space-y-2">
            <legend className="text-lg font-bold text-brand-dark">
              Color para reconocerla
            </legend>
            <p className="text-base text-brand-taupe">
              Es el color del círculo con sus iniciales en las listas y en el tablero.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Avatar
                nombre={nombre === "" ? "?" : nombre}
                color={colorAvatar}
                className="h-14 w-14"
              />
              {COLORES_PASO.map((opcion) => {
                const elegido = opcion.valor === colorAvatar;
                return (
                  <button
                    key={opcion.valor}
                    type="button"
                    onClick={() => setColorAvatar(opcion.valor)}
                    aria-label={`Color ${opcion.nombre}`}
                    aria-pressed={elegido}
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-2xl border-4 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2",
                      elegido
                        ? "scale-110 border-brand-dark"
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: opcion.valor }}
                  >
                    {elegido ? (
                      <Check
                        className="h-6 w-6"
                        style={{ color: textoSobre(opcion.valor) }}
                        aria-hidden="true"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* ── PIN (sólo al crear) ───────────────────────────────────── */}
          {editando ? (
            <AvisoInfo mensaje="Para cambiarle el PIN a esta persona, cierra esta ventana y usa el botón «Cambiar PIN» de su tarjeta." />
          ) : (
            <fieldset className="space-y-3 rounded-2xl border-2 border-brand-dark/10 p-4">
              <legend className="px-2 font-display text-xl font-bold text-brand-dark">
                PIN para entrar
              </legend>
              <EditorPin
                pin={pin}
                confirmacion={confirmacion}
                onCambiar={(nuevoPin, nuevaConfirmacion) => {
                  setPin(nuevoPin);
                  setConfirmacion(nuevaConfirmacion);
                  if (errorPin !== "") setErrorPin("");
                }}
                error={errorPin}
              />
            </fieldset>
          )}

          <PieFormulario
            onCancelar={onCerrar}
            guardando={guardando}
            icono={UserPlus}
            textoGuardar={editando ? "GUARDAR CAMBIOS" : "CREAR LA PERSONA"}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
