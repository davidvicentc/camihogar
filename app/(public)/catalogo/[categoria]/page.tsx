import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogProducts } from "@/components/catalog/catalog-products";
import { getCategories } from "@/lib/data/catalog";
import { catalogMetadata } from "@/lib/metadata";

type Props = { params: Promise<{ categoria: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categoria } = await params;
  const category = (await getCategories()).find((item) => item.slug === categoria);
  if (!category) notFound();
  return catalogMetadata(
    `/catalogo/${encodeURIComponent(categoria)}`,
    `${category.name}: catálogo de muebles`,
    `${category.description || `Explora nuestra selección de ${category.name.toLocaleLowerCase("es")}.`} Consulta precios y disponibilidad por WhatsApp. Tiendas en Guatire y Caracas, con entregas en toda Venezuela.`,
  );
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { categoria } = await params;
  if (!(await getCategories()).some((item) => item.slug === categoria)) notFound();
  return <CatalogProducts categoryRoute searchParams={searchParams.then((sp) => ({...sp, categoria}))} />;
}
