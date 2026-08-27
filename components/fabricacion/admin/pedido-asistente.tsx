"use client";

/**
 * Asistente de pedido nuevo, en tres pasos y sin prisa.
 *
 *   1. ¿Quién es el cliente?
 *   2. ¿Qué muebles lleva?
 *   3. Revisa y confirma → se crean los muebles con su código y su etiqueta.
 *
 * Una sola acción principal por pantalla (§9), siempre abajo, ancha y grande.
 * Nada se guarda hasta el último paso: hasta entonces se puede ir y volver.
 */

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  PartyPopper,
  Printer,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  FormularioPedido,
  PEDIDO_VACIO,
  validarPedido,
  type DatosPedido,
} from "@/components/fabricacion/admin/pedido-formulario-cliente";
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
import {
  ChipCanal,
  ChipPrioridad,
  Codigo,
  Dato,
  fechaCorta,
} from "@/components/fabricacion/admin/tablero-piezas";
import { crearPedido } from "@/lib/actions/fabricacion";
import type { PedidoDTO } from "@/lib/types/fabricacion";
import { cn, formatPrice } from "@/lib/utils";

const TITULOS = [
  "¿Quién es el cliente?",
  "¿Qué muebles lleva?",
  "Revisa y confirma",
] as const;

export function AsistentePedido({
  productos,
  rutas,
  verPrecios,
  imprimirEtiquetas,
}: {
  productos: OpcionProducto[];
  rutas: OpcionRuta[];
  verPrecios: boolean;
  imprimirEtiquetas: boolean;
}) {
  const rutaPorDefecto = rutas.find((ruta) => ruta.esPredeterminada)?._id ?? rutas[0]?._id ?? "";

  const [paso, setPaso] = useState(0);
  const [datos, setDatos] = useState<DatosPedido>(PEDIDO_VACIO);
  const [lineas, setLineas] = useState<LineaBorrador[]>([lineaVacia(rutaPorDefecto)]);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [creado, setCreado] = useState<PedidoDTO | null>(null);

  function siguiente() {
    setError(null);
    if (paso === 0) {
      const aviso = validarPedido(datos);
      if (aviso) {
        setError(aviso);
        return;
      }
    }
    if (paso === 1) {
      const aviso = validarLineas(lineas);
      if (aviso) {
        setError(aviso);
        return;
      }
    }
    setPaso((actual) => Math.min(2, actual + 1));
  }

  async function guardar() {
    setError(null);
    const avisoCliente = validarPedido(datos);
    if (avisoCliente) {
      setError(avisoCliente);
      setPaso(0);
      return;
    }
    const avisoLineas = validarLineas(lineas);
    if (avisoLineas) {
      setError(avisoLineas);
      setPaso(1);
      return;
    }

    setEnviando(true);
    try {
      const resultado = await crearPedido({
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
        lineas: aLineasPedido(lineas),
      });

      if (!resultado.ok || !resultado.data) {
        setError(resultado.error ?? "No pudimos registrar el pedido. Vuelve a intentarlo.");
        return;
      }
      setCreado(resultado.data);
    } catch {
      setError("No pudimos conectar con el servidor. Revisa la conexión y reintenta.");
    } finally {
      setEnviando(false);
    }
  }

  /* ── Pantalla de éxito ───────────────────────────────────────────────── */
  if (creado) {
    const unidades = creado.unidades ?? [];
    return (
      <div className="space-y-6">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-8 text-center">
            <span
              aria-hidden="true"
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-600 text-white"
            >
              <PartyPopper className="h-8 w-8" />
            </span>
            <h2 className="font-display text-3xl font-bold text-green-900">
              Pedido registrado
            </h2>
            <p className="mt-2 text-lg text-green-800">
              El pedido <Codigo valor={creado.codigo} className="text-green-900" /> de{" "}
              {creado.cliente.nombre} ya está en el taller con{" "}
              {unidades.length === 1 ? "1 mueble" : `${unidades.length} muebles`}.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-6">
            <h3 className="font-display text-xl font-semibold text-brand-dark">
              Estos son los códigos de cada mueble
            </h3>
            <p className="text-base text-brand-taupe">
              Cada mueble lleva el suyo. Imprime la etiqueta y pégala en la pieza: es lo que
              el taller escanea en cada paso.
            </p>

            <ul className="divide-y divide-brand-dark/5 rounded-2xl border border-brand-dark/10">
              {unidades.map((unidad) => (
                <li
                  key={unidad._id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <Codigo valor={unidad.codigo} className="text-xl" />
                    <p className="truncate text-base text-brand-taupe">
                      {unidad.producto.titulo}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" className="h-12 text-base font-semibold">
                      <Link href={`/admin/fabricacion/unidades/${unidad.codigo}`}>Ver ficha</Link>
                    </Button>
                    {imprimirEtiquetas && (
                      <Button asChild variant="outline" className="h-12 text-base font-semibold">
                        <Link href={`/admin/fabricacion/etiquetas/${unidad.codigo}`}>
                          <Printer className="!size-5" aria-hidden="true" />
                          Etiqueta
                        </Link>
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {imprimirEtiquetas && unidades.length > 0 && (
              <Button
                asChild
                variant="accent"
                className="h-20 w-full rounded-2xl text-xl font-bold"
              >
                <Link href={`/admin/fabricacion/etiquetas/${creado.codigo}`}>
                  <Printer className="!size-7" aria-hidden="true" />
                  IMPRIMIR TODAS LAS ETIQUETAS
                </Link>
              </Button>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Button asChild variant="outline" className="h-14 text-base font-semibold">
                <Link href={`/admin/fabricacion/pedidos/${creado.codigo}`}>
                  Ver la ficha del pedido
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-14 text-base font-semibold">
                <Link href="/admin/fabricacion/pedidos/nuevo">Registrar otro pedido</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Los tres pasos ──────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Dónde vamos */}
      <div>
        <p className="text-base font-bold uppercase tracking-wide text-brand-accent">
          Paso {paso + 1} de 3
        </p>
        <h2 className="mt-1 font-display text-3xl font-bold tracking-tight text-brand-dark">
          {TITULOS[paso]}
        </h2>
        <div className="mt-4 flex gap-2" aria-hidden="true">
          {TITULOS.map((titulo, indice) => (
            <span
              key={titulo}
              className={cn(
                "h-2.5 flex-1 rounded-full",
                indice <= paso ? "bg-brand-accent" : "bg-brand-taupe/20"
              )}
            />
          ))}
        </div>
      </div>

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
          {paso === 0 && <FormularioPedido valor={datos} alCambiar={setDatos} />}

          {paso === 1 && (
            <EditorLineas
              lineas={lineas}
              alCambiar={setLineas}
              productos={productos}
              rutas={rutas}
              verPrecios={verPrecios}
            />
          )}

          {paso === 2 && (
            <div className="space-y-6">
              <section>
                <h3 className="mb-3 font-display text-xl font-semibold text-brand-dark">
                  El cliente
                </h3>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <Dato etiqueta="Nombre">{datos.nombre}</Dato>
                  <Dato etiqueta="Teléfono">{datos.telefono}</Dato>
                  <Dato etiqueta="Cédula">{datos.cedula}</Dato>
                  <Dato etiqueta="Ciudad">{datos.ciudad}</Dato>
                  <Dato etiqueta="Dirección" className="sm:col-span-2">
                    {datos.direccion}
                  </Dato>
                  <Dato etiqueta="Correo">{datos.email}</Dato>
                  <Dato etiqueta="Fecha prometida">{fechaCorta(datos.fechaPrometida)}</Dato>
                  <Dato etiqueta="Llegó por">
                    <ChipCanal canal={datos.canal} />
                  </Dato>
                  <Dato etiqueta="Urgencia">
                    <ChipPrioridad prioridad={datos.prioridad} />
                  </Dato>
                  {datos.notas.trim() !== "" && (
                    <Dato etiqueta="Notas" className="sm:col-span-2">
                      {datos.notas}
                    </Dato>
                  )}
                </dl>
              </section>

              <section>
                <h3 className="mb-3 font-display text-xl font-semibold text-brand-dark">
                  Los muebles ({totalMuebles(lineas)} en total)
                </h3>
                <ul className="divide-y divide-brand-dark/5 rounded-2xl border border-brand-dark/10">
                  {lineas.map((linea, indice) => {
                    const ruta = rutas.find((candidata) => candidata._id === linea.rutaId);
                    const precio = Number(linea.precio);
                    return (
                      <li key={linea.id} className="p-4">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-lg font-semibold text-brand-dark">
                            {linea.cantidad} × {linea.titulo || `Mueble ${indice + 1}`}
                          </p>
                          {verPrecios && linea.precio.trim() !== "" && !Number.isNaN(precio) && (
                            <p className="text-lg font-semibold text-brand-dark">
                              {formatPrice(precio * linea.cantidad)}
                            </p>
                          )}
                        </div>
                        <p className="mt-1 text-base text-brand-taupe">
                          {[linea.tela, linea.acabado, linea.configuracion, linea.medidas]
                            .filter((texto) => texto.trim() !== "")
                            .join(" · ") || "Sin detalles adicionales"}
                        </p>
                        <p className="mt-1 text-base text-brand-taupe">
                          Ruta: {ruta ? `${ruta.nombre} (${ruta.pasos.length} pasos)` : "la de siempre"}
                        </p>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 flex items-start gap-2 rounded-2xl bg-brand-sand/60 p-4 text-base text-brand-dark">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-accent" aria-hidden="true" />
                  Al confirmar se crean {totalMuebles(lineas)}{" "}
                  {totalMuebles(lineas) === 1 ? "mueble" : "muebles"}, cada uno con su propio
                  código y su etiqueta con QR.
                </p>
              </section>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navegación: una sola acción principal, ancha y grande */}
      <div className="space-y-3">
        {paso < 2 ? (
          <Button
            type="button"
            variant="accent"
            className="h-20 w-full rounded-2xl text-xl font-bold"
            onClick={siguiente}
          >
            <ArrowRight className="!size-7" aria-hidden="true" />
            SIGUIENTE
          </Button>
        ) : (
          <Button
            type="button"
            variant="accent"
            className="h-20 w-full rounded-2xl text-xl font-bold"
            disabled={enviando}
            onClick={guardar}
          >
            {enviando ? (
              <Loader2 className="!size-7 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="!size-7" aria-hidden="true" />
            )}
            {enviando ? "GUARDANDO…" : "SÍ, REGISTRAR EL PEDIDO"}
          </Button>
        )}

        <div className="flex flex-wrap gap-3">
          {paso > 0 && (
            <Button
              type="button"
              variant="outline"
              className="h-14 flex-1 text-base font-semibold"
              disabled={enviando}
              onClick={() => {
                setError(null);
                setPaso((actual) => Math.max(0, actual - 1));
              }}
            >
              <ArrowLeft className="!size-5" aria-hidden="true" />
              Volver al paso anterior
            </Button>
          )}
          <Button asChild variant="ghost" className="h-14 flex-1 text-base font-semibold">
            <Link href="/admin/fabricacion/pedidos">Salir sin guardar</Link>
          </Button>
        </div>
        <p className="text-center text-sm text-brand-taupe">
          Nada se guarda hasta que confirmes en el paso 3.
        </p>
      </div>
    </div>
  );
}
