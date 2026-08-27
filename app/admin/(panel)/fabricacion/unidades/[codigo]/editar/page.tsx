/**
 * Editar los datos maestros de un mueble y, si aún no ha empezado, cambiarle
 * la ruta de fabricación explicando el motivo.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvisosFabricacion } from "@/components/fabricacion/admin/tablero-avisos";
import { EditarUnidad } from "@/components/fabricacion/admin/unidad-editar";
import { Codigo, SinPermiso, permisosDe } from "@/components/fabricacion/admin/tablero-piezas";
import type { OpcionRuta } from "@/components/fabricacion/admin/pedido-lineas";
import { getUnidad, listarRutas } from "@/lib/data/fabricacion";
import { getSesionOperario } from "@/lib/fabricacion/auth";

export const dynamic = "force-dynamic";

export default async function EditarUnidadPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const sesion = await getSesionOperario();
  const permisos = permisosDe(sesion);

  if (!permisos.gestionarUnidades) {
    return <SinPermiso que="la edición de los muebles" />;
  }

  const [unidad, rutas] = await Promise.all([
    getUnidad(decodeURIComponent(codigo), sesion),
    listarRutas(),
  ]);
  if (!unidad) notFound();

  const opcionesRuta: OpcionRuta[] = rutas.map((ruta) => ({
    _id: ruta._id,
    nombre: ruta.nombre,
    esPredeterminada: ruta.esPredeterminada,
    pasos: ruta.pasos.map((paso) => paso.nombre),
  }));

  return (
    <div className="space-y-6">
      <AvisosFabricacion />

      <div>
        <Button asChild variant="ghost" className="-ml-3 h-12 text-base font-semibold">
          <Link href={`/admin/fabricacion/unidades/${unidad.codigo}`}>
            <ArrowLeft className="!size-5" aria-hidden="true" />
            Volver a la ficha del mueble
          </Link>
        </Button>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl">
          Editar <Codigo valor={unidad.codigo} className="text-3xl sm:text-4xl" />
        </h1>
        <p className="mt-1 text-lg text-brand-taupe">
          {unidad.producto.titulo} · para {unidad.clienteNombre}. Queda anotado quién hace
          cada cambio.
        </p>
      </div>

      <EditarUnidad unidad={unidad} rutas={opcionesRuta} verPrecios={permisos.verPrecios} />
    </div>
  );
}
