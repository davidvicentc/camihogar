"use client";

/**
 * El MISMO formulario para crear y para editar un área de trabajo (§7).
 *
 * El tipo se elige con cuatro botones grandes con su dibujo (Taller · Almacén ·
 * Transporte · Tienda), no con una lista desplegable, para que se vea de un
 * golpe qué es cada cosa. El orden en el listado no se escribe aquí: se cambia
 * con las flechas ▲▼ de la propia lista.
 */

import * as React from "react";
import { Check, MapPinned } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TIPOS_ESTACION,
  type EstacionDTO,
  type TipoEstacion,
} from "@/lib/types/fabricacion";
import { ETIQUETAS_TIPO_ESTACION } from "@/lib/fabricacion/constantes";
import {
  actualizarEstacion,
  crearEstacion,
  type EstacionInput,
} from "@/lib/actions/fabricacion";
import { cn } from "@/lib/utils";
import {
  Campo,
  InterruptorTexto,
  PieFormulario,
  avisoError,
  avisoExito,
} from "./config-compartido";

/** Para qué sirve cada tipo, en una frase que entienda cualquiera. */
const AYUDA_TIPO: Record<TipoEstacion, string> = {
  TALLER: "Donde se trabaja el mueble: carpintería, tapicería, pintura.",
  ALMACEN: "Donde el mueble espera guardado antes de salir.",
  TRANSPORTE: "Camiones y traslados entre un sitio y otro.",
  TIENDA: "El local donde se recibe o se entrega al cliente.",
};

export interface PropsFormularioEstacion {
  abierto: boolean;
  onCerrar: () => void;
  /** Si viene, se está editando. */
  inicial?: EstacionDTO | null;
  onGuardado: () => void;
}

export function FormularioEstacion({
  abierto,
  onCerrar,
  inicial,
  onGuardado,
}: PropsFormularioEstacion) {
  const editando = Boolean(inicial);

  const [nombre, setNombre] = React.useState("");
  const [tipo, setTipo] = React.useState<TipoEstacion>("TALLER");
  const [direccion, setDireccion] = React.useState("");
  const [telefono, setTelefono] = React.useState("");
  const [activa, setActiva] = React.useState(true);
  const [errorNombre, setErrorNombre] = React.useState("");
  const [guardando, setGuardando] = React.useState(false);

  React.useEffect(() => {
    if (!abierto) return;
    setNombre(inicial?.nombre ?? "");
    setTipo(inicial?.tipo ?? "TALLER");
    setDireccion(inicial?.direccion ?? "");
    setTelefono(inicial?.telefono ?? "");
    setActiva(inicial ? inicial.activa : true);
    setErrorNombre("");
    setGuardando(false);
  }, [abierto, inicial]);

  async function alEnviar(evento: React.FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();

    const nombreLimpio = nombre.trim();
    if (nombreLimpio.length < 2) {
      setErrorNombre("Ponle un nombre al área. Por ejemplo: Taller de carpintería.");
      return;
    }
    setErrorNombre("");

    const datos: EstacionInput = {
      nombre: nombreLimpio,
      tipo,
      direccion: direccion.trim(),
      telefono: telefono.trim(),
      activa,
    };

    setGuardando(true);
    const resultado =
      editando && inicial
        ? await actualizarEstacion(inicial._id, datos)
        : await crearEstacion(datos);
    setGuardando(false);

    if (!resultado.ok) {
      avisoError(resultado.error ?? "No pudimos guardar el área. Vuelve a intentarlo.");
      return;
    }

    avisoExito(
      editando
        ? `Se guardaron los cambios del área «${nombreLimpio}».`
        : `Se creó el área «${nombreLimpio}».`
    );
    onGuardado();
    onCerrar();
  }

  return (
    <Dialog open={abierto} onOpenChange={(valor) => (valor ? undefined : onCerrar())}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-8 font-display text-2xl font-bold">
            {editando ? `Editar el área «${inicial?.nombre}»` : "Crear un área de trabajo"}
          </DialogTitle>
          <DialogDescription className="text-base">
            Las áreas son los sitios por los que pasa un mueble: talleres, almacenes,
            camiones y tiendas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={alEnviar} className="space-y-7">
          <Campo
            htmlFor="area-nombre"
            etiqueta="Nombre del área"
            ayuda="Como la llama la gente del taller. Por ejemplo: Taller de tapicería."
            error={errorNombre}
            obligatorio
          >
            <Input
              id="area-nombre"
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
              placeholder="Taller de carpintería"
              autoComplete="off"
              className="h-14 text-lg"
            />
          </Campo>

          <fieldset className="space-y-2">
            <legend className="text-lg font-bold text-brand-dark">
              ¿Qué tipo de área es?
              <span className="ml-1 text-brand-accent" aria-hidden="true">
                *
              </span>
            </legend>
            <div className="grid gap-3 pt-1 sm:grid-cols-2">
              {TIPOS_ESTACION.map((valor) => {
                const meta = ETIQUETAS_TIPO_ESTACION[valor];
                const Icono = meta.icono;
                const elegido = valor === tipo;
                return (
                  <button
                    key={valor}
                    type="button"
                    role="radio"
                    aria-checked={elegido}
                    onClick={() => setTipo(valor)}
                    className={cn(
                      "flex min-h-[80px] items-start gap-3 rounded-2xl border-2 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2",
                      elegido
                        ? "border-brand-accent bg-brand-accent/[0.08]"
                        : "border-brand-dark/12 bg-brand-card hover:border-brand-accent/40"
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${meta.color}1A`, color: meta.color }}
                    >
                      <Icono className="h-6 w-6" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg font-bold text-brand-dark">
                        {meta.label}
                      </span>
                      <span className="mt-0.5 block text-base leading-snug text-brand-taupe">
                        {AYUDA_TIPO[valor]}
                      </span>
                    </span>
                    {elegido ? (
                      <Check
                        className="mt-1 h-6 w-6 shrink-0 text-brand-accent"
                        aria-hidden="true"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <Campo
            htmlFor="area-direccion"
            etiqueta="Dirección"
            ayuda="Opcional. Sirve para saber dónde queda y para las entregas."
          >
            <Input
              id="area-direccion"
              value={direccion}
              onChange={(evento) => setDireccion(evento.target.value)}
              placeholder="Av. Principal, galpón 4"
              autoComplete="off"
              className="h-14 text-lg"
            />
          </Campo>

          <Campo
            htmlFor="area-telefono"
            etiqueta="Teléfono"
            ayuda="Opcional. El número al que llamar si hay que preguntar algo del área."
          >
            <Input
              id="area-telefono"
              type="tel"
              value={telefono}
              onChange={(evento) => setTelefono(evento.target.value)}
              placeholder="0414 000 0000"
              autoComplete="off"
              className="h-14 text-lg"
            />
          </Campo>

          <InterruptorTexto
            id="area-activa"
            activo={activa}
            onChange={setActiva}
            etiqueta="El área está en uso"
            ayuda={
              activa
                ? "Aparece para elegirla en los pasos y en las personas."
                : "Queda apagada: no se puede elegir en sitios nuevos."
            }
          />

          <PieFormulario
            onCancelar={onCerrar}
            guardando={guardando}
            icono={MapPinned}
            textoGuardar={editando ? "GUARDAR CAMBIOS" : "CREAR EL ÁREA"}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
