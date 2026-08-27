/**
 * Imagen QR de un mueble: `GET /api/fabrica/qr/COD-949473`.
 *
 * DECISIÓN DEL DUEÑO (§1 del contrato): **el QR no lleva token**. Dentro va
 * exactamente `{siteUrl}/f/COD-949473` y nada más, tal y como lo construye
 * `urlQr()`. Si alguna vez alguien quiere "asegurar" la etiqueta con un
 * parámetro secreto, la respuesta ya está tomada: la seguridad real es tener
 * la sesión iniciada más la auditoría completa, y un token sólo haría
 * imposible reimprimir una etiqueta perdida.
 *
 * Devuelve SVG porque es lo que mejor imprime: vectorial, nítido a cualquier
 * tamaño y ligero. El contenido del QR depende sólo del código, así que se
 * puede cachear para siempre (`immutable`).
 */

import { NextResponse } from "next/server";
import QRCode from "qrcode";

import { connectDB } from "@/lib/mongodb";
import UnidadFabricacionModel from "@/lib/models/UnidadFabricacion";
import { getSesionOperario } from "@/lib/fabricacion/auth";
import { normalizarCodigo, urlQr } from "@/lib/fabricacion/codigos";

export const runtime = "nodejs";

/** Tamaños razonables para una etiqueta: ni un sello ni un póster. */
const TAMANO_POR_DEFECTO = 512;
const TAMANO_MINIMO = 128;
const TAMANO_MAXIMO = 1024;

/** Marrón del logo sobre blanco: contraste de sobra para cualquier lector. */
const TINTA = "#25160F";
const PAPEL = "#FFFFFF";

function respuestaTexto(mensaje: string, estado: number): NextResponse {
  return NextResponse.json({ error: mensaje }, { status: estado });
}

function tamanoPedido(url: string): number {
  const crudo = new URL(url).searchParams.get("size");
  if (!crudo) return TAMANO_POR_DEFECTO;
  const numero = Number.parseInt(crudo, 10);
  if (!Number.isFinite(numero)) return TAMANO_POR_DEFECTO;
  return Math.min(TAMANO_MAXIMO, Math.max(TAMANO_MINIMO, numero));
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ codigo: string }> }
) {
  // Sólo con sesión abierta (la del taller o la del panel). Así el listado de
  // códigos válidos no queda al aire para cualquiera que pruebe números.
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

    // Comprobación barata de existencia: no hace falta traer el mueble entero
    // sólo para dibujar su QR.
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

    const svg = await QRCode.toString(urlQr(canonico), {
      type: "svg",
      errorCorrectionLevel: "H",
      margin: 1,
      width: tamanoPedido(request.url),
      color: { dark: TINTA, light: PAPEL },
    });

    return new NextResponse(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("[api/fabrica/qr] GET:", error);
    return respuestaTexto(
      "No pudimos dibujar el código ahora mismo. Vuelve a intentarlo en un momento.",
      500
    );
  }
}
