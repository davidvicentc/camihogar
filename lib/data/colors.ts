import { connectDB } from "@/lib/mongodb";
import ColorPresetModel from "@/lib/models/ColorPreset";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS, PUBLIC_CACHE_SECONDS } from "@/lib/cache-tags";

export interface ColorPresetDTO {
  _id: string;
  name: string;
  colors: string[];
}

const getColorPresetsCached = unstable_cache(async (): Promise<ColorPresetDTO[]> => {
    await connectDB();
    const docs = await ColorPresetModel.find({ isActive: true }).sort({ name: 1 }).lean();
    return docs.map((doc) => ({ _id: String(doc._id), name: doc.name, colors: doc.colors }));
}, ["color-presets"], { revalidate: PUBLIC_CACHE_SECONDS, tags: [CACHE_TAGS.colors] });

export async function getColorPresets(): Promise<ColorPresetDTO[]> {
  try {
    return await getColorPresetsCached();
  } catch (error) {
    console.error("[data/colors] getColorPresets:", error);
    return [];
  }
}
