"use client";

/**
 * Las dos vistas del centro de control: "Tablero" (columnas por paso) y
 * "Lista" (una fila por mueble).
 *
 * Sólo la conmutación es interactiva; el contenido de cada pestaña llega ya
 * renderizado desde el servidor como `children`, así que al navegador no viaja
 * ni la lógica del tablero ni los datos duplicados.
 *
 * La pestaña elegida se recuerda en el navegador para que, al volver del
 * detalle de un mueble, cada quien siga donde estaba.
 */

import { useEffect, useState, type ReactNode } from "react";
import { LayoutGrid, List } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CLAVE_MEMORIA = "camihogar:fabricacion:vista";

export function PestanasTablero({
  tablero,
  lista,
}: {
  tablero: ReactNode;
  lista: ReactNode;
}) {
  const [vista, setVista] = useState("tablero");

  useEffect(() => {
    try {
      const guardada = window.localStorage.getItem(CLAVE_MEMORIA);
      if (guardada === "tablero" || guardada === "lista") setVista(guardada);
    } catch {
      // Navegador con el almacenamiento bloqueado: se queda en "tablero".
    }
  }, []);

  function cambiar(nueva: string) {
    setVista(nueva);
    try {
      window.localStorage.setItem(CLAVE_MEMORIA, nueva);
    } catch {
      // Da igual: la pestaña sigue funcionando, sólo no se recuerda.
    }
  }

  return (
    <Tabs value={vista} onValueChange={cambiar}>
      <TabsList className="h-14 rounded-2xl p-1.5">
        <TabsTrigger value="tablero" className="h-11 gap-2 px-5 text-base font-semibold">
          <LayoutGrid className="h-5 w-5" aria-hidden="true" />
          Tablero
        </TabsTrigger>
        <TabsTrigger value="lista" className="h-11 gap-2 px-5 text-base font-semibold">
          <List className="h-5 w-5" aria-hidden="true" />
          Lista
        </TabsTrigger>
      </TabsList>

      <TabsContent value="tablero">{tablero}</TabsContent>
      <TabsContent value="lista">{lista}</TabsContent>
    </Tabs>
  );
}
