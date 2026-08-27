"use client";

/**
 * El MISMO formulario para crear y para editar un rol (§7 del contrato).
 *
 * La pieza central son las capacidades: casillas gigantes de `h-16` agrupadas
 * por `GRUPOS_CAPACIDADES`, cada una con la frase llana de `META_CAPACIDADES`
 * y su ayuda debajo. Las marcadas como `peligrosa` llevan aviso ámbar. Abajo,
 * una vista previa en vivo redacta en frases qué podrá hacer quien tenga el rol.
 */

import * as React from "react";
import {
  BadgeCheck,
  Check,
  CheckCheck,
  Eraser,
  Save,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CAPACIDADES,
  GRUPOS_CAPACIDADES,
  META_CAPACIDADES,
  type Capacidad,
  type GrupoCapacidad,
  type RolDTO,
} from "@/lib/types/fabricacion";
import { COLORES_PASO, iconoDeRol } from "@/lib/fabricacion/constantes";
import { actualizarRol, crearRol, type RolInput } from "@/lib/actions/fabricacion";
import { cn } from "@/lib/utils";
import {
  AvisoCuidado,
  AvisoInfo,
  Campo,
  PieFormulario,
  avisoError,
  avisoExito,
  textoSobre,
} from "./config-compartido";

/** Los iconos que se ofrecen, con nombre en español para que se entiendan. */
const ICONOS_DISPONIBLES: { clave: string; etiqueta: string }[] = [
  { clave: "escudo", etiqueta: "Escudo (administración)" },
  { clave: "supervisor", etiqueta: "Supervisor" },
  { clave: "martillo", etiqueta: "Martillo (carpintería)" },
  { clave: "sillon", etiqueta: "Sillón (tapicería)" },
  { clave: "pintura", etiqueta: "Rodillo (pintura)" },
  { clave: "almacen", etiqueta: "Almacén" },
  { clave: "camion", etiqueta: "Camión (entregas)" },
  { clave: "tienda", etiqueta: "Tienda" },
  { clave: "equipo", etiqueta: "Equipo" },
  { clave: "llave", etiqueta: "Llave (permisos)" },
  { clave: "usuario", etiqueta: "Persona" },
];

/** Capacidades de cada grupo, en el orden del catálogo. */
const POR_GRUPO: Record<GrupoCapacidad, Capacidad[]> = GRUPOS_CAPACIDADES.reduce(
  (acumulado, grupo) => {
    acumulado[grupo] = CAPACIDADES.filter((cap) => META_CAPACIDADES[cap].grupo === grupo);
    return acumulado;
  },
  {} as Record<GrupoCapacidad, Capacidad[]>
);

const AYUDA_GRUPO: Record<GrupoCapacidad, string> = {
  Taller: "Lo que hace a diario quien trabaja los muebles.",
  Supervisión: "Lo que hace quien reparte el trabajo y revisa cómo va todo.",
  Configuración: "Lo que hace quien arma las rutas, los pasos y las áreas.",
  Administración: "Permisos fuertes: dan poder sobre el sistema entero.",
};

/** La primera letra en minúscula, para encadenar frases: "podrá: trabajar…". */
function enFrase(texto: string): string {
  return texto.charAt(0).toLowerCase() + texto.slice(1);
}

export interface PropsFormularioRol {
  abierto: boolean;
  onCerrar: () => void;
  /** Si viene, se está editando; si no, se está creando. */
  inicial?: RolDTO | null;
  /** Se llama cuando se guardó bien, para que la lista se refresque sola. */
  onGuardado: () => void;
}

