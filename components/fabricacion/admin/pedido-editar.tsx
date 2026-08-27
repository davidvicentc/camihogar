"use client";

/**
 * Editar un pedido ya registrado: datos del cliente, canal, urgencia, fecha
 * prometida y notas.
 *
 * Reutiliza EL MISMO formulario del asistente (§7: crear y editar comparten
 * formulario), sólo que arrancando con lo que ya estaba guardado.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  FormularioPedido,
  validarPedido,
  type DatosPedido,
} from "@/components/fabricacion/admin/pedido-formulario-cliente";
import { avisoOk } from "@/components/fabricacion/admin/tablero-avisos";
import { paraInputFecha } from "@/components/fabricacion/admin/tablero-piezas";
import { actualizarPedido } from "@/lib/actions/fabricacion";
import type { PedidoDTO } from "@/lib/types/fabricacion";

/** Convierte el pedido guardado en el borrador que entiende el formulario. */
function aBorrador(pedido: PedidoDTO): DatosPedido {
  return {
    nombre: pedido.cliente.nombre,
    telefono: pedido.cliente.telefono,
    cedula: pedido.cliente.cedula,
    direccion: pedido.cliente.direccion,
    ciudad: pedido.cliente.ciudad,
    email: pedido.cliente.email,
    canal: pedido.canal,
    prioridad: pedido.prioridad,
    fechaPrometida: paraInputFecha(pedido.fechaPrometida),
    notas: pedido.notas,
  };
}

export function EditarPedido({ pedido }: { pedido: PedidoDTO }) {
  const router = useRouter();
  const [datos, setDatos] = useState<DatosPedido>(() => aBorrador(pedido));
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    const aviso = validarPedido(datos);
    if (aviso) {
      setError(aviso);
      return;
    }

    setError(null);
    setGuardando(true);
    try {
      const resultado = await actualizarPedido(pedido.codigo, {
        cliente: {
          nombre: datos.nombre.trim(),
          telefono: datos.telefono.trim(),
          cedula: datos.cedula.trim(),
          direccion: datos.direccion.trim(),
          ciudad: datos.ciudad.trim(),
          email: datos.email.trim(),
        },
        canal: datos.canal,
        prioridad: datos.prioridad,
        fechaPrometida: datos.fechaPrometida === "" ? null : datos.fechaPrometida,
        notas: datos.notas.trim(),
      });

      if (!resultado.ok) {
        setError(resultado.error ?? "No pudimos guardar los cambios. Vuelve a intentarlo.");
        return;
      }

      avisoOk(`Los datos del pedido ${pedido.codigo} quedaron guardados.`);
      router.push(`/admin/fabricacion/pedidos/${pedido.codigo}`);
      router.refresh();
    } catch {
      setError("No pudimos conectar con el servidor. Revisa la conexión y reintenta.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-base font-medium text-red-800"
        >
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <Card>
        <CardContent className="p-6">
          <FormularioPedido valor={datos} alCambiar={setDatos} />
        </CardContent>
      </Card>

      <p className="rounded-2xl bg-brand-sand/60 p-4 text-base text-brand-dark">
        Los muebles de este pedido no se tocan aquí. Para añadir o quitar muebles, vuelve a
        la ficha del pedido.
      </p>

      <div className="space-y-3">
        <Button
          type="button"
          variant="accent"
          className="h-20 w-full rounded-2xl text-xl font-bold"
          disabled={guardando}
          onClick={guardar}
        >
          {guardando ? (
            <Loader2 className="!size-7 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="!size-7" aria-hidden="true" />
          )}
          {guardando ? "GUARDANDO…" : "GUARDAR LOS CAMBIOS"}
        </Button>

        <Button asChild variant="ghost" className="h-14 w-full text-base font-semibold">
          <Link href={`/admin/fabricacion/pedidos/${pedido.codigo}`}>
            <ArrowLeft className="!size-5" aria-hidden="true" />
            Salir sin guardar
          </Link>
        </Button>
      </div>
    </div>
  );
}
