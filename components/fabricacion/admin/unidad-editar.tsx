"use client";

/**
 * Editar los datos maestros de un mueble: qué es, tela, acabado,
 * configuración, medidas, precio y notas. Y, si todavía no ha empezado a
 * fabricarse, cambiarle la ruta explicando por qué.
 *
 * El cambio de ruta va aparte y con motivo obligatorio porque rehace la lista
 * de pasos del mueble: no es una edición cualquiera y queda auditado.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Loader2, Route, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Campo } from "@/components/fabricacion/admin/pedido-formulario-cliente";
import { DialogoConfirmar } from "@/components/fabricacion/admin/tablero-dialogo-confirmar";
import { avisoOk } from "@/components/fabricacion/admin/tablero-avisos";
import { Codigo } from "@/components/fabricacion/admin/tablero-piezas";
import type { OpcionRuta } from "@/components/fabricacion/admin/pedido-lineas";
import { actualizarUnidad, cambiarRutaDeUnidad } from "@/lib/actions/fabricacion";
import type { UnidadDTO } from "@/lib/types/fabricacion";

interface BorradorUnidad {
  titulo: string;
  categoria: string;
  tela: string;
  acabado: string;
  configuracion: string;
  medidas: string;
  precio: string;
  notas: string;
}

/** Un mueble "no ha empezado" mientras ningún paso se haya tocado. */
function noHaEmpezado(unidad: UnidadDTO): boolean {
  if (unidad.estado !== "PENDIENTE") return false;
  return unidad.pasos.every(
    (paso) => paso.estado === "BLOQUEADO" || paso.estado === "LISTO"
  );
}

