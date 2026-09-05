import { NextResponse } from "next/server";
import { getWhatsAppNumber } from "@/lib/data/settings";

export async function GET() {
  return NextResponse.json({ whatsappNumber: await getWhatsAppNumber() }, { headers: { "Cache-Control": "no-store" } });
}