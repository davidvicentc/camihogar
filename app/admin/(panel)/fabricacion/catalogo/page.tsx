import { Suspense } from "react";
import type { Metadata } from "next";
import { CatalogoListado } from "@/components/fabricacion/admin/catalogo-listado";
import { SinPermiso } from "@/components/fabricacion/admin/ruta-ui";
import { listarCatalogoPasos, listarEstaciones, listarRoles } from "@/lib/data/fabricacion";
import { getSesionOperario } from "@/lib/fabricacion/auth";
import { tiene } from "@/lib/fabricacion/permisos";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pasos del taller",
};

export default async function CatalogoPasosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const sesion = await getSesionOperario();

  if (!tiene(sesion, "gestionar_catalogo")) {
    return <SinPermiso que="ver y cambiar los pasos del taller" />;
  }

  const verDesactivados = sp.desactivados === "1";

  const [pasos, estaciones, roles] = await Promise.all([
    listarCatalogoPasos({ incluirInactivos: verDesactivados }),
    listarEstaciones(),
    listarRoles(),
  ]);

  return (
    <Suspense fallback={<p className="text-lg text-brand-taupe">Cargando los pasos…</p>}>
      <CatalogoListado
        pasos={pasos}
        estaciones={estaciones}
        roles={roles}
        verDesactivados={verDesactivados}
      />
    </Suspense>
  );
}
