import { connectDB } from "@/lib/mongodb";
import BrandModel from "@/lib/models/Brand";
import CategoryModel from "@/lib/models/Category";

export interface CatalogOptionDTO {
  _id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

function serialize(doc: { _id: unknown; name: string; slug: string; isActive?: boolean }): CatalogOptionDTO {
  return { _id: String(doc._id), name: doc.name, slug: doc.slug, isActive: doc.isActive ?? true };
}

export async function getBrands(includeInactive = false): Promise<CatalogOptionDTO[]> {
  try {
    await connectDB();
    const query = includeInactive ? {} : { isActive: true };
    const docs = await BrandModel.find(query).sort({ name: 1 }).lean();
    return docs.map(serialize);
  } catch (error) {
    console.error("[data/catalog] getBrands:", error);
    return [];
  }
}

export async function getCategories(includeInactive = false): Promise<CatalogOptionDTO[]> {
  try {
    await connectDB();
    const query = includeInactive ? {} : { isActive: true };
    const docs = await CategoryModel.find(query).sort({ name: 1 }).lean();
    return docs.map(serialize);
  } catch (error) {
    console.error("[data/catalog] getCategories:", error);
    return [];
  }
}