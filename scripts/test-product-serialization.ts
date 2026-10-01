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

test("serializa colores con su muestra e imagen opcional", () => {
  const product = serializeProduct({
    _id: "product-2",
    title: "Sofá Nube",
    category: "Salas",
    basePrice: 450,
    colorOptions: [
      { name: "Beige arena", colors: ["#C8B59A"], image: "/products/sofa-beige.webp" },
      { name: "Verde oliva / Blanco", colors: ["#667052", "#FFFFFF"] },
    ],
  });

  assert.deepEqual(product.colorOptions, [
    { name: "Beige arena", colors: ["#C8B59A"], image: "/products/sofa-beige.webp" },
    { name: "Verde oliva / Blanco", colors: ["#667052", "#FFFFFF"], image: undefined },
  ]);
});
