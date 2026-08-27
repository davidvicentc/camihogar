"use client";

/**
 * El panel de acciones de la ficha de un pedido.
 *
 * Cada botón lleva icono + texto y sólo aparece si quien mira tiene el permiso
 * correspondiente. Lo que no se puede deshacer pasa siempre por el diálogo de
 * confirmación con sus dos botones grandes (§7).
 */

import { useState } from "react";
import Link from "next/link";
import {
  Ban,
  Copy,
  Link2Off,
  Loader2,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Share2,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogoConfirmar } from "@/components/fabricacion/admin/tablero-dialogo-confirmar";
import { avisoError, avisoOk, useAccion } from "@/components/fabricacion/admin/tablero-avisos";
import { SelectorGrande } from "@/components/fabricacion/admin/pedido-formulario-cliente";
import {
  EditorLineas,
  aLineasPedido,
  lineaVacia,
  totalMuebles,
  validarLineas,
  type LineaBorrador,
  type OpcionProducto,
  type OpcionRuta,
} from "@/components/fabricacion/admin/pedido-lineas";
import type { PermisosPanel } from "@/components/fabricacion/admin/tablero-piezas";
import {
  agregarUnidadesAPedido,
  cambiarPrioridadPedido,
  cancelarPedido,
  eliminarPedido,
  restaurarPedido,
} from "@/lib/actions/fabricacion";
import { ETIQUETAS_PRIORIDAD } from "@/lib/fabricacion/constantes";
import { PRIORIDADES, type PedidoDTO, type Prioridad } from "@/lib/types/fabricacion";

type Panel = "prioridad" | "muebles" | "cancelar" | "eliminar" | null;

