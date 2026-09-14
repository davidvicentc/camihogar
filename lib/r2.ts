import { DeleteObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const PRODUCT_PREFIX = "productos/";

function config() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET_NAME?.trim();
  const publicUrl = (process.env.R2_PUBLIC_URL ?? process.env.NEXT_PUBLIC_R2_PUBLIC_URL)?.trim().replace(/\/$/, "");
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl };
}

function client() {
  const settings = config();
  if (!settings) throw new Error("R2 no está conectado. Completa las variables de Cloudflare R2.");
  return { settings, s3: new S3Client({ region: "auto", endpoint: `https://${settings.accountId}.r2.cloudflarestorage.com`, credentials: { accessKeyId: settings.accessKeyId, secretAccessKey: settings.secretAccessKey } }) };
}

export function isR2Configured(): boolean {
  return config() !== null;
}

export async function createProductImageUpload(contentType: string) {
  const { settings, s3 } = client();
  const key = `${PRODUCT_PREFIX}${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.webp`;
  const uploadUrl = await getSignedUrl(s3, new PutObjectCommand({ Bucket: settings.bucket, Key: key, ContentType: contentType, CacheControl: "public, max-age=31536000, immutable" }), { expiresIn: 300 });
  return { key, uploadUrl, publicUrl: `${settings.publicUrl}/${key}` };
}

export async function deleteProductImage(key: string) {
  if (!key.startsWith(PRODUCT_PREFIX) || key.includes("..")) throw new Error("Ruta de imagen inválida.");
  const { settings, s3 } = client();
  await s3.send(new DeleteObjectCommand({ Bucket: settings.bucket, Key: key }));
}

export interface R2StorageStats {
  configured: boolean;
  imageCount: number;
  bytesUsed: number;
  limitBytes: number;
  percentUsed: number;
}

export async function getR2StorageStats(): Promise<R2StorageStats> {
  const limitBytes = Math.max(1, Number(process.env.R2_STORAGE_LIMIT_GB ?? 10)) * 1024 ** 3;
  if (!isR2Configured()) return { configured: false, imageCount: 0, bytesUsed: 0, limitBytes, percentUsed: 0 };
  const { settings, s3 } = client();
  let continuationToken: string | undefined;
  let imageCount = 0;
  let bytesUsed = 0;
  do {
    const result = await s3.send(new ListObjectsV2Command({ Bucket: settings.bucket, Prefix: PRODUCT_PREFIX, ContinuationToken: continuationToken }));
    for (const object of result.Contents ?? []) { imageCount += 1; bytesUsed += object.Size ?? 0; }
    continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
  } while (continuationToken);
  return { configured: true, imageCount, bytesUsed, limitBytes, percentUsed: Math.min(100, (bytesUsed / limitBytes) * 100) };
}

export function productImageKeyFromUrl(url: string): string | null {
  const settings = config();
  if (!settings || !url.startsWith(`${settings.publicUrl}/`)) return null;
  const key = decodeURIComponent(url.slice(settings.publicUrl.length + 1));
  return key.startsWith(PRODUCT_PREFIX) ? key : null;
}
