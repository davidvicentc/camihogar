/**
 * Pantalla de escaneo del taller — `/fabrica/escanear`.
 *
 * Toda la parte que se toca (cámara, teclado gigante, confirmación) vive en
 * `components/fabricacion/escaner/*`, que son componentes de cliente. Esta
 * página es sólo la envoltura del servidor y existe por un motivo concreto:
 * **buscar el mueble tiene que pasar por el servidor**. Aquí se define esa
 * búsqueda como acción de servidor y se le pasa al componente de cliente, de
 * forma que el navegador nunca habla con la base de datos y el código leído se
 * normaliza siempre en el mismo sitio (`normalizarCodigo`).
 *
 * El QR de la etiqueta lleva `{siteUrl}/f/COD-949473` y nada más (§1 del
 * contrato): esta pantalla acepta ese texto entero, el código suelto o los
 * seis dígitos tecleados a mano; los tres acaban en el mismo mueble.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ScanLine, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getUnidad } from "@/lib/data/fabricacion";
import { getSesionOperario } from "@/lib/fabricacion/auth";
import { normalizarCodigo } from "@/lib/fabricacion/codigos";
import { META_ESTADO_UNIDAD } from "@/lib/fabricacion/constantes";
import { tiene } from "@/lib/fabricacion/permisos";
import { indicePasoActual } from "@/lib/fabricacion/reglas";
import type { ActionResult } from "@/lib/types/fabricacion";

import type { MuebleEncontrado } from "@/components/fabricacion/escaner/confirmacion-mueble";
import { PantallaEscaneo } from "@/components/fabricacion/escaner/pantalla-escaneo";

export const metadata: Metadata = {
  title: "Escanear un mueble",
};

export const dynamic = "force-dynamic";

export default async function EscanearPage() {
  /**
   * Busca el mueble a partir de lo que leyó la cámara o de lo que se tecleó.
   *
   * Devuelve un objeto plano y pequeño: lo justo para que la persona reconozca
   * el mueble antes de entrar. Nada de documentos de la base de datos ni fechas
   * sueltas cruzando al navegador.
   */
  async function buscarMueble(
    textoLeido: string
  ): Promise<ActionResult<MuebleEncontrado>> {
    "use server";

    try {
      const sesion = await getSesionOperario();
      if (!sesion) {
        return {
          ok: false,
          error: "Tu sesión se cerró. Vuelve a entrar con tu PIN.",
        };
      }

      const canonico = normalizarCodigo(textoLeido);
      if (!canonico) {
        return {
          ok: false,
          error:
            "Ese código no se entiende. Revisa los números de la etiqueta y prueba otra vez.",
        };
      }

      const unidad = await getUnidad(canonico, sesion);
      if (!unidad) {
        return {
          ok: false,
          error: "No encontramos ese código. Revísalo y prueba otra vez.",
        };
      }

      if (unidad.eliminada) {
        return {
          ok: false,
          error:
            "Ese mueble ya no está en la lista de fabricación. Avisa a tu supervisor.",
        };
      }

      const meta = META_ESTADO_UNIDAD[unidad.estado];
      const paso = unidad.pasos[indicePasoActual(unidad.pasos)];

      return {
        ok: true,
        data: {
          codigo: unidad.codigo,
          mueble: unidad.producto.titulo,
          cliente: unidad.clienteNombre,
          pedidoCodigo: unidad.pedidoCodigo,
          estadoLabel: meta.label,
          estadoDescripcion: meta.descripcion,
          estadoClases: meta.clases,
          progreso: unidad.progreso,
          pasoActual: paso?.nombre ?? "",
          imagen: unidad.producto.imagen,
        },
      };
    } catch (error) {
      console.error("[fabrica/escanear] buscarMueble:", error);
      return {
        ok: false,
        error:
          "No pudimos buscar el mueble ahora mismo. Espera un momento y vuelve a intentarlo.",
      };
    }
  }

  const sesion = await getSesionOperario();
  if (!sesion) redirect("/fabrica/login");

  // Sin la capacidad de escanear no se enseña la cámara, pero tampoco se deja
  // a nadie delante de un error seco: se dice qué pasa y por dónde salir.
  if (!tiene(sesion, "escanear")) {
    return (
      <div className="mx-auto w-full max-w-md space-y-6 px-4 py-8 text-lg">
        <div className="rounded-3xl border-4 border-amber-300 bg-amber-50 p-6 text-center">
          <ShieldAlert
            className="mx-auto h-14 w-14 text-amber-600"
            aria-hidden="true"
          />
          <h1 className="mt-3 text-3xl font-bold text-brand-dark">
            No puedes escanear
          </h1>
          <p className="mt-3 text-lg leading-relaxed text-brand-taupe">
            Tu perfil de <strong>{sesion.rolNombre}</strong> no tiene activado
            el escaneo de muebles. Si lo necesitas, pídeselo a quien administra
            el sistema.
          </p>
        </div>

        <Button
          asChild
          variant="accent"
          className="h-20 w-full rounded-3xl text-xl font-bold"
        >
          <Link href="/fabrica">
            <ArrowLeft className="!h-7 !w-7" aria-hidden="true" />
            VOLVER A MI TRABAJO
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-5 px-4 py-6 text-lg">
      <header className="space-y-1">
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-brand-dark">
          <ScanLine className="h-9 w-9 text-brand-accent" aria-hidden="true" />
          Escanear un mueble
        </h1>
        <p className="text-lg leading-relaxed text-brand-taupe">
          Acerca la cámara a la etiqueta del mueble. Si no se lee, puedes
          escribir el código a mano.
        </p>
      </header>

      <PantallaEscaneo buscarMueble={buscarMueble} />

      <Link
        href="/fabrica"
        className="flex h-14 items-center justify-center gap-2 rounded-3xl text-lg font-semibold text-brand-taupe underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-accent"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        Volver a mi trabajo
      </Link>
    </div>
  );
}
