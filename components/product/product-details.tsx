"use client";

import { useMemo, useState } from "react";
import type { ProductDTO } from "@/lib/types";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductInfo } from "@/components/product/product-info";

export function ProductDetails({ product }: { product: ProductDTO }) {
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const selectedColor = product.colorOptions?.[selectedColorIndex];
  const images = useMemo(() => {
    const colorImages = (product.colorOptions ?? []).map((color) => color.image).filter((image): image is string => Boolean(image));
    return Array.from(new Set([...product.images, ...colorImages]));
  }, [product.colorOptions, product.images]);

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
      <ProductGallery images={images} title={product.title} selectedImage={selectedColor?.image} />
      <ProductInfo product={product} selectedColorIndex={selectedColorIndex} onColorChange={setSelectedColorIndex} />
    </div>
  );
}
