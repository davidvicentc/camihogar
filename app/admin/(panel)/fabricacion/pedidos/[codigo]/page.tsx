/**
 * Ficha de un pedido: quién lo pidió, cómo va, qué muebles lleva y todo lo que
 * se puede hacer con él.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { SiWhatsapp } from "@icons-pack/react-simple-icons";
import { ArrowLeft, History, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvisosFabricacion } from "@/components/fabricacion/admin/tablero-avisos";
import { AccionesPedido } from "@/components/fabricacion/admin/pedido-acciones";
import {
  BarraProgreso,
  ChipCanal,
  ChipEstadoPedido,
  ChipPrioridad,
  Codigo,
  Dato,
  EstadoVacio,
  ProgresoPedido,
  SinPermiso,
  fechaCorta,
  fechaLarga,
  permisosDe,
  whatsappDelCliente,
} from "@/components/fabricacion/admin/tablero-piezas";
import { TablaUnidades } from "@/components/fabricacion/admin/unidad-tabla";
import { HistorialCambios } from "@/components/fabricacion/admin/unidad-auditoria";
import type {
  OpcionProducto,
  OpcionRuta,
} from "@/components/fabricacion/admin/pedido-lineas";
import { getAuditoriaDeEntidad, getPedido, listarRutas } from "@/lib/data/fabricacion";
import { getProducts } from "@/lib/data/products";
import { getSesionOperario } from "@/lib/fabricacion/auth";
import { seguimientoPublicoActivo } from "@/lib/fabricacion/constantes";
import { getSiteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FichaPedidoPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const sesion = await getSesionOperario();
  const permisos = permisosDe(sesion);

  if (!permisos.verTablero && !permisos.gestionarPedidos) {
    return <SinPermiso que="los pedidos" />;
  }

  const pedido = await getPedido(decodeURIComponent(codigo), sesion);
  if (!pedido) notFound();

  const unidades = pedido.unidades ?? [];
  const hoyIso = new Date().toISOString().slice(0, 10);

  // El catálogo y las rutas sólo hacen falta para el diálogo "Añadir muebles".
  const [productos, rutas, auditoria] = await Promise.all([
    permisos.gestionarPedidos ? getProducts({}) : Promise.resolve([]),
    permisos.gestionarPedidos ? listarRutas() : Promise.resolve([]),
    permisos.verAuditoria
      ? getAuditoriaDeEntidad("PEDIDO", pedido._id, 30)
      : Promise.resolve([]),
  ]);

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

  const seguimiento = seguimientoPublicoActivo();
  const textoSeguimiento = seguimiento
    ? unidades
        .map(
          (unidad) =>
            `${unidad.producto.titulo} (${unidad.codigo}): ${getSiteUrl()}/seguimiento/${unidad.codigo}`
        )
        .join("\n")
    : "";

  const avanceMedio =
    unidades.length === 0
      ? 0
      : Math.round(
          unidades.reduce((suma, unidad) => suma + unidad.progreso, 0) / unidades.length
        );

  const whatsapp = whatsappDelCliente(
    pedido.cliente.telefono,
    `Hola ${pedido.cliente.nombre}, le escribimos de CamiHogar por su pedido ${pedido.codigo}.`
  );

  return (
    <div className="space-y-6">
      <AvisosFabricacion />

      <div>
        <Button asChild variant="ghost" className="-ml-3 h-12 text-base font-semibold">
          <Link href="/admin/fabricacion/pedidos">
            <ArrowLeft className="!size-5" aria-hidden="true" />
            Volver a los pedidos
          </Link>
        </Button>
      </div>

      {/* Cabecera */}
      <header className="rounded-3xl border border-brand-dark/5 bg-brand-card p-6 shadow-warm-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <Codigo valor={pedido.codigo} className="text-3xl sm:text-4xl" />
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-brand-dark">
              {pedido.cliente.nombre}
            </h1>
            <p className="mt-1 text-base text-brand-taupe">
              Registrado el {fechaLarga(pedido.createdAt)}
              {pedido.creadoPorNombre !== "" && ` por ${pedido.creadoPorNombre}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ChipEstadoPedido estado={pedido.estado} />
            <ChipPrioridad prioridad={pedido.prioridad} />
            <ChipCanal canal={pedido.canal} />
          </div>
        </div>

        {pedido.eliminado && (
          <p
            role="status"
            className="mt-4 rounded-2xl border border-brand-dark/10 bg-brand-sand/60 p-4 text-base font-semibold text-brand-dark"
          >
            Este pedido está eliminado. Se conserva su historial y se puede restaurar.
          </p>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Dato etiqueta="Teléfono">
              {whatsapp ? (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[#128C4A] underline-offset-4 hover:underline"
                >
                  <SiWhatsapp className="h-5 w-5" aria-hidden="true" />
                  {pedido.cliente.telefono}
                </a>
              ) : (
                pedido.cliente.telefono
              )}
            </Dato>
            <Dato etiqueta="Cédula">{pedido.cliente.cedula}</Dato>
            <Dato etiqueta="Ciudad">{pedido.cliente.ciudad}</Dato>
            <Dato etiqueta="Correo">{pedido.cliente.email}</Dato>
            <Dato etiqueta="Dirección" className="sm:col-span-2">
              {pedido.cliente.direccion}
            </Dato>
            <Dato etiqueta="Fecha prometida">{fechaCorta(pedido.fechaPrometida)}</Dato>
            {pedido.notas !== "" && (
              <Dato etiqueta="Notas del pedido" className="sm:col-span-2">
                {pedido.notas}
              </Dato>
            )}
          </dl>

          <div className="space-y-4 rounded-2xl bg-brand-sand/50 p-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-taupe">
                Muebles terminados
              </p>
              <ProgresoPedido
                completadas={pedido.unidadesCompletadas}
                total={pedido.totalUnidades}
                className="mt-2"
              />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-taupe">
                Avance medio del pedido
              </p>
              <BarraProgreso
                valor={avanceMedio}
                etiqueta={`Avance medio del pedido ${pedido.codigo}`}
                className="mt-2"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Acciones */}
      <section className="rounded-3xl border border-brand-dark/5 bg-brand-card p-6 shadow-warm-sm">
        <h2 className="mb-4 font-display text-xl font-semibold text-brand-dark">
          ¿Qué quieres hacer con este pedido?
        </h2>
        <AccionesPedido
          pedido={pedido}
          permisos={permisos}
          productos={opcionesProducto}
          rutas={opcionesRuta}
          seguimientoActivo={seguimiento}
          urlSeguimiento={textoSeguimiento}
        />
      </section>

      {/* Los muebles */}
      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold tracking-tight text-brand-dark">
          Los muebles de este pedido
        </h2>

        {unidades.length === 0 ? (
          <EstadoVacio
            icono={<Package className="h-7 w-7" />}
            titulo="Este pedido no tiene muebles"
            mensaje="Añade los muebles que hay que fabricar y cada uno recibirá su código y su etiqueta con QR."
          />
        ) : (
          <TablaUnidades unidades={unidades} permisos={permisos} hoyIso={hoyIso} />
        )}
      </section>

      {/* Quién cambió qué */}
      {permisos.verAuditoria && (
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight text-brand-dark">
            <History className="h-6 w-6 text-brand-accent" aria-hidden="true" />
            Historial de cambios del pedido
          </h2>
          <HistorialCambios
            registros={auditoria}
            vacio="Nadie ha cambiado los datos de este pedido desde que se registró."
          />
        </section>
      )}
    </div>
  );
}
