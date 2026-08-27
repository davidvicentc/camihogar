/**
 * Registrar un pedido nuevo. La página sólo trae los datos (catálogo de la
 * tienda y rutas activas); el asistente de tres pasos vive en el cliente.
 */

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvisosFabricacion } from "@/components/fabricacion/admin/tablero-avisos";
import { AsistentePedido } from "@/components/fabricacion/admin/pedido-asistente";
import { SinPermiso, permisosDe } from "@/components/fabricacion/admin/tablero-piezas";
import type {
  OpcionProducto,
  OpcionRuta,
} from "@/components/fabricacion/admin/pedido-lineas";
import { listarRutas } from "@/lib/data/fabricacion";
import { getProducts } from "@/lib/data/products";
import { getSesionOperario } from "@/lib/fabricacion/auth";

export const dynamic = "force-dynamic";

export default async function NuevoPedidoPage() {
  const sesion = await getSesionOperario();
  const permisos = permisosDe(sesion);

  if (!permisos.gestionarPedidos) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold tracking-tight text-brand-dark">
          Nuevo pedido
        </h1>
        <SinPermiso que="el registro de pedidos" />
      </div>
    );
  }

  const [productos, rutas] = await Promise.all([getProducts({}), listarRutas()]);

  const opcionesProducto: OpcionProducto[] = productos.map((producto) => ({
    _id: producto._id,
    titulo: producto.title,
    categoria: producto.category,
    imagen: producto.images[0] ?? "",
    precio: producto.basePrice,
  }));

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
        <Button asChild variant="ghost" className="h-12 -ml-3 text-base font-semibold">
          <Link href="/admin/fabricacion/pedidos">
            <ArrowLeft className="!size-5" aria-hidden="true" />
            Volver a los pedidos
          </Link>
        </Button>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl">
          Registrar un pedido nuevo
        </h1>
        <p className="mt-1 text-lg text-brand-taupe">
          Son tres pantallas. Puedes ir y volver todas las veces que quieras.
        </p>
      </div>

      <AsistentePedido
        productos={opcionesProducto}
        rutas={opcionesRuta}
        verPrecios={permisos.verPrecios}
        imprimirEtiquetas={permisos.imprimirEtiquetas}
      />
    </div>
  );
}
