export function validateProductReferences(input: { brandId?: string; categoryId?: string }): string | null {
  if (!input.brandId || !input.categoryId) return "Selecciona una marca y categoría válidas.";
  return null;
}
