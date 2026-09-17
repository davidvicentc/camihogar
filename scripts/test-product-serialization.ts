import assert from "node:assert/strict";
import test from "node:test";
import { serializeProduct } from "../lib/data/products";

test("la tarjeta usa el nombre de la marca relacionada", () => {
  const product = serializeProduct({
    _id: "product-1",
    title: "Colchón Bamboo",
    brand: "",
    brandId: { _id: "brand-1", name: "Beautyrest" },
    category: "Colchones",
    basePrice: 170,
  });

  assert.equal(product.brand, "Beautyrest");
});
