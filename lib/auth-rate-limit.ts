import { createHash } from "node:crypto";
import { connectDB } from "@/lib/mongodb";
import AuthAttempt from "@/lib/models/AuthAttempt";

// Contador compartido entre instancias de Vercel; no depende de memoria local.
export async function allowAuthAttempt(request: Request) {
  await connectDB();
  const ip = request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-forwarded-for") ?? "unknown";
  const bucket = Math.floor(Date.now() / 900000);
  const key = createHash("sha256").update(`${ip.split(",")[0]}:${bucket}`).digest("hex");
  let attempt;
  try {
    attempt = await AuthAttempt.findOneAndUpdate({ _id: key }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((bucket + 2) * 900000) } }, { upsert: true, new: true });
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
    attempt = await AuthAttempt.findOneAndUpdate({ _id: key }, { $inc: { count: 1 } }, { new: true });
  }
  return !!attempt && attempt.count <= 20;
}
