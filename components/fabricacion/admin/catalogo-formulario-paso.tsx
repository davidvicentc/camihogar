"use client";

/**
 * EL formulario de un paso. Es el mismo en los dos sitios donde se configura
 * un paso: el catálogo de pasos reutilizables y el constructor de rutas. Así
 * quien aprende a llenarlo una vez, lo sabe llenar siempre.
 *
 * Todas las preguntas están escritas como se las haría una persona a otra
 * ("¿Tiene que tomar una foto?") y cada una lleva su ayuda debajo.
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Camera, Check, ClipboardList, Clock, Loader2, MapPin, Minus, PenTool, Plus, ScanLine, StickyNote, Trash2, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  COLORES_PASO,
  ETIQUETAS_TIPO_PASO,
  ICONOS_PASO,
  iconoDePaso,
  seguimientoPublicoActivo,
  type PasoSugerido,
} from "@/lib/fabricacion/constantes";
import type { PasoPlantillaInput } from "@/lib/actions/fabricacion";
import type {
  ChecklistItemDTO,
  EstacionDTO,
  PasoPlantillaDTO,
  RolDTO,
  TipoPaso,
} from "@/lib/types/fabricacion";
import { TIPOS_PASO } from "@/lib/types/fabricacion";
import { cn, slugify } from "@/lib/utils";
import { ChipBoton, FilaInterruptor, type ResultadoConfirmacion } from "./ruta-ui";

/* ────────────────────────────────────────────────────────────────────────────
 * VALORES DEL FORMULARIO
 * ──────────────────────────────────────────────────────────────────────────── */

