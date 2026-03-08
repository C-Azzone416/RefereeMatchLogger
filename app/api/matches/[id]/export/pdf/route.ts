import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { format } from "date-fns";
import type { GameEvent } from "@prisma/client";
import React from "react";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, padding: 40, color: "#1a1a1a" },
  header: { backgroundColor: "#15803d", padding: 16, marginBottom: 20, borderRadius: 4 },
  headerTitle: { color: "#ffffff", fontSize: 16, fontFamily: "Helvetica-Bold", textAlign: "center", letterSpacing: 2 },
  headerSub: { color: "#bbf7d0", fontSize: 9, textAlign: "center", marginTop: 3 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1.5, color: "#555", marginBottom: 6, borderBottom: "1px solid #e5e5e5", paddingBottom: 3 },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: 130, fontSize: 9, color: "#888", fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  value: { flex: 1, fontSize: 10 },
  scoreBox: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: 12, padding: 12, backgroundColor: "#f9fafb", borderRadius: 4 },
  teamName: { flex: 1, textAlign: "center", fontSize: 13, fontFamily: "Helvetica-Bold" },
  teamLabel: { fontSize: 8, color: "#999", textAlign: "center" },
  scoreText: { width: 60, textAlign: "center", fontSize: 24, fontFamily: "Helvetica-Bold" },
  scoreHT: { fontSize: 8, color: "#999", textAlign: "center" },
  eventRow: { flexDirection: "row", marginBottom: 2, alignItems: "flex-start" },
  eventMinute: { width: 42, fontSize: 9, color: "#666", fontFamily: "Helvetica-Oblique" },
  eventType: { width: 12, fontSize: 9 },
  eventDesc: { flex: 1, fontSize: 9 },
  eventDetail: { fontSize: 8, color: "#666", marginTop: 1 },
  narrativeText: { fontSize: 10, lineHeight: 1.5, color: "#333" },
  footer: { marginTop: 24, paddingTop: 8, borderTop: "1px solid #eee", fontSize: 8, color: "#999", textAlign: "center" },
  abandoned: { color: "#dc2626", fontFamily: "Helvetica-Bold", fontSize: 10, textAlign: "center", marginTop: 4 },
});

type EventDetail = {
  reason?: string;
  description?: string;
  penalty?: boolean;
  ownGoal?: boolean;
  assistName?: string;
  subOnName?: string;
  secondYellow?: boolean;
};

const PERIOD_LABELS: Record<string, string> = {
  "1": "First Half",
  "2": "Second Half",
  "et1": "Extra Time – 1st Half",
  "et2": "Extra Time – 2nd Half",
  "penalties": "Penalty Shootout",
};

const EVENT_SYMBOLS: Record<string, string> = {
  goal: "⚽",
  yellow_card: "🟨",
  red_card: "🟥",
  substitution: "↔",
  injury: "+",
  note: "•",
};

function minuteLabel(e: { minute: number; stoppageTime: number | null }): string {
  return e.stoppageTime ? `${e.minute}+${e.stoppageTime}'` : `${e.minute}'`;
}

