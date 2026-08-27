"use client";

/**
 * Pantalla del EQUIPO: crear · leer · listar · editar · eliminar personas,
 * más cambiar rol, cambiar PIN, activar/desactivar y restaurar (§7).
 *
 * Los seguros anti-bloqueo viven en las Server Actions; aquí se enseñan sus
 * mensajes dentro del diálogo correspondiente, nunca en un aviso que se
 * esfuma, para que a nadie se le escape por qué no pudo hacer algo.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Users, UserSearch } from "lucide-react";
import type { EstacionDTO, OperarioDTO, RolDTO } from "@/lib/types/fabricacion";
import { iconoDeRol } from "@/lib/fabricacion/constantes";
import {
  activarOperario,
  desactivarOperario,
  eliminarOperario,
  restaurarOperario,
} from "@/lib/actions/fabricacion";
import {
  BotonPrincipal,
  BuscadorGrande,
  CabeceraConfig,
  ChipFiltro,
  DialogoEliminar,
  EstadoVacio,
  InterruptorTexto,
  ToasterFabrica,
  avisoError,
  avisoExito,
} from "./config-compartido";
import { FormularioEquipo, type EntregaPin } from "./equipo-formulario";
import { TarjetaEquipo } from "./equipo-tarjeta";
import { DialogoCambiarRol } from "./equipo-cambiar-rol";
import { DialogoCambiarPin } from "./equipo-cambiar-pin";
import { TarjetaPinImprimible } from "./equipo-tarjeta-imprimible";

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export interface PropsListaEquipo {
  /** Todas las personas: activas, desactivadas y eliminadas. */
  personas: OperarioDTO[];
  roles: RolDTO[];
  estaciones: EstacionDTO[];
  /** El `uid` de quien está mirando, para marcar «Eres tú». */
  miUid: string;
}

