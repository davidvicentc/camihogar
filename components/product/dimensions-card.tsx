import { MoveDiagonal, MoveHorizontal, MoveVertical, Ruler } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProductDTO } from "@/lib/types";

interface DimensionsCardProps {
  dimensions: ProductDTO["dimensions"];
  title: string;
}

function formatMeasure(value: number, unit: string): string {
  return value > 0 ? `${value} ${unit}` : "—";
}

/**
 * Card de dimensiones con diagrama isométrico (SVG inline) y las tres
 * medidas del mueble. Server-safe: sin hooks ni interactividad.
 */
export function DimensionsCard({ dimensions, title }: DimensionsCardProps) {
  const { width, height, depth, unit } = dimensions;

  if (width === 0 && height === 0 && depth === 0) return null;

  const measures = [
    {
      key: "A",
      label: "Ancho",
      value: formatMeasure(width, unit),
      Icon: MoveHorizontal,
    },
    {
      key: "H",
      label: "Alto",
      value: formatMeasure(height, unit),
      Icon: MoveVertical,
    },
    {
      key: "P",
      label: "Profundidad",
      value: formatMeasure(depth, unit),
      Icon: MoveDiagonal,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ruler className="h-5 w-5 text-brand-accent" aria-hidden="true" />
          Dimensiones
        </CardTitle>
        <CardDescription>
          Medidas de {title} para que confirmes que abraza perfecto tu espacio.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-6 md:flex-row md:items-center md:gap-10">
        {/* Diagrama isométrico con cotas */}
        <svg
          viewBox="0 0 340 230"
          role="img"
          aria-label={`Diagrama de dimensiones de ${title}: ancho ${formatMeasure(width, unit)}, alto ${formatMeasure(height, unit)}, profundidad ${formatMeasure(depth, unit)}`}
          className="w-full max-w-[320px] shrink-0"
        >
          <defs>
            <marker
              id="cota-arrow-start"
              markerWidth="7"
              markerHeight="7"
              refX="2"
              refY="3.5"
              orient="auto"
            >
              <path d="M7 0 L0 3.5 L7 7 Z" className="fill-brand-accent" />
            </marker>
            <marker
              id="cota-arrow-end"
              markerWidth="7"
              markerHeight="7"
              refX="5"
              refY="3.5"
              orient="auto"
            >
              <path d="M0 0 L7 3.5 L0 7 Z" className="fill-brand-accent" />
            </marker>
          </defs>

          {/* Cuerpo del mueble (caja isométrica) */}
          {/* Cara superior */}
          <polygon
            points="80,80 240,80 290,50 130,50"
            className="fill-brand-taupe/10 stroke-brand-taupe"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Cara lateral */}
          <polygon
            points="240,80 290,50 290,150 240,180"
            className="fill-brand-taupe/20 stroke-brand-taupe"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Cara frontal */}
          <rect
            x="80"
            y="80"
            width="160"
            height="100"
            rx="4"
            className="fill-brand-taupe/5 stroke-brand-taupe"
            strokeWidth="2"
          />
          {/* Detalle: patas */}
          <line x1="92" y1="180" x2="92" y2="192" className="stroke-brand-taupe" strokeWidth="3" strokeLinecap="round" />
          <line x1="228" y1="180" x2="228" y2="192" className="stroke-brand-taupe" strokeWidth="3" strokeLinecap="round" />
          <line x1="278" y1="150" x2="278" y2="162" className="stroke-brand-taupe" strokeWidth="3" strokeLinecap="round" />

          {/* Cota A — ancho (bajo la cara frontal) */}
          <line x1="80" y1="180" x2="80" y2="206" className="stroke-brand-taupe/40" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="240" y1="180" x2="240" y2="206" className="stroke-brand-taupe/40" strokeWidth="1" strokeDasharray="3 3" />
          <line
            x1="84"
            y1="202"
            x2="236"
            y2="202"
            className="stroke-brand-accent"
            strokeWidth="1.5"
            markerStart="url(#cota-arrow-start)"
            markerEnd="url(#cota-arrow-end)"
          />
          <text x="160" y="222" textAnchor="middle" className="fill-brand-accent text-[13px] font-semibold">
            A
          </text>

          {/* Cota H — alto (a la izquierda de la cara frontal) */}
          <line x1="80" y1="80" x2="54" y2="80" className="stroke-brand-taupe/40" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="80" y1="180" x2="54" y2="180" className="stroke-brand-taupe/40" strokeWidth="1" strokeDasharray="3 3" />
          <line
            x1="58"
            y1="84"
            x2="58"
            y2="176"
            className="stroke-brand-accent"
            strokeWidth="1.5"
            markerStart="url(#cota-arrow-start)"
            markerEnd="url(#cota-arrow-end)"
          />
          <text x="40" y="135" textAnchor="middle" className="fill-brand-accent text-[13px] font-semibold">
            H
          </text>

          {/* Cota P — profundidad (paralela a la arista lateral inferior) */}
          <line x1="240" y1="180" x2="254" y2="192" className="stroke-brand-taupe/40" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="290" y1="150" x2="304" y2="162" className="stroke-brand-taupe/40" strokeWidth="1" strokeDasharray="3 3" />
          <line
            x1="253"
            y1="187"
            x2="300"
            y2="159"
            className="stroke-brand-accent"
            strokeWidth="1.5"
            markerStart="url(#cota-arrow-start)"
            markerEnd="url(#cota-arrow-end)"
          />
          <text x="292" y="188" textAnchor="middle" className="fill-brand-accent text-[13px] font-semibold">
            P
          </text>
        </svg>

        {/* Medidas en tres celdas */}
        <div className="grid w-full grid-cols-3 gap-3">
          {measures.map(({ key, label, value, Icon }) => (
            <div
              key={key}
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-secondary/60 px-2 py-4 text-center"
            >
              <Icon className="h-5 w-5 text-brand-accent" aria-hidden="true" />
              <p className="text-xs font-medium uppercase tracking-wide text-brand-taupe">
                {label} ({key})
              </p>
              <p className="text-sm font-bold text-brand-dark sm:text-base">{value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
