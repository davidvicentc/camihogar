"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Botón de cierre de sesión del panel. Vive sobre fondos oscuros
 * (sidebar / top bar del admin), por eso usa tinta clara.
 */
export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      // Aunque falle la petición, llevamos al login: el middleware decide.
    }
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium text-brand-bg/70 transition-colors hover:bg-white/10 hover:text-brand-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent disabled:opacity-50",
        className
      )}
    >
      <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
      {loading ? "Saliendo…" : "Salir"}
    </button>
  );
}
