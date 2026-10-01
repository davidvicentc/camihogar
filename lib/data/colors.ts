import { connectDB } from "@/lib/mongodb";
import ColorPresetModel from "@/lib/models/ColorPreset";

export interface ColorPresetDTO {
  _id: string;
  name: string;
  colors: string[];
}

export async function getColorPresets(): Promise<ColorPresetDTO[]> {
  try {
    await connectDB();
    const docs = await ColorPresetModel.find({ isActive: true }).sort({ name: 1 }).lean();
    return docs.map((doc) => ({ _id: String(doc._id), name: doc.name, colors: doc.colors }));
  } catch (error) {
    console.error("[data/colors] getColorPresets:", error);
    return [];
  }
}
