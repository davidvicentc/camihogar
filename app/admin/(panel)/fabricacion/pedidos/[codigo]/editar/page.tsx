/**
 * Editar los datos de un pedido ya registrado.
 *
 * Reutiliza el mismo formulario del asistente de alta (§7), así que quien
 * registró el pedido se encuentra exactamente los mismos campos.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvisosFabricacion } from "@/components/fabricacion/admin/tablero-avisos";
import { EditarPedido } from "@/components/fabricacion/admin/pedido-editar";
import { Codigo, SinPermiso, permisosDe } from "@/components/fabricacion/admin/tablero-piezas";
import { getPedido } from "@/lib/data/fabricacion";
import { getSesionOperario } from "@/lib/fabricacion/auth";

export const dynamic = "force-dynamic";

export default async function EditarPedidoPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const sesion = await getSesionOperario();
  const permisos = permisosDe(sesion);

  if (!permisos.gestionarPedidos) {
    return <SinPermiso que="la edición de pedidos" />;
  }

  const pedido = await getPedido(decodeURIComponent(codigo), sesion);
  if (!pedido) notFound();

  return (
    <div className="space-y-6">
      <AvisosFabricacion />

      <div>
        <Button asChild variant="ghost" className="-ml-3 h-12 text-base font-semibold">
          <Link href={`/admin/fabricacion/pedidos/${pedido.codigo}`}>
            <ArrowLeft className="!size-5" aria-hidden="true" />
            Volver a la ficha del pedido
          </Link>
        </Button>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl">
          Editar el pedido <Codigo valor={pedido.codigo} className="text-3xl sm:text-4xl" />
        </h1>
        <p className="mt-1 text-lg text-brand-taupe">
          Cambia lo que haga falta y guarda. Queda anotado quién hizo el cambio.
        </p>
      </div>

      <EditarPedido pedido={pedido} />
    </div>
  );
}
