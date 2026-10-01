import { connectDB } from "@/lib/mongodb";
import MattressOptionModel, { type MattressOptionKind } from "@/lib/models/MattressOption";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS, PUBLIC_CACHE_SECONDS } from "@/lib/cache-tags";

export interface MattressOptionDTO { _id: string; kind: MattressOptionKind; name: string; isActive: boolean }

const DEFAULTS: Record<MattressOptionKind, string[]> = {
  size: ["Individual", "Matrimonial", "Queen", "King"],
  pillow: ["Sin Pillow", "1 Pillow", "2 Pillow", "Doble Pillow"],
  model: ["Ortopédico", "Semi Ortopédico"],
  composition: ["Resortes", "Goma"],
};

export async function ensureMattressOptions() {
  await connectDB();
  await MattressOptionModel.bulkWrite((Object.entries(DEFAULTS) as [MattressOptionKind, string[]][]).flatMap(([kind, names]) => names.map((name) => ({ updateOne: { filter: { kind, normalizedName: name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() }, update: { $setOnInsert: { kind, name, normalizedName: name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(), isActive: true } }, upsert: true } }))));
}

const getMattressOptionsCached = unstable_cache(async (kind?: MattressOptionKind): Promise<MattressOptionDTO[]> => {
    await ensureMattressOptions();
    const docs = await MattressOptionModel.find({ ...(kind ? { kind } : {}), isActive: true }).sort({ kind: 1, createdAt: 1, name: 1 }).lean();
    return docs.map((doc) => ({ _id: String(doc._id), kind: doc.kind, name: doc.name, isActive: doc.isActive ?? true })).sort((a, b) => {
      if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
      const aIndex = DEFAULTS[a.kind].indexOf(a.name); const bIndex = DEFAULTS[b.kind].indexOf(b.name);
      if (aIndex >= 0 || bIndex >= 0) return (aIndex < 0 ? 999 : aIndex) - (bIndex < 0 ? 999 : bIndex);
      return a.name.localeCompare(b.name, "es");
    });
}, ["mattress-options"], { revalidate: PUBLIC_CACHE_SECONDS, tags: [CACHE_TAGS.mattressOptions] });

export async function getMattressOptions(kind?: MattressOptionKind): Promise<MattressOptionDTO[]> {
  try {
    return await getMattressOptionsCached(kind);
  } catch (error) { console.error("[data/mattress-options]", error); return []; }
}

export async function getMattressOptionGroups() {
  const options = await getMattressOptions();
  return {
    sizes: options.filter((item) => item.kind === "size"),
    pillows: options.filter((item) => item.kind === "pillow"),
    models: options.filter((item) => item.kind === "model"),
    compositions: options.filter((item) => item.kind === "composition"),
  };
}
