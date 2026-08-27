"use client";

/**
 * Las tres vistas de la ficha de un mueble: la línea de tiempo de sus pasos,
 * la bitácora del taller y el historial de cambios de configuración.
 *
 * Sólo la conmutación necesita el navegador; el contenido llega ya renderizado
 * desde el servidor.
 */

import type { ReactNode } from "react";
import { History, ListChecks, ScrollText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function PestanasUnidad({
  lineaTiempo,
  bitacora,
  historial,
  mostrarHistorial,
}: {
  lineaTiempo: ReactNode;
  bitacora: ReactNode;
  historial: ReactNode;
  /** El historial de cambios sólo lo ve quien tiene «Ver el historial de cambios». */
  mostrarHistorial: boolean;
}) {
  return (
    <Tabs defaultValue="linea">
      <TabsList className="h-auto flex-wrap justify-start rounded-2xl p-1.5">
        <TabsTrigger value="linea" className="h-12 gap-2 px-5 text-base font-semibold">
          <ListChecks className="h-5 w-5" aria-hidden="true" />
          Línea de tiempo
        </TabsTrigger>
        <TabsTrigger value="bitacora" className="h-12 gap-2 px-5 text-base font-semibold">
          <ScrollText className="h-5 w-5" aria-hidden="true" />
          Bitácora
        </TabsTrigger>
        {mostrarHistorial && (
          <TabsTrigger value="historial" className="h-12 gap-2 px-5 text-base font-semibold">
            <History className="h-5 w-5" aria-hidden="true" />
            Historial de cambios
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="linea" className="mt-6">
        {lineaTiempo}
      </TabsContent>
      <TabsContent value="bitacora" className="mt-6">
        {bitacora}
      </TabsContent>
      {mostrarHistorial && (
        <TabsContent value="historial" className="mt-6">
          {historial}
        </TabsContent>
      )}
    </Tabs>
  );
}
