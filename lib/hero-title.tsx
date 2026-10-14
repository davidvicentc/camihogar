import type { CSSProperties } from "react";

export type TextStyleRange = { start: number; end: number; color: string; endColor: string; mode: "solid" | "gradient"; bold?: boolean };

export type HeroTitleStyle = {
  heroTitleRanges?: TextStyleRange[];
  heroTitleColor?: string;
  heroHighlightText?: string;
  heroHighlightMode?: string;
  heroHighlightColor?: string;
  heroHighlightEndColor?: string;
};

export function HeroTitle({ title, settings }: { title: string; settings: HeroTitleStyle }) {
  const highlight = settings.heroHighlightText ?? "SOLUCIÓN";
  const index = highlight ? title.toLocaleLowerCase("es").indexOf(highlight.toLocaleLowerCase("es")) : -1;
  const ranges = settings.heroTitleRanges ?? (index < 0 ? [] : [{ start: index, end: index + highlight.length, color: settings.heroHighlightColor ?? "#E8511A", endColor: settings.heroHighlightEndColor ?? "#FFB782", mode: settings.heroHighlightMode === "solid" ? "solid" : "gradient" }]);
  return <StyledText text={title} ranges={ranges} color={settings.heroTitleColor ?? "#FBF8F4"} />;
}

export function StyledText({ text, ranges, color }: { text: string; ranges: TextStyleRange[]; color: string }) {
  const boundaries = [...new Set([0, text.length, ...ranges.flatMap((range) => [Math.max(0, Math.min(text.length, range.start)), Math.max(0, Math.min(text.length, range.end))])])].sort((a, b) => a - b);
  return <span style={{ color }}>{boundaries.slice(0, -1).map((start, index) => {
    const end = boundaries[index + 1];
    const range = [...ranges].reverse().find((range) => range.start <= start && range.end >= end);
    const style: CSSProperties = !range ? {} : {
      fontWeight: range.bold ? 700 : undefined,
      ...(range.mode === "solid" ? { color: range.color } : { backgroundImage: `linear-gradient(90deg, ${range.color}, ${range.endColor})`, backgroundClip: "text", WebkitBackgroundClip: "text", color: "transparent" }),
    };
    return <span key={start} style={style}>{text.slice(start, end)}</span>;
  })}</span>;
}
