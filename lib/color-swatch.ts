export function colorSwatchBackground(colors: string[]): string {
  const safe = colors.filter((color) => /^#[0-9a-f]{6}$/i.test(color)).slice(0, 4);
  if (safe.length <= 1) return safe[0] ?? "#d6cec5";
  const step = 100 / safe.length;
  const stops = safe.flatMap((color, index) => [`${color} ${index * step}%`, `${color} ${(index + 1) * step}%`]);
  return `conic-gradient(${stops.join(", ")})`;
}
