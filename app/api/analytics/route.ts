import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import AnalyticsLogModel from "@/lib/models/AnalyticsLog";
import ProductModel from "@/lib/models/Product";

const VALID_EVENTS = ["VIEW", "WHATSAPP_CLICK", "CUSTOMIZER_OPEN"] as const;
type EventType = (typeof VALID_EVENTS)[number];

/** Registra un evento de receptividad y actualiza los contadores del producto. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      productId?: string;
      eventType?: string;
    };

    if (
      !body.productId ||
      !Types.ObjectId.isValid(body.productId) ||
      !VALID_EVENTS.includes(body.eventType as EventType)
    ) {
      return NextResponse.json({ ok: false, error: "Payload inválido" }, { status: 400 });
    }

    await connectDB();

    const inc =
      body.eventType === "VIEW"
        ? { "metrics.viewsCount": 1 }
        : body.eventType === "WHATSAPP_CLICK"
          ? { "metrics.whatsappClicksCount": 1 }
          : null;

    await Promise.all([
      AnalyticsLogModel.create({
        productId: body.productId,
        eventType: body.eventType,
        timestamp: new Date(),
      }),
      inc ? ProductModel.updateOne({ _id: body.productId }, { $inc: inc }) : Promise.resolve(),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/analytics] POST:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
