import type { Metadata } from "next";
import { listarRoles } from "@/lib/data/fabricacion";
import { getSesionOperario } from "@/lib/fabricacion/auth";
import { tiene } from "@/lib/fabricacion/permisos";
import { AvisoSinPermiso } from "@/components/fabricacion/admin/config-compartido";
import { ListaRoles } from "@/components/fabricacion/admin/rol-lista";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Roles y permisos",
};

/**
 * Gestión de roles y permisos (§7 y decisión 5 del dueño).
 *
 * Los roles NO son un enum: son datos editables. Aquí se crean, se editan con
 * casillas en lenguaje llano, se duplican, se activan/desactivan y se eliminan
 * reasignando antes a las personas que los tengan.
 */
export default async function PaginaRolesFabricacion() {
  const sesion = await getSesionOperario();

  if (!tiene(sesion, "gestionar_roles")) {
    return (
      <AvisoSinPermiso
        titulo="Esta pantalla no es para tu usuario"
        mensaje="Aquí se cambian los permisos de todo el equipo, y tu rol no tiene ese permiso. Si necesitas entrar, pídeselo a quien administra el sistema."
      />
    );
  }

  // Se traen también los desactivados: el interruptor "Ver desactivados" los
  // muestra sin tener que volver al servidor.
  const roles = await listarRoles({ incluirInactivos: true });

  return <ListaRoles roles={roles} />;
}
