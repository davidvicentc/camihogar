import { redirect } from "next/navigation";
import { Hammer, PartyPopper, Play, ScanLine } from "lucide-react";

import { getSesionOperario } from "@/lib/fabricacion/auth";
import { getMiTrabajo } from "@/lib/data/fabricacion";
import { BotonGrandeLink } from "@/components/fabricacion/operario/boton-grande";
import { TarjetaMueble } from "@/components/fabricacion/operario/tarjeta-mueble";
import { VacioTaller } from "@/components/fabricacion/operario/vacio-taller";
import {
  formatearDiaLargo,
  primerNombre,
} from "@/components/fabricacion/operario/formato";

/**
 * "MI TRABAJO": la primera pantalla del taller y la que más se mira.
 *
 * Dos listas y nada más:
 *  · SIGUE TRABAJANDO — lo que esta persona dejó empezado (ámbar).
 *  · TE TOCA A TI     — lo que puede coger ahora mismo (azul).
 *
 * Y, pegado abajo, el botón de escanear: si el mueble que tiene delante no
 * aparece en ninguna lista, se lee su código y punto.
 */

export const dynamic = "force-dynamic";

export default async function PaginaMiTrabajo() {
  const sesion = await getSesionOperario();
  if (!sesion) redirect(`/fabrica/login?volver=${encodeURIComponent("/fabrica")}`);

  const { enCurso, listas } = await getMiTrabajo(sesion);
  const nadaQueHacer = enCurso.length === 0 && listas.length === 0;

  return (
    <>
      <header>
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-brand-dark">
          Hola, {primerNombre(sesion.nombre)}
        </h1>
        <p className="mt-1 text-lg capitalize text-brand-taupe">
          {formatearDiaLargo(new Date())}
        </p>
      </header>

      {nadaQueHacer ? (
        <div className="mt-8">
          <VacioTaller
            icono={PartyPopper}
            titulo="No tienes nada pendiente"
            mensaje="Ahora mismo no hay ningún mueble esperándote. Si tienes uno delante, escanea su código para abrirlo."
            accion={{
              href: "/fabrica/escanear",
              texto: "ESCANEAR CÓDIGO",
              icono: ScanLine,
              tono: "marca",
            }}
          />
        </div>
      ) : null}

      {enCurso.length > 0 ? (
        <section className="mt-8" aria-labelledby="titulo-en-curso">
          <h2
            id="titulo-en-curso"
            className="flex items-center gap-3 text-2xl font-bold uppercase tracking-tight text-amber-700"
          >
            <Hammer className="h-8 w-8" aria-hidden="true" />
            Sigue trabajando
          </h2>
          <p className="mt-1 text-lg text-brand-taupe">
            {enCurso.length === 1
              ? "Dejaste 1 mueble empezado."
              : `Dejaste ${enCurso.length} muebles empezados.`}
          </p>
          <ul className="mt-4 space-y-5">
            {enCurso.map((unidad) => (
              <li key={unidad._id}>
                <TarjetaMueble unidad={unidad} variante="enCurso" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {listas.length > 0 ? (
        <section className="mt-10" aria-labelledby="titulo-listas">
          <h2
            id="titulo-listas"
            className="flex items-center gap-3 text-2xl font-bold uppercase tracking-tight text-sky-700"
          >
            <Play className="h-8 w-8" aria-hidden="true" />
            Te toca a ti
          </h2>
          <p className="mt-1 text-lg text-brand-taupe">
            {listas.length === 1
              ? "Hay 1 mueble listo para empezar."
              : `Hay ${listas.length} muebles listos para empezar.`}
          </p>
          <ul className="mt-4 space-y-5">
            {listas.map((unidad) => (
              <li key={unidad._id}>
                <TarjetaMueble unidad={unidad} variante="lista" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Siempre a la vista, justo encima de la barra de abajo. */}
      {nadaQueHacer ? null : (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-30 px-4">
          <div className="pointer-events-auto mx-auto w-full max-w-2xl">
            <BotonGrandeLink href="/fabrica/escanear" tono="marca" icono={ScanLine}>
              ESCANEAR CÓDIGO
            </BotonGrandeLink>
          </div>
        </div>
      )}
    </>
  );
}
