import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogProducts } from "@/components/catalog/catalog-products";
import { getCategories } from "@/lib/data/catalog";

type Props = { params: Promise<{ categoria: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categoria } = await params;
  const category = (await getCategories()).find((item) => item.slug === categoria);
  return { title: category?.name ?? "Categoría", description: category?.description, alternates: { canonical: `/catalogo/${categoria}` } };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { categoria } = await params;
  if (!(await getCategories()).some((item) => item.slug === categoria)) notFound();
  return <CatalogProducts categoryRoute searchParams={searchParams.then((sp) => ({...sp, categoria}))} />;
}
