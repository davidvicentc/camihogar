import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Ban,
  CalendarClock,
  CircleCheck,
  CirclePause,
  Package,
  Play,
  ScanLine,
  TriangleAlert,
  User,
} from "lucide-react";

import { getSesionOperario } from "@/lib/fabricacion/auth";
import { getUnidad } from "@/lib/data/fabricacion";
import { obtenerRoles, tiene } from "@/lib/fabricacion/permisos";
import {
  ETIQUETAS_PRIORIDAD,
  META_ESTADO_UNIDAD,
} from "@/lib/fabricacion/constantes";
import {
  MENSAJES,
  describirBloqueo,
  indicePasoActual,
  puedeIniciarPaso,
  siguientePasoAccionable,
} from "@/lib/fabricacion/reglas";
import type {
  EstadoUnidad,
  PasoUnidadDTO,
  SesionOperario,
} from "@/lib/types/fabricacion";
import { cn } from "@/lib/utils";
import {
  BotonGrandeLink,
  CartelBloqueo,
} from "@/components/fabricacion/operario/boton-grande";
import { DialogoNota } from "@/components/fabricacion/operario/dialogo-nota";
import { DialogoProblema } from "@/components/fabricacion/operario/dialogo-problema";
import { FotoMueble } from "@/components/fabricacion/operario/foto-mueble";
import { LineaTiempoPasos } from "@/components/fabricacion/operario/linea-tiempo-pasos";
import { VacioTaller } from "@/components/fabricacion/operario/vacio-taller";
import { avisoDeEntrega } from "@/components/fabricacion/operario/formato";

/**
 * LA FICHA DEL MUEBLE — la pantalla a la que lleva el QR.
 *
 * Se lee de lejos: el código en grande arriba del todo (es lo que se compara
 * con la etiqueta), la foto, para quién es, cuándo hay que entregarlo y la
 * línea de tiempo con todos los pasos.
 *
 * Abajo, **un solo botón grande**: el que corresponde al estado del mueble. Si
 * no se puede hacer nada, en su sitio va un cartel que explica por qué y qué
 * hacer, del mismo tamaño, para que la pantalla no cambie de forma.
 */

export const dynamic = "force-dynamic";

