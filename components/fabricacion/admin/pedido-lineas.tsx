"use client";

/**
 * "¿Qué muebles lleva el pedido?"
 *
 * Una tarjeta por mueble: se elige del catálogo de la tienda o se escribe uno
 * a medida, se anotan tela, acabado, medidas y precio, cuántos son y qué ruta
 * de fabricación sigue.
 *
 * Lo usan por igual el asistente de pedido nuevo (paso 2) y el diálogo
 * "Añadir muebles" de la ficha del pedido, para que se rellene siempre igual.
 */

import { Fragment } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Campo } from "@/components/fabricacion/admin/pedido-formulario-cliente";
import type { LineaPedidoInput } from "@/lib/actions/fabricacion";
import { cn, formatPrice } from "@/lib/utils";

/** Un mueble del catálogo de la tienda, reducido a lo que hace falta aquí. */
export interface OpcionProducto {
  _id: string;
  titulo: string;
  categoria: string;
  imagen: string;
  precio: number;
}

/** Una ruta de fabricación activa, con su vista previa de pasos. */
export interface OpcionRuta {
  _id: string;
  nombre: string;
  esPredeterminada: boolean;
  /** Nombres de los pasos, en orden. */
  pasos: string[];
}

/** Una línea del pedido mientras se está escribiendo (todo texto). */
export interface LineaBorrador {
  /** Clave local para React; no se envía al servidor. */
  id: string;
  aMedida: boolean;
  productoId: string;
  titulo: string;
  categoria: string;
  imagen: string;
  tela: string;
  acabado: string;
  configuracion: string;
  medidas: string;
  precio: string;
  cantidad: number;
  rutaId: string;
}

let contadorLineas = 0;

export function lineaVacia(rutaId: string): LineaBorrador {
  contadorLineas += 1;
  return {
    id: `linea-${contadorLineas}`,
    aMedida: false,
    productoId: "",
    titulo: "",
    categoria: "",
    imagen: "",
    tela: "",
    acabado: "",
    configuracion: "",
    medidas: "",
    precio: "",
    cantidad: 1,
    rutaId,
  };
}

/** Aviso en español, o `null` si las líneas están listas para enviarse. */
export function validarLineas(lineas: LineaBorrador[]): string | null {
  if (lineas.length === 0) {
    return "Añade al menos un mueble al pedido con el botón «Añadir otro mueble».";
  }
  for (let indice = 0; indice < lineas.length; indice += 1) {
    const linea = lineas[indice];
    if (linea.titulo.trim() === "") {
      return `Al mueble ${indice + 1} le falta el nombre. Elígelo del catálogo o escríbelo a mano.`;
    }
    if (!Number.isFinite(linea.cantidad) || linea.cantidad < 1) {
      return `La cantidad del mueble ${indice + 1} tiene que ser 1 o más.`;
    }
    if (linea.precio.trim() !== "" && Number.isNaN(Number(linea.precio))) {
      return `El precio del mueble ${indice + 1} tiene que ser un número, por ejemplo 450.`;
    }
  }
  return null;
}

/** Traduce el borrador a lo que espera la acción del servidor. */
export function aLineasPedido(lineas: LineaBorrador[]): LineaPedidoInput[] {
  return lineas.map((linea) => ({
    productoId: linea.aMedida || linea.productoId === "" ? null : linea.productoId,
    producto: {
      titulo: linea.titulo.trim(),
      categoria: linea.categoria.trim(),
      imagen: linea.imagen.trim(),
      tela: linea.tela.trim(),
      acabado: linea.acabado.trim(),
      configuracion: linea.configuracion.trim(),
      medidas: linea.medidas.trim(),
      precio: linea.precio.trim() === "" ? null : Number(linea.precio),
    },
    cantidad: Math.max(1, Math.round(linea.cantidad)),
    rutaId: linea.rutaId === "" ? null : linea.rutaId,
  }));
}

/** Cuántos muebles se van a crear en total (cada unidad lleva su propio QR). */
export function totalMuebles(lineas: LineaBorrador[]): number {
  return lineas.reduce((suma, linea) => suma + Math.max(1, Math.round(linea.cantidad)), 0);
}

/* ────────────────────────────────────────────────────────────────────────────
 * EL EDITOR
 * ──────────────────────────────────────────────────────────────────────────── */

