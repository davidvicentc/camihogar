import { connectDB } from "@/lib/mongodb";
import AnalyticsLogModel from "@/lib/models/AnalyticsLog";
import ProductModel from "@/lib/models/Product";
import { serializeProduct } from "@/lib/data/products";
import type { ProductDTO } from "@/lib/types";

export interface DashboardSummary {
  totalProducts: number;
  totalViews: number;
  totalWhatsappClicks: number;
  totalCustomizerOpens: number;
  conversionRate: number; // clics WhatsApp / vistas
  topViewed: ProductDTO[];
  topConverting: ProductDTO[];
  /** Serie diaria de los últimos 14 días para el gráfico vistas vs. conversiones. */
  dailySeries: { date: string; views: number; whatsappClicks: number }[];
}

const EMPTY_SUMMARY: DashboardSummary = {
  totalProducts: 0,
  totalViews: 0,
  totalWhatsappClicks: 0,
  totalCustomizerOpens: 0,
  conversionRate: 0,
  topViewed: [],
  topConverting: [],
  dailySeries: [],
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  try {
    await connectDB();

    const since = new Date();
    since.setDate(since.getDate() - 13);
    since.setHours(0, 0, 0, 0);

    const [totalProducts, metricTotals, customizerOpens, topViewedDocs, topConvertingDocs, dailyRaw] =
      await Promise.all([
        ProductModel.countDocuments(),
        ProductModel.aggregate([
          {
            $group: {
              _id: null,
              views: { $sum: "$metrics.viewsCount" },
              clicks: { $sum: "$metrics.whatsappClicksCount" },
            },
          },
        ]),
        AnalyticsLogModel.countDocuments({ eventType: "CUSTOMIZER_OPEN" }),
        ProductModel.find().sort({ "metrics.viewsCount": -1 }).limit(5).lean(),
        ProductModel.find()
          .sort({ "metrics.whatsappClicksCount": -1 })
          .limit(5)
          .lean(),
        AnalyticsLogModel.aggregate([
          { $match: { timestamp: { $gte: since }, eventType: { $in: ["VIEW", "WHATSAPP_CLICK"] } } },
          {
            $group: {
              _id: {
                date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                eventType: "$eventType",
              },
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

    const totalViews = metricTotals[0]?.views ?? 0;
    const totalWhatsappClicks = metricTotals[0]?.clicks ?? 0;

    // Construye la serie completa de 14 días (incluye días sin eventos).
    const byDate = new Map<string, { views: number; whatsappClicks: number }>();
    for (let i = 0; i < 14; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      byDate.set(d.toISOString().slice(0, 10), { views: 0, whatsappClicks: 0 });
    }
    for (const row of dailyRaw as {
      _id: { date: string; eventType: string };
      count: number;
    }[]) {
      const entry = byDate.get(row._id.date);
      if (!entry) continue;
      if (row._id.eventType === "VIEW") entry.views = row.count;
      else entry.whatsappClicks = row.count;
    }

    return {
      totalProducts,
      totalViews,
      totalWhatsappClicks,
      totalCustomizerOpens: customizerOpens,
      conversionRate:
        totalViews > 0 ? Math.round((totalWhatsappClicks / totalViews) * 1000) / 10 : 0,
      topViewed: topViewedDocs.map(serializeProduct),
      topConverting: topConvertingDocs.map(serializeProduct),
      dailySeries: Array.from(byDate.entries()).map(([date, v]) => ({
        date,
        ...v,
      })),
    };
  } catch (error) {
    console.error("[data/analytics] getDashboardSummary:", error);
    return EMPTY_SUMMARY;
  }
}
