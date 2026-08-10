/**
 * Paleta de gráficos del dashboard, validada para visión de color deficiente
 * (CVD ΔE ≥ 8), piso de croma y contraste ≥ 3:1 sobre tarjeta blanca.
 * No sustituir por colores a ojo: cualquier cambio debe re-validarse.
 *
 * Revalidada al adoptar el naranja del logo (#E8511A, antes #E06B43):
 * contraste sobre blanco 3.73:1 (antes 3.31:1) y separación contra el azul
 * ΔE 80.8 en protanopía / 110.1 en deuteranopía (antes 69.4 / 93.7).
 */
export const CHART_COLORS = {
  /** Conversiones (clics a WhatsApp) — naranja exacto del logo. */
  conversions: "#E8511A",
  /** Vistas — azul complementario validado contra el terracota. */
  views: "#2C7FB8",
  /** Rejilla y ejes recesivos, en el marrón del logo. */
  grid: "rgba(37, 22, 15, 0.08)",
  axis: "#6E5748",
} as const;
