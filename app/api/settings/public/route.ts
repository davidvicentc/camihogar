import { NextResponse } from "next/server";
import { getSiteSettings } from "@/lib/data/settings";

export async function GET() {
  const settings = await getSiteSettings();
  return NextResponse.json(
    {
      whatsappNumber: settings.whatsappNumber,
      googleAnalyticsId: settings.googleAnalyticsId,
    },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } }
  );
}