/** Lo que el formulario edita. Es un paso de ruta o de catálogo, indistinto. */
export interface ValoresPaso {
  /** Vacía mientras el paso es nuevo: se genera sola a partir del nombre. */
  clave: string;
  nombre: string;
  instrucciones: string;
  icono: string;
  color: string;
  tipo: TipoPaso;
  estacionId: string | null;
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

/** Un paso recién creado, con lo más común ya puesto. */
export const PASO_VACIO: ValoresPaso = {
  clave: "",
  nombre: "",
  instrucciones: "",
  icono: "lista",
  color: COLORES_PASO[0].valor,
  tipo: "TRABAJO",
  estacionId: null,
  rolesPermitidos: [],
  requiereFoto: false,
  minFotos: 1,
  requiereEscaneo: false,
  requiereFirma: false,
  requiereNota: false,
  checklist: [],
  horasEstimadas: 1,
  permiteParalelo: false,
  permiteOmitir: false,
  notificaCliente: false,
};

/** Pasa un paso ya guardado (de una ruta o del catálogo) al formulario. */
export function valoresDesdePaso(paso: PasoPlantillaDTO): ValoresPaso {
  return {
    clave: paso.clave,
    nombre: paso.nombre,
    instrucciones: paso.instrucciones,
    icono: paso.icono,
    color: paso.color,
    tipo: paso.tipo,
    estacionId: paso.estacionId,
    rolesPermitidos: [...paso.rolesPermitidos],
    requiereFoto: paso.requiereFoto,
    minFotos: paso.minFotos,
    requiereEscaneo: paso.requiereEscaneo,
    requiereFirma: paso.requiereFirma,
    requiereNota: paso.requiereNota,
    checklist: paso.checklist.map((item) => ({ ...item })),
    horasEstimadas: paso.horasEstimadas,
    permiteParalelo: paso.permiteParalelo,
    permiteOmitir: paso.permiteOmitir,
    notificaCliente: paso.notificaCliente,
  };
}

/**
 * Pasa uno de los pasos de ejemplo del sistema al formulario, enlazándolo con
 * la primera área del tipo que sugiere (taller, almacén, transporte, tienda).
 */
export function valoresDesdeSugerido(
  paso: PasoSugerido,
  estaciones: EstacionDTO[]
): ValoresPaso {
  const area = estaciones.find((estacion) => estacion.tipo === paso.tipoEstacion);
  return {
    clave: paso.clave,
    nombre: paso.nombre,
    instrucciones: paso.instrucciones,
    icono: paso.icono,
    color: paso.color,
    tipo: paso.tipo,
    estacionId: area ? area._id : null,
    rolesPermitidos: [...paso.rolesPermitidos],
    requiereFoto: paso.requiereFoto,
    minFotos: paso.minFotos,
    requiereEscaneo: paso.requiereEscaneo,
    requiereFirma: paso.requiereFirma,
    requiereNota: paso.requiereNota,
    checklist: paso.checklist.map((item) => ({ ...item })),
    horasEstimadas: paso.horasEstimadas,
    permiteParalelo: paso.permiteParalelo,
    permiteOmitir: paso.permiteOmitir,
    notificaCliente: paso.notificaCliente,
  };
}

/** Lo que se manda a las acciones del servidor. */
export function aPasoPlantillaInput(valores: ValoresPaso): PasoPlantillaInput {
  return {
    clave: valores.clave === "" ? undefined : valores.clave,
    nombre: valores.nombre.trim(),
    instrucciones: valores.instrucciones.trim(),
    icono: valores.icono,
    color: valores.color,
    tipo: valores.tipo,
    estacionId: valores.estacionId,
    rolesPermitidos: valores.rolesPermitidos,
    requiereFoto: valores.requiereFoto,
    minFotos: valores.requiereFoto ? Math.max(1, valores.minFotos) : 0,
    requiereEscaneo: valores.requiereEscaneo,
    requiereFirma: valores.requiereFirma,
    requiereNota: valores.requiereNota,
    checklist: valores.checklist
      .filter((item) => item.texto.trim() !== "")
      .map((item) => ({ texto: item.texto.trim(), obligatorio: item.obligatorio })),
    horasEstimadas: valores.horasEstimadas,
    permiteParalelo: valores.permiteParalelo,
    permiteOmitir: valores.permiteOmitir,
    notificaCliente: valores.notificaCliente,
  };
}

/** Validación amable: devuelve la frase a corregir, o `null` si está bien. */
export function validarPaso(valores: ValoresPaso): string | null {
  if (valores.nombre.trim() === "") {
    return "Ponle un nombre al paso, por ejemplo «Lijado». Es lo que va a leer el trabajador.";
  }
  if (valores.nombre.trim().length > 60) {
    return "El nombre del paso es muy largo. Déjalo en menos de 60 letras para que se lea bien en el teléfono.";
  }
  if (valores.requiereFoto && valores.minFotos < 1) {
    return "Si el paso pide foto, tiene que pedir al menos 1. Sube la cantidad o apaga la pregunta de la foto.";
  }
  if (valores.checklist.some((item) => item.texto.trim() === "")) {
    return "Hay una pregunta de la lista de comprobación sin escribir. Escríbela o quítala.";
  }
  if (valores.horasEstimadas < 0) {
    return "Las horas no pueden ser un número negativo.";
  }
  return null;
}

/** Genera la clave estable de un paso nuevo a partir de su nombre. */
export function claveDesdeNombre(nombre: string): string {
  const base = slugify(nombre).replace(/-/g, "_");
  return base === "" ? "paso" : base;
}

/* ────────────────────────────────────────────────────────────────────────────
 * PIEZAS DEL FORMULARIO
 * ──────────────────────────────────────────────────────────────────────────── */

/** Iconos que se ofrecen para pintar el paso, con su nombre en español. */
export const ICONOS_ELEGIBLES: { clave: string; etiqueta: string }[] = [
  { clave: "lista", etiqueta: "Lista" },
  { clave: "regla", etiqueta: "Regla" },
  { clave: "sierra", etiqueta: "Sierra" },
  { clave: "martillo", etiqueta: "Martillo" },
  { clave: "lija", etiqueta: "Lija" },
  { clave: "tornillo", etiqueta: "Llave" },
  { clave: "destornillador", etiqueta: "Taladro" },
  { clave: "espuma", etiqueta: "Espuma" },
  { clave: "tijeras", etiqueta: "Tijeras" },
  { clave: "sillon", etiqueta: "Sillón" },
  { clave: "sofa", etiqueta: "Sofá" },
  { clave: "pintura", etiqueta: "Pintura" },
  { clave: "brocha", etiqueta: "Brocha" },
  { clave: "spray", etiqueta: "Spray" },
  { clave: "paleta", etiqueta: "Paleta" },
  { clave: "calidad", etiqueta: "Revisión" },
  { clave: "caja", etiqueta: "Caja" },
  { clave: "cajas", etiqueta: "Cajas" },
  { clave: "despacho", etiqueta: "Despacho" },
  { clave: "almacen", etiqueta: "Almacén" },
  { clave: "camion", etiqueta: "Camión" },
  { clave: "mapa", etiqueta: "Mapa" },
  { clave: "tienda", etiqueta: "Tienda" },
  { clave: "casa", etiqueta: "Casa" },
  { clave: "taller", etiqueta: "Taller" },
  { clave: "reloj", etiqueta: "Reloj" },
  { clave: "escaner", etiqueta: "Escáner" },
  { clave: "foto", etiqueta: "Foto" },
  { clave: "firma", etiqueta: "Firma" },
  { clave: "etiqueta", etiqueta: "Etiqueta" },
].filter((opcion) => Boolean(ICONOS_PASO[opcion.clave]));

/** Bloque con su pregunta grande y su ayuda debajo. */
function Bloque({
  titulo,
  ayuda,
  children,
  htmlFor,
}: {
  titulo: string;
  ayuda?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="text-lg font-semibold text-brand-dark">
        {titulo}
      </Label>
      {ayuda ? <p className="text-base text-brand-taupe">{ayuda}</p> : null}
      {children}
    </div>
  );
}

/** Contador con botones enormes de − y +. Nada de escribir números. */
function Contador({
  valor,
  onCambiar,
  minimo,
  maximo,
  paso = 1,
  sufijo,
  etiqueta,
}: {
  valor: number;
  onCambiar: (valor: number) => void;
  minimo: number;
  maximo: number;
  paso?: number;
  sufijo: string;
  etiqueta: string;
}) {
  const redondear = (numero: number) => Math.round(numero * 100) / 100;
  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        variant="outline"
        onClick={() => onCambiar(redondear(Math.max(minimo, valor - paso)))}
        disabled={valor <= minimo}
        aria-label={`Bajar ${etiqueta}`}
        className="h-14 w-14 rounded-2xl p-0 [&_svg]:size-6"
      >
        <Minus className="h-6 w-6" aria-hidden="true" />
      </Button>
      <span
        className="min-w-[7rem] rounded-2xl border border-brand-dark/10 bg-white px-4 py-3 text-center text-xl font-bold text-brand-dark"
        aria-live="polite"
      >
        {valor} {sufijo}
      </span>
      <Button
        type="button"
        variant="outline"
        onClick={() => onCambiar(redondear(Math.min(maximo, valor + paso)))}
        disabled={valor >= maximo}
        aria-label={`Subir ${etiqueta}`}
        className="h-14 w-14 rounded-2xl p-0 [&_svg]:size-6"
      >
        <Plus className="h-6 w-6" aria-hidden="true" />
      </Button>
    </div>
  );
}

