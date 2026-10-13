import { connectDB } from "@/lib/mongodb";
import BrandModel from "@/lib/models/Brand";
import CategoryModel from "@/lib/models/Category";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS, PUBLIC_CACHE_SECONDS } from "@/lib/cache-tags";

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

const getBrandsCached = unstable_cache(async (includeInactive: boolean): Promise<CatalogOptionDTO[]> => {
    await connectDB();
    const query = includeInactive ? {} : { isActive: true };
    const docs = await BrandModel.find(query).sort({ name: 1 }).lean();
    return docs.map(serialize);
}, ["catalog-brands"], { revalidate: PUBLIC_CACHE_SECONDS, tags: [CACHE_TAGS.catalog] });

export async function getBrands(includeInactive = false): Promise<CatalogOptionDTO[]> {
  try {
    return await getBrandsCached(includeInactive);
  } catch (error) {
    console.error("[data/catalog] getBrands:", error);
    return [];
  }
}

const getCategoriesCached = unstable_cache(async (includeInactive: boolean): Promise<CatalogOptionDTO[]> => {
    await connectDB();
    const query = includeInactive ? {} : { isActive: true };
    const docs = await CategoryModel.find(query).sort({ name: 1 }).lean();

    return docs.map(serialize);
}, ["catalog-categories"], { revalidate: PUBLIC_CACHE_SECONDS, tags: [CACHE_TAGS.catalog] });

export async function getCategories(includeInactive = false): Promise<CatalogOptionDTO[]> {
  try {
    return await getCategoriesCached(includeInactive);
  } catch (error) {
    console.error("[data/catalog] getCategories:", error);
    return [];
  }
}