function buildPdfDocument(
  match: Parameters<typeof db.match.findFirst>[0] extends undefined ? never : Awaited<ReturnType<typeof db.match.findFirst>> & { events: GameEvent[] },
  user: { name: string; badgeNumber: string | null; currentGrade: string | null; state: string | null }
) {
  if (!match) throw new Error("Match is null");

  const dateStr = format(new Date(match.date), "MMMM d, yyyy");
  const timeStr = format(new Date(match.date), "h:mm a");
  const ALL_PERIODS = ["1", "2", "et1", "et2", "penalties"];
  const periods = match.overtimePossible ? ALL_PERIODS : ALL_PERIODS.slice(0, 2);
  const eventsByPeriod = periods
    .map((p) => ({ period: p, label: PERIOD_LABELS[p], events: match.events.filter((e) => e.period === p) }))
    .filter((g) => g.events.length > 0);

  const yellowCards = match.events.filter((e) => e.eventType === "yellow_card");
  const redCards = match.events.filter((e) => e.eventType === "red_card");

  return React.createElement(Document, {},
    React.createElement(Page, { size: "LETTER" as const, style: styles.page },
      // Header
      React.createElement(View, { style: styles.header },
        React.createElement(Text, { style: styles.headerTitle }, "OFFICIAL MATCH REPORT"),
        React.createElement(Text, { style: styles.headerSub }, `US Soccer${user.state ? ` — ${user.state}` : ""}`)
      ),

      // Match Details
      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, "Match Details"),
        React.createElement(View, { style: styles.row }, React.createElement(Text, { style: styles.label }, "Competition"), React.createElement(Text, { style: styles.value }, match.competitionName)),
        React.createElement(View, { style: styles.row }, React.createElement(Text, { style: styles.label }, "Date"), React.createElement(Text, { style: styles.value }, `${dateStr} at ${timeStr}`)),
        React.createElement(View, { style: styles.row }, React.createElement(Text, { style: styles.label }, "Age / Gender"), React.createElement(Text, { style: styles.value }, `${match.ageGroup} ${match.gender}`)),
        React.createElement(View, { style: styles.row }, React.createElement(Text, { style: styles.label }, "Level"), React.createElement(Text, { style: styles.value }, match.competitionLevel)),
        React.createElement(View, { style: styles.row }, React.createElement(Text, { style: styles.label }, "Venue"), React.createElement(Text, { style: styles.value }, match.field ? `${match.venue}, ${match.field}` : match.venue)),
      ),

      // Score
      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, "Result"),
        React.createElement(View, { style: styles.scoreBox },
          React.createElement(View, { style: { flex: 1 } },
            React.createElement(Text, { style: styles.teamName }, match.homeTeam),
            React.createElement(Text, { style: styles.teamLabel }, "Home")
          ),
          React.createElement(View, { style: { width: 80, alignItems: "center" as const } },
            React.createElement(Text, { style: styles.scoreText }, `${match.homeScore}–${match.awayScore}`),
            match.halfTimeHomeScore !== null
              ? React.createElement(Text, { style: styles.scoreHT }, `HT: ${match.halfTimeHomeScore}–${match.halfTimeAwayScore}`)
              : null,
            match.extraTime ? React.createElement(Text, { style: { fontSize: 8, color: "#999" } }, "AET") : null,
            match.penalties ? React.createElement(Text, { style: { fontSize: 8, color: "#999" } }, "Pens") : null,
          ),
          React.createElement(View, { style: { flex: 1 } },
            React.createElement(Text, { style: styles.teamName }, match.awayTeam),
            React.createElement(Text, { style: styles.teamLabel }, "Away")
          ),
        ),
        match.matchAbandoned
          ? React.createElement(Text, { style: styles.abandoned }, `⚠ Match Abandoned${match.abandonReason ? `: ${match.abandonReason}` : ""}`)
          : null,
      ),

      // Officials
      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, "Officials"),
        match.role === "Center"
          ? React.createElement(View, {},
              React.createElement(View, { style: styles.row }, React.createElement(Text, { style: styles.label }, "Referee"), React.createElement(Text, { style: styles.value }, `${user.name}${user.badgeNumber ? ` (Badge: ${user.badgeNumber})` : ""}`)),
              React.createElement(View, { style: styles.row }, React.createElement(Text, { style: styles.label }, "Grade"), React.createElement(Text, { style: styles.value }, user.currentGrade || "—")),
            )
          : React.createElement(View, {},
              React.createElement(View, { style: styles.row }, React.createElement(Text, { style: styles.label }, "Center Referee"), React.createElement(Text, { style: styles.value }, `${match.centerRefName || "—"}${match.centerRefBadge ? ` (Badge: ${match.centerRefBadge})` : ""}`)),
              React.createElement(View, { style: styles.row }, React.createElement(Text, { style: styles.label }, match.role), React.createElement(Text, { style: styles.value }, `${user.name}${user.badgeNumber ? ` (Badge: ${user.badgeNumber})` : ""}`)),
              React.createElement(View, { style: styles.row }, React.createElement(Text, { style: styles.label }, "Grade"), React.createElement(Text, { style: styles.value }, user.currentGrade || "—")),
            ),
        match.ar1Name ? React.createElement(View, { style: styles.row }, React.createElement(Text, { style: styles.label }, "AR1"), React.createElement(Text, { style: styles.value }, `${match.ar1Name}${match.ar1Badge ? ` (Badge: ${match.ar1Badge})` : ""}`)) : null,
        match.ar2Name ? React.createElement(View, { style: styles.row }, React.createElement(Text, { style: styles.label }, "AR2"), React.createElement(Text, { style: styles.value }, `${match.ar2Name}${match.ar2Badge ? ` (Badge: ${match.ar2Badge})` : ""}`)) : null,
      ),

      // Events
      eventsByPeriod.length > 0
        ? React.createElement(View, { style: styles.section },
            React.createElement(Text, { style: styles.sectionTitle }, "Match Events"),
            ...eventsByPeriod.flatMap(({ label, events }) => [
              React.createElement(Text, { key: `label-${label}`, style: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#555", marginTop: 6, marginBottom: 3 } }, label),
              ...events.map((ev) => {
                const detail = (ev.detail ?? {}) as EventDetail;
                const team = ev.team === "home" ? match.homeTeam : match.awayTeam;
                const player = [ev.playerNumber ? `#${ev.playerNumber}` : null, ev.playerName].filter(Boolean).join(" ");
                let desc = team;
                if (player) desc += ` — ${player}`;
                if (ev.eventType === "goal" && detail.ownGoal) desc += " (OG)";
                if (ev.eventType === "goal" && detail.penalty) desc += " (PK)";
                if (ev.eventType === "substitution" && detail.subOnName) desc += ` → ${detail.subOnName}`;
                const detailLine = [
                  (ev.eventType === "yellow_card" || ev.eventType === "red_card") && detail.reason
                    ? `${detail.reason}${detail.secondYellow ? " (2nd caution)" : ""}`
                    : null,
                  ev.eventType === "goal" && detail.assistName ? `Assist: ${detail.assistName}` : null,
                  (ev.eventType === "note" || ev.eventType === "injury") && detail.description ? detail.description : null,
                ].filter(Boolean).join(" · ");

                return React.createElement(View, { key: ev.id, style: styles.eventRow },
                  React.createElement(Text, { style: styles.eventMinute }, minuteLabel(ev)),
                  React.createElement(Text, { style: styles.eventType }, EVENT_SYMBOLS[ev.eventType] ?? ""),
                  React.createElement(View, { style: { flex: 1 } },
                    React.createElement(Text, { style: styles.eventDesc }, desc),
                    detailLine ? React.createElement(Text, { style: styles.eventDetail }, detailLine) : null,
                  )
                );
              }),
            ])
          )
        : null,

      // Disciplinary Summary
      (yellowCards.length > 0 || redCards.length > 0)
        ? React.createElement(View, { style: styles.section },
            React.createElement(Text, { style: styles.sectionTitle }, "Disciplinary Summary"),
            React.createElement(View, { style: styles.row },
              React.createElement(Text, { style: styles.label }, `🟨 Cautions (${yellowCards.length})`),
              React.createElement(Text, { style: styles.value }, yellowCards.length === 0 ? "None" : yellowCards.map((e) => {
                const detail = (e.detail ?? {}) as EventDetail;
                const team = e.team === "home" ? match.homeTeam : match.awayTeam;
                return `${minuteLabel(e)} ${team}${e.playerName ? ` — ${e.playerName}` : ""}${detail.reason ? ` (${detail.reason})` : ""}`;
              }).join("\n")),
            ),
            React.createElement(View, { style: styles.row },
              React.createElement(Text, { style: styles.label }, `🟥 Send-offs (${redCards.length})`),
              React.createElement(Text, { style: styles.value }, redCards.length === 0 ? "None" : redCards.map((e) => {
                const detail = (e.detail ?? {}) as EventDetail;
                const team = e.team === "home" ? match.homeTeam : match.awayTeam;
                return `${minuteLabel(e)} ${team}${e.playerName ? ` — ${e.playerName}` : ""}${detail.reason ? ` (${detail.reason})` : ""}`;
              }).join("\n")),
            ),
          )
        : null,

      // Narrative
      match.narrative
        ? React.createElement(View, { style: styles.section },
            React.createElement(Text, { style: styles.sectionTitle }, "Referee's Report"),
            React.createElement(Text, { style: styles.narrativeText }, match.narrative),
          )
        : null,

      // Footer
      React.createElement(Text, { style: styles.footer }, `Generated by Referee Match Tracker · ${format(new Date(), "MMMM d, yyyy")}`),
    )
  );
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
        select: { name: true, badgeNumber: true, currentGrade: true, state: true },
      }),
    ]);

    if (!match || !user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const doc = buildPdfDocument(match, user);
    const buffer = await renderToBuffer(doc);
    const uint8 = new Uint8Array(buffer);

    const filename = `match-report-${match.homeTeam.replace(/\s+/g, "-")}-vs-${match.awayTeam.replace(/\s+/g, "-")}-${format(new Date(match.date), "yyyy-MM-dd")}.pdf`
      .replace(/[^a-zA-Z0-9._-]/g, "-");

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": uint8.byteLength.toString(),
      },
    });
  } catch (err) {
    console.error("GET /api/matches/[id]/export/pdf:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
