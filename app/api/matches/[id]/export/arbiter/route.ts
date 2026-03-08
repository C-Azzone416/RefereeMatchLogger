import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { format } from "date-fns";
import type { GameEvent } from "@prisma/client";

type EventDetail = {
  reason?: string;
  secondYellow?: boolean;
};

function csvField(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? "" : String(value);
  // Wrap in quotes if it contains commas, quotes, or newlines
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCautionLines(events: GameEvent[], homeTeam: string, awayTeam: string): string {
  return events
    .filter((e) => e.eventType === "yellow_card")
    .map((e) => {
      const detail = (e.detail ?? {}) as EventDetail;
      const team = e.team === "home" ? homeTeam : awayTeam;
      const minute = e.stoppageTime ? `${e.minute}+${e.stoppageTime}` : String(e.minute);
      return [
        `${minute}'`,
        team,
        e.playerName || "",
        e.playerNumber || "",
        detail.reason || "",
        detail.secondYellow ? "2nd Caution" : "Caution",
      ].filter(Boolean).join(" | ");
    })
    .join("; ");
}

function buildSendOffLines(events: GameEvent[], homeTeam: string, awayTeam: string): string {
  return events
    .filter((e) => e.eventType === "red_card")
    .map((e) => {
      const detail = (e.detail ?? {}) as EventDetail;
      const team = e.team === "home" ? homeTeam : awayTeam;
      const minute = e.stoppageTime ? `${e.minute}+${e.stoppageTime}` : String(e.minute);
      return [
        `${minute}'`,
        team,
        e.playerName || "",
        e.playerNumber || "",
        detail.reason || "",
        detail.secondYellow ? "Send Off (2nd Caution)" : "Send Off",
      ].filter(Boolean).join(" | ");
    })
    .join("; ");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const [match, user] = await Promise.all([
      db.match.findFirst({
        where: { id, userId: session.userId },
        include: {
          events: { orderBy: [{ period: "asc" }, { minute: "asc" }, { stoppageTime: "asc" }] },
        },
      }),
      db.user.findUnique({
        where: { id: session.userId },
        select: { name: true, badgeNumber: true, currentGrade: true },
      }),
    ]);

    if (!match || !user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const dateStr = format(new Date(match.date), "MM/dd/yyyy");
    const timeStr = format(new Date(match.date), "HH:mm");

    const centerRefName = match.role === "Center" ? user.name : (match.centerRefName || "");
    const centerRefBadge = match.role === "Center" ? (user.badgeNumber || "") : (match.centerRefBadge || "");
    const ar1Name = match.role === "AR1" ? user.name : (match.ar1Name || "");
    const ar1Badge = match.role === "AR1" ? (user.badgeNumber || "") : (match.ar1Badge || "");
    const ar2Name = match.role === "AR2" ? user.name : (match.ar2Name || "");
    const ar2Badge = match.role === "AR2" ? (user.badgeNumber || "") : (match.ar2Badge || "");

    const cautions = buildCautionLines(match.events, match.homeTeam, match.awayTeam);
    const sendOffs = buildSendOffLines(match.events, match.homeTeam, match.awayTeam);

    const goalEvents = match.events.filter((e) => e.eventType === "goal");
    const homeGoals = goalEvents.filter((e) => e.team === "home").length;
    const awayGoals = goalEvents.filter((e) => e.team === "away").length;

    const headers = [
      "Date",
      "Time",
      "Competition",
      "Age Group",
      "Gender",
      "Level",
      "Venue",
      "Field",
      "Home Team",
      "Away Team",
      "Home Score",
      "Away Score",
      "HT Home Score",
      "HT Away Score",
      "Extra Time",
      "Penalties",
      "Match Abandoned",
      "Abandon Reason",
      "Center Referee",
      "Center Referee Badge",
      "AR1",
      "AR1 Badge",
      "AR2",
      "AR2 Badge",
      "Reporting Official Grade",
      "Cautions",
      "Send Offs",
      "Caution Count",
      "Send Off Count",
      "Narrative",
    ];

    const values = [
      dateStr,
      timeStr,
      match.competitionName,
      match.ageGroup,
      match.gender,
      match.competitionLevel,
      match.venue,
      match.field || "",
      match.homeTeam,
      match.awayTeam,
      match.homeScore,
      match.awayScore,
      match.halfTimeHomeScore ?? "",
      match.halfTimeAwayScore ?? "",
      match.extraTime ? "Yes" : "No",
      match.penalties ? "Yes" : "No",
      match.matchAbandoned ? "Yes" : "No",
      match.abandonReason || "",
      centerRefName,
      centerRefBadge,
      ar1Name,
      ar1Badge,
      ar2Name,
      ar2Badge,
      user.currentGrade || "",
      cautions,
      sendOffs,
      match.events.filter((e) => e.eventType === "yellow_card").length,
      match.events.filter((e) => e.eventType === "red_card").length,
      match.narrative || "",
    ];

    const csv = [
      headers.map(csvField).join(","),
      values.map(csvField).join(","),
    ].join("\r\n");

    const filename = `arbiter-${match.homeTeam.replace(/\s+/g, "-")}-vs-${match.awayTeam.replace(/\s+/g, "-")}-${format(new Date(match.date), "yyyy-MM-dd")}.csv`
      .replace(/[^a-zA-Z0-9._-]/g, "-");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("GET /api/matches/[id]/export/arbiter:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
