import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RutaConstructor } from "@/components/fabricacion/admin/ruta-constructor";
import { SinPermiso } from "@/components/fabricacion/admin/ruta-ui";
import {
  getRuta,
  listarCatalogoPasos,
  listarEstaciones,
  listarRoles,
} from "@/lib/data/fabricacion";
import { getSesionOperario } from "@/lib/fabricacion/auth";
import { tiene } from "@/lib/fabricacion/permisos";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const ruta = await getRuta(id);
  return { title: ruta ? `Editar la ruta ${ruta.nombre}` : "Editar una ruta" };
}

export default async function EditarRutaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sesion = await getSesionOperario();

  if (!tiene(sesion, "gestionar_rutas")) {
    return <SinPermiso que="cambiar las rutas de fabricación" />;
  }

  const [ruta, catalogo, estaciones, roles] = await Promise.all([
    getRuta(id),
    listarCatalogoPasos(),
    listarEstaciones(),
    listarRoles(),
  ]);

  if (!ruta) notFound();

  return (
    <RutaConstructor
      rutaInicial={ruta}
      catalogo={catalogo}
      estaciones={estaciones}
      roles={roles}
      unidadesEnCurso={ruta.unidadesEnCurso ?? 0}
    />
  );
}