export function EditarUnidad({
  unidad,
  rutas,
  verPrecios,
}: {
  unidad: UnidadDTO;
  rutas: OpcionRuta[];
  verPrecios: boolean;
}) {
  const router = useRouter();
  const [datos, setDatos] = useState<BorradorUnidad>({
    titulo: unidad.producto.titulo,
    categoria: unidad.producto.categoria,
    tela: unidad.producto.tela,
    acabado: unidad.producto.acabado,
    configuracion: unidad.producto.configuracion,
    medidas: unidad.producto.medidas,
    precio: unidad.producto.precio === null ? "" : String(unidad.producto.precio),
    notas: unidad.notas,
  });
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [rutaElegida, setRutaElegida] = useState<string>(unidad.rutaId ?? "");
  const [confirmarRuta, setConfirmarRuta] = useState(false);

  const puedeCambiarRuta = noHaEmpezado(unidad);
  const rutaNueva = rutas.find((ruta) => ruta._id === rutaElegida);

  function cambiar<C extends keyof BorradorUnidad>(campo: C, valor: BorradorUnidad[C]) {
    setDatos((actual) => ({ ...actual, [campo]: valor }));
  }

  async function guardar() {
    if (datos.titulo.trim() === "") {
      setError("El mueble necesita un nombre. Escribe cómo se lo dirías al carpintero.");
      return;
    }
    if (datos.precio.trim() !== "" && Number.isNaN(Number(datos.precio))) {
      setError("El precio tiene que ser un número, por ejemplo 450.");
      return;
    }

    setError(null);
    setGuardando(true);
    try {
      const resultado = await actualizarUnidad(unidad.codigo, {
        notas: datos.notas.trim(),
        producto: {
          titulo: datos.titulo.trim(),
          categoria: datos.categoria.trim(),
          tela: datos.tela.trim(),
          acabado: datos.acabado.trim(),
          configuracion: datos.configuracion.trim(),
          medidas: datos.medidas.trim(),
          ...(verPrecios
            ? { precio: datos.precio.trim() === "" ? null : Number(datos.precio) }
            : {}),
        },
      });

      if (!resultado.ok) {
        setError(resultado.error ?? "No pudimos guardar los cambios. Vuelve a intentarlo.");
        return;
      }

      avisoOk(`Guardamos los datos de ${unidad.codigo}.`);
      router.push(`/admin/fabricacion/unidades/${unidad.codigo}`);
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
        <CardContent className="space-y-5 p-6">
          <h2 className="font-display text-2xl font-semibold text-brand-dark">
            Datos del mueble
          </h2>

          <div className="grid gap-5 sm:grid-cols-2">
            <Campo
              id="unidad-titulo"
              etiqueta="¿Qué mueble es?"
              ayuda="Como se lo dirías al carpintero."
              obligatorio
              className="sm:col-span-2"
            >
              <Input
                id="unidad-titulo"
                value={datos.titulo}
                onChange={(evento) => cambiar("titulo", evento.target.value)}
                className="h-14 text-base"
              />
            </Campo>

            <Campo id="unidad-categoria" etiqueta="Categoría" ayuda="Salas, comedores…">
              <Input
                id="unidad-categoria"
                value={datos.categoria}
                onChange={(evento) => cambiar("categoria", evento.target.value)}
                className="h-14 text-base"
              />
            </Campo>

            <Campo id="unidad-tela" etiqueta="Tela o tapizado" ayuda="Nombre o código de la tela.">
              <Input
                id="unidad-tela"
                value={datos.tela}
                onChange={(evento) => cambiar("tela", evento.target.value)}
                className="h-14 text-base"
              />
            </Campo>

            <Campo id="unidad-acabado" etiqueta="Acabado" ayuda="De la madera o las patas.">
              <Input
                id="unidad-acabado"
                value={datos.acabado}
                onChange={(evento) => cambiar("acabado", evento.target.value)}
                className="h-14 text-base"
              />
            </Campo>

            <Campo
              id="unidad-configuracion"
              etiqueta="Configuración"
              ayuda="Puestos, lado de la chaise, extras…"
            >
              <Input
                id="unidad-configuracion"
                value={datos.configuracion}
                onChange={(evento) => cambiar("configuracion", evento.target.value)}
                className="h-14 text-base"
              />
            </Campo>

            <Campo
              id="unidad-medidas"
              etiqueta="Medidas"
              ayuda="Ancho x alto x profundidad, en centímetros."
            >
              <Input
                id="unidad-medidas"
                value={datos.medidas}
                onChange={(evento) => cambiar("medidas", evento.target.value)}
                className="h-14 text-base"
              />
            </Campo>

            {verPrecios && (
              <Campo
                id="unidad-precio"
                etiqueta="Precio"
                ayuda="En dólares. Déjalo vacío si aún no está cerrado."
              >
                <Input
                  id="unidad-precio"
                  value={datos.precio}
                  onChange={(evento) => cambiar("precio", evento.target.value)}
                  inputMode="decimal"
                  className="h-14 text-base"
                />
              </Campo>
            )}
          </div>

          <Campo
            id="unidad-notas"
            etiqueta="Notas internas"
            ayuda="Lo que el taller tiene que tener en cuenta con este mueble."
          >
            <Textarea
              id="unidad-notas"
              value={datos.notas}
              onChange={(evento) => cambiar("notas", evento.target.value)}
              className="min-h-[110px] text-base"
            />
          </Campo>
        </CardContent>
      </Card>

      {/* ── Cambiar de ruta ─────────────────────────────────────────────── */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="flex items-center gap-2 font-display text-2xl font-semibold text-brand-dark">
            <Route className="h-6 w-6 text-brand-accent" aria-hidden="true" />
            Ruta de fabricación
          </h2>
          <p className="text-base text-brand-taupe">
            Ahora mismo sigue la ruta{" "}
            <strong className="text-brand-dark">{unidad.rutaNombre || "sin asignar"}</strong>, con{" "}
            {unidad.pasos.length} {unidad.pasos.length === 1 ? "paso" : "pasos"}.
          </p>

          {puedeCambiarRuta ? (
            <>
              <div className="space-y-1.5">
                <Label className="text-base font-semibold">Cambiar a esta ruta</Label>
                <Select value={rutaElegida} onValueChange={setRutaElegida}>
                  <SelectTrigger
                    className="h-14 rounded-2xl text-base"
                    aria-label="Elegir la nueva ruta de fabricación"
                  >
                    <SelectValue placeholder="Toca para elegir la ruta" />
                  </SelectTrigger>
                  <SelectContent>
                    {rutas.map((ruta) => (
                      <SelectItem key={ruta._id} value={ruta._id} className="py-3 text-base">
                        {ruta.nombre} — {ruta.pasos.length}{" "}
                        {ruta.pasos.length === 1 ? "paso" : "pasos"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {rutaNueva && rutaNueva._id !== unidad.rutaId && (
                <div className="rounded-2xl bg-brand-sand/60 p-4">
                  <p className="text-base font-semibold text-brand-dark">
                    Con la ruta «{rutaNueva.nombre}» el mueble pasará por{" "}
                    {rutaNueva.pasos.length} pasos:
                  </p>
                  <p className="mt-1 text-base text-brand-taupe">
                    {rutaNueva.pasos.join(" → ")}
                  </p>
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                className="h-14 w-full text-base font-semibold"
                disabled={rutaElegida === "" || rutaElegida === unidad.rutaId}
                onClick={() => setConfirmarRuta(true)}
              >
                <Route className="!size-5" aria-hidden="true" />
                Cambiar la ruta de este mueble
              </Button>
            </>
          ) : (
            <p className="rounded-2xl border border-brand-dark/10 bg-brand-sand/50 p-4 text-base text-brand-dark">
              Este mueble ya empezó a fabricarse, así que su ruta no se puede cambiar: se
              perdería lo que el taller ya hizo. Si de verdad hace falta otra ruta, cancela
              este mueble y añade uno nuevo al pedido.
            </p>
          )}
        </CardContent>
      </Card>

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
          <Link href={`/admin/fabricacion/unidades/${unidad.codigo}`}>
            <ArrowLeft className="!size-5" aria-hidden="true" />
            Salir sin guardar
          </Link>
        </Button>
      </div>

      <DialogoConfirmar
        abierto={confirmarRuta}
        alCerrar={() => setConfirmarRuta(false)}
        tono="normal"
        titulo={`¿Cambiar la ruta de ${unidad.codigo}?`}
        descripcion={
          <>
            El mueble <Codigo valor={unidad.codigo} /> dejará de seguir «{unidad.rutaNombre}» y
            pasará a «{rutaNueva?.nombre ?? "la nueva ruta"}». Se rehace su lista de pasos.
            Como todavía no ha empezado, no se pierde ningún trabajo.
          </>
        }
        pideMotivo
        etiquetaMotivo="¿Por qué se cambia de ruta?"
        textoConfirmar="SÍ, CAMBIAR LA RUTA"
        alConfirmar={(motivo) => cambiarRutaDeUnidad(unidad.codigo, rutaElegida, motivo)}
        exito={() => "El mueble sigue ahora la ruta nueva."}
      />
    </div>
  );
}
