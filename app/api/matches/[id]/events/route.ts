import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const match = await db.match.findFirst({
      where: { id, userId: session.userId },
    });

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const body = await req.json();
    const { eventType, period, minute, stoppageTime, team, playerName, playerNumber, detail } = body;

    if (!eventType || !period || minute === undefined || !team) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const event = await db.gameEvent.create({
      data: {
        matchId: id,
        eventType,
        period,
        minute: Number(minute),
        stoppageTime: stoppageTime ? Number(stoppageTime) : null,
        team,
        playerName: playerName || null,
        playerNumber: playerNumber || null,
        detail: detail ? JSON.stringify(detail) : null,
      },
    });

    return NextResponse.json(event);
  } catch (err) {
    console.error("POST /api/matches/[id]/events:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { eventId } = await req.json();

    const event = await db.gameEvent.findFirst({
      where: { id: eventId, match: { userId: session.userId, id } },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    await db.gameEvent.delete({ where: { id: eventId } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/matches/[id]/events:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
