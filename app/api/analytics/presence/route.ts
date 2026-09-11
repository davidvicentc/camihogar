import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import VisitorPresenceModel from "@/lib/models/VisitorPresence";

const ACTIVE_WINDOW_MS = 60_000;
const PRESENCE_TTL_MS = 90_000;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { sessionId?: string };
    if (!body.sessionId || body.sessionId.length > 100) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const now = new Date();
    await connectDB();
    await VisitorPresenceModel.updateOne(
      { sessionId: body.sessionId },
      {
        $set: {
          lastSeen: now,
          expiresAt: new Date(now.getTime() + PRESENCE_TTL_MS),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/analytics/presence] POST:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET() {
  try {
    await connectDB();
    const since = new Date(Date.now() - ACTIVE_WINDOW_MS);
    const activeVisitors = await VisitorPresenceModel.countDocuments({ lastSeen: { $gte: since } });
    return NextResponse.json({ activeVisitors });
  } catch (error) {
    console.error("[api/analytics/presence] GET:", error);
    return NextResponse.json({ activeVisitors: 0 }, { status: 500 });
  }
}