export function EditorLineas({
  lineas,
  alCambiar,
  productos,
  rutas,
  verPrecios,
}: {
  lineas: LineaBorrador[];
  alCambiar: (nuevas: LineaBorrador[]) => void;
  productos: OpcionProducto[];
  rutas: OpcionRuta[];
  verPrecios: boolean;
}) {
  const rutaPorDefecto = rutas.find((ruta) => ruta.esPredeterminada)?._id ?? rutas[0]?._id ?? "";

  function actualizar(id: string, cambios: Partial<LineaBorrador>) {
    alCambiar(lineas.map((linea) => (linea.id === id ? { ...linea, ...cambios } : linea)));
  }

  function quitar(id: string) {
    alCambiar(lineas.filter((linea) => linea.id !== id));
  }

  function elegirProducto(id: string, productoId: string) {
    const producto = productos.find((candidato) => candidato._id === productoId);
    if (!producto) return;
    actualizar(id, {
      productoId,
      titulo: producto.titulo,
      categoria: producto.categoria,
      imagen: producto.imagen,
      precio: String(producto.precio),
    });
  }

  return (
    <div className="space-y-5">
      {lineas.map((linea, indice) => {
        const ruta = rutas.find((candidata) => candidata._id === linea.rutaId);

        return (
          <div
            key={linea.id}
            className="rounded-3xl border border-brand-dark/10 bg-brand-card p-5 shadow-warm-sm"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-display text-xl font-semibold text-brand-dark">
                Mueble {indice + 1}
              </h3>
              {lineas.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 text-base text-red-700"
                  onClick={() => quitar(linea.id)}
                >
                  <Trash2 className="!size-5" aria-hidden="true" />
                  Quitar este mueble
                </Button>
              )}
            </div>

            {/* Del catálogo o a medida */}
            <div className="mb-5 flex flex-wrap gap-2">
              {[
                { valor: false, texto: "Del catálogo de la tienda" },
                { valor: true, texto: "Un mueble a medida" },
              ].map((opcion) => (
                <button
                  key={String(opcion.valor)}
                  type="button"
                  aria-pressed={linea.aMedida === opcion.valor}
                  onClick={() =>
                    actualizar(linea.id, {
                      aMedida: opcion.valor,
                      productoId: opcion.valor ? "" : linea.productoId,
                    })
                  }
                  className={cn(
                    "min-h-[52px] rounded-2xl border-2 px-5 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent",
                    linea.aMedida === opcion.valor
                      ? "border-brand-accent bg-brand-accent/10 text-brand-accent"
                      : "border-brand-dark/15 bg-brand-card text-brand-dark hover:border-brand-accent/40"
                  )}
                >
                  {opcion.texto}
                </button>
              ))}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {linea.aMedida ? (
                <Campo
                  id={`titulo-${linea.id}`}
                  etiqueta="¿Qué mueble es?"
                  ayuda="Escríbelo como se lo dirías al carpintero."
                  obligatorio
                  className="sm:col-span-2"
                >
                  <Input
                    id={`titulo-${linea.id}`}
                    value={linea.titulo}
                    onChange={(evento) => actualizar(linea.id, { titulo: evento.target.value })}
                    placeholder="Sofá de 3 puestos con chaise longue"
                    className="h-14 text-base"
                  />
                </Campo>
              ) : (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-base font-semibold">
                    Mueble del catálogo
                    <span className="ml-1 font-normal text-brand-accent" aria-hidden="true">
                      *
                    </span>
                  </Label>
                  <Select
                    value={linea.productoId}
                    onValueChange={(valor) => elegirProducto(linea.id, valor)}
                  >
                    <SelectTrigger
                      className="h-14 rounded-2xl text-base"
                      aria-label={`Elegir el mueble ${indice + 1} del catálogo`}
                    >
                      <SelectValue placeholder="Toca para elegir un mueble" />
                    </SelectTrigger>
                    <SelectContent>
                      {productos.map((producto) => (
                        <SelectItem
                          key={producto._id}
                          value={producto._id}
                          className="py-3 text-base"
                        >
                          {producto.titulo}
                          {verPrecios ? ` — ${formatPrice(producto.precio)}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-brand-taupe">
                    {productos.length === 0
                      ? "Todavía no hay muebles publicados en la tienda. Elige «Un mueble a medida»."
                      : "Al elegirlo se copian su nombre y su precio; puedes cambiarlos abajo."}
                  </p>
                </div>
              )}

              <Campo
                id={`tela-${linea.id}`}
                etiqueta="Tela o tapizado"
                ayuda="El nombre o el código de la tela."
              >
                <Input
                  id={`tela-${linea.id}`}
                  value={linea.tela}
                  onChange={(evento) => actualizar(linea.id, { tela: evento.target.value })}
                  placeholder="Chenille beige"
                  className="h-14 text-base"
                />
              </Campo>

              <Campo id={`acabado-${linea.id}`} etiqueta="Acabado" ayuda="De la madera o las patas.">
                <Input
                  id={`acabado-${linea.id}`}
                  value={linea.acabado}
                  onChange={(evento) => actualizar(linea.id, { acabado: evento.target.value })}
                  placeholder="Nogal mate"
                  className="h-14 text-base"
                />
              </Campo>

              <Campo
                id={`configuracion-${linea.id}`}
                etiqueta="Configuración"
                ayuda="Puestos, lado de la chaise, extras…"
              >
                <Input
                  id={`configuracion-${linea.id}`}
                  value={linea.configuracion}
                  onChange={(evento) =>
                    actualizar(linea.id, { configuracion: evento.target.value })
                  }
                  placeholder="3 puestos, chaise a la izquierda"
                  className="h-14 text-base"
                />
              </Campo>

              <Campo
                id={`medidas-${linea.id}`}
                etiqueta="Medidas"
                ayuda="Ancho x alto x profundidad, en centímetros."
              >
                <Input
                  id={`medidas-${linea.id}`}
                  value={linea.medidas}
                  onChange={(evento) => actualizar(linea.id, { medidas: evento.target.value })}
                  placeholder="240 x 85 x 95 cm"
                  className="h-14 text-base"
                />
              </Campo>

              {verPrecios && (
                <Campo
                  id={`precio-${linea.id}`}
                  etiqueta="Precio por unidad"
                  ayuda="En dólares. Déjalo vacío si aún no está cerrado."
                >
                  <Input
                    id={`precio-${linea.id}`}
                    value={linea.precio}
                    onChange={(evento) => actualizar(linea.id, { precio: evento.target.value })}
                    inputMode="decimal"
                    placeholder="450"
                    className="h-14 text-base"
                  />
                </Campo>
              )}

              <Campo
                id={`cantidad-${linea.id}`}
                etiqueta="¿Cuántos iguales?"
                ayuda="Cada uno tendrá su propio código y su propia etiqueta con QR."
              >
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-14 w-14 shrink-0 rounded-2xl text-2xl font-bold"
                    aria-label={`Quitar uno a la cantidad del mueble ${indice + 1}`}
                    onClick={() =>
                      actualizar(linea.id, { cantidad: Math.max(1, linea.cantidad - 1) })
                    }
                  >
                    −
                  </Button>
                  <Input
                    id={`cantidad-${linea.id}`}
                    value={String(linea.cantidad)}
                    onChange={(evento) => {
                      const numero = Number(evento.target.value.replace(/\D/g, ""));
                      actualizar(linea.id, { cantidad: Number.isFinite(numero) ? numero : 1 });
                    }}
                    inputMode="numeric"
                    className="h-14 w-20 text-center text-xl font-bold"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-14 w-14 shrink-0 rounded-2xl text-2xl font-bold"
                    aria-label={`Sumar uno a la cantidad del mueble ${indice + 1}`}
                    onClick={() => actualizar(linea.id, { cantidad: linea.cantidad + 1 })}
                  >
                    +
                  </Button>
                </div>
              </Campo>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-base font-semibold">¿Qué ruta de fabricación sigue?</Label>
                <Select
                  value={linea.rutaId}
                  onValueChange={(valor) => actualizar(linea.id, { rutaId: valor })}
                >
                  <SelectTrigger
                    className="h-14 rounded-2xl text-base"
                    aria-label={`Elegir la ruta del mueble ${indice + 1}`}
                  >
                    <SelectValue placeholder="Toca para elegir la ruta" />
                  </SelectTrigger>
                  <SelectContent>
                    {rutas.map((opcion) => (
                      <SelectItem key={opcion._id} value={opcion._id} className="py-3 text-base">
                        {opcion.nombre} — {opcion.pasos.length}{" "}
                        {opcion.pasos.length === 1 ? "paso" : "pasos"}
                        {opcion.esPredeterminada ? " (la de siempre)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {ruta ? (
                  <div className="rounded-2xl bg-brand-sand/60 p-3">
                    <p className="text-sm font-semibold text-brand-dark">
                      Este mueble pasará por {ruta.pasos.length}{" "}
                      {ruta.pasos.length === 1 ? "paso" : "pasos"}:
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-brand-taupe">
                      {ruta.pasos.map((paso, posicion) => (
                        <Fragment key={`${paso}-${posicion}`}>
                          {posicion > 0 && " → "}
                          {paso}
                        </Fragment>
                      ))}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-brand-taupe">
                    {rutas.length === 0
                      ? "Todavía no hay rutas creadas. Se usará la ruta que esté marcada como predeterminada."
                      : "Si no eliges ninguna se usa la ruta de siempre."}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        className="h-16 w-full rounded-2xl border-2 border-dashed text-lg font-bold"
        onClick={() => alCambiar([...lineas, lineaVacia(rutaPorDefecto)])}
      >
        <Plus className="!size-6" aria-hidden="true" />
        AÑADIR OTRO MUEBLE
      </Button>
    </div>
  );
}
