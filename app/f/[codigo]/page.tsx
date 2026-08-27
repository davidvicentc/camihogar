import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Package } from "lucide-react";

import { getSesionOperario } from "@/lib/fabricacion/auth";
import { getUnidad } from "@/lib/data/fabricacion";
import { normalizarCodigo } from "@/lib/fabricacion/codigos";
import { tiene } from "@/lib/fabricacion/permisos";
import { RedirigirEscaneo } from "@/components/fabricacion/operario/redirigir-escaneo";
import { VacioTaller } from "@/components/fabricacion/operario/vacio-taller";

/**
 * A DONDE LLEVA EL QR DE LA ETIQUETA.
 *
 * La etiqueta del mueble lleva sólo `{sitio}/f/COD-XXXXXX`: **sin ninguna clave
 * ni código secreto en la dirección** (decisión del dueño). Quien no tiene la
 * sesión iniciada no ve nada; lo mandamos a entrar y, al volver, aterriza justo
 * en el mueble que escaneó.
 *
 * El código se acepta escrito como sea (`949473`, `cod-949473`, con espacios o
 * la URL entera): de eso se encarga `normalizarCodigo`.
 */

export const metadata: Metadata = {
  title: "Mueble — CamiHogar",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** La pantalla amable de "esto no existe", con salida al escáner. */
function NoEncontrado({ codigo }: { codigo: string }) {
  return (
    <main className="min-h-screen bg-brand-bg px-4 py-10 text-lg text-brand-dark">
      <div className="mx-auto w-full max-w-md">
        <VacioTaller
          icono={Package}
          titulo="No encontramos ese mueble"
          mensaje={`No hay ningún mueble con el código «${codigo}». Puede que la etiqueta esté borrosa o que ese mueble ya no exista. Prueba a escanearlo otra vez o escribe el código a mano.`}
          accion={{
            href: "/fabrica/escanear",
            texto: "ESCANEAR OTRA VEZ",
            icono: Package,
            tono: "marca",
          }}
          secundaria={{ href: "/fabrica", texto: "Ir a mi trabajo" }}
        />
      </div>
    </main>
  );
}

export default async function PaginaQr({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const canonico = normalizarCodigo(codigo);

  if (!canonico) return <NoEncontrado codigo={codigo} />;

  // Primero se comprueba que el mueble exista: así, si la etiqueta está mal, no
  // se manda a nadie a escribir su PIN para acabar en un callejón sin salida.
  const sesion = await getSesionOperario();
  const unidad = await getUnidad(canonico, sesion);

  if (!unidad) return <NoEncontrado codigo={canonico} />;

  if (!sesion) {
    redirect(
      `/fabrica/login?volver=${encodeURIComponent(`/fabrica/u/${unidad.codigo}`)}`
    );
  }

  return (
    <RedirigirEscaneo
      codigo={unidad.codigo}
      puedeEscanear={tiene(sesion, "escanear")}
    />
  );
}
