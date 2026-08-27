/**
 * Firma las fotos que se suben desde el taller: `POST /api/fabrica/subir`.
 *
 * Es el gemelo de `app/api/cloudinary/sign/route.ts`, con una diferencia
 * deliberada: aquel sólo lo puede usar el dueño con la cookie del panel, y
 * este lo puede usar CUALQUIER persona con sesión de taller abierta, porque
 * las fotos de los pasos las toman los carpinteros desde el móvil.
 *
 * Todo lo que se sube cae en una sola carpeta, `camihogar/fabricacion`, para
 * que nunca se mezcle con el catálogo de la tienda.
 *
 * SEGURO IMPORTANTE: sólo se firman parámetros de una lista blanca. Firmar lo
 * que llegue tal cual permitiría, por ejemplo, mandar un `public_id` que pise
 * una foto del catálogo, o un `folder` cualquiera. Si llega algo fuera de la
 * lista se rechaza explicando qué pasó, en vez de firmarlo "por si acaso".
 *
 * Admite dos formas de pedirlo:
 *  1. Sin cuerpo (o con `{}`): devuelve una firma nueva para subir a la
 *     carpeta de fabricación con la marca de tiempo actual.
 *  2. Con `{ paramsToSign }` (lo que manda el widget de Cloudinary): valida
 *     esos parámetros y firma exactamente esos, ni uno más.
 */

import { NextResponse } from "next/server";

import { signUploadParams } from "@/lib/cloudinary";
import { getSesionOperario } from "@/lib/fabricacion/auth";

export const runtime = "nodejs";

/** Única carpeta permitida para las fotos del taller. */
const CARPETA = "camihogar/fabricacion";

/** Lo único que este endpoint acepta firmar. */
const PARAMETROS_PERMITIDOS = [
  "timestamp",
  "folder",
  "upload_preset",
  "context",
  "tags",
] as const;

type ParametroPermitido = (typeof PARAMETROS_PERMITIDOS)[number];

function esParametroPermitido(clave: string): clave is ParametroPermitido {
  return (PARAMETROS_PERMITIDOS as readonly string[]).includes(clave);
}

/** Marca de tiempo en segundos, que es lo que espera Cloudinary. */
function ahoraEnSegundos(): number {
  return Math.round(Date.now() / 1000);
}

export async function POST(request: Request) {
  const sesion = await getSesionOperario();
  if (!sesion) {
    return NextResponse.json(
      {
        error:
          "Tu sesión se cerró. Vuelve a entrar con tu PIN para poder subir la foto.",
      },
      { status: 401 }
    );
  }

  try {
    let recibidos: Record<string, unknown> = {};

    try {
      const cuerpo: unknown = await request.json();
      if (typeof cuerpo === "object" && cuerpo !== null) {
        const datos = (cuerpo as { paramsToSign?: unknown }).paramsToSign;
        if (typeof datos === "object" && datos !== null) {
          recibidos = datos as Record<string, unknown>;
        }
      }
    } catch {
      // Sin cuerpo: se firma una subida nueva con los valores por defecto.
    }

    const aFirmar: Record<string, string | number> = {};

    for (const [clave, valor] of Object.entries(recibidos)) {
      if (!esParametroPermitido(clave)) {
        console.error(
          "[api/fabrica/subir] parámetro no permitido en la firma:",
          clave
        );
        return NextResponse.json(
          {
            error:
              "No pudimos preparar la subida de la foto. Vuelve a intentarlo desde la pantalla del paso.",
          },
          { status: 400 }
        );
      }

      // Sólo textos y números: nada de objetos anidados dentro de la firma.
      if (typeof valor !== "string" && typeof valor !== "number") {
        return NextResponse.json(
          {
            error:
              "No pudimos preparar la subida de la foto. Vuelve a intentarlo desde la pantalla del paso.",
          },
          { status: 400 }
        );
      }

      aFirmar[clave] = valor;
    }

    // La carpeta no se negocia: si viene otra, se rechaza.
    if (aFirmar.folder !== undefined && aFirmar.folder !== CARPETA) {
      return NextResponse.json(
        {
          error:
            "Las fotos del taller sólo se pueden guardar en la carpeta de fabricación.",
        },
        { status: 400 }
      );
    }

    // Cuando el widget manda sus parámetros hay que firmar EXACTAMENTE esos:
    // añadirle uno por nuestra cuenta rompería la firma y la subida fallaría.
    // Por eso, si el widget no declaró la carpeta, se rechaza en vez de
    // inventarla (el widget debe configurarse con `folder: CARPETA`).
    const vienenDelWidget = Object.keys(aFirmar).length > 0;

    if (vienenDelWidget) {
      if (aFirmar.folder === undefined) {
        return NextResponse.json(
          {
            error:
              "Falta indicar la carpeta de fabricación al subir la foto. Vuelve a intentarlo desde la pantalla del paso.",
          },
          { status: 400 }
        );
      }
      if (aFirmar.timestamp === undefined) {
        return NextResponse.json(
          {
            error:
              "La subida llegó incompleta. Vuelve a intentarlo desde la pantalla del paso.",
          },
          { status: 400 }
        );
      }
    } else {
      aFirmar.folder = CARPETA;
      aFirmar.timestamp = ahoraEnSegundos();
    }

    const signature = signUploadParams(aFirmar);

    return NextResponse.json({
      signature,
      timestamp: aFirmar.timestamp,
      apiKey: process.env.CLOUDINARY_API_KEY ?? "",
      // El widget necesita el nombre de la cuenta; vale cualquiera de las dos
      // variables, porque en este proyecto conviven la privada y la pública.
      cloudName:
        process.env.CLOUDINARY_CLOUD_NAME ??
        process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ??
        "",
      folder: CARPETA,
    });
  } catch (error) {
    console.error("[api/fabrica/subir] POST:", error);
    return NextResponse.json(
      {
        error:
          "No pudimos preparar la subida de la foto. Espera un momento y vuelve a intentarlo.",
      },
      { status: 500 }
    );
  }
}
