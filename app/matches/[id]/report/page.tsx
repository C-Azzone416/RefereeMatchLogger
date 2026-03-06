import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { format } from "date-fns";
import { JERSEY_COLOR_MAP } from "@/lib/jerseyColors";
import PrintButton from "./PrintButton";

const PERIOD_LABELS: Record<string, string> = {
  "1": "First Half",
  "2": "Second Half",
  "et1": "Extra Time – First Half",
  "et2": "Extra Time – Second Half",
  "penalties": "Penalty Shootout",
};

const ALL_PERIODS = ["1", "2", "et1", "et2", "penalties"];

function minuteLabel(e: { minute: number; stoppageTime: number | null }) {
  return e.stoppageTime ? `${e.minute}+${e.stoppageTime}'` : `${e.minute}'`;
}

function JerseyBadge({ color }: { color: string | null }) {
  if (!color) return <span className="text-gray-400 italic">Not recorded</span>;
  const hex = JERSEY_COLOR_MAP[color];
  const isLight = color === "White" || color === "Yellow" || color === "Gold";
  return (
    <span className="inline-flex items-center gap-1.5">
      {hex && (
        <span
          className={`inline-block w-3.5 h-3.5 rounded-full flex-shrink-0 ${isLight ? "border border-gray-400" : ""}`}
          style={{ backgroundColor: hex }}
        />
      )}
      {color}
    </span>
  );
}

