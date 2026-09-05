import { connectDB } from "@/lib/mongodb";
import BrandModel from "@/lib/models/Brand";
import CategoryModel from "@/lib/models/Category";
import { PRODUCT_CATEGORY_OPTIONS } from "@/lib/constants";

export interface CatalogOptionDTO {
  _id: string;
  name: string;
  slug: string;
  isActive: boolean;
  description?: string;
  image?: string;
}

function serialize(doc: { _id: unknown; name: string; slug: string; isActive?: boolean; description?: string; image?: string }): CatalogOptionDTO {
  return { _id: String(doc._id), name: doc.name, slug: doc.slug, isActive: doc.isActive ?? true, description: doc.description ?? "", image: doc.image ?? "" };
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
    if (docs.length > 0) return docs.map(serialize);
    return PRODUCT_CATEGORY_OPTIONS.map((category, index) => ({ _id: `default-${index}`, name: category.label, slug: category.slug, isActive: true, description: category.description, image: category.image }));
  } catch (error) {
    console.error("[data/catalog] getCategories:", error);
    return [];
  }
}