export default async function PaginaMueble({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const sesion = await getSesionOperario();

  if (!sesion) {
    redirect(`/fabrica/login?volver=${encodeURIComponent(`/fabrica/u/${codigo}`)}`);
  }

  const unidad = await getUnidad(codigo, sesion);

  if (!unidad) {
    return (
      <VacioTaller
        icono={Package}
        titulo="No encontramos ese mueble"
        mensaje={`No hay ningún mueble con el código «${codigo}». Puede que la etiqueta esté borrosa o que ese mueble ya no exista. Vuelve a escanear el código.`}
        accion={{
          href: "/fabrica/escanear",
          texto: "ESCANEAR OTRA VEZ",
          icono: ScanLine,
          tono: "marca",
        }}
        secundaria={{ href: "/fabrica", texto: "Ir a mi trabajo" }}
      />
    );
  }

  const roles = await obtenerRoles();
  const nombresRoles = Object.fromEntries(roles.map((rol) => [rol.clave, rol.nombre]));

  const pasos = unidad.pasos;
  const indice = indicePasoActual(pasos);
  const pasoActual = pasos.length > 0 ? pasos[indice] : null;
  const accionable = siguientePasoAccionable(pasos);
  const metaEstado = META_ESTADO_UNIDAD[unidad.estado];
  const IconoEstado = metaEstado.icono;
  const prioridad = ETIQUETAS_PRIORIDAD[unidad.prioridad];
  const IconoPrioridad = prioridad.icono;
  const aviso = avisoDeEntrega(unidad.fechaPrometida);
  const problemas = unidad.incidenciasAbiertas ?? 0;

  // El paso que el operario tiene entre manos: el que puede tocar ya y, si no
  // hay ninguno accionable, el que marca en qué punto está el mueble.
  const pasoEnMano = accionable ?? pasoActual;

  // Si el mueble está parado, cancelado o con un problema, no se pide escanear:
  // esa pantalla tiene que enseñar un solo mensaje, no dos cosas que hacer.
  const enMarcha = unidad.estado === "PENDIENTE" || unidad.estado === "EN_PROCESO";

  const faltaEscanear =
    enMarcha &&
    problemas === 0 &&
    pasoEnMano !== null &&
    pasoEnMano.requiereEscaneo &&
    pasoEnMano.escaneadoAt === null &&
    (pasoEnMano.estado === "LISTO" || pasoEnMano.estado === "EN_CURSO");

  return (
    <>
      {/* ── Identidad del mueble ─────────────────────────────────────── */}
      <header>
        <p className="text-base font-bold uppercase tracking-wide text-brand-taupe">
          Mueble
        </p>
        <h1 className="select-all font-mono text-4xl font-bold leading-none tracking-tight text-brand-dark sm:text-5xl">
          {unidad.codigo}
        </h1>

        <div className="mt-5 flex gap-4">
          <FotoMueble
            src={unidad.producto.imagen}
            alt={unidad.producto.titulo}
            className="h-28 w-28 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xl font-bold leading-tight text-brand-dark">
              {unidad.producto.titulo}
            </p>
            <p className="mt-2 flex items-center gap-2 text-lg text-brand-taupe">
              <User className="h-6 w-6 shrink-0" aria-hidden="true" />
              <span className="truncate">Para: {unidad.clienteNombre}</span>
            </p>
            <p className="mt-1 text-base text-brand-taupe">
              Pedido{" "}
              <span className="font-mono font-semibold">{unidad.pedidoCodigo}</span>
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex min-h-[40px] items-center gap-2 rounded-full px-4 text-base font-bold",
              metaEstado.clases
            )}
          >
            <IconoEstado className="h-5 w-5" aria-hidden="true" />
            {metaEstado.label}
          </span>
          {unidad.prioridad !== "NORMAL" ? (
            <span
              className={cn(
                "inline-flex min-h-[40px] items-center gap-2 rounded-full px-4 text-base font-bold",
                prioridad.clases
              )}
            >
              <IconoPrioridad className="h-5 w-5" aria-hidden="true" />
              {prioridad.label}
            </span>
          ) : null}
          {unidad.ubicacionActualNombre ? (
            <span className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-brand-sand px-4 text-base font-semibold text-brand-taupe">
              {unidad.ubicacionActualNombre}
            </span>
          ) : null}
        </div>

        {aviso ? (
          <p
            className={cn(
              "mt-4 flex items-center gap-3 rounded-3xl border-2 p-4 text-lg font-bold leading-snug",
              aviso.tarde
                ? "border-red-400 bg-red-50 text-red-800"
                : aviso.cerca
                  ? "border-orange-300 bg-orange-50 text-orange-800"
                  : "border-brand-dark/10 bg-brand-card text-brand-taupe"
            )}
            role={aviso.tarde ? "alert" : undefined}
          >
            <CalendarClock className="h-8 w-8 shrink-0" aria-hidden="true" />
            <span>
              {aviso.texto}
              <span className="block text-base font-semibold opacity-80">
                Fecha prometida: {aviso.fecha}
              </span>
            </span>
          </p>
        ) : null}
      </header>

      {/* ── Progreso ─────────────────────────────────────────────────── */}
      {pasos.length > 0 ? (
        <section className="mt-7" aria-labelledby="titulo-progreso">
          <div className="flex items-baseline justify-between gap-3">
            <h2
              id="titulo-progreso"
              className="text-2xl font-bold uppercase tracking-tight text-brand-dark"
            >
              Paso {indice + 1} de {pasos.length}
            </h2>
            <p className="text-xl font-bold text-brand-accent">{unidad.progreso}%</p>
          </div>
          <div
            className="mt-3 h-6 w-full overflow-hidden rounded-full bg-brand-sand"
            role="progressbar"
            aria-valuenow={unidad.progreso}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Cuánto lleva hecho este mueble"
          >
            <span
              className="block h-full rounded-full bg-brand-accent transition-all duration-500"
              style={{ width: `${unidad.progreso}%` }}
            />
          </div>
          {pasoActual ? (
            <p className="mt-2 text-lg text-brand-taupe">
              Ahora toca: <strong className="text-brand-dark">{pasoActual.nombre}</strong>
            </p>
          ) : null}
        </section>
      ) : null}

      {/* ── Aviso de escaneo pendiente ───────────────────────────────── */}
      {faltaEscanear ? (
        <section className="mt-6 rounded-3xl border-4 border-sky-400 bg-sky-50 p-5">
          <p className="flex items-start gap-3 text-xl font-bold leading-snug text-sky-900">
            <ScanLine className="mt-0.5 h-8 w-8 shrink-0" aria-hidden="true" />
            <span>Primero escanea el código del mueble para recibirlo</span>
          </p>
          <p className="mt-2 text-lg leading-relaxed text-sky-900">
            Este paso necesita que leas el código pegado al mueble. Así queda anotado que
            llegó a tus manos.
          </p>
          <div className="mt-5">
            <BotonGrandeLink href="/fabrica/escanear" tono="azul" icono={ScanLine}>
              ESCANEAR EL CÓDIGO
            </BotonGrandeLink>
          </div>
        </section>
      ) : null}

      {/* ── Línea de tiempo ──────────────────────────────────────────── */}
      <section className="mt-8" aria-labelledby="titulo-historial">
        <h2
          id="titulo-historial"
          className="text-2xl font-bold uppercase tracking-tight text-brand-dark"
        >
          Todos los pasos
        </h2>
        <div className="mt-4">
          <LineaTiempoPasos pasos={pasos} indiceActual={indice} />
        </div>
      </section>

      {unidad.notas ? (
        <section className="mt-7 rounded-3xl border-2 border-brand-dark/5 bg-brand-card p-5">
          <h2 className="text-lg font-bold uppercase tracking-wide text-brand-taupe">
            Notas del mueble
          </h2>
          <p className="mt-2 whitespace-pre-line text-lg leading-relaxed text-brand-dark">
            {unidad.notas}
          </p>
        </section>
      ) : null}

      {/* ── La acción: un solo botón grande ──────────────────────────── */}
      <section className="mt-9 space-y-4" aria-label="Qué puedes hacer con este mueble">
        <AccionPrincipal
          codigo={unidad.codigo}
          estadoUnidad={unidad.estado}
          problemas={problemas}
          pasos={pasos}
          accionable={accionable}
          pasoActual={pasoActual}
          faltaEscanear={faltaEscanear}
          sesion={sesion}
          nombresRoles={nombresRoles}
        />

        {tiene(sesion, "reportar_incidencias") && problemas === 0 ? (
          <DialogoProblema
            codigo={unidad.codigo}
            pasoClave={pasoActual?.clave ?? ""}
            pasoNombre={pasoActual?.nombre ?? ""}
          />
        ) : null}

        {/*
          Un recado para quien siga con el mueble: no bloquea nada y queda en la
          bitácora con el nombre de quien lo escribe. Es lo que evita que un
          detalle sin importancia acabe abriendo un problema que sí para el
          mueble. Va con «trabajar» porque se escribe desde el banco de trabajo.
        */}
        {tiene(sesion, "trabajar") ? <DialogoNota codigo={unidad.codigo} /> : null}

        <Link
          href="/fabrica"
          className="flex min-h-[56px] w-full items-center justify-center gap-3 rounded-3xl border-2 border-brand-dark/15 px-4 text-lg font-semibold text-brand-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-accent/60"
        >
          <span>Volver a mi trabajo</span>
          <ArrowRight className="h-6 w-6" aria-hidden="true" />
        </Link>
      </section>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * EL BOTÓN GRANDE (o el cartel que lo sustituye)
 * ──────────────────────────────────────────────────────────────────────────── */

interface AccionPrincipalProps {
  codigo: string;
  estadoUnidad: EstadoUnidad;
  problemas: number;
  pasos: PasoUnidadDTO[];
  /** El paso sobre el que se puede actuar ya, si lo hay. */
  accionable: PasoUnidadDTO | null;
  /** En el que está el mueble ahora (puede estar bloqueado). */
  pasoActual: PasoUnidadDTO | null;
  /** El paso de ahora pide escanear el código y todavía nadie lo escaneó. */
  faltaEscanear: boolean;
  sesion: SesionOperario;
  nombresRoles: Record<string, string>;
}

function AccionPrincipal({
  codigo,
  estadoUnidad,
  problemas,
  pasos,
  accionable,
  pasoActual,
  faltaEscanear,
  sesion,
  nombresRoles,
}: AccionPrincipalProps) {
  if (estadoUnidad === "CANCELADA") {
    return (
      <CartelBloqueo
        icono={Ban}
        titulo="Este mueble está cancelado"
        detalle="Ya no hay que fabricarlo. Si crees que es un error, avisa a tu supervisor."
      />
    );
  }

  if (problemas > 0) {
    return (
      <CartelBloqueo
        icono={TriangleAlert}
        tono="rojo"
        titulo="Este mueble tiene un problema sin resolver"
        detalle={MENSAJES.incidenciaAbierta}
      />
    );
  }

  if (estadoUnidad === "ENTREGADA") {
    return (
      <CartelBloqueo
        icono={CircleCheck}
        tono="verde"
        titulo="ESTE MUEBLE YA SE ENTREGÓ"
        detalle="El cliente ya lo recibió. No queda nada por hacer."
      />
    );
  }

  if (estadoUnidad === "TERMINADA") {
    return (
      <CartelBloqueo
        icono={CircleCheck}
        tono="verde"
        titulo="ESTE MUEBLE YA ESTÁ LISTO"
        detalle="Todos los pasos están hechos. Ahora toca entregarlo al cliente."
      />
    );
  }

  if (estadoUnidad === "PAUSADA") {
    return (
      <CartelBloqueo
        icono={CirclePause}
        tono="gris"
        titulo="Este mueble está en pausa"
        detalle="Tu supervisor lo detuvo a propósito. Él lo vuelve a poner en marcha cuando toque."
      />
    );
  }

  if (pasos.length === 0) {
    return <CartelBloqueo icono={Package} titulo="Sin pasos" detalle={MENSAJES.sinPasos} />;
  }

  // Mientras falte el escaneo, el ÚNICO botón azul de la pantalla es el de
  // escanear (el bloque de arriba). Aquí va un cartel, nunca otro botón: si no,
  // el operario toca este y la pantalla del paso le vuelve a pedir el escaneo.
  if (faltaEscanear) {
    return (
      <CartelBloqueo
        icono={ScanLine}
        titulo="Primero escanea el código de arriba"
        detalle={MENSAJES.faltaEscaneo}
      />
    );
  }

  if (accionable && accionable.estado === "EN_CURSO") {
    return (
      <BotonGrandeLink
        href={`/fabrica/u/${codigo}/paso/${accionable.clave}`}
        tono="ambar"
        icono={ArrowRight}
        ariaLabel={`Continuar el paso ${accionable.nombre} del mueble ${codigo}`}
      >
        CONTINUAR EL PASO
      </BotonGrandeLink>
    );
  }

  if (accionable && accionable.estado === "LISTO") {
    const permiso = puedeIniciarPaso(pasos, accionable.clave, sesion, nombresRoles);
    if (permiso.ok) {
      return (
        <BotonGrandeLink
          href={`/fabrica/u/${codigo}/paso/${accionable.clave}`}
          tono="azul"
          icono={Play}
          ariaLabel={`Empezar el paso ${accionable.nombre} del mueble ${codigo}`}
        >
          EMPEZAR ESTE PASO
        </BotonGrandeLink>
      );
    }
    return (
      <CartelBloqueo
        icono={TriangleAlert}
        titulo="Este paso no te toca a ti"
        detalle={permiso.motivo || "Avisa a tu supervisor para que lo reparta."}
      />
    );
  }

  return (
    <CartelBloqueo
      icono={TriangleAlert}
      titulo="Todavía no se puede tocar este mueble"
      detalle={
        (pasoActual ? describirBloqueo(pasos, pasoActual.clave) : "") ||
        "Avisa a tu supervisor para que lo desbloquee."
      }
    />
  );
}
