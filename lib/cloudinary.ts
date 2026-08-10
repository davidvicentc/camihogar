import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export default cloudinary;

/**
 * Firma parámetros para el Cloudinary Upload Widget en modo firmado.
 * Se usa desde el route handler /api/cloudinary/sign (solo admin).
 */
export function signUploadParams(paramsToSign: Record<string, unknown>): string {
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!secret) {
    throw new Error("Falta CLOUDINARY_API_SECRET en las variables de entorno.");
  }
  return cloudinary.utils.api_sign_request(
    paramsToSign as Record<string, string>,
    secret
  );
}

/**
 * Aplica transformaciones de entrega optimizada (f_auto, q_auto) a una URL de
 * Cloudinary ya almacenada. Si la URL no es de Cloudinary, se devuelve intacta.
 */
export function optimizedUrl(url: string, width = 1200): string {
  if (!url.includes("res.cloudinary.com") || url.includes("/upload/f_auto")) {
    return url;
  }
  return url.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`);
}
