"use client";

/**
 * El buscador grande del centro de control: se pega el código que viene del QR
 * o de la etiqueta y salta directo a la ficha.
 *
 * Reconoce el código aquí mismo, en el navegador, con una expresión pequeña.
 * NO importa `normalizarCodigo` de `lib/fabricacion/codigos.ts` porque ese
 * archivo arrastra Mongoose (el contador de secuencias) y no puede acabar en
 * el paquete del navegador. De todas formas la ficha del servidor vuelve a
 * normalizar lo que reciba, así que un código raro también encuentra su mueble.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { avisoError } from "@/components/fabricacion/admin/tablero-avisos";

interface CodigoLeido {
  tipo: "UNIDAD" | "PEDIDO";
  codigo: string;
}

/**
 * Acepta `949473`, `cod949473`, `COD 949473`, `cod-949473`, `PED-100248` y la
 * URL entera del QR (`https://…/f/COD-949473`). Sin prefijo se asume mueble.
 */
function interpretarCodigo(entrada: string): CodigoLeido | null {
  const limpio = entrada
    .trim()
    .toUpperCase()
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "");
  const coincidencia = limpio.match(/(COD|PED)?[\s_-]*(\d{6,10})\s*$/);
  if (!coincidencia) return null;

  const prefijo = coincidencia[1] === "PED" ? "PED" : "COD";
  return {
    tipo: prefijo === "PED" ? "PEDIDO" : "UNIDAD",
    codigo: `${prefijo}-${coincidencia[2]}`,
  };
}

export function BuscadorCodigo({ className }: { className?: string }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");

  function buscar(evento: React.FormEvent) {
    evento.preventDefault();
    const leido = interpretarCodigo(texto);

    if (!leido) {
      avisoError(
        "Ese código no se entiende. Escribe los 6 números del mueble, por ejemplo 949473."
      );
      return;
    }

    setTexto("");
    router.push(
      leido.tipo === "PEDIDO"
        ? `/admin/fabricacion/pedidos/${leido.codigo}`
        : `/admin/fabricacion/unidades/${leido.codigo}`
    );
  }

  return (
    <form onSubmit={buscar} className={className}>
      <label htmlFor="buscador-codigo" className="mb-2 block text-base font-semibold text-brand-dark">
        Buscar un mueble o un pedido por su código
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          id="buscador-codigo"
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          inputMode="text"
          autoComplete="off"
          placeholder="COD-949473, 949473 o PED-100248"
          className="h-14 flex-1 rounded-2xl font-mono text-lg"
        />
        <Button type="submit" variant="accent" className="h-14 px-8 text-lg font-bold sm:w-auto">
          <Search className="!size-6" aria-hidden="true" />
          BUSCAR
        </Button>
      </div>
      <p className="mt-2 text-sm text-brand-taupe">
        Sirve el número de la etiqueta, el código completo o la dirección que abre el QR.
      </p>
    </form>
  );
}
