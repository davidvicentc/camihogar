import { redirect } from "next/navigation";

import { getSesionOperario } from "@/lib/fabricacion/auth";
import { listarOperariosParaLogin } from "@/lib/data/fabricacion";
import { EntradaTaller } from "@/components/fabricacion/operario/entrada-taller";

/**
 * Pantalla de entrada al taller: la lista de caras y el teclado del PIN.
 *
 * Acepta `?volver=` para devolver a la persona justo a donde iba (por ejemplo,
 * al mueble cuyo QR acaba de escanear). Ese destino se comprueba aquí: sólo se
 * admiten rutas internas del módulo, nunca una dirección de fuera.
 */

export const dynamic = "force-dynamic";

/** Sólo dejamos volver a sitios del propio taller. Nada de enlaces de fuera. */
function destinoSeguro(volver: string | undefined): string {
  if (typeof volver !== "string") return "/fabrica";
  const limpio = volver.trim();
  // Una barra sola al principio: descarta "//otro-sitio.com" y "https://…".
  if (!limpio.startsWith("/") || limpio.startsWith("//")) return "/fabrica";
  if (limpio.startsWith("/fabrica/login")) return "/fabrica";
  if (limpio === "/fabrica" || limpio.startsWith("/fabrica/") || limpio.startsWith("/f/")) {
    return limpio;
  }
  return "/fabrica";
}

export default async function PaginaEntrada({
  searchParams,
}: {
  searchParams: Promise<{ volver?: string }>;
}) {
  const [{ volver }, sesion] = await Promise.all([searchParams, getSesionOperario()]);
  const destino = destinoSeguro(volver);

  // Quien ya entró no vuelve a ver el teclado del PIN.
  if (sesion) redirect(destino);

  const personas = await listarOperariosParaLogin();

  return <EntradaTaller personas={personas} volver={destino} />;
}
