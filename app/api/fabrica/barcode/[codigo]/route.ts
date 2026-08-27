/**
 * Código de barras Code128 de un mueble: `GET /api/fabrica/barcode/COD-949473`.
 *
 * Va debajo del QR en la etiqueta para que también sirva con las pistolas
 * lectoras de toda la vida, que no leen QR. Codifica el texto plano
 * `COD-949473`, sin URL y sin token (§1 del contrato).
 *
 * bwip-js 4 expone una entrada distinta por entorno: la de Node (`bwip-js/node`)
 * es la única que trae `toSVG`. Si algún día esa función desapareciera, el
 * respaldo dibuja un PNG con `toBuffer` y se devuelve `image/png`; la etiqueta
 * funciona igual porque la pinta con un `<img>`.
 *
 * Se dibuja SIN texto debajo (`includetext: false`) por dos motivos: el código
 * ya va enorme y en monoespaciada justo encima, y así el render no necesita
 * cargar las tipografías empaquetadas de bwip-js en el servidor.
 */

import { NextResponse } from "next/server";
import bwipjs from "bwip-js/node";

import { connectDB } from "@/lib/mongodb";
import UnidadFabricacionModel from "@/lib/models/UnidadFabricacion";
import { getSesionOperario } from "@/lib/fabricacion/auth";
import { normalizarCodigo } from "@/lib/fabricacion/codigos";

export const runtime = "nodejs";

/** Barras negras sobre blanco: lo que mejor lee cualquier pistola. */
const OPCIONES_BASE = {
  bcid: "code128",
  scale: 3,
  height: 12,
  includetext: false,
  backgroundcolor: "FFFFFF",
  paddingwidth: 2,
  paddingheight: 2,
} as const;

function respuestaTexto(mensaje: string, estado: number): NextResponse {
  return NextResponse.json({ error: mensaje }, { status: estado });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ codigo: string }> }
) {
  const sesion = await getSesionOperario();
  if (!sesion) {
    return respuestaTexto(
      "Tienes que entrar con tu PIN para ver el código del mueble.",
      401
    );
  }

  try {
    const { codigo } = await params;
    const canonico = normalizarCodigo(codigo);

    if (!canonico) {
      return respuestaTexto(
        "Ese código no se entiende. Revísalo y vuelve a intentarlo.",
        404
      );
    }

    await connectDB();
    const existe = await UnidadFabricacionModel.countDocuments({
      codigo: canonico,
    }).limit(1);

    if (existe === 0) {
      return respuestaTexto(
        `No encontramos el mueble ${canonico}. Revisa el código y vuelve a intentarlo.`,
        404
      );
    }

    const opciones = { ...OPCIONES_BASE, text: canonico };

    if (typeof bwipjs.toSVG === "function") {
      const svg = bwipjs.toSVG(opciones);
      return new NextResponse(svg, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // Respaldo: mapa de bits. Mismo dibujo, formato distinto.
    const png = await bwipjs.toBuffer(opciones);
    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("[api/fabrica/barcode] GET:", error);
    return respuestaTexto(
      "No pudimos dibujar el código de barras ahora mismo. Vuelve a intentarlo en un momento.",
      500
    );
  }
}
