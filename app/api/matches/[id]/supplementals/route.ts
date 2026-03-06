import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { INCIDENT_TYPES, getDeadlineDate } from "@/lib/supplementalTypes";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const match = await db.match.findFirst({ where: { id, userId: session.userId } });
    if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

    const reports = await db.supplementalReport.findMany({
      where: { matchId: id },
      include: { gameEvent: true },
      orderBy: { createdAt: "asc" },
    });

    // Attach deadline info to each report
    const enriched = reports.map((r) => {
      const destinations = r.submittedTo ? r.submittedTo.split(",") : [];
      const deadline = destinations.length
        ? getDeadlineDate(match.date, destinations).toISOString()
        : null;
      return { ...r, deadline };
    });

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("GET /api/matches/[id]/supplementals:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const match = await db.match.findFirst({ where: { id, userId: session.userId } });
    if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

    const body = await req.json();
    const {
      incidentType,
      gameEventId,
      team,
      playerName,
      playerNumber,
      officialName,
      officialRole,
      minute,
      stoppageTime,
      period,
      fieldLocation,
      offenseCode,
      narrative,
      details,
    } = body;

    if (!incidentType || !INCIDENT_TYPES.includes(incidentType)) {
      return NextResponse.json({ error: "Valid incidentType is required" }, { status: 400 });
    }

    // If linking to a game event, verify it belongs to this match
    if (gameEventId) {
      const event = await db.gameEvent.findFirst({ where: { id: gameEventId, matchId: id } });
      if (!event) return NextResponse.json({ error: "Game event not found" }, { status: 404 });

      // Check a supplemental doesn't already exist for this event
      const existing = await db.supplementalReport.findUnique({ where: { gameEventId } });
      if (existing) {
        return NextResponse.json(
          { error: "A supplemental report already exists for this event", existingId: existing.id },
          { status: 409 }
        );
      }
    }

    const report = await db.supplementalReport.create({
      data: {
        matchId: id,
        gameEventId: gameEventId || null,
        incidentType,
        team: team || null,
        playerName: playerName || null,
        playerNumber: playerNumber || null,
        officialName: officialName || null,
        officialRole: officialRole || null,
        minute: minute !== undefined ? Number(minute) : null,
        stoppageTime: stoppageTime ? Number(stoppageTime) : null,
        period: period || null,
        fieldLocation: fieldLocation || null,
        offenseCode: offenseCode || null,
        narrative: narrative || null,
        details: details ?? null,
        status: "draft",
      },
      include: { gameEvent: true },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (err) {
    console.error("POST /api/matches/[id]/supplementals:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
