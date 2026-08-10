"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_COLORS } from "@/lib/chart-colors";
import type { ProductDTO } from "@/lib/types";

interface DailyPoint {
  date: string;
  views: number;
  whatsappClicks: number;
}

interface DashboardChartsProps {
  dailySeries: DailyPoint[];
  topViewed: ProductDTO[];
  topConverting: ProductDTO[];
}

const numberFormat = new Intl.NumberFormat("es-VE");

/** "2026-07-31" → "31 jul" (es-VE), sin librerías de fechas ni saltos de zona horaria. */
function formatDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Intl.DateTimeFormat("es-VE", { day: "numeric", month: "short" })
    .format(new Date(y, m - 1, d))
    .replace(".", "");
}

/** Los textos de leyenda van en tinta, nunca en el color de la serie. */
function legendText(value: string) {
  return <span className="text-xs font-medium text-brand-dark">{value}</span>;
}

function EmptyState({ children }: { children: string }) {
  return (
    <div className="flex min-h-[160px] items-center justify-center rounded-2xl bg-secondary/40 px-6 text-center">
      <p className="max-w-xs text-sm text-brand-taupe">{children}</p>
    </div>
  );
}

/**
 * Lista top-5 con barras horizontales proporcionales hechas con divs —
 * el color sigue a la métrica (azul = vistas, terracota = clics).
 */
function RankList({
  products,
  getMetric,
  color,
  emptyCopy,
}: {
  products: ProductDTO[];
  getMetric: (p: ProductDTO) => number;
  color: string;
  emptyCopy: string;
}) {
  const withActivity = products.filter((p) => getMetric(p) > 0).slice(0, 5);
  if (withActivity.length === 0) return <EmptyState>{emptyCopy}</EmptyState>;

  const max = Math.max(...withActivity.map(getMetric), 1);

  return (
    <ul className="space-y-4">
      {withActivity.map((product) => {
        const value = getMetric(product);
        return (
          <li key={product._id}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="truncate text-sm text-brand-dark">{product.title}</span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-brand-dark">
                {numberFormat.format(value)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-brand-dark/5">
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${Math.max((value / max) * 100, 4)}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function DashboardCharts({ dailySeries, topViewed, topConverting }: DashboardChartsProps) {
  const hasActivity = dailySeries.some((d) => d.views > 0 || d.whatsappClicks > 0);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Vistas vs. clics a WhatsApp</CardTitle>
          <CardDescription>Últimos 14 días</CardDescription>
        </CardHeader>
        <CardContent>
          {hasActivity ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dailySeries} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDay}
                  tick={{ fill: CHART_COLORS.axis, fontSize: 12, dy: 6 }}
                  tickLine={false}
                  axisLine={{ stroke: CHART_COLORS.grid }}
                  minTickGap={18}
                />
                <YAxis
                  allowDecimals={false}
                  width={40}
                  tick={{ fill: CHART_COLORS.axis, fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ stroke: CHART_COLORS.grid, strokeWidth: 1 }}
                  contentStyle={{
                    borderRadius: 16,
                    border: "1px solid rgba(37, 22, 15, 0.08)",
                    backgroundColor: "#FFFFFF",
                    boxShadow: "0 12px 32px -12px rgba(37, 22, 15, 0.25)",
                    padding: "10px 14px",
                  }}
                  labelStyle={{ color: "#231510", fontWeight: 600, fontSize: 12, marginBottom: 4 }}
                  itemStyle={{ color: "#231510", fontSize: 12, padding: 0 }}
                  labelFormatter={(label) => formatDay(String(label))}
                  formatter={(value, name) => [numberFormat.format(Number(value)), String(name)]}
                />
                <Legend formatter={legendText} iconType="plainline" wrapperStyle={{ paddingTop: 12 }} />
                <Line
                  type="monotone"
                  dataKey="views"
                  name="Vistas"
                  stroke={CHART_COLORS.views}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="whatsappClicks"
                  name="Clics a WhatsApp"
                  stroke={CHART_COLORS.conversions}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState>
              Aún no hay actividad registrada. Comparte tu catálogo y aquí verás cómo la gente responde a tus muebles.
            </EmptyState>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Muebles más vistos</CardTitle>
          <CardDescription>Top 5 por vistas acumuladas</CardDescription>
        </CardHeader>
        <CardContent>
          <RankList
            products={topViewed}
            getMetric={(p) => p.metrics.viewsCount}
            color={CHART_COLORS.views}
            emptyCopy="Todavía nadie ha visto tus muebles. Publica tu primer producto y deja que enamore."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Más clics a WhatsApp</CardTitle>
          <CardDescription>Top 5 por interés de compra</CardDescription>
        </CardHeader>
        <CardContent>
          <RankList
            products={topConverting}
            getMetric={(p) => p.metrics.whatsappClicksCount}
            color={CHART_COLORS.conversions}
            emptyCopy="Aún no hay clics a WhatsApp. Cuando alguien pregunte por un mueble, lo verás aquí."
          />
        </CardContent>
      </Card>
    </div>
  );
}
