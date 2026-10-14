import { CatalogProducts } from "@/components/catalog/catalog-products";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Catálogo",
    description:
      "Explora el catálogo completo de CamiHogar: salas, comedores, dormitorios y más muebles que abrazan tu hogar.",
  };
}

export default function CatalogoPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <CatalogProducts searchParams={searchParams}/>;
}
