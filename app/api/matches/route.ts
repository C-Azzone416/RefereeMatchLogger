import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      date, time, venue, field, competitionName, ageGroup, gender,
      competitionLevel, homeTeam, awayTeam, homeJerseyColor, awayJerseyColor,
      role, centerRefName, centerRefBadge,
    } = body;

    if (!date || !venue || !competitionName || !homeTeam || !awayTeam || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const matchDate = new Date(`${date}T${time || "00:00"}`);

    const match = await db.match.create({
      data: {
        userId: session.userId,
        date: matchDate,
        venue,
        field: field || null,
        competitionName,
        ageGroup,
        gender,
        competitionLevel,
        homeTeam,
        awayTeam,
        homeJerseyColor: homeJerseyColor || null,
        awayJerseyColor: awayJerseyColor || null,
        role,
        centerRefName: centerRefName || null,
        centerRefBadge: centerRefBadge || null,
      },
    });

    return NextResponse.json({ id: match.id });
  } catch (err) {
    console.error("POST /api/matches:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const matches = await db.match.findMany({
      where: { userId: session.userId },
      orderBy: { date: "desc" },
      include: { events: true },
    });

    return NextResponse.json(matches);
  } catch (err) {
    console.error("GET /api/matches:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
