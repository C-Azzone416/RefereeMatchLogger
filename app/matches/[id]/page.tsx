import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { format } from "date-fns";
import { JERSEY_COLOR_MAP } from "@/lib/jerseyColors";
import MatchReportActions from "./MatchReportActions";

const PERIOD_LABELS: Record<string, string> = {
  "1": "1st Half", "2": "2nd Half", "et1": "ET 1st", "et2": "ET 2nd", "penalties": "Penalties",
};

const EVENT_EMOJI: Record<string, string> = {
  goal: "⚽", yellow_card: "🟨", red_card: "🟥", substitution: "🔄", injury: "🏥", note: "📝",
};

function minuteLabel(e: { minute: number; stoppageTime: number | null }) {
  return e.stoppageTime ? `${e.minute}+${e.stoppageTime}'` : `${e.minute}'`;
}

function JerseySwatch({ color, team }: { color: string | null; team: string }) {
  if (!color) return <span className="text-gray-400 text-xs">Not recorded</span>;
  const hex = JERSEY_COLOR_MAP[color] ?? "#ccc";
  const isLight = color === "White" || color === "Yellow" || color === "Gold";
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={`inline-block w-4 h-4 rounded-full flex-shrink-0 ${isLight ? "border border-gray-300" : ""}`}
        style={{ backgroundColor: hex }}
      />
      <span className="font-medium">{color}</span>
      <span className="text-gray-400 text-xs">({team})</span>
    </span>
  );
}

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session.userId) redirect("/login");

  const { id } = await params;
  const match = await db.match.findFirst({
    where: { id, userId: session.userId },
    include: { events: { orderBy: [{ period: "asc" }, { minute: "asc" }] } },
  });

  if (!match) redirect("/dashboard");

  const PERIODS = ["1", "2", "et1", "et2", "penalties"];
  const eventsByPeriod = PERIODS.map((p) => ({
    period: p,
    events: match.events.filter((e) => e.period === p),
  })).filter((g) => g.events.length > 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-brand-800 text-white px-4 pt-4 pb-6 pitch-bg">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/dashboard" className="text-brand-300 text-sm">← Dashboard</Link>
          <span className="text-brand-300 text-[10px] ml-auto uppercase tracking-widest">{match.role}</span>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-brand-300 uppercase tracking-widest mb-3">{match.competitionName} · {match.ageGroup} {match.gender}</div>
          <div className="flex items-center justify-center gap-4 mb-3">
            <span className="font-black text-base flex-1 text-right leading-tight">{match.homeTeam}</span>
            <span className="text-5xl font-black tabular-nums shrink-0">{match.homeScore}–{match.awayScore}</span>
            <span className="font-black text-base flex-1 text-left leading-tight">{match.awayTeam}</span>
          </div>
          <div className="text-brand-300 text-xs mt-2">
            {format(new Date(match.date), "EEEE, MMMM d, yyyy · h:mm a")}
          </div>
          <div className="text-brand-300 text-xs">{match.venue}{match.field ? ` · ${match.field}` : ""}</div>
        </div>
      </header>

      <div className="px-4 py-5 space-y-5 max-w-lg mx-auto">
        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link href={`/matches/${id}/log`} className="btn-secondary text-center block text-sm">
            Edit Game Log
          </Link>
          <Link href={`/matches/${id}/report`} className="btn-primary text-center block text-sm">
            Full Report
          </Link>
        </div>

        {/* Match info */}
        <div className="card space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Competition Level</span>
            <span className="font-medium">{match.competitionLevel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Your Role</span>
            <span className="font-medium">{match.role}</span>
          </div>
          {match.centerRefName && (
            <div className="flex justify-between">
              <span className="text-gray-500">Center Referee</span>
              <span className="font-medium">{match.centerRefName}</span>
            </div>
          )}
          {match.halfTimeHomeScore !== null && (
            <div className="flex justify-between">
              <span className="text-gray-500">Half-time</span>
              <span className="font-medium">{match.halfTimeHomeScore}–{match.halfTimeAwayScore}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-1 border-t border-gray-100">
            <span className="text-gray-500">Jerseys</span>
            <div className="flex flex-col items-end gap-1">
              <JerseySwatch color={match.homeJerseyColor} team="Home" />
              <JerseySwatch color={match.awayJerseyColor} team="Away" />
            </div>
          </div>
        </div>

        {/* Game log */}
        {eventsByPeriod.length > 0 ? (
          <div>
            <h2 className="font-semibold text-gray-900 mb-3">Match Events</h2>
            <div className="space-y-4">
              {eventsByPeriod.map(({ period, events }) => (
                <div key={period}>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    {PERIOD_LABELS[period]}
                  </div>
                  <div className="space-y-2">
                    {events.map((ev) => {
                      const detail = ev.detail ? JSON.parse(ev.detail) : {};
                      const team = ev.team === "home" ? match.homeTeam : match.awayTeam;
                      const player = ev.playerNumber ? `#${ev.playerNumber} ${ev.playerName || ""}` : ev.playerName || "";
                      return (
                        <div key={ev.id} className="card flex gap-3 items-start">
                          <div className="text-xl flex-shrink-0">{EVENT_EMOJI[ev.eventType]}</div>
                          <div className="flex-1">
                            <div className="flex items-baseline gap-2">
                              <span className="font-mono text-sm font-bold text-gray-900">{minuteLabel(ev)}</span>
                              <span className="text-sm font-medium text-gray-700">{team}</span>
                              {player && <span className="text-sm text-gray-500">{player}</span>}
                            </div>
                            {detail.reason && <div className="text-xs text-gray-500 mt-0.5">{detail.reason}</div>}
                            {detail.description && <div className="text-xs text-gray-500 mt-0.5">{detail.description}</div>}
                            {detail.ownGoal && <div className="text-xs text-orange-600 mt-0.5">Own Goal</div>}
                            {detail.penalty && <div className="text-xs text-blue-600 mt-0.5">Penalty Kick</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card text-center py-6 text-gray-400 text-sm">No events logged.</div>
        )}

        {/* Export actions */}
        <MatchReportActions matchId={id} />
      </div>
    </div>
  );
}