export function AccionesPedido({
  pedido,
  permisos,
  productos,
  rutas,
  seguimientoActivo,
  urlSeguimiento,
}: {
  pedido: PedidoDTO;
  permisos: PermisosPanel;
  productos: OpcionProducto[];
  rutas: OpcionRuta[];
  /** Viene de `seguimientoPublicoActivo()`, resuelto en el servidor. */
  seguimientoActivo: boolean;
  /**
   * Lo que se copia al portapapeles: el enlace de seguimiento de cada mueble,
   * uno por línea. Vacío si el seguimiento está apagado.
   */
  urlSeguimiento: string;
}) {
  const { ejecutando, ejecutar } = useAccion();
  const [panel, setPanel] = useState<Panel>(null);
  const rutaPorDefecto = rutas.find((ruta) => ruta.esPredeterminada)?._id ?? rutas[0]?._id ?? "";
  const [lineas, setLineas] = useState<LineaBorrador[]>([lineaVacia(rutaPorDefecto)]);
  const [errorMuebles, setErrorMuebles] = useState<string | null>(null);

  const activo = pedido.estado !== "CANCELADO" && !pedido.eliminado;

  function anadirMuebles() {
    const aviso = validarLineas(lineas);
    if (aviso) {
      setErrorMuebles(aviso);
      return;
    }
    setErrorMuebles(null);
    ejecutar(() => agregarUnidadesAPedido(pedido.codigo, aLineasPedido(lineas)), {
      exito: (creadas) =>
        `Se añadieron ${creadas?.length ?? 0} muebles al pedido ${pedido.codigo}.`,
      alTerminar: () => {
        setPanel(null);
        setLineas([lineaVacia(rutaPorDefecto)]);
      },
    });
  }

  async function copiarSeguimiento() {
    try {
      await navigator.clipboard.writeText(urlSeguimiento);
      avisoOk("Copiamos el enlace de seguimiento. Ya lo puedes pegar en WhatsApp.");
    } catch {
      avisoError("No pudimos copiar el enlace. Selecciónalo y cópialo a mano.");
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {permisos.gestionarPedidos && activo && (
          <Button asChild variant="outline" className="h-14 text-base font-semibold">
            <Link href={`/admin/fabricacion/pedidos/${pedido.codigo}/editar`}>
              <Pencil className="!size-5" aria-hidden="true" />
              Editar los datos
            </Link>
          </Button>
        )}

        {permisos.gestionarPedidos && activo && (
          <Button
            type="button"
            variant="outline"
            className="h-14 text-base font-semibold"
            onClick={() => setPanel("prioridad")}
          >
            <TriangleAlert className="!size-5" aria-hidden="true" />
            Cambiar la urgencia
          </Button>
        )}

        {permisos.gestionarPedidos && activo && (
          <Button
            type="button"
            variant="outline"
            className="h-14 text-base font-semibold"
            onClick={() => setPanel("muebles")}
          >
            <Plus className="!size-5" aria-hidden="true" />
            Añadir muebles
          </Button>
        )}

        {permisos.imprimirEtiquetas && (pedido.unidades?.length ?? 0) > 0 && (
          <Button asChild variant="outline" className="h-14 text-base font-semibold">
            <Link href={`/admin/fabricacion/etiquetas/${pedido.codigo}`}>
              <Printer className="!size-5" aria-hidden="true" />
              Imprimir todas las etiquetas
            </Link>
          </Button>
        )}

        {permisos.cancelarUnidades && activo && pedido.estado !== "ENTREGADO" && (
          <Button
            type="button"
            variant="outline"
            className="h-14 text-base font-semibold text-red-700"
            onClick={() => setPanel("cancelar")}
          >
            <Ban className="!size-5" aria-hidden="true" />
            Cancelar el pedido
          </Button>
        )}

        {permisos.eliminarPedidos && !pedido.eliminado && (
          <Button
            type="button"
            variant="outline"
            className="h-14 text-base font-semibold text-red-700"
            onClick={() => setPanel("eliminar")}
          >
            <Trash2 className="!size-5" aria-hidden="true" />
            Eliminar
          </Button>
        )}

        {permisos.eliminarPedidos && pedido.eliminado && (
          <Button
            type="button"
            variant="accent"
            className="h-14 text-base font-semibold"
            disabled={ejecutando}
            onClick={() =>
              ejecutar(() => restaurarPedido(pedido.codigo), {
                exito: `${pedido.codigo} vuelve a estar en los listados.`,
              })
            }
          >
            {ejecutando ? (
              <Loader2 className="!size-5 animate-spin" aria-hidden="true" />
            ) : (
              <RotateCcw className="!size-5" aria-hidden="true" />
            )}
            Restaurar el pedido
          </Button>
        )}
      </div>

      {/* Compartir el seguimiento con el cliente — sólo si está encendido */}
      {seguimientoActivo ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-brand-dark/10 bg-brand-sand/50 p-4">
          <Share2 className="h-5 w-5 shrink-0 text-brand-accent" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-base text-brand-dark">
            Puedes compartir con {pedido.cliente.nombre} el enlace de seguimiento de sus
            muebles.
          </p>
          <Button
            type="button"
            variant="outline"
            className="h-12 text-base font-semibold"
            onClick={copiarSeguimiento}
          >
            <Copy className="!size-5" aria-hidden="true" />
            Copiar el seguimiento
          </Button>
        </div>
      ) : (
        <p className="mt-4 flex items-start gap-2 rounded-2xl border border-brand-dark/10 bg-brand-sand/40 p-4 text-sm text-brand-taupe">
          <Link2Off className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          El seguimiento para clientes está apagado, así que por ahora no hay enlace que
          compartir. Se enciende desde la configuración del sitio.
        </p>
      )}

      {/* ── Cambiar la urgencia ─────────────────────────────────────────── */}
      <Dialog open={panel === "prioridad"} onOpenChange={(abierto) => !abierto && setPanel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl">¿Qué tan urgente es este pedido?</DialogTitle>
            <DialogDescription className="text-base">
              Lo urgente se pone primero en el tablero del taller. El cambio se aplica también
              a sus muebles.
            </DialogDescription>
          </DialogHeader>

          <SelectorGrande<Prioridad>
            etiqueta="Urgencia"
            valor={pedido.prioridad}
            opciones={PRIORIDADES.map((prioridad) => ({
              valor: prioridad,
              texto: ETIQUETAS_PRIORIDAD[prioridad].label,
              icono: ETIQUETAS_PRIORIDAD[prioridad].icono,
            }))}
            alElegir={(nueva) =>
              ejecutar(() => cambiarPrioridadPedido(pedido.codigo, nueva), {
                exito: `El pedido ${pedido.codigo} quedó como ${ETIQUETAS_PRIORIDAD[nueva].label.toLowerCase()}.`,
                alTerminar: () => setPanel(null),
              })
            }
          />
        </DialogContent>
      </Dialog>

      {/* ── Añadir muebles ──────────────────────────────────────────────── */}
      <Dialog open={panel === "muebles"} onOpenChange={(abierto) => !abierto && setPanel(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Añadir muebles al pedido {pedido.codigo}
            </DialogTitle>
            <DialogDescription className="text-base">
              Cada mueble que añadas se crea con su propio código y su etiqueta con QR.
            </DialogDescription>
          </DialogHeader>

          {errorMuebles && (
            <p
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-base text-red-800"
            >
              {errorMuebles}
            </p>
          )}

          <EditorLineas
            lineas={lineas}
            alCambiar={setLineas}
            productos={productos}
            rutas={rutas}
            verPrecios={permisos.verPrecios}
          />

          <Button
            type="button"
            variant="accent"
            className="h-20 w-full rounded-2xl text-xl font-bold"
            disabled={ejecutando}
            onClick={anadirMuebles}
          >
            {ejecutando ? (
              <Loader2 className="!size-7 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="!size-7" aria-hidden="true" />
            )}
            AÑADIR {totalMuebles(lineas)}{" "}
            {totalMuebles(lineas) === 1 ? "MUEBLE" : "MUEBLES"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* ── Cancelar ────────────────────────────────────────────────────── */}
      <DialogoConfirmar
        abierto={panel === "cancelar"}
        alCerrar={() => setPanel(null)}
        titulo={`¿Cancelar el pedido ${pedido.codigo}?`}
        descripcion={`Se cancelan también los muebles de ${pedido.cliente.nombre} que aún no se han entregado. Se conserva todo el historial y las fotos.`}
        pideMotivo
        etiquetaMotivo="¿Por qué se cancela el pedido?"
        textoConfirmar="SÍ, CANCELAR"
        alConfirmar={(motivo) => cancelarPedido(pedido.codigo, motivo)}
        exito={() => `${pedido.codigo} quedó cancelado.`}
      />

      {/* ── Eliminar ────────────────────────────────────────────────────── */}
      <DialogoConfirmar
        abierto={panel === "eliminar"}
        alCerrar={() => setPanel(null)}
        titulo={`¿Eliminar el pedido ${pedido.codigo}?`}
        descripcion="Desaparece de los listados junto con sus muebles. Si ya se trabajó en alguno, se guarda todo el historial y podrás restaurarlo desde «Ver eliminados»."
        textoConfirmar="SÍ, ELIMINAR"
        alConfirmar={() => eliminarPedido(pedido.codigo)}
        exito={(dato) => dato?.mensaje ?? "Pedido eliminado."}
      />
    </>
  );
}
