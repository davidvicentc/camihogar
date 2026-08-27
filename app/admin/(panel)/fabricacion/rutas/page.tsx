import { Suspense } from "react";
import type { Metadata } from "next";
import { RutasListado } from "@/components/fabricacion/admin/ruta-listado";
import { SinPermiso } from "@/components/fabricacion/admin/ruta-ui";
import { listarRutas } from "@/lib/data/fabricacion";
import { getSesionOperario } from "@/lib/fabricacion/auth";
import { tiene } from "@/lib/fabricacion/permisos";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rutas de fabricación",
};

export default async function RutasFabricacionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const sesion = await getSesionOperario();

  if (!tiene(sesion, "gestionar_rutas")) {
    return <SinPermiso que="ver y cambiar las rutas de fabricación" />;
  }

  const verArchivadas = sp.archivadas === "1";

  // "Ver archivadas" enseña SÓLO las archivadas; en la vista normal se
  // incluyen las inactivas para que nada se quede escondido sin querer.
  const rutas = await listarRutas({
    soloArchivadas: verArchivadas,
    incluirArchivadas: verArchivadas,
    incluirInactivas: true,
  });

  return (
    <Suspense
      fallback={<p className="text-lg text-brand-taupe">Cargando las rutas…</p>}
    >
      <RutasListado rutas={rutas} verArchivadas={verArchivadas} />
    </Suspense>
  );
}
