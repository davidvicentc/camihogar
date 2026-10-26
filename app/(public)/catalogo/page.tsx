import { CatalogProducts } from "@/components/catalog/catalog-products";
import { catalogMetadata } from "@/lib/metadata";

export const metadata = catalogMetadata("/catalogo");

export default function CatalogoPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <CatalogProducts searchParams={searchParams}/>;
}
