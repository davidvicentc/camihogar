import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CircleCheck, Package, ScanLine, TriangleAlert } from "lucide-react";

import { getSesionOperario } from "@/lib/fabricacion/auth";
import { getUnidad } from "@/lib/data/fabricacion";
import { obtenerRoles } from "@/lib/fabricacion/permisos";
import { MENSAJES, puedeIniciarPaso } from "@/lib/fabricacion/reglas";
import { AsistentePaso } from "@/components/fabricacion/operario/asistente-paso";
import { BotonGrandeLink } from "@/components/fabricacion/operario/boton-grande";
import { VacioTaller } from "@/components/fabricacion/operario/vacio-taller";

/**
 * EL ASISTENTE DE UN PASO.
 *
 * Esta página sólo decide si se puede entrar al asistente y con qué datos; todo
 * lo demás (una pantalla por requisito) lo lleva `AsistentePaso`.
 *
 * Antes de dejar pasar comprueba, en este orden:
 *  1. que el mueble exista y el paso también,
 *  2. que el paso no esté ya terminado o saltado,
 *  3. que no falte escanear el mueble (handoff entre áreas),
 *  4. que esta persona pueda hacerlo (rol, orden de los pasos, problemas).
 * Cada "no" se explica con una frase que dice qué hacer, nunca con un error.
 */

export const dynamic = "force-dynamic";

export default async function PaginaAsistentePaso({
  params,
}: {
  params: Promise<{ codigo: string; clave: string }>;
}) {
  const { codigo, clave } = await params;
  const sesion = await getSesionOperario();

  if (!sesion) {
    redirect(
      `/fabrica/login?volver=${encodeURIComponent(`/fabrica/u/${codigo}/paso/${clave}`)}`
    );
  }

  const unidad = await getUnidad(codigo, sesion);

  if (!unidad) {
    return (
      <VacioTaller
        icono={Package}
        titulo="No encontramos ese mueble"
        mensaje={`No hay ningún mueble con el código «${codigo}». Vuelve a escanear el código pegado al mueble.`}
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

  const indice = unidad.pasos.findIndex((paso) => paso.clave === clave);
  const paso = indice >= 0 ? unidad.pasos[indice] : null;

  if (!paso) {
    return (
      <VacioTaller
        icono={TriangleAlert}
        titulo="No encontramos ese paso"
        mensaje={MENSAJES.pasoNoExiste}
        accion={{
          href: `/fabrica/u/${unidad.codigo}`,
          texto: "VER EL MUEBLE",
          icono: ArrowLeft,
          tono: "oscuro",
        }}
      />
    );
  }

  /* ── Ya está hecho: no hay nada que rellenar ────────────────────────── */
  if (paso.estado === "COMPLETADO" || paso.estado === "OMITIDO") {
    return (
      <VacioTaller
        icono={CircleCheck}
        titulo={
          paso.estado === "COMPLETADO"
            ? "Este paso ya está terminado"
            : "Este paso se saltó"
        }
        mensaje={
          paso.estado === "COMPLETADO"
            ? `«${paso.nombre}» ya lo terminó ${paso.completadoPorNombre || "alguien del equipo"}. Vuelve al mueble para ver qué toca ahora.`
            : `«${paso.nombre}» no hizo falta y se saltó. Vuelve al mueble para ver qué toca ahora.`
        }
        accion={{
          href: `/fabrica/u/${unidad.codigo}`,
          texto: "VER EL MUEBLE",
          icono: ArrowLeft,
          tono: "oscuro",
        }}
      />
    );
  }

  /* ── Falta recibir el mueble con la cámara ──────────────────────────── */
  if (paso.requiereEscaneo && paso.escaneadoAt === null) {
    return (
      <section>
        <Link
          href={`/fabrica/u/${unidad.codigo}`}
          className="flex min-h-[56px] w-fit items-center gap-3 rounded-3xl border-2 border-brand-dark/15 px-5 text-lg font-bold text-brand-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-accent/60"
        >
          <ArrowLeft className="h-7 w-7" aria-hidden="true" />
          <span>ATRÁS</span>
        </Link>

        <div className="mt-6 rounded-3xl border-4 border-sky-400 bg-sky-50 p-6">
          <h1 className="flex items-start gap-3 text-3xl font-bold leading-tight text-sky-900">
            <ScanLine className="mt-1 h-10 w-10 shrink-0" aria-hidden="true" />
            <span>Primero escanea el código del mueble para recibirlo</span>
          </h1>
          <p className="mt-4 text-xl leading-relaxed text-sky-900">
            El paso «{paso.nombre}» necesita que leas el código pegado al mueble{" "}
            <span className="font-mono font-bold">{unidad.codigo}</span>. Así queda
            anotado que llegó a tus manos.
          </p>
          <div className="mt-7">
            <BotonGrandeLink href="/fabrica/escanear" tono="azul" icono={ScanLine}>
              ESCANEAR EL CÓDIGO
            </BotonGrandeLink>
          </div>
        </div>
      </section>
    );
  }

  const roles = await obtenerRoles();
  const nombresRoles = Object.fromEntries(roles.map((rol) => [rol.clave, rol.nombre]));

  /* ── ¿Puede esta persona empezarlo? ─────────────────────────────────── */
  if (paso.estado !== "EN_CURSO") {
    const permiso = puedeIniciarPaso(unidad.pasos, paso.clave, sesion, nombresRoles);
    if (!permiso.ok) {
      return (
        <VacioTaller
          icono={TriangleAlert}
          titulo="Todavía no puedes hacer este paso"
          mensaje={permiso.motivo ?? "Avisa a tu supervisor para que lo desbloquee."}
          accion={{
            href: `/fabrica/u/${unidad.codigo}`,
            texto: "VER EL MUEBLE",
            icono: ArrowLeft,
            tono: "oscuro",
          }}
          secundaria={{ href: "/fabrica", texto: "Ir a mi trabajo" }}
        />
      );
    }
  }

  return (
    <AsistentePaso
      codigo={unidad.codigo}
      tituloMueble={unidad.producto.titulo}
      clienteNombre={unidad.clienteNombre}
      imagenMueble={unidad.producto.imagen}
      paso={paso}
      numeroPaso={indice + 1}
      totalPasos={unidad.pasos.length}
      sesion={sesion}
      nombresRoles={nombresRoles}
    />
  );
}
