"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const WhatsAppContext = createContext<string | null>(null);
export function WhatsAppSettingsProvider({ children }: { children: ReactNode }) {
  const [number, setNumber] = useState<string | null>(null);
  useEffect(() => { fetch("/api/settings/public").then((response) => response.json()).then((data) => setNumber(data.whatsappNumber)).catch(() => undefined); }, []);
  return <WhatsAppContext.Provider value={number}>{children}</WhatsAppContext.Provider>;
}
export function useWhatsAppNumber() { return useContext(WhatsAppContext); }