export default async function MatchReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session.userId) redirect("/login");

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

  if (!match || !user) redirect("/dashboard");

  const goals = match.events.filter((e) => e.eventType === "goal");
  const yellowCards = match.events.filter((e) => e.eventType === "yellow_card");
  const redCards = match.events.filter((e) => e.eventType === "red_card");
  const substitutions = match.events.filter((e) => e.eventType === "substitution");
  const injuries = match.events.filter((e) => e.eventType === "injury");
  const notes = match.events.filter((e) => e.eventType === "note");

  const PERIODS = match.overtimePossible ? ALL_PERIODS : ALL_PERIODS.slice(0, 2);
  const eventsByPeriod = PERIODS.map((p) => ({
    period: p,
    label: PERIOD_LABELS[p],
    events: match.events.filter((e) => e.period === p),
  })).filter((g) => g.events.length > 0);

  const reportDate = format(new Date(match.date), "MMMM d, yyyy");
  const reportTime = format(new Date(match.date), "h:mm a");

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* Toolbar — hidden on print */}
      <div className="print:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link href={`/matches/${id}`} className="text-brand-600 text-sm font-medium">← Back</Link>
        <span className="text-gray-400">|</span>
        <span className="text-sm text-gray-600 flex-1">Match Report</span>
        <PrintButton />
      </div>

      {/* Report */}
      <div className="max-w-2xl mx-auto my-6 print:my-0 bg-white shadow-sm print:shadow-none">
        <div className="p-8 print:p-6 space-y-6">

          {/* Header */}
          <div className="text-center border-b-2 border-gray-900 pb-4">
            <h1 className="text-xl font-bold uppercase tracking-wide">Official Match Report</h1>
            <p className="text-sm text-gray-600 mt-1">US Soccer — {user.state || "State Association"}</p>
          </div>

          {/* Competition + Date */}
          <section className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Field label="Competition" value={match.competitionName} />
            <Field label="Date" value={reportDate} />
            <Field label="Age Group / Gender" value={`${match.ageGroup} ${match.gender}`} />
            <Field label="Kick-off Time" value={reportTime} />
            <Field label="Competition Level" value={match.competitionLevel} />
            <Field label="Venue" value={`${match.venue}${match.field ? `, ${match.field}` : ""}`} />
          </section>

          <Divider />

          {/* Teams + Score */}
          <section>
            <SectionTitle>Teams &amp; Result</SectionTitle>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 my-3">
              <div className="text-center">
                <div className="font-bold text-lg">{match.homeTeam}</div>
                <div className="text-xs text-gray-500 mt-0.5">Home</div>
                <div className="text-xs mt-1"><JerseyBadge color={match.homeJerseyColor} /></div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black tabular-nums">{match.homeScore}–{match.awayScore}</div>
                {match.halfTimeHomeScore !== null && (
                  <div className="text-xs text-gray-500 mt-1">
                    Half-time: {match.halfTimeHomeScore}–{match.halfTimeAwayScore}
                  </div>
                )}
                {match.overtimePossible && match.extraTime && <div className="text-xs text-gray-500">After extra time</div>}
                {match.overtimePossible && match.penalties && <div className="text-xs text-gray-500">After penalties</div>}
              </div>
              <div className="text-center">
                <div className="font-bold text-lg">{match.awayTeam}</div>
                <div className="text-xs text-gray-500 mt-0.5">Away</div>
                <div className="text-xs mt-1"><JerseyBadge color={match.awayJerseyColor} /></div>
              </div>
            </div>
            {match.matchAbandoned && (
              <p className="text-red-600 text-sm font-semibold text-center mt-2">
                ⚠ Match Abandoned{match.abandonReason ? `: ${match.abandonReason}` : ""}
              </p>
            )}
          </section>

          <Divider />

          {/* Officials */}
          <section>
            <SectionTitle>Officials</SectionTitle>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mt-2">
              {match.role === "Center" ? (
                <>
                  <Field label="Referee" value={user.name} />
                  <Field label="Badge Number" value={user.badgeNumber ?? "—"} />
                  <Field label="Grade" value={user.currentGrade ?? "—"} />
                </>
              ) : (
                <>
                  <Field label="Center Referee" value={match.centerRefName ?? "—"} />
                  <Field label="Badge Number" value={match.centerRefBadge ?? "—"} />
                  <Field
                    label={match.role}
                    value={`${user.name}${user.badgeNumber ? ` (${user.badgeNumber})` : ""}`}
                  />
                  <Field label="Grade" value={user.currentGrade ?? "—"} />
                </>
              )}
            </div>
          </section>

          <Divider />

          {/* Match Events */}
          <section>
            <SectionTitle>Match Events</SectionTitle>

            {match.events.length === 0 ? (
              <p className="text-sm text-gray-400 italic mt-2">No events recorded.</p>
            ) : (
              <div className="mt-3 space-y-4">
                {eventsByPeriod.map(({ period, label, events }) => (
                  <div key={period}>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">{label}</h3>
                    <table className="w-full text-sm border-collapse">
                      <tbody>
                        {events.map((ev) => {
                          const detail = ev.detail ? (ev.detail ?? {}) as { reason?: string; description?: string; penalty?: boolean; ownGoal?: boolean; assistName?: string; subOnName?: string; subOnNumber?: string; secondYellow?: boolean } : {};
                          const team = ev.team === "home" ? match.homeTeam : match.awayTeam;
                          const player = [ev.playerNumber ? `#${ev.playerNumber}` : null, ev.playerName].filter(Boolean).join(" ");

                          return (
                            <tr key={ev.id} className="border-t border-gray-100">
                              <td className="py-1.5 pr-3 font-mono text-xs text-gray-500 w-12 align-top">
                                {minuteLabel(ev)}
                              </td>
                              <td className="py-1.5 pr-2 w-5 align-top">
                                {ev.eventType === "goal" && "⚽"}
                                {ev.eventType === "yellow_card" && "🟨"}
                                {ev.eventType === "red_card" && "🟥"}
                                {ev.eventType === "substitution" && "🔄"}
                                {ev.eventType === "injury" && "🏥"}
                                {ev.eventType === "note" && "📝"}
                              </td>
                              <td className="py-1.5 align-top">
                                <span className="font-medium">{team}</span>
                                {player && <span className="text-gray-600"> — {player}</span>}
                                {ev.eventType === "goal" && detail.ownGoal && <span className="text-orange-600"> (Own Goal)</span>}
                                {ev.eventType === "goal" && detail.penalty && <span className="text-blue-600"> (Penalty)</span>}
                                {ev.eventType === "goal" && detail.assistName && (
                                  <span className="text-gray-500"> · Assist: {detail.assistName}</span>
                                )}
                                {(ev.eventType === "yellow_card" || ev.eventType === "red_card") && detail.reason && (
                                  <div className="text-xs text-gray-500">{detail.reason}{detail.secondYellow ? " (2nd caution)" : ""}</div>
                                )}
                                {ev.eventType === "substitution" && detail.subOnName && (
                                  <span className="text-gray-500"> → {detail.subOnName}</span>
                                )}
                                {(ev.eventType === "note" || ev.eventType === "injury") && detail.description && (
                                  <div className="text-xs text-gray-500">{detail.description}</div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Disciplinary Summary */}
          {(yellowCards.length > 0 || redCards.length > 0) && (
            <>
              <Divider />
              <section>
                <SectionTitle>Disciplinary Summary</SectionTitle>
                <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                  <div>
                    <div className="font-semibold mb-1">🟨 Cautions ({yellowCards.length})</div>
                    {yellowCards.length === 0 ? (
                      <p className="text-gray-400 italic">None</p>
                    ) : (
                      <ul className="space-y-1">
                        {yellowCards.map((e) => {
                          const detail = e.detail ? (e.detail ?? {}) as { reason?: string; description?: string; penalty?: boolean; ownGoal?: boolean; assistName?: string; subOnName?: string; subOnNumber?: string; secondYellow?: boolean } : {};
                          const team = e.team === "home" ? match.homeTeam : match.awayTeam;
                          return (
                            <li key={e.id} className="text-gray-700">
                              {minuteLabel(e)} {team}{e.playerName ? ` — ${e.playerName}` : ""}
                              {detail.reason && <div className="text-xs text-gray-500 pl-8">{detail.reason}</div>}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold mb-1">🟥 Send-offs ({redCards.length})</div>
                    {redCards.length === 0 ? (
                      <p className="text-gray-400 italic">None</p>
                    ) : (
                      <ul className="space-y-1">
                        {redCards.map((e) => {
                          const detail = e.detail ? (e.detail ?? {}) as { reason?: string; description?: string; penalty?: boolean; ownGoal?: boolean; assistName?: string; subOnName?: string; subOnNumber?: string; secondYellow?: boolean } : {};
                          const team = e.team === "home" ? match.homeTeam : match.awayTeam;
                          return (
                            <li key={e.id} className="text-gray-700">
                              {minuteLabel(e)} {team}{e.playerName ? ` — ${e.playerName}` : ""}
                              {detail.reason && <div className="text-xs text-gray-500 pl-8">{detail.reason}</div>}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              </section>
            </>
          )}

          {/* Goals Summary */}
          {goals.length > 0 && (
            <>
              <Divider />
              <section>
                <SectionTitle>Goals</SectionTitle>
                <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                  {["home", "away"].map((side) => {
                    const teamGoals = goals.filter((g) => {
                      const detail = g.detail ? (g.detail ?? {}) as { reason?: string; description?: string; penalty?: boolean; ownGoal?: boolean; assistName?: string; subOnName?: string; subOnNumber?: string; secondYellow?: boolean } : {};
                      const scored = detail.ownGoal ? g.team !== side : g.team === side;
                      return scored;
                    });
                    const teamName = side === "home" ? match.homeTeam : match.awayTeam;
                    return (
                      <div key={side}>
                        <div className="font-semibold mb-1">{teamName}</div>
                        {teamGoals.length === 0 ? (
                          <p className="text-gray-400 italic">None</p>
                        ) : (
                          <ul className="space-y-0.5">
                            {teamGoals.map((g) => {
                              const detail = g.detail ? (g.detail ?? {}) as { reason?: string; description?: string; penalty?: boolean; ownGoal?: boolean; assistName?: string; subOnName?: string; subOnNumber?: string; secondYellow?: boolean } : {};
                              return (
                                <li key={g.id} className="text-gray-700">
                                  {minuteLabel(g)}{g.playerName ? ` ${g.playerName}` : ""}
                                  {detail.penalty && " (PK)"}
                                  {detail.ownGoal && " (OG)"}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}

          {/* Narrative */}
          {(match.narrative || notes.length > 0 || injuries.length > 0) && (
            <>
              <Divider />
              <section>
                <SectionTitle>Referee&apos;s Report</SectionTitle>
                {match.narrative && (
                  <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap leading-relaxed">{match.narrative}</p>
                )}
                {injuries.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Injuries</p>
                    <ul className="space-y-1 text-sm text-gray-700">
                      {injuries.map((e) => {
                        const detail = e.detail ? (e.detail ?? {}) as { reason?: string; description?: string; penalty?: boolean; ownGoal?: boolean; assistName?: string; subOnName?: string; subOnNumber?: string; secondYellow?: boolean } : {};
                        const team = e.team === "home" ? match.homeTeam : match.awayTeam;
                        return (
                          <li key={e.id}>
                            {minuteLabel(e)} {team}{e.playerName ? ` — ${e.playerName}` : ""}
                            {detail.description && `: ${detail.description}`}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </section>
            </>
          )}

          <Divider />

          {/* Signature block */}
          <section className="grid grid-cols-2 gap-8 text-sm pt-2">
            <div>
              <div className="border-t border-gray-400 pt-2">
                <p className="font-medium">{user.name}</p>
                <p className="text-gray-500">{match.role === "Center" ? "Referee" : match.role}</p>
                {user.badgeNumber && <p className="text-gray-500">Badge: {user.badgeNumber}</p>}
              </div>
            </div>
            <div>
              <div className="border-t border-gray-400 pt-2">
                <p className="text-gray-400 italic">Date submitted</p>
                <p className="text-gray-700">{format(new Date(), "MMMM d, yyyy")}</p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-gray-900">{value || "—"}</dd>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-bold uppercase tracking-widest text-gray-900 border-b border-gray-200 pb-1">
      {children}
    </h2>
  );
}

function Divider() {
  return <hr className="border-gray-200" />;
}
