import type { Metadata } from "next";
import { listarEstaciones } from "@/lib/data/fabricacion";
import { getSesionOperario } from "@/lib/fabricacion/auth";
import { tiene } from "@/lib/fabricacion/permisos";
import { AvisoSinPermiso } from "@/components/fabricacion/admin/config-compartido";
import { ListaEstaciones } from "@/components/fabricacion/admin/estacion-lista";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Áreas de trabajo",
};

/**
 * CRUD completo de áreas de trabajo (§7): crear, leer, listar agrupado por
 * tipo, editar, activar/desactivar, eliminar (lógico si el área está en uso) y
 * restaurar. El orden dentro de cada grupo se cambia con las flechas ▲▼.
 */
export default async function PaginaEstacionesFabricacion() {
  const sesion = await getSesionOperario();

  if (!tiene(sesion, "gestionar_estaciones")) {
    return (
      <AvisoSinPermiso
        titulo="Esta pantalla no es para tu usuario"
        mensaje="Aquí se mantienen los talleres, almacenes, camiones y tiendas, y tu rol no tiene ese permiso. Si necesitas entrar, pídeselo a quien administra el sistema."
      />
    );
  }

  // También las apagadas y las eliminadas: los interruptores de la pantalla las
  // muestran sin tener que volver al servidor.
  const estaciones = await listarEstaciones({
    incluirInactivas: true,
    incluirEliminadas: true,
  });

  return <ListaEstaciones estaciones={estaciones} />;
}
