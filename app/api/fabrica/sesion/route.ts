/**
 * Entrada y salida del taller por HTTP.
 *
 *   POST   /api/fabrica/sesion   { operarioId, pin }  → abre la sesión
 *   DELETE /api/fabrica/sesion                        → la cierra
 *
 * Toda la lógica vive en `lib/actions/sesion-fabrica.ts`: comprobar el PIN,
 * comprobar que la persona y su rol siguen sirviendo, frenar al que prueba
 * PINes a mano, escribir la cookie y dejar anotado quién entró. Aquí sólo se
 * traduce a HTTP.
 *
 * **El freno a la fuerza bruta NO se duplica aquí a propósito.** La pantalla
 * del taller llama a la Server Action directamente, así que un contador puesto
 * en este archivo sería código muerto: no vería ni uno de los intentos reales.
 * Vive donde se entra de verdad, dentro de `iniciarSesionOperario`.
 */

import { NextResponse } from "next/server";

import {
  cerrarSesionOperario,
  iniciarSesionOperario,
} from "@/lib/actions/sesion-fabrica";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let operarioId = "";
  let pin = "";

  try {
    const cuerpo: unknown = await request.json();
    if (typeof cuerpo === "object" && cuerpo !== null) {
      const datos = cuerpo as { operarioId?: unknown; pin?: unknown };
      operarioId = typeof datos.operarioId === "string" ? datos.operarioId.trim() : "";
      pin = typeof datos.pin === "string" ? datos.pin.trim() : "";
    }
  } catch {
    // Cuerpo mal formado: se trata como si no hubiera llegado nada.
  }

  if (operarioId === "") {
    return NextResponse.json(
      { ok: false, error: "Toca tu nombre en la lista para entrar." },
      { status: 400 }
    );
  }
  if (pin === "") {
    return NextResponse.json(
      { ok: false, error: "Escribe tu PIN con el teclado numérico." },
      { status: 400 }
    );
  }

  try {
    const resultado = await iniciarSesionOperario(operarioId, pin);

    if (!resultado.ok) {
      // 429 cuando el freno de la action pidió esperar; 401 en lo demás. El
      // texto es siempre el que compuso la action, sin añadir ni quitar nada.
      const esEspera = (resultado.error ?? "").startsWith("Has fallado el PIN");
      return NextResponse.json(resultado, { status: esEspera ? 429 : 401 });
    }

    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    console.error("[api/fabrica/sesion] POST:", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          "No pudimos entrar ahora mismo. Espera un momento y vuelve a intentarlo.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const resultado = await cerrarSesionOperario();
    return NextResponse.json(resultado, { status: resultado.ok ? 200 : 500 });
  } catch (error) {
    console.error("[api/fabrica/sesion] DELETE:", error);
    return NextResponse.json(
      { ok: false, error: "No pudimos cerrar la sesión. Vuelve a intentarlo." },
      { status: 500 }
    );
  }
}