export interface FormularioPasoProps {
  valores: ValoresPaso;
  onCambiar: (valores: ValoresPaso) => void;
  estaciones: EstacionDTO[];
  roles: RolDTO[];
}

/** El formulario completo de un paso, controlado desde fuera. */
export function FormularioPaso({ valores, onCambiar, estaciones, roles }: FormularioPasoProps) {
  const seguimientoEncendido = useMemo(() => seguimientoPublicoActivo(), []);
  const [nuevaPregunta, setNuevaPregunta] = useState("");

  function cambiar<C extends keyof ValoresPaso>(campo: C, valor: ValoresPaso[C]) {
    onCambiar({ ...valores, [campo]: valor });
  }

  function alternarRol(clave: string) {
    const yaEsta = valores.rolesPermitidos.includes(clave);
    cambiar(
      "rolesPermitidos",
      yaEsta
        ? valores.rolesPermitidos.filter((rol) => rol !== clave)
        : [...valores.rolesPermitidos, clave]
    );
  }

  function agregarPregunta() {
    const texto = nuevaPregunta.trim();
    if (texto === "") return;
    cambiar("checklist", [...valores.checklist, { texto, obligatorio: true }]);
    setNuevaPregunta("");
  }

  const IconoElegido = iconoDePaso(valores.icono);

  return (
    <div className="space-y-6">
      {/* 1. Nombre */}
      <Bloque
        titulo="¿Cómo se llama este paso?"
        ayuda="Escríbelo como se lo dirías a un compañero: «Lijado», «Tapizado», «Entrega en la casa»."
        htmlFor="paso-nombre"
      >
        <Input
          id="paso-nombre"
          value={valores.nombre}
          onChange={(evento) => cambiar("nombre", evento.target.value)}
          placeholder="Por ejemplo: Lijado"
          maxLength={60}
          className="h-14 text-lg"
        />
      </Bloque>

      {/* 2. Instrucciones */}
      <Bloque
        titulo="Explícale al trabajador qué tiene que hacer"
        ayuda="Frases cortas, una orden por frase. Esto es lo que va a leer en el teléfono mientras trabaja."
        htmlFor="paso-instrucciones"
      >
        <Textarea
          id="paso-instrucciones"
          value={valores.instrucciones}
          onChange={(evento) => cambiar("instrucciones", evento.target.value)}
          placeholder="Por ejemplo: Lija toda la madera hasta que quede lisa al tacto. Empieza con la lija gruesa y termina con la fina. Limpia el polvo antes de avisar."
          className="min-h-[130px] text-lg"
        />
      </Bloque>

      {/* 3. Tipo de paso */}
      <Bloque
        titulo="¿Qué clase de paso es?"
        ayuda="Sirve para agrupar los pasos y pintarlos con el mismo color en el tablero."
      >
        <div className="flex flex-wrap gap-2">
          {TIPOS_PASO.map((tipo) => {
            const meta = ETIQUETAS_TIPO_PASO[tipo];
            return (
              <ChipBoton
                key={tipo}
                activo={valores.tipo === tipo}
                etiqueta={meta.label}
                icono={meta.icono}
                onClick={() => cambiar("tipo", tipo)}
              />
            );
          })}
        </div>
      </Bloque>

      {/* 4. Dónde se hace */}
      <Bloque
        titulo="¿Dónde se hace?"
        ayuda="Elige el área donde estará el mueble mientras se hace este paso. Si da igual, deja «En cualquier parte»."
      >
        <div className="flex flex-wrap gap-2">
          <ChipBoton
            activo={valores.estacionId === null}
            etiqueta="En cualquier parte"
            icono={MapPin}
            onClick={() => cambiar("estacionId", null)}
          />
          {estaciones.map((estacion) => (
            <ChipBoton
              key={estacion._id}
              activo={valores.estacionId === estacion._id}
              etiqueta={estacion.nombre}
              icono={MapPin}
              onClick={() => cambiar("estacionId", estacion._id)}
            />
          ))}
        </div>
        {estaciones.length === 0 ? (
          <p className="text-base text-brand-taupe">
            Todavía no hay áreas de trabajo creadas. Se pueden añadir en «Áreas».
          </p>
        ) : null}
      </Bloque>

      {/* 5. Quién puede hacerlo */}
      <Bloque
        titulo="¿Quién puede hacerlo?"
        ayuda="Marca los oficios que pueden hacer este paso. Si no marcas ninguno, lo puede hacer cualquiera del taller."
      >
        <div className="flex flex-wrap gap-2">
          {roles.map((rol) => (
            <ChipBoton
              key={rol.clave}
              activo={valores.rolesPermitidos.includes(rol.clave)}
              etiqueta={rol.nombre}
              color={rol.color}
              onClick={() => alternarRol(rol.clave)}
            />
          ))}
        </div>
        <p className="flex items-center gap-2 text-base text-brand-taupe">
          <Users className="h-5 w-5 shrink-0" aria-hidden="true" />
          {valores.rolesPermitidos.length === 0
            ? "Ahora mismo lo puede hacer cualquiera."
            : `Lo pueden hacer ${valores.rolesPermitidos.length} ${
                valores.rolesPermitidos.length === 1 ? "oficio" : "oficios"
              }.`}
        </p>
      </Bloque>

      {/* 6-9. Requisitos */}
      <div className="space-y-3">
        <FilaInterruptor
          id="paso-foto"
          pregunta="¿Tiene que tomar una foto?"
          ayuda="Sirve para dejar constancia de cómo quedó el trabajo."
          icono={Camera}
          activo={valores.requiereFoto}
          onCambiar={(activo) => onCambiar({ ...valores, requiereFoto: activo, minFotos: activo ? Math.max(1, valores.minFotos) : 0 })}
        >
          <div className="space-y-2">
            <p className="text-lg font-semibold text-brand-dark">¿Cuántas?</p>
            <Contador
              valor={valores.minFotos}
              onCambiar={(valor) => cambiar("minFotos", valor)}
              minimo={1}
              maximo={10}
              sufijo={valores.minFotos === 1 ? "foto" : "fotos"}
              etiqueta="la cantidad de fotos"
            />
          </div>
        </FilaInterruptor>

        <FilaInterruptor
          id="paso-escaneo"
          pregunta="¿Tiene que escanear el código al recibir el mueble?"
          ayuda="Úsalo cuando el mueble cambia de manos, por ejemplo cuando sale del almacén."
          icono={ScanLine}
          activo={valores.requiereEscaneo}
          onCambiar={(activo) => cambiar("requiereEscaneo", activo)}
        />

        <FilaInterruptor
          id="paso-firma"
          pregunta="¿Tiene que firmar el cliente?"
          ayuda="El cliente firma con el dedo en la pantalla. Se usa sobre todo en la entrega."
          icono={PenTool}
          activo={valores.requiereFirma}
          onCambiar={(activo) => cambiar("requiereFirma", activo)}
        />

        <FilaInterruptor
          id="paso-nota"
          pregunta="¿Tiene que escribir una nota?"
          ayuda="Una frase corta contando cómo quedó o qué pasó."
          icono={StickyNote}
          activo={valores.requiereNota}
          onCambiar={(activo) => cambiar("requiereNota", activo)}
        />
      </div>

      {/* 10. Lista de comprobación */}
      <Bloque
        titulo="Lista de comprobación"
        ayuda="Preguntas de sí o no que el trabajador tiene que marcar antes de dar el paso por terminado."
      >
        <div className="space-y-2">
          {valores.checklist.map((item, indice) => (
            <div
              key={`${indice}-${item.texto}`}
              className="flex flex-wrap items-center gap-2 rounded-2xl border border-brand-dark/10 bg-white p-3"
            >
              <ClipboardList className="h-5 w-5 shrink-0 text-brand-accent" aria-hidden="true" />
              <Input
                value={item.texto}
                onChange={(evento) => {
                  const copia = valores.checklist.map((otro, i) =>
                    i === indice ? { ...otro, texto: evento.target.value } : otro
                  );
                  cambiar("checklist", copia);
                }}
                aria-label={`Pregunta ${indice + 1} de la lista`}
                className="h-12 min-w-[12rem] flex-1 text-base"
              />
              <ChipBoton
                activo={item.obligatorio}
                etiqueta={item.obligatorio ? "Obligatoria" : "Opcional"}
                onClick={() => {
                  const copia = valores.checklist.map((otro, i) =>
                    i === indice ? { ...otro, obligatorio: !otro.obligatorio } : otro
                  );
                  cambiar("checklist", copia);
                }}
                ariaLabel={
                  item.obligatorio
                    ? `Hacer opcional la pregunta ${indice + 1}`
                    : `Hacer obligatoria la pregunta ${indice + 1}`
                }
              />
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  cambiar(
                    "checklist",
                    valores.checklist.filter((_, i) => i !== indice)
                  )
                }
                aria-label={`Quitar la pregunta ${indice + 1}`}
                className="h-12 px-4 text-base text-red-700 [&_svg]:size-5 hover:border-red-300 hover:bg-red-50 hover:text-red-800"
              >
                <Trash2 className="h-5 w-5" aria-hidden="true" />
                Quitar
              </Button>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={nuevaPregunta}
              onChange={(evento) => setNuevaPregunta(evento.target.value)}
              onKeyDown={(evento) => {
                if (evento.key === "Enter") {
                  evento.preventDefault();
                  agregarPregunta();
                }
              }}
              placeholder="Por ejemplo: ¿Quedó lisa toda la madera?"
              aria-label="Escribe una pregunta nueva para la lista"
              className="h-14 min-w-[14rem] flex-1 text-lg"
            />
            <Button
              type="button"
              variant="outline"
              onClick={agregarPregunta}
              aria-label="Añadir la pregunta a la lista"
              className="h-14 px-6 text-base font-bold [&_svg]:size-5"
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
              AÑADIR PREGUNTA
            </Button>
          </div>
        </div>
      </Bloque>

      {/* 11. Horas */}
      <Bloque
        titulo="¿Cuántas horas suele tardar?"
        ayuda="Un cálculo aproximado. Sirve para saber cuánto va a tardar el mueble entero."
      >
        <Contador
          valor={valores.horasEstimadas}
          onCambiar={(valor) => cambiar("horasEstimadas", valor)}
          minimo={0}
          maximo={80}
          paso={0.5}
          sufijo={valores.horasEstimadas === 1 ? "hora" : "horas"}
          etiqueta="las horas del paso"
        />
      </Bloque>

      {/* 12-14. Reglas */}
      <div className="space-y-3">
        <FilaInterruptor
          id="paso-paralelo"
          pregunta="¿Se puede empezar sin haber terminado el anterior?"
          ayuda="Sólo para trabajos que de verdad se hacen a la vez, como coser las fundas mientras se arma la madera."
          icono={Clock}
          activo={valores.permiteParalelo}
          onCambiar={(activo) => cambiar("permiteParalelo", activo)}
          avisoEncendido="Normalmente esto va apagado: los pasos se hacen uno detrás de otro. Enciéndelo sólo si estás seguro."
        />

        <FilaInterruptor
          id="paso-omitir"
          pregunta="¿Se puede saltar este paso?"
          ayuda="Enciéndelo si a veces el mueble no lo necesita, por ejemplo cuando el cliente lo recoge en la tienda."
          icono={Check}
          activo={valores.permiteOmitir}
          onCambiar={(activo) => cambiar("permiteOmitir", activo)}
        />

        <FilaInterruptor
          id="paso-cliente"
          pregunta="¿El cliente ve este paso en su seguimiento?"
          ayuda={
            seguimientoEncendido
              ? "El cliente verá que su mueble llegó a este paso."
              : "El seguimiento para clientes está apagado ahora mismo. Se queda anotado por si se enciende más adelante."
          }
          icono={Users}
          activo={valores.notificaCliente}
          onCambiar={(activo) => cambiar("notificaCliente", activo)}
        />
      </div>

      {/* 15. Color e icono */}
      <Bloque titulo="Color del paso" ayuda="Es el color con el que se pinta en el tablero y en la ruta.">
        <div className="flex flex-wrap gap-2">
          {COLORES_PASO.map((color) => (
            <button
              key={color.valor}
              type="button"
              onClick={() => cambiar("color", color.valor)}
              aria-label={`Usar el color ${color.nombre}`}
              aria-pressed={valores.color === color.valor}
              className={cn(
                "flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2 text-base font-semibold transition-colors",
                valores.color === color.valor
                  ? "border-brand-dark text-brand-dark"
                  : "border-brand-dark/15 text-brand-taupe hover:border-brand-accent/40"
              )}
            >
              <span
                className="h-5 w-5 rounded-full border border-black/10"
                style={{ backgroundColor: color.valor }}
                aria-hidden="true"
              />
              {color.nombre}
            </button>
          ))}
        </div>
      </Bloque>

      <Bloque titulo="Dibujo del paso" ayuda="Un dibujo sencillo ayuda a reconocer el paso de un vistazo.">
        <div className="flex items-center gap-3 rounded-2xl border border-brand-dark/10 bg-white p-3">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${valores.color}1A`, color: valores.color }}
          >
            <IconoElegido className="h-8 w-8" aria-hidden="true" />
          </span>
          <p className="text-base text-brand-taupe">Así se va a ver el paso en el teléfono.</p>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
          {ICONOS_ELEGIBLES.map((opcion) => {
            const Icono = iconoDePaso(opcion.clave);
            const elegido = valores.icono === opcion.clave;
            return (
              <button
                key={opcion.clave}
                type="button"
                onClick={() => cambiar("icono", opcion.clave)}
                aria-label={`Usar el dibujo ${opcion.etiqueta}`}
                aria-pressed={elegido}
                title={opcion.etiqueta}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 rounded-2xl border text-[0.7rem] font-semibold transition-colors",
                  elegido
                    ? "border-brand-accent bg-brand-accent/10 text-brand-accent"
                    : "border-brand-dark/10 bg-white text-brand-taupe hover:border-brand-accent/40"
                )}
              >
                <Icono className="h-6 w-6" aria-hidden="true" />
                {opcion.etiqueta}
              </button>
            );
          })}
        </div>
      </Bloque>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * DIÁLOGO QUE ENVUELVE AL FORMULARIO
 * ──────────────────────────────────────────────────────────────────────────── */

export interface DialogoPasoProps {
  abierto: boolean;
  onAbiertoChange: (abierto: boolean) => void;
  titulo: string;
  descripcion: string;
  /** Los valores con los que se abre. Se copian cada vez que se abre. */
  inicial: ValoresPaso;
  estaciones: EstacionDTO[];
  roles: RolDTO[];
  textoGuardar: string;
  /** Casilla opcional del pie ("Guardarlo también en el catálogo"). */
  opcionCatalogo?: { etiqueta: string; ayuda: string };
  onGuardar: (valores: ValoresPaso, guardarEnCatalogo: boolean) => Promise<ResultadoConfirmacion>;
  onGuardado?: () => void;
}

/**
 * Crear y editar comparten este mismo diálogo: sólo cambian el título y el
 * texto del botón. La validación se pinta DENTRO, nunca en un aviso que se va.
 */
export function DialogoPaso({
  abierto,
  onAbiertoChange,
  titulo,
  descripcion,
  inicial,
  estaciones,
  roles,
  textoGuardar,
  opcionCatalogo,
  onGuardar,
  onGuardado,
}: DialogoPasoProps) {
  const [valores, setValores] = useState<ValoresPaso>(inicial);
  const [guardarEnCatalogo, setGuardarEnCatalogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    setValores(inicial);
    setGuardarEnCatalogo(false);
    setError(null);
    setGuardando(false);
  }, [abierto, inicial]);

  async function guardar() {
    const problema = validarPaso(valores);
    if (problema) {
      setError(problema);
      return;
    }

    setGuardando(true);
    setError(null);
    const resultado = await onGuardar(valores, guardarEnCatalogo);
    setGuardando(false);

    if (!resultado.ok) {
      setError(resultado.error ?? "No pudimos guardar el paso. Vuelve a intentarlo.");
      return;
    }

    onAbiertoChange(false);
    onGuardado?.();
  }

  return (
    <Dialog open={abierto} onOpenChange={guardando ? undefined : onAbiertoChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl leading-tight">{titulo}</DialogTitle>
          <DialogDescription className="text-base text-brand-taupe">
            {descripcion}
          </DialogDescription>
        </DialogHeader>

        <FormularioPaso
          valores={valores}
          onCambiar={setValores}
          estaciones={estaciones}
          roles={roles}
        />

        {opcionCatalogo ? (
          <FilaInterruptor
            id="paso-guardar-catalogo"
            pregunta={opcionCatalogo.etiqueta}
            ayuda={opcionCatalogo.ayuda}
            activo={guardarEnCatalogo}
            onCambiar={setGuardarEnCatalogo}
          />
        ) : null}

        {error ? (
          <p
            role="alert"
            className="rounded-2xl border border-red-300 bg-red-50 p-4 text-base font-medium text-red-800"
          >
            {error}
          </p>
        ) : null}

        <div className="sticky bottom-0 -mx-6 -mb-6 flex flex-col gap-3 border-t border-brand-dark/10 bg-brand-card px-6 py-4">
          <Button
            type="button"
            onClick={guardar}
            disabled={guardando}
            aria-label={textoGuardar}
            className="h-16 w-full bg-ember-gradient text-lg font-bold text-white shadow-ember [&_svg]:size-6 hover:brightness-[1.06]"
          >
            {guardando ? (
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="h-6 w-6" aria-hidden="true" />
            )}
            {guardando ? "GUARDANDO…" : textoGuardar}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onAbiertoChange(false)}
            disabled={guardando}
            aria-label="Cancelar y volver"
            className="h-14 w-full text-base font-bold [&_svg]:size-5"
          >
            <X className="h-5 w-5" aria-hidden="true" />
            CANCELAR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
