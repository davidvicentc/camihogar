import type { Metadata } from "next";
import {
  listarEstaciones,
  listarOperarios,
  listarRoles,
} from "@/lib/data/fabricacion";
import { getSesionOperario } from "@/lib/fabricacion/auth";
import { tiene } from "@/lib/fabricacion/permisos";
import { AvisoSinPermiso } from "@/components/fabricacion/admin/config-compartido";
import { ListaEquipo } from "@/components/fabricacion/admin/equipo-lista";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Equipo",
};

/**
 * CRUD completo de personas (§7 y decisión 3 del dueño: los usuarios sólo los
 * crea quien tenga la capacidad `gestionar_usuarios`).
 *
 * Se traen también las desactivadas y las eliminadas para que los filtros y el
 * interruptor «Ver eliminadas» funcionen sin volver al servidor.
 */
export default async function PaginaEquipoFabricacion() {
  const sesion = await getSesionOperario();

  if (!tiene(sesion, "gestionar_usuarios")) {
    return (
      <AvisoSinPermiso
        titulo="Esta pantalla no es para tu usuario"
        mensaje="Aquí se dan de alta las personas del equipo y se les cambia el PIN, y tu rol no tiene ese permiso. Si necesitas entrar, pídeselo a quien administra el sistema."
      />
    );
  }

  const [personas, roles, estaciones] = await Promise.all([
    listarOperarios({ incluirInactivos: true, incluirEliminados: true }),
    listarRoles({ incluirInactivos: true }),
    listarEstaciones({ incluirInactivas: true }),
  ]);

  return (
    <ListaEquipo
      personas={personas}
      roles={roles}
      estaciones={estaciones}
      miUid={sesion?.uid ?? ""}
    />
  );
}
