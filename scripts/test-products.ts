import assert from "node:assert/strict";
import test from "node:test";
import { validateProductReferences } from "../lib/product-validation";

test("crear producto requiere marca y categoría", () => {
  assert.equal(validateProductReferences({}), "Selecciona una marca y categoría válidas.");
  assert.equal(validateProductReferences({ categoryId: "category-1" }), "Selecciona una marca y categoría válidas.");
  assert.equal(validateProductReferences({ brandId: "brand-1" }), "Selecciona una marca y categoría válidas.");
});

test("crear producto acepta referencias completas", () => {
  assert.equal(validateProductReferences({ brandId: "brand-1", categoryId: "category-1" }), null);
});
