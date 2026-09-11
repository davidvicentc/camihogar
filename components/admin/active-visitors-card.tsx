"use client";

import { Users } from "lucide-react";
import { useEffect, useState } from "react";
import { StatCard } from "@/components/admin/stat-card";

const REFRESH_MS = 15_000;

export function ActiveVisitorsCard() {
  const [activeVisitors, setActiveVisitors] = useState(0);

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/analytics/presence", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { activeVisitors?: number };
        if (mounted) setActiveVisitors(data.activeVisitors ?? 0);
      } catch {
        // El panel conserva el último valor si la consulta falla.
      }
    };

    void refresh();
    const interval = window.setInterval(() => void refresh(), REFRESH_MS);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <StatCard
      label="En el sitio ahora"
      value={activeVisitors}
      icon={<Users className="h-5 w-5" />}
      hint="Sesiones activas en el último minuto"
    />
  );
}
