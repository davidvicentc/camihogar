import { Eye, Package, Percent } from "lucide-react";
import { SiWhatsapp } from "@icons-pack/react-simple-icons";
import { getDashboardSummary } from "@/lib/data/analytics";
import { StatCard } from "@/components/admin/stat-card";
import { DashboardCharts } from "@/components/admin/dashboard-charts";

export const dynamic = "force-dynamic";

const numberFormat = new Intl.NumberFormat("es-VE");
const percentFormat = new Intl.NumberFormat("es-VE", { maximumFractionDigits: 1 });

export default async function AdminDashboardPage() {
  const summary = await getDashboardSummary();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tighter text-brand-dark sm:text-3xl">
          Resumen de receptividad
        </h1>
        <p className="mt-1 text-sm text-brand-taupe">
          Así está respondiendo la gente a los muebles de tu hogar.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Productos"
          value={numberFormat.format(summary.totalProducts)}
          icon={<Package className="h-5 w-5" />}
        />
        <StatCard
          label="Vistas totales"
          value={numberFormat.format(summary.totalViews)}
          icon={<Eye className="h-5 w-5" />}
        />
        <StatCard
          label="Clics a WhatsApp"
          value={numberFormat.format(summary.totalWhatsappClicks)}
          icon={<SiWhatsapp className="h-5 w-5" />}
          hint={`Además, ${numberFormat.format(summary.totalCustomizerOpens)} aperturas del personalizador`}
        />
        <StatCard
          label="Conversión"
          value={`${percentFormat.format(summary.conversionRate)}%`}
          icon={<Percent className="h-5 w-5" />}
          hint="Clics a WhatsApp entre vistas totales"
        />
      </div>

      <DashboardCharts
        dailySeries={summary.dailySeries}
        topViewed={summary.topViewed}
        topConverting={summary.topConverting}
      />
    </div>
  );
}
