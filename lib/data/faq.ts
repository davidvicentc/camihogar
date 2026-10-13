import { unstable_cache } from "next/cache";
import { connectDB } from "@/lib/mongodb";
import FaqModel from "@/lib/models/Faq";
import { CACHE_TAGS, PUBLIC_CACHE_SECONDS } from "@/lib/cache-tags";

export type FaqDTO = { _id: string; question: string; answer: string; order: number; isActive: boolean };
const readFaqCached = unstable_cache(async (): Promise<FaqDTO[]> => {
  await connectDB();
  const rows = await FaqModel.find({ isActive: true }).sort({ order: 1, createdAt: 1 }).lean();
  return rows.map((row) => ({ _id: String(row._id), question: row.question, answer: row.answer, order: row.order ?? 0, isActive: row.isActive ?? true }));
}, ["faq-public"], { revalidate: PUBLIC_CACHE_SECONDS, tags: [CACHE_TAGS.faq] });

export async function getFaq(includeInactive = false): Promise<FaqDTO[]> {
  await connectDB();
  const rows = await FaqModel.find(includeInactive ? {} : { isActive: true }).sort({ order: 1, createdAt: 1 }).lean();
  return rows.map((row) => ({ _id: String(row._id), question: row.question, answer: row.answer, order: row.order ?? 0, isActive: row.isActive ?? true }));
}
export async function getPublicFaq() { return readFaqCached(); }
