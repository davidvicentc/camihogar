"use client";

/**
 * Panel izquierdo del constructor: los pasos que ya existen en el catálogo,
 * agrupados por clase y con un botón «+» enorme para meterlos en la ruta.
 */

import { useMemo, useState } from "react";
import { Plus, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ETIQUETAS_TIPO_PASO, iconoDePaso } from "@/lib/fabricacion/constantes";
import type { CatalogoPasoDTO, TipoPaso } from "@/lib/types/fabricacion";
import { TIPOS_PASO } from "@/lib/types/fabricacion";
import { cn } from "@/lib/utils";

export interface PanelCatalogoProps {
  catalogo: CatalogoPasoDTO[];
  /** Claves que ya están en la ruta, para avisar de las repetidas. */
  clavesEnRuta: string[];
  onAgregar: (paso: CatalogoPasoDTO) => void;
  onCrearPasoNuevo: () => void;
}

export function PanelCatalogo({
  catalogo,
  clavesEnRuta,
  onAgregar,
  onCrearPasoNuevo,
}: PanelCatalogoProps) {
  const [busqueda, setBusqueda] = useState("");

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (texto === "") return catalogo;
    return catalogo.filter(
      (paso) =>
        paso.nombre.toLowerCase().includes(texto) ||
        paso.instrucciones.toLowerCase().includes(texto) ||
        (paso.estacionNombre ?? "").toLowerCase().includes(texto)
    );
  }, [busqueda, catalogo]);

  const porTipo = useMemo(() => {
    const mapa = new Map<TipoPaso, CatalogoPasoDTO[]>();
    for (const tipo of TIPOS_PASO) mapa.set(tipo, []);
    for (const paso of filtrados) {
      const lista = mapa.get(paso.tipo);
      if (lista) lista.push(paso);
    }
    return mapa;
  }, [filtrados]);

  return (
    <section
      aria-labelledby="titulo-pasos-disponibles"
      className="rounded-3xl border border-brand-dark/5 bg-brand-card p-4 shadow-warm-sm"
    >
      <h2
        id="titulo-pasos-disponibles"
        className="font-display text-xl font-bold uppercase tracking-tight text-brand-dark"
      >
        Pasos disponibles
      </h2>
      <p className="mt-1 text-base text-brand-taupe">
        Toca el botón «+» de un paso para meterlo al final de tu ruta.
      </p>

      <div className="relative mt-3">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-taupe"
          aria-hidden="true"
        />
        <Input
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar un paso…"
          aria-label="Buscar un paso del catálogo"
          className="h-14 pl-12 text-lg"
        />
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={onCrearPasoNuevo}
        aria-label="Crear un paso nuevo para esta ruta"
        className="mt-3 h-14 w-full text-base font-bold [&_svg]:size-5"
      >
        <Sparkles className="h-5 w-5" aria-hidden="true" />
        CREAR UN PASO NUEVO
      </Button>

      <div className="mt-4 max-h-[65vh] space-y-5 overflow-y-auto pr-1">
        {filtrados.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-brand-dark/15 p-6 text-center text-base text-brand-taupe">
            No hay ningún paso con ese nombre. Prueba con otra palabra o crea un paso nuevo con el
            botón de arriba.
          </p>
        ) : null}

        {TIPOS_PASO.map((tipo) => {
          const pasos = porTipo.get(tipo) ?? [];
          if (pasos.length === 0) return null;
          const meta = ETIQUETAS_TIPO_PASO[tipo];
          const IconoTipo = meta.icono;

          return (
            <div key={tipo}>
              <h3 className="flex items-center gap-2 text-base font-bold uppercase tracking-wide text-brand-taupe">
                <IconoTipo className="h-5 w-5" aria-hidden="true" />
                {meta.label}
                <span className="font-normal normal-case">({pasos.length})</span>
              </h3>

              <ul className="mt-2 space-y-2">
                {pasos.map((paso) => {
                  const Icono = iconoDePaso(paso.icono || paso.clave);
                  const repetidas = clavesEnRuta.filter((clave) => clave === paso.clave).length;

                  return (
                    <li
                      key={paso._id}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border bg-white p-3",
                        repetidas > 0 ? "border-brand-accent/40" : "border-brand-dark/10"
                      )}
                    >
                      <span
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                        style={{ backgroundColor: `${paso.color}1A`, color: paso.color }}
                      >
                        <Icono className="h-6 w-6" aria-hidden="true" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-lg font-semibold text-brand-dark">
                          {paso.nombre}
                        </p>
                        <p className="truncate text-base text-brand-taupe">
                          {paso.estacionNombre && paso.estacionNombre !== ""
                            ? paso.estacionNombre
                            : "En cualquier parte"}
                          {paso.horasEstimadas > 0
                            ? ` · ${paso.horasEstimadas} ${paso.horasEstimadas === 1 ? "hora" : "horas"}`
                            : ""}
                        </p>
                        {repetidas > 0 ? (
                          <p className="text-sm font-semibold text-brand-accent">
                            Ya está en tu ruta{repetidas > 1 ? ` ${repetidas} veces` : ""}
                          </p>
                        ) : null}
                      </div>

                      <Button
                        type="button"
                        onClick={() => onAgregar(paso)}
                        aria-label={`Añadir el paso ${paso.nombre} a la ruta`}
                        className="h-16 w-20 shrink-0 flex-col gap-0.5 rounded-2xl bg-ember-gradient p-0 text-[0.7rem] font-bold text-white shadow-ember [&_svg]:size-7 hover:brightness-[1.06]"
                      >
                        <Plus className="h-7 w-7" aria-hidden="true" />
                        AÑADIR
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
