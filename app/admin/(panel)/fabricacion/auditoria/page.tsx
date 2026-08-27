import type { Metadata } from "next";
import {
  contarAuditoria,
  listarAuditoria,
  listarOperarios,
} from "@/lib/data/fabricacion";
import { getSesionOperario } from "@/lib/fabricacion/auth";
import { tiene } from "@/lib/fabricacion/permisos";
import {
  ENTIDADES_AUDITORIA,
  type EntidadAuditoria,
  type FiltrosAuditoria,
} from "@/lib/types/fabricacion";
import { AvisoSinPermiso } from "@/components/fabricacion/admin/config-compartido";
import { LineaTiempoAuditoria } from "@/components/fabricacion/admin/auditoria-linea-tiempo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Historial de cambios",
};

const POR_PAGINA = 40;

/** La zona del taller, para que «desde» y «hasta» cubran el día completo. */
const DESFASE = "-04:00";

/** Un parámetro de la dirección, siempre como texto limpio. */
function comoTexto(valor: string | string[] | undefined): string {
  if (Array.isArray(valor)) return (valor[0] ?? "").trim();
  return (valor ?? "").trim();
}

function comoDia(valor: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : "";
}

interface PropsPagina {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Historial de cambios de configuración (decisión 2 del dueño: *"deja anotado
 * siempre quién edita algo"*).
 *
 * Sólo lectura y sólo para quien tenga la capacidad `ver_auditoria`. Los
 * filtros viajan en la dirección para poder compartir una vista concreta.
 */
export default async function PaginaAuditoriaFabricacion({ searchParams }: PropsPagina) {
  const sesion = await getSesionOperario();

  if (!tiene(sesion, "ver_auditoria")) {
    return (
      <AvisoSinPermiso
        titulo="Esta pantalla no es para tu usuario"
        mensaje="Aquí se ve quién cambió cada cosa en todo el módulo, y tu rol no tiene ese permiso. Si necesitas consultarlo, pídeselo a quien administra el sistema."
      />
    );
  }

  const parametros = await searchParams;

  const busqueda = comoTexto(parametros.busqueda);
  const entidadCruda = comoTexto(parametros.entidad).toUpperCase();
  const entidad = (ENTIDADES_AUDITORIA as readonly string[]).includes(entidadCruda)
    ? (entidadCruda as EntidadAuditoria)
    : "";
  const actorId = comoTexto(parametros.actorId);
  const desde = comoDia(comoTexto(parametros.desde));
  const hasta = comoDia(comoTexto(parametros.hasta));

  const paginaCruda = Number.parseInt(comoTexto(parametros.pagina), 10);
  const pagina = Number.isFinite(paginaCruda) && paginaCruda > 1 ? paginaCruda : 1;

  // Filtros comunes: los chips de tipo se cuentan con TODO lo demás aplicado.
  const base: FiltrosAuditoria = {
    busqueda: busqueda === "" ? undefined : busqueda,
    actorId: actorId === "" ? undefined : actorId,
    desde: desde === "" ? undefined : `${desde}T00:00:00.000${DESFASE}`,
    hasta: hasta === "" ? undefined : `${hasta}T23:59:59.999${DESFASE}`,
  };

  const filtros: FiltrosAuditoria = {
    ...base,
    entidad: entidad === "" ? undefined : entidad,
    pagina,
    porPagina: POR_PAGINA,
  };

  const [registros, total, personas, conteosPorTipo] = await Promise.all([
    listarAuditoria(filtros),
    contarAuditoria(filtros),
    listarOperarios({ incluirInactivos: true, incluirEliminados: true }),
    Promise.all(
      ENTIDADES_AUDITORIA.map(async (tipo) => ({
        tipo,
        cantidad: await contarAuditoria({ ...base, entidad: tipo }),
      }))
    ),
  ]);

  const conteos: Record<string, number> = {};
  let totalGeneral = 0;
  for (const fila of conteosPorTipo) {
    conteos[fila.tipo] = fila.cantidad;
    totalGeneral += fila.cantidad;
  }

  return (
    <LineaTiempoAuditoria
      registros={registros}
      total={total}
      totalGeneral={totalGeneral}
      pagina={pagina}
      porPagina={POR_PAGINA}
      valores={{ busqueda, entidad, actorId, desde, hasta }}
      personas={personas.map((persona) => ({
        _id: persona._id,
        nombre: persona.nombre,
      }))}
      conteos={conteos}
    />
  );
}
