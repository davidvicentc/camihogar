"use client";

/**
 * Pantalla de ROLES Y PERMISOS: listado, buscador, "Ver desactivados",
 * creación/edición con el mismo formulario y el diálogo de eliminar del §7,
 * que cuando hay personas con el rol ofrece dentro del propio diálogo el
 * selector "Reasignar esas personas a…" y reintenta con `eliminarRol(clave, a)`.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShieldPlus, ShieldQuestion } from "lucide-react";
import type { RolDTO } from "@/lib/types/fabricacion";
import {
  activarRol,
  desactivarRol,
  duplicarRol,
  eliminarRol,
} from "@/lib/actions/fabricacion";
import {
  AvisoInfo,
  BotonPrincipal,
  BuscadorGrande,
  CabeceraConfig,
  CLASES_SELECT,
  DialogoEliminar,
  EstadoVacio,
  InterruptorTexto,
  ToasterFabrica,
  avisoError,
  avisoExito,
} from "./config-compartido";
import { FormularioRol } from "./rol-formulario";
import { TarjetaRol } from "./rol-tarjeta";

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export interface PropsListaRoles {
  /** Todos los roles, activos y desactivados, ya serializados. */
  roles: RolDTO[];
}

export function ListaRoles({ roles }: PropsListaRoles) {
  const router = useRouter();

  const [busqueda, setBusqueda] = React.useState("");
  const [verDesactivados, setVerDesactivados] = React.useState(false);
  const [ocupado, setOcupado] = React.useState(false);

  const [formularioAbierto, setFormularioAbierto] = React.useState(false);
  const [rolEditando, setRolEditando] = React.useState<RolDTO | null>(null);

  const [rolAEliminar, setRolAEliminar] = React.useState<RolDTO | null>(null);
  const [bloqueo, setBloqueo] = React.useState<string | null>(null);
  const [reasignarA, setReasignarA] = React.useState("");

  const activos = React.useMemo(() => roles.filter((rol) => rol.activo).length, [roles]);
  const desactivados = roles.length - activos;

  const visibles = React.useMemo(() => {
    const patron = normalizar(busqueda.trim());
    return roles
      .filter((rol) => (verDesactivados ? true : rol.activo))
      .filter((rol) => {
        if (patron === "") return true;
        return (
          normalizar(rol.nombre).includes(patron) ||
          normalizar(rol.clave).includes(patron) ||
          normalizar(rol.descripcion).includes(patron)
        );
      });
  }, [roles, busqueda, verDesactivados]);

  function abrirCreacion(): void {
    setRolEditando(null);
    setFormularioAbierto(true);
  }

  function abrirEdicion(rol: RolDTO): void {
    setRolEditando(rol);
    setFormularioAbierto(true);
  }

  function refrescar(): void {
    router.refresh();
  }

  async function alDuplicar(rol: RolDTO): Promise<void> {
    setOcupado(true);
    const resultado = await duplicarRol(rol.clave);
    setOcupado(false);

    if (!resultado.ok) {
      avisoError(resultado.error ?? "No pudimos duplicar el rol. Vuelve a intentarlo.");
      return;
    }
    avisoExito(
      `Se creó una copia del rol «${rol.nombre}». Ábrela y cámbiale el nombre si quieres.`
    );
    refrescar();
  }

  async function alCambiarActivo(rol: RolDTO): Promise<void> {
    setOcupado(true);
    const resultado = rol.activo ? await desactivarRol(rol.clave) : await activarRol(rol.clave);
    setOcupado(false);

    if (!resultado.ok) {
      avisoError(
        resultado.error ?? "No pudimos cambiar el estado del rol. Vuelve a intentarlo."
      );
      return;
    }
    avisoExito(
      rol.activo
        ? `El rol «${rol.nombre}» quedó desactivado. Ya no se puede elegir para nadie nuevo.`
        : `El rol «${rol.nombre}» vuelve a estar disponible.`
    );
    refrescar();
  }

  function abrirEliminar(rol: RolDTO): void {
    setRolAEliminar(rol);
    setBloqueo(null);
    setReasignarA("");
  }

  function cerrarEliminar(): void {
    if (ocupado) return;
    setRolAEliminar(null);
    setBloqueo(null);
    setReasignarA("");
  }

  async function confirmarEliminar(): Promise<void> {
    if (!rolAEliminar) return;

    setOcupado(true);
    const resultado = await eliminarRol(
      rolAEliminar.clave,
      reasignarA === "" ? undefined : reasignarA
    );
    setOcupado(false);

    if (!resultado.ok) {
      // El motivo se queda DENTRO del diálogo, junto a la salida sugerida.
      setBloqueo(resultado.error ?? "No pudimos eliminar el rol. Vuelve a intentarlo.");
      return;
    }

    avisoExito(resultado.data?.mensaje ?? `Se eliminó el rol «${rolAEliminar.nombre}».`);
    setRolAEliminar(null);
    setBloqueo(null);
    setReasignarA("");
    refrescar();
  }

  const personasDelRol = rolAEliminar?.cantidadPersonas ?? 0;
  const necesitaReasignar = Boolean(rolAEliminar) && bloqueo !== null && personasDelRol > 0;
  const destinos = roles.filter(
    (rol) => rol.activo && rol.clave !== rolAEliminar?.clave
  );

  return (
    <div className="space-y-8">
      <ToasterFabrica />

      <CabeceraConfig
        titulo="Roles y permisos"
        contador={`${activos} ${activos === 1 ? "rol activo" : "roles activos"}`}
        descripcion="Un rol es un conjunto de permisos. Cada persona del equipo tiene uno."
      >
        <BotonPrincipal icono={ShieldPlus} onClick={abrirCreacion} disabled={ocupado}>
          CREAR ROL NUEVO
        </BotonPrincipal>
      </CabeceraConfig>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="lg:max-w-md lg:flex-1">
          <BuscadorGrande
            id="buscar-rol"
            valor={busqueda}
            onChange={setBusqueda}
            etiqueta="Buscar un rol por su nombre"
            marcador="Buscar un rol…"
          />
        </div>
        <InterruptorTexto
          id="ver-roles-desactivados"
          activo={verDesactivados}
          onChange={setVerDesactivados}
          etiqueta="Ver desactivados"
          ayuda={
            desactivados === 0
              ? "No hay roles desactivados"
              : `Hay ${desactivados} ${desactivados === 1 ? "rol desactivado" : "roles desactivados"}`
          }
        />
      </div>

      {roles.length === 0 ? (
        <EstadoVacio
          icono={ShieldQuestion}
          titulo="Todavía no hay roles"
          mensaje="Un rol dice qué puede hacer cada persona del equipo. Crea el primero y marca sus permisos con casillas."
        >
          <BotonPrincipal icono={ShieldPlus} onClick={abrirCreacion}>
            CREAR ROL NUEVO
          </BotonPrincipal>
        </EstadoVacio>
      ) : visibles.length === 0 ? (
        <EstadoVacio
          icono={ShieldQuestion}
          titulo="No encontramos ningún rol así"
          mensaje="Prueba a escribir menos letras, o enciende «Ver desactivados» por si el rol que buscas está apagado."
        />
      ) : (
        <div className="space-y-4">
          {visibles.map((rol) => (
            <TarjetaRol
              key={rol._id}
              rol={rol}
              ocupado={ocupado}
              onEditar={() => abrirEdicion(rol)}
              onDuplicar={() => void alDuplicar(rol)}
              onCambiarActivo={() => void alCambiarActivo(rol)}
              onEliminar={() => abrirEliminar(rol)}
            />
          ))}
        </div>
      )}

      <FormularioRol
        abierto={formularioAbierto}
        onCerrar={() => setFormularioAbierto(false)}
        inicial={rolEditando}
        onGuardado={refrescar}
      />

      <DialogoEliminar
        abierto={rolAEliminar !== null}
        onCerrar={cerrarEliminar}
        titulo={`¿Eliminar el rol «${rolAEliminar?.nombre ?? ""}»?`}
        queSeConserva="Todo el trabajo hecho por las personas que tenían este rol y el historial de cambios."
        queSePierde="El rol y sus permisos. Las personas que lo tengan necesitan otro rol para poder entrar."
        bloqueo={bloqueo}
        cargando={ocupado}
        confirmarDeshabilitado={necesitaReasignar && reasignarA === ""}
        salida={
          necesitaReasignar ? (
            <div className="space-y-2">
              <label
                htmlFor="reasignar-rol"
                className="block text-lg font-bold text-brand-dark"
              >
                Reasignar esas personas a…
              </label>
              <p className="text-base text-brand-taupe">
                Elige el rol que tendrán a partir de ahora. Se les cambia en el momento y
                queda anotado en el historial.
              </p>
              <select
                id="reasignar-rol"
                value={reasignarA}
                onChange={(evento) => setReasignarA(evento.target.value)}
                className={CLASES_SELECT}
              >
                <option value="">Elige un rol…</option>
                {destinos.map((rol) => (
                  <option key={rol._id} value={rol.clave}>
                    {rol.nombre}
                  </option>
                ))}
              </select>
              {destinos.length === 0 ? (
                <AvisoInfo mensaje="No hay ningún otro rol activo al que pasarlas. Crea uno antes de eliminar este." />
              ) : null}
            </div>
          ) : null
        }
        onConfirmar={() => void confirmarEliminar()}
      />
    </div>
  );
}