export function FormularioRol({
  abierto,
  onCerrar,
  inicial,
  onGuardado,
}: PropsFormularioRol) {
  const editando = Boolean(inicial);
  const esAdmin = inicial?.clave === "admin";

  const [nombre, setNombre] = React.useState("");
  const [descripcion, setDescripcion] = React.useState("");
  const [color, setColor] = React.useState(COLORES_PASO[0].valor);
  const [icono, setIcono] = React.useState("usuario");
  const [capacidades, setCapacidades] = React.useState<Capacidad[]>([]);
  const [errorNombre, setErrorNombre] = React.useState("");
  const [guardando, setGuardando] = React.useState(false);

  // Cada vez que se abre, el formulario se rellena con lo que toca.
  React.useEffect(() => {
    if (!abierto) return;
    setNombre(inicial?.nombre ?? "");
    setDescripcion(inicial?.descripcion ?? "");
    setColor(inicial?.color || COLORES_PASO[0].valor);
    setIcono(inicial?.icono || "usuario");
    setCapacidades(inicial ? [...inicial.capacidades] : []);
    setErrorNombre("");
    setGuardando(false);
  }, [abierto, inicial]);

  const marcadas = React.useMemo(() => new Set(capacidades), [capacidades]);

  function alternar(capacidad: Capacidad): void {
    setCapacidades((previas) =>
      previas.includes(capacidad)
        ? previas.filter((cap) => cap !== capacidad)
        : [...previas, capacidad]
    );
  }

  function marcarGrupo(grupo: GrupoCapacidad, marcar: boolean): void {
    const delGrupo = POR_GRUPO[grupo];
    setCapacidades((previas) => {
      const sinGrupo = previas.filter((cap) => !delGrupo.includes(cap));
      return marcar ? [...sinGrupo, ...delGrupo] : sinGrupo;
    });
  }

  async function alEnviar(evento: React.FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();

    const nombreLimpio = nombre.trim();
    if (nombreLimpio.length < 2) {
      setErrorNombre("Escribe el nombre del rol. Por ejemplo: Tapicero.");
      return;
    }
    setErrorNombre("");

    const datos: RolInput = {
      nombre: nombreLimpio,
      descripcion: descripcion.trim(),
      color,
      icono,
      capacidades,
    };

    setGuardando(true);
    const resultado = editando && inicial
      ? await actualizarRol(inicial.clave, datos)
      : await crearRol(datos);
    setGuardando(false);

    if (!resultado.ok) {
      avisoError(resultado.error ?? "No pudimos guardar el rol. Vuelve a intentarlo.");
      return;
    }

    avisoExito(
      editando
        ? `Se guardaron los cambios del rol «${nombreLimpio}».`
        : `Se creó el rol «${nombreLimpio}».`
    );
    onGuardado();
    onCerrar();
  }

  const IconoRol = iconoDeRol(icono);
  const capacidadesVistaPrevia = esAdmin ? [...CAPACIDADES] : capacidades;

  return (
    <Dialog open={abierto} onOpenChange={(valor) => (valor ? undefined : onCerrar())}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-8 font-display text-2xl font-bold">
            {editando ? `Editar el rol «${inicial?.nombre}»` : "Crear un rol nuevo"}
          </DialogTitle>
          <DialogDescription className="text-base">
            Ponle un nombre, explica en pocas palabras qué hace y marca las casillas de
            lo que podrá hacer la gente con este rol.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={alEnviar} className="space-y-7">
          {/* ── Identidad ─────────────────────────────────────────────── */}
          <Campo
            htmlFor="rol-nombre"
            etiqueta="Nombre del rol"
            ayuda="Cómo se llama en el taller. Por ejemplo: Tapicero, Supervisor, Almacén."
            error={errorNombre}
            obligatorio
          >
            <Input
              id="rol-nombre"
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
              placeholder="Tapicero"
              autoComplete="off"
              className="h-14 text-lg"
            />
          </Campo>

          {editando ? (
            <AvisoInfo
              mensaje={`El nombre corto interno de este rol es «${inicial?.clave}» y no cambia, porque es lo que tienen guardado las personas y los pasos.`}
            />
          ) : null}

          <Campo
            htmlFor="rol-descripcion"
            etiqueta="¿Qué hace esta persona?"
            ayuda="Una frase sencilla. Se lee en la lista de roles y al elegir el rol de alguien."
          >
            <Textarea
              id="rol-descripcion"
              value={descripcion}
              onChange={(evento) => setDescripcion(evento.target.value)}
              placeholder="Arma la estructura de madera del mueble."
              className="min-h-[90px] text-lg"
            />
          </Campo>

          {/* ── Color ─────────────────────────────────────────────────── */}
          <fieldset className="space-y-2">
            <legend className="text-lg font-bold text-brand-dark">Color del rol</legend>
            <p className="text-base text-brand-taupe">
              Sirve para reconocerlo de un vistazo en las listas y en el tablero.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              {COLORES_PASO.map((opcion) => {
                const elegido = opcion.valor === color;
                return (
                  <button
                    key={opcion.valor}
                    type="button"
                    onClick={() => setColor(opcion.valor)}
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

          {/* ── Icono ─────────────────────────────────────────────────── */}
          <fieldset className="space-y-2">
            <legend className="text-lg font-bold text-brand-dark">Dibujo del rol</legend>
            <p className="text-base text-brand-taupe">
              Elige el dibujo que mejor represente el trabajo de esta persona.
            </p>
            <div className="grid grid-cols-3 gap-3 pt-1 sm:grid-cols-4">
              {ICONOS_DISPONIBLES.map((opcion) => {
                const Icono = iconoDeRol(opcion.clave);
                const elegido = opcion.clave === icono;
                return (
                  <button
                    key={opcion.clave}
                    type="button"
                    onClick={() => setIcono(opcion.clave)}
                    aria-label={opcion.etiqueta}
                    aria-pressed={elegido}
                    className={cn(
                      "flex h-16 min-h-[44px] flex-col items-center justify-center gap-1 rounded-2xl border-2 px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2",
                      elegido
                        ? "border-brand-accent bg-brand-accent/10 text-brand-accent"
                        : "border-brand-dark/15 bg-brand-card text-brand-taupe hover:border-brand-accent/40"
                    )}
                  >
                    <Icono className="h-6 w-6" aria-hidden="true" />
                    <span className="line-clamp-1">{opcion.etiqueta.split(" (")[0]}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* ── Vista rápida de cómo queda ────────────────────────────── */}
          <div className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-brand-dark/15 p-4">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ backgroundColor: color, color: textoSobre(color) }}
              aria-hidden="true"
            >
              <IconoRol className="h-7 w-7" />
            </span>
            <div>
              <p className="text-lg font-bold text-brand-dark">
                {nombre.trim() === "" ? "Nombre del rol" : nombre}
              </p>
              <p className="text-base text-brand-taupe">
                {descripcion.trim() === ""
                  ? "Así se va a ver en la lista."
                  : descripcion}
              </p>
            </div>
          </div>

          {/* ── Permisos ──────────────────────────────────────────────── */}
          <section className="space-y-4">
            <div>
              <h3 className="font-display text-2xl font-bold tracking-tight text-brand-dark">
                ¿Qué puede hacer?
              </h3>
              <p className="mt-1 text-base text-brand-taupe">
                Marca una casilla por cada cosa que quieras permitirle. Puedes cambiarlo
                cuando quieras: el cambio se aplica de inmediato, sin que nadie tenga que
                volver a entrar.
              </p>
            </div>

            {esAdmin ? (
              <AvisoInfo mensaje="El rol Administrador siempre lo puede todo. Es el seguro para que nunca te quedes fuera del sistema, por eso sus casillas no se pueden desmarcar." />
            ) : null}

            {GRUPOS_CAPACIDADES.map((grupo) => {
              const delGrupo = POR_GRUPO[grupo];
              const todasMarcadas = delGrupo.every((cap) => marcadas.has(cap));
              const ningunaMarcada = delGrupo.every((cap) => !marcadas.has(cap));

              return (
                <fieldset
                  key={grupo}
                  className="rounded-2xl border-2 border-brand-dark/10 p-4"
                >
                  <legend className="px-2 font-display text-xl font-bold text-brand-dark">
                    {grupo}
                  </legend>
                  <p className="text-base text-brand-taupe">{AYUDA_GRUPO[grupo]}</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => marcarGrupo(grupo, true)}
                      disabled={esAdmin || todasMarcadas}
                      className="inline-flex h-11 min-h-[44px] items-center gap-2 rounded-xl border border-brand-dark/15 bg-brand-card px-4 text-sm font-semibold text-brand-dark transition-colors hover:border-brand-accent/40 hover:text-brand-accent disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                    >
                      <CheckCheck className="h-5 w-5" aria-hidden="true" />
                      Marcar todo el grupo
                    </button>
                    <button
                      type="button"
                      onClick={() => marcarGrupo(grupo, false)}
                      disabled={esAdmin || ningunaMarcada}
                      className="inline-flex h-11 min-h-[44px] items-center gap-2 rounded-xl border border-brand-dark/15 bg-brand-card px-4 text-sm font-semibold text-brand-dark transition-colors hover:border-brand-accent/40 hover:text-brand-accent disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                    >
                      <Eraser className="h-5 w-5" aria-hidden="true" />
                      Quitar todo el grupo
                    </button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {delGrupo.map((capacidad) => {
                      const meta = META_CAPACIDADES[capacidad];
                      const activa = esAdmin || marcadas.has(capacidad);
                      return (
                        <button
                          key={capacidad}
                          type="button"
                          role="checkbox"
                          aria-checked={activa}
                          disabled={esAdmin}
                          onClick={() => alternar(capacidad)}
                          className={cn(
                            "flex w-full min-h-[64px] items-start gap-4 rounded-2xl border-2 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-80",
                            activa
                              ? "border-brand-accent bg-brand-accent/[0.08]"
                              : "border-brand-dark/12 bg-brand-card hover:border-brand-accent/40 hover:bg-brand-accent/[0.04]"
                          )}
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 transition-colors",
                              activa
                                ? "border-brand-accent bg-brand-accent text-white"
                                : "border-brand-dark/25 bg-white"
                            )}
                          >
                            {activa ? <Check className="h-5 w-5" strokeWidth={3} /> : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-lg font-bold leading-snug text-brand-dark">
                              {meta.etiqueta}
                            </span>
                            <span className="mt-0.5 block text-base leading-snug text-brand-taupe">
                              {meta.ayuda}
                            </span>
                            {meta.peligrosa ? (
                              <span className="mt-2 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-2 text-sm font-semibold text-amber-900">
                                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                                Este permiso da mucho poder. Dáselo sólo a gente de
                                confianza.
                              </span>
                            ) : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              );
            })}
          </section>

          {/* ── Vista previa en vivo ──────────────────────────────────── */}
          <section
            aria-live="polite"
            className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5"
          >
            <h3 className="flex items-center gap-2 font-display text-xl font-bold text-emerald-900">
              <Sparkles className="h-6 w-6" aria-hidden="true" />
              Con estos permisos, esta persona podrá:
            </h3>
            {capacidadesVistaPrevia.length === 0 ? (
              <p className="mt-3 text-base font-semibold text-emerald-900">
                Nada todavía. Marca al menos una casilla, o esta persona podrá entrar
                pero no hacer nada.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {capacidadesVistaPrevia.map((capacidad) => (
                  <li
                    key={capacidad}
                    className="flex items-start gap-2 text-base text-emerald-900"
                  >
                    <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                    <span>{enFrase(META_CAPACIDADES[capacidad].etiqueta)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {!esAdmin && capacidades.includes("gestionar_usuarios") ? (
            <AvisoCuidado mensaje="Quien tenga este rol podrá crear y eliminar personas del equipo, y cambiarles el PIN de entrada." />
          ) : null}

          <PieFormulario
            onCancelar={onCerrar}
            guardando={guardando}
            icono={Save}
            textoGuardar={editando ? "GUARDAR CAMBIOS" : "CREAR EL ROL"}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
