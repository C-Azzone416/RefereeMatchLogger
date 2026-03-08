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
      homeHeadCoach, awayHeadCoach, halfLength, overtimePossible, role,
      centerRefName, centerRefBadge, ar1Name, ar1Badge, ar2Name, ar2Badge,
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
        homeHeadCoach: homeHeadCoach || null,
        awayHeadCoach: awayHeadCoach || null,
        halfLength: halfLength ? Number(halfLength) : 45,
        overtimePossible: overtimePossible === true || overtimePossible === "true",
        role,
        centerRefName: centerRefName || null,
        centerRefBadge: centerRefBadge || null,
        ar1Name: ar1Name || null,
        ar1Badge: ar1Badge || null,
        ar2Name: ar2Name || null,
        ar2Badge: ar2Badge || null,
      },
    });

    return NextResponse.json({ id: match.id });
  } catch (err) {
    console.error("POST /api/matches:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const role             = searchParams.get("role")             || undefined;
    const ageGroup         = searchParams.get("ageGroup")         || undefined;
    const competitionLevel = searchParams.get("competitionLevel") || undefined;
    const q                = searchParams.get("q")                || undefined;

    // Default date window: last 30 days. Callers can override with explicit ISO dates.
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dateFrom = searchParams.get("dateFrom")
      ? new Date(searchParams.get("dateFrom")!)
      : thirtyDaysAgo;

    const dateTo = searchParams.get("dateTo")
      ? new Date(searchParams.get("dateTo")!)
      : undefined;

    const limitParam = parseInt(searchParams.get("limit") ?? "20", 10);
    const limit = Math.min(isNaN(limitParam) || limitParam < 1 ? 20 : limitParam, 100);
    const offsetParam = parseInt(searchParams.get("offset") ?? "0", 10);
    const offset = isNaN(offsetParam) || offsetParam < 0 ? 0 : offsetParam;

    const where = {
      userId: session.userId,
      ...(role             && { role }),
      ...(ageGroup         && { ageGroup }),
      ...(competitionLevel && { competitionLevel }),
      ...(q && {
        OR: [
          { homeTeam:        { contains: q, mode: "insensitive" as const } },
          { awayTeam:        { contains: q, mode: "insensitive" as const } },
          { competitionName: { contains: q, mode: "insensitive" as const } },
          { venue:           { contains: q, mode: "insensitive" as const } },
          { homeHeadCoach:   { contains: q, mode: "insensitive" as const } },
          { awayHeadCoach:   { contains: q, mode: "insensitive" as const } },
        ],
      }),
      date: {
        gte: dateFrom,
        ...(dateTo && { lte: dateTo }),
      },
    };

    const [total, rows] = await Promise.all([
      db.match.count({ where }),
      db.match.findMany({
        where,
        orderBy: { date: "desc" },
        skip: offset,
        take: limit,
        include: {
          events: { select: { eventType: true } },
          _count: { select: { supplementalReports: true } },
        },
      }),
    ]);

    // Replace raw events array with lightweight summary counts
    const matches = rows.map(({ events, _count, ...match }) => ({
      ...match,
      goalCount:         events.filter((e) => e.eventType === "goal").length,
      yellowCards:       events.filter((e) => e.eventType === "yellow_card").length,
      redCards:          events.filter((e) => e.eventType === "red_card").length,
      supplementalCount: _count.supplementalReports,
    }));

    return NextResponse.json({ matches, total, limit, offset });
  } catch (err) {
    console.error("GET /api/matches:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
