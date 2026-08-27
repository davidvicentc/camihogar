import type { Metadata } from "next";
import { RutaConstructor } from "@/components/fabricacion/admin/ruta-constructor";
import { SinPermiso } from "@/components/fabricacion/admin/ruta-ui";
import { listarCatalogoPasos, listarEstaciones, listarRoles } from "@/lib/data/fabricacion";
import { getSesionOperario } from "@/lib/fabricacion/auth";
import { tiene } from "@/lib/fabricacion/permisos";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Crear una ruta",
};

export default async function NuevaRutaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const sesion = await getSesionOperario();

  if (!tiene(sesion, "gestionar_rutas")) {
    return <SinPermiso que="crear rutas de fabricación" />;
  }

  const [catalogo, estaciones, roles] = await Promise.all([
    listarCatalogoPasos(),
    listarEstaciones(),
    listarRoles(),
  ]);

  return (
    <RutaConstructor
      catalogo={catalogo}
      estaciones={estaciones}
      roles={roles}
      plantillaInicial={sp.plantilla ?? null}
    />
  );
}
