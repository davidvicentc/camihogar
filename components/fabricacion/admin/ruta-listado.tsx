"use client";

/**
 * Listado de rutas con su CRUD completo (§7): buscar, filtrar, crear, editar,
 * duplicar, marcar la predeterminada, archivar, restaurar y eliminar.
 *
 * Eliminar SIEMPRE pasa por un diálogo que dice qué se conserva y qué se
 * pierde. Si la ruta ya se está usando, la acción del servidor la archiva en
 * vez de borrarla y su explicación se pinta ahí mismo.
 */

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Archive, PlusCircle, Route as RouteIcon, Search, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PLANTILLAS_RUTA } from "@/lib/fabricacion/constantes";
import {
  archivarRuta,
  duplicarRuta,
  eliminarRuta,
  marcarRutaPredeterminada,
  restaurarRuta,
} from "@/lib/actions/fabricacion";
import type { RutaDTO } from "@/lib/types/fabricacion";
import {
  AvisosFabricacion,
  ChipBoton,
  DialogoConfirmar,
  EstadoVacio,
  avisarError,
  avisarExito,
} from "./ruta-ui";
import { RutaTarjeta } from "./ruta-tarjeta";
import { SecuenciaPasos } from "./ruta-secuencia";

/** Enlace a la pantalla de creación, opcionalmente con una plantilla cargada. */
function enlaceNueva(plantilla?: string): string {
  return plantilla
    ? `/admin/fabricacion/rutas/nueva?plantilla=${encodeURIComponent(plantilla)}`
    : "/admin/fabricacion/rutas/nueva";
}

export interface RutasListadoProps {
  rutas: RutaDTO[];
  verArchivadas: boolean;
}