export function ListaEquipo({ personas, roles, estaciones, miUid }: PropsListaEquipo) {
  const router = useRouter();

  const [busqueda, setBusqueda] = React.useState("");
  const [filtroRol, setFiltroRol] = React.useState("");
  const [verEliminadas, setVerEliminadas] = React.useState(false);
  const [ocupado, setOcupado] = React.useState(false);

  const [formularioAbierto, setFormularioAbierto] = React.useState(false);
  const [enEdicion, setEnEdicion] = React.useState<OperarioDTO | null>(null);

  const [cambiandoRol, setCambiandoRol] = React.useState<OperarioDTO | null>(null);
  const [cambiandoPin, setCambiandoPin] = React.useState<OperarioDTO | null>(null);
  const [entrega, setEntrega] = React.useState<EntregaPin | null>(null);

  const [aEliminar, setAEliminar] = React.useState<OperarioDTO | null>(null);
  const [bloqueo, setBloqueo] = React.useState<string | null>(null);

  const porClave = React.useMemo(() => {
    const mapa = new Map<string, RolDTO>();
    for (const rol of roles) mapa.set(rol.clave, rol);
    return mapa;
  }, [roles]);

  const vivas = React.useMemo(
    () => personas.filter((persona) => !persona.eliminado),
    [personas]
  );
  const eliminadas = personas.length - vivas.length;

  const visibles = React.useMemo(() => {
    const patron = normalizar(busqueda.trim());
    return personas
      .filter((persona) => (verEliminadas ? persona.eliminado : !persona.eliminado))
      .filter((persona) => (filtroRol === "" ? true : persona.rolClave === filtroRol))
      .filter((persona) => {
        if (patron === "") return true;
        return (
          normalizar(persona.nombre).includes(patron) ||
          normalizar(persona.codigoEmpleado).includes(patron) ||
          normalizar(persona.telefono).includes(patron) ||
          normalizar(persona.rolNombre).includes(patron)
        );
      });
  }, [personas, busqueda, filtroRol, verEliminadas]);

  function refrescar(): void {
    router.refresh();
  }

  function abrirCreacion(): void {
    setEnEdicion(null);
    setFormularioAbierto(true);
  }

  async function alCambiarActivo(persona: OperarioDTO): Promise<void> {
    setOcupado(true);
    const resultado = persona.activo
      ? await desactivarOperario(persona._id)
      : await activarOperario(persona._id);
    setOcupado(false);

    if (!resultado.ok) {
      avisoError(
        resultado.error ?? "No pudimos cambiar el estado de la persona. Vuelve a intentarlo."
      );
      return;
    }
    avisoExito(
      persona.activo
        ? `«${persona.nombre}» quedó desactivada: ya no puede entrar a la app del taller.`
        : `«${persona.nombre}» vuelve a poder entrar a la app del taller.`
    );
    refrescar();
  }

  async function alRestaurar(persona: OperarioDTO): Promise<void> {
    setOcupado(true);
    const resultado = await restaurarOperario(persona._id);
    setOcupado(false);

    if (!resultado.ok) {
      avisoError(resultado.error ?? "No pudimos recuperar a la persona. Vuelve a intentarlo.");
      return;
    }
    avisoExito(`«${persona.nombre}» vuelve a estar en el equipo.`);
    refrescar();
  }

  async function confirmarEliminar(): Promise<void> {
    if (!aEliminar) return;

    setOcupado(true);
    const resultado = await eliminarOperario(aEliminar._id);
    setOcupado(false);

    if (!resultado.ok) {
      setBloqueo(resultado.error ?? "No pudimos eliminar a la persona. Vuelve a intentarlo.");
      return;
    }

    avisoExito(resultado.data?.mensaje ?? `Se eliminó a «${aEliminar.nombre}».`);
    setAEliminar(null);
    setBloqueo(null);
    refrescar();
  }

  const totalTexto = `${vivas.length} ${vivas.length === 1 ? "persona" : "personas"}`;

  return (
    <div className="space-y-8">
      <ToasterFabrica />

      <CabeceraConfig
        titulo="Equipo"
        contador={totalTexto}
        descripcion="Quiénes pueden entrar a la app del taller y qué puede hacer cada uno."
      >
        <BotonPrincipal icono={UserPlus} onClick={abrirCreacion} disabled={ocupado}>
          AÑADIR PERSONA
        </BotonPrincipal>
      </CabeceraConfig>

      <div className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="lg:max-w-md lg:flex-1">
            <BuscadorGrande
              id="buscar-persona"
              valor={busqueda}
              onChange={setBusqueda}
              etiqueta="Buscar una persona por su nombre o su código"
              marcador="Buscar una persona…"
            />
          </div>
          <InterruptorTexto
            id="ver-personas-eliminadas"
            activo={verEliminadas}
            onChange={setVerEliminadas}
            etiqueta="Ver eliminadas"
            ayuda={
              eliminadas === 0
                ? "No hay personas eliminadas"
                : `Hay ${eliminadas} ${eliminadas === 1 ? "persona eliminada" : "personas eliminadas"}`
            }
          />
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por rol">
          <ChipFiltro
            activo={filtroRol === ""}
            onClick={() => setFiltroRol("")}
            icono={Users}
            cantidad={vivas.length}
          >
            Todos
          </ChipFiltro>
          {roles.map((rol) => {
            const cantidad = vivas.filter((persona) => persona.rolClave === rol.clave).length;
            if (cantidad === 0 && filtroRol !== rol.clave) return null;
            return (
              <ChipFiltro
                key={rol._id}
                activo={filtroRol === rol.clave}
                onClick={() => setFiltroRol(filtroRol === rol.clave ? "" : rol.clave)}
                icono={iconoDeRol(rol.icono || rol.clave)}
                cantidad={cantidad}
              >
                {rol.nombre}
              </ChipFiltro>
            );
          })}
        </div>
      </div>

      {personas.length === 0 ? (
        <EstadoVacio
          icono={Users}
          titulo="Todavía no hay nadie en el equipo"
          mensaje="Añade a la primera persona: ponle nombre, elige su rol y dale un PIN de 4 números para que pueda entrar a la app del taller."
        >
          <BotonPrincipal icono={UserPlus} onClick={abrirCreacion}>
            AÑADIR PERSONA
          </BotonPrincipal>
        </EstadoVacio>
      ) : visibles.length === 0 ? (
        <EstadoVacio
          icono={UserSearch}
          titulo={
            verEliminadas
              ? "No hay personas eliminadas"
              : "No encontramos a nadie con esa búsqueda"
          }
          mensaje={
            verEliminadas
              ? "Apaga «Ver eliminadas» para volver al equipo de siempre."
              : "Prueba a escribir menos letras, quita el filtro de rol, o enciende «Ver eliminadas» por si esa persona ya no está en el equipo."
          }
        />
      ) : (
        <div className="space-y-4">
          {visibles.map((persona) => (
            <TarjetaEquipo
              key={persona._id}
              operario={persona}
              rol={porClave.get(persona.rolClave)}
              ocupado={ocupado}
              esMiCuenta={persona._id === miUid}
              onEditar={() => {
                setEnEdicion(persona);
                setFormularioAbierto(true);
              }}
              onCambiarRol={() => setCambiandoRol(persona)}
              onCambiarPin={() => setCambiandoPin(persona)}
              onCambiarActivo={() => void alCambiarActivo(persona)}
              onEliminar={() => {
                setAEliminar(persona);
                setBloqueo(null);
              }}
              onRestaurar={() => void alRestaurar(persona)}
            />
          ))}
        </div>
      )}

      <FormularioEquipo
        abierto={formularioAbierto}
        onCerrar={() => setFormularioAbierto(false)}
        inicial={enEdicion}
        roles={roles}
        estaciones={estaciones}
        onGuardado={(nuevaEntrega) => {
          if (nuevaEntrega) setEntrega(nuevaEntrega);
          refrescar();
        }}
      />

      <DialogoCambiarRol
        operario={cambiandoRol}
        roles={roles}
        onCerrar={() => setCambiandoRol(null)}
        onCambiado={refrescar}
      />

      <DialogoCambiarPin
        operario={cambiandoPin}
        onCerrar={() => setCambiandoPin(null)}
        onCambiado={(pin) => {
          const persona = cambiandoPin;
          if (persona) {
            setEntrega({
              nombre: persona.nombre,
              rolNombre: persona.rolNombre,
              codigoEmpleado: persona.codigoEmpleado,
              colorAvatar: persona.colorAvatar,
              pin,
            });
          }
          refrescar();
        }}
      />

      <TarjetaPinImprimible
        abierto={entrega !== null}
        onCerrar={() => setEntrega(null)}
        nombre={entrega?.nombre ?? ""}
        rolNombre={entrega?.rolNombre ?? ""}
        codigoEmpleado={entrega?.codigoEmpleado ?? ""}
        colorAvatar={entrega?.colorAvatar ?? "#E8511A"}
        pin={entrega?.pin ?? ""}
      />

      <DialogoEliminar
        abierto={aEliminar !== null}
        onCerrar={() => {
          if (ocupado) return;
          setAEliminar(null);
          setBloqueo(null);
        }}
        titulo={`¿Eliminar a ${aEliminar?.nombre ?? ""} del equipo?`}
        queSeConserva="Todo lo que trabajó: los pasos que hizo, las fotos que subió y su nombre en la bitácora de cada mueble."
        queSePierde="Su acceso a la app del taller. Dejará de aparecer en las listas y no podrá entrar con su PIN."
        bloqueo={bloqueo}
        cargando={ocupado}
        onConfirmar={() => void confirmarEliminar()}
      />
    </div>
  );
}