export function RutasListado({ rutas, verArchivadas }: RutasListadoProps) {
  const router = useRouter();
  const rutaActual = usePathname();
  const parametros = useSearchParams();
  const [, iniciarTransicion] = useTransition();

  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState<string>("");
  const [ocupadaId, setOcupadaId] = useState<string | null>(null);
  const [aEliminar, setAEliminar] = useState<RutaDTO | null>(null);
  const [aArchivar, setAArchivar] = useState<RutaDTO | null>(null);

  const categorias = useMemo(() => {
    const vistas = new Set<string>();
    for (const ruta of rutas) {
      if (ruta.categoriaSugerida.trim() !== "") vistas.add(ruta.categoriaSugerida.trim());
    }
    return [...vistas].sort((a, b) => a.localeCompare(b, "es"));
  }, [rutas]);

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return rutas.filter((ruta) => {
      if (categoria !== "" && ruta.categoriaSugerida !== categoria) return false;
      if (texto === "") return true;
      return (
        ruta.nombre.toLowerCase().includes(texto) ||
        ruta.descripcion.toLowerCase().includes(texto) ||
        ruta.categoriaSugerida.toLowerCase().includes(texto) ||
        ruta.pasos.some((paso) => paso.nombre.toLowerCase().includes(texto))
      );
    });
  }, [busqueda, categoria, rutas]);

  function cambiarArchivadas(activo: boolean) {
    const nuevos = new URLSearchParams(parametros.toString());
    if (activo) nuevos.set("archivadas", "1");
    else nuevos.delete("archivadas");
    const consulta = nuevos.toString();
    iniciarTransicion(() => {
      router.push(consulta === "" ? rutaActual : `${rutaActual}?${consulta}`);
    });
  }

  async function accionDirecta(
    ruta: RutaDTO,
    ejecutar: () => Promise<{ ok: boolean; error?: string }>,
    mensajeExito: string
  ) {
    setOcupadaId(ruta._id);
    const resultado = await ejecutar();
    setOcupadaId(null);

    if (!resultado.ok) {
      avisarError(resultado.error ?? "No pudimos hacerlo. Vuelve a intentarlo en un momento.");
      return;
    }
    avisarExito(mensajeExito);
    router.refresh();
  }

  const hayRutas = rutas.length > 0;

  return (
    <div className="space-y-6 text-lg">
      <AvisosFabricacion />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-brand-dark sm:text-4xl">
            Rutas de fabricación
          </h1>
          <p className="mt-1 text-base text-brand-taupe">
            {verArchivadas
              ? `${rutas.length} ${rutas.length === 1 ? "ruta archivada" : "rutas archivadas"}`
              : `${rutas.length} ${rutas.length === 1 ? "ruta" : "rutas"}`}{" "}
            · Una ruta es el camino de pasos que sigue un mueble hasta el cliente.
          </p>
        </div>

        <Button
          asChild
          className="h-16 bg-ember-gradient px-6 text-lg font-bold text-white shadow-ember [&_svg]:size-6 hover:brightness-[1.06]"
        >
          <Link href={enlaceNueva()} aria-label="Crear una ruta nueva">
            <PlusCircle className="h-6 w-6" aria-hidden="true" />
            CREAR NUEVA RUTA
          </Link>
        </Button>
      </header>

      {/* Buscador y filtros */}
      <div className="space-y-3 rounded-3xl border border-brand-dark/5 bg-brand-card p-4 shadow-warm-sm">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-taupe"
            aria-hidden="true"
          />
          <Input
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Buscar una ruta por su nombre o por un paso…"
            aria-label="Buscar una ruta"
            className="h-14 pl-12 text-lg"
          />
        </div>

        {categorias.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            <ChipBoton
              activo={categoria === ""}
              etiqueta="Todas"
              onClick={() => setCategoria("")}
            />
            {categorias.map((nombre) => (
              <ChipBoton
                key={nombre}
                activo={categoria === nombre}
                etiqueta={nombre}
                onClick={() => setCategoria(nombre)}
              />
            ))}
          </div>
        ) : null}

        <label
          htmlFor="ver-archivadas"
          className="flex min-h-[44px] cursor-pointer items-center justify-between gap-4 rounded-2xl border border-brand-dark/10 bg-white p-3"
        >
          <span>
            <span className="flex items-center gap-2 text-lg font-semibold text-brand-dark">
              <Archive className="h-5 w-5 text-brand-taupe" aria-hidden="true" />
              Ver archivadas
            </span>
            <span className="mt-0.5 block text-base text-brand-taupe">
              Las rutas guardadas que ya no se usan. Se pueden devolver al uso cuando quieras.
            </span>
          </span>
          <Switch
            id="ver-archivadas"
            checked={verArchivadas}
            onCheckedChange={cambiarArchivadas}
            aria-label="Ver las rutas archivadas"
            className="shrink-0 scale-[1.4] origin-right"
          />
        </label>
      </div>

      {/* Listado */}
      {!hayRutas ? (
        <EstadoVacio
          icono={RouteIcon}
          titulo={verArchivadas ? "No hay rutas archivadas" : "Todavía no hay ninguna ruta"}
          descripcion={
            verArchivadas
              ? "Aquí aparecerán las rutas que archives. Apaga «Ver archivadas» para volver a las que están en uso."
              : "Puedes armar la tuya desde cero o empezar con una ruta ya preparada y cambiarle lo que quieras."
          }
        >
          {verArchivadas ? null : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                {PLANTILLAS_RUTA.map((plantilla) => (
                  <Button
                    key={plantilla.nombre}
                    asChild
                    variant="outline"
                    className="h-auto min-h-[5.5rem] flex-col items-start gap-1 whitespace-normal p-4 text-left text-base font-bold [&_svg]:size-5"
                  >
                    <Link
                      href={enlaceNueva(plantilla.nombre)}
                      aria-label={`Empezar con la ruta ${plantilla.nombre}, ${plantilla.pasos.length} pasos listos`}
                    >
                      <span className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-brand-accent" aria-hidden="true" />
                        Empieza con «{plantilla.nombre}»
                      </span>
                      <span className="text-sm font-medium text-brand-taupe">
                        {plantilla.pasos.length} pasos listos
                      </span>
                    </Link>
                  </Button>
                ))}
              </div>
              <Button
                asChild
                className="h-16 w-full bg-ember-gradient text-lg font-bold text-white shadow-ember [&_svg]:size-6 hover:brightness-[1.06]"
              >
                <Link href={enlaceNueva()} aria-label="Crear una ruta nueva desde cero">
                  <PlusCircle className="h-6 w-6" aria-hidden="true" />
                  CREAR NUEVA RUTA DESDE CERO
                </Link>
              </Button>
            </div>
          )}
        </EstadoVacio>
      ) : visibles.length === 0 ? (
        <EstadoVacio
          icono={Search}
          titulo="No encontramos ninguna ruta así"
          descripcion="Prueba con otra palabra o quita el filtro para ver todas otra vez."
        >
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setBusqueda("");
              setCategoria("");
            }}
            aria-label="Ver todas las rutas otra vez"
            className="h-14 px-6 text-base font-bold"
          >
            VER TODAS
          </Button>
        </EstadoVacio>
      ) : (
        <div className="space-y-4">
          {visibles.map((ruta) => (
            <RutaTarjeta
              key={ruta._id}
              ruta={ruta}
              ocupada={ocupadaId === ruta._id}
              onDuplicar={(elegida) =>
                accionDirecta(
                  elegida,
                  () => duplicarRuta(elegida._id),
                  `Se creó una copia de «${elegida.nombre}». Búscala como «${elegida.nombre} (copia)».`
                )
              }
              onPredeterminada={(elegida) =>
                accionDirecta(
                  elegida,
                  () => marcarRutaPredeterminada(elegida._id),
                  `Ahora «${elegida.nombre}» es la ruta que se propone sola al registrar un mueble.`
                )
              }
              onRestaurar={(elegida) =>
                accionDirecta(
                  elegida,
                  () => restaurarRuta(elegida._id),
                  `«${elegida.nombre}» volvió al uso.`
                )
              }
              onArchivar={setAArchivar}
              onEliminar={setAEliminar}
            />
          ))}
        </div>
      )}

      {/* Diálogo de archivar */}
      {aArchivar ? (
        <DialogoConfirmar
          abierto
          onAbiertoChange={(abierto) => {
            if (!abierto) setAArchivar(null);
          }}
          titulo={`¿Archivar «${aArchivar.nombre}»?`}
          descripcion="La ruta se guarda pero deja de ofrecerse al registrar muebles nuevos."
          detalle={
            <ul className="list-disc space-y-1 pl-5 text-base text-brand-taupe">
              <li>Los muebles que ya la están usando siguen igual.</li>
              <li>Puedes devolverla al uso cuando quieras desde «Ver archivadas».</li>
              <li>No se borra nada del historial.</li>
            </ul>
          }
          textoConfirmar="SÍ, ARCHIVAR"
          iconoConfirmar={Archive}
          onConfirmar={async () => {
            const resultado = await archivarRuta(aArchivar._id);
            return {
              ok: resultado.ok,
              error: resultado.error,
              mensaje: `«${aArchivar.nombre}» quedó archivada.`,
            };
          }}
          onHecho={() => {
            setAArchivar(null);
            router.refresh();
          }}
        />
      ) : null}

      {/* Diálogo de eliminar */}
      {aEliminar ? (
        <DialogoConfirmar
          abierto
          onAbiertoChange={(abierto) => {
            if (!abierto) setAEliminar(null);
          }}
          titulo={`¿Eliminar la ruta «${aEliminar.nombre}»?`}
          descripcion={
            (aEliminar.unidadesEnCurso ?? 0) > 0
              ? `Esta ruta la usan ${aEliminar.unidadesEnCurso} ${
                  (aEliminar.unidadesEnCurso ?? 0) === 1 ? "mueble" : "muebles"
                }, así que no se puede borrar: se va a archivar.`
              : "Esta ruta no la usa ningún mueble, así que se va a borrar del todo."
          }
          detalle={
            <div className="space-y-3">
              <SecuenciaPasos pasos={aEliminar.pasos} maximo={4} />
              <ul className="list-disc space-y-1 pl-5 text-base text-brand-taupe">
                <li>
                  <strong className="text-brand-dark">Se conserva:</strong> todo el historial de los
                  muebles que ya la usaron y el registro de quién la creó y la editó.
                </li>
                <li>
                  <strong className="text-brand-dark">Se pierde:</strong> la ruta deja de aparecer
                  al registrar muebles nuevos. Si se archiva, la puedes recuperar; si se borra del
                  todo, hay que armarla otra vez.
                </li>
              </ul>
            </div>
          }
          textoConfirmar={
            (aEliminar.unidadesEnCurso ?? 0) > 0 ? "SÍ, ARCHIVARLA" : "SÍ, ELIMINAR"
          }
          peligroso
          iconoConfirmar={Trash2}
          onConfirmar={async () => {
            const resultado = await eliminarRuta(aEliminar._id);
            if (!resultado.ok) {
              return { ok: false, error: resultado.error };
            }
            return {
              ok: true,
              mensaje:
                resultado.data?.mensaje ?? `Se eliminó la ruta «${aEliminar.nombre}».`,
            };
          }}
          onHecho={() => {
            setAEliminar(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
