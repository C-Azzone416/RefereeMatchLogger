import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { format } from "date-fns";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session.userId) redirect("/login");

  const matches = await db.match.findMany({
    where: { userId: session.userId },
    orderBy: { date: "desc" },
    take: 10,
  });

  const allMatches = await db.match.findMany({
    where: { userId: session.userId },
    select: { role: true, ageGroup: true, competitionLevel: true, date: true },
  });

  const centerCount = allMatches.filter((m) => m.role === "Center").length;
  const arCount = allMatches.filter((m) => m.role !== "Center").length;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentCount = allMatches.filter((m) => new Date(m.date) >= thirtyDaysAgo).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-brand-800 text-white px-4 py-4 flex items-center justify-between pitch-bg">
        <div>
          <h1 className="font-black text-xl tracking-tight">RefereeMatchTracker</h1>
          <p className="text-brand-100 text-xs mt-0.5">{session.userName}</p>
        </div>
        <Link href="/profile" className="text-brand-200 text-sm font-medium">Profile</Link>
      </header>

      <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
        {/* Quick action */}
        <Link href="/matches/new" className="btn-primary w-full text-center block text-base py-4">
          + Log New Match
        </Link>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-brand-800 rounded-xl p-4 text-center text-white pitch-bg">
            <div className="text-3xl font-black tabular-nums">{allMatches.length}</div>
            <div className="text-[10px] text-brand-100 uppercase tracking-widest mt-1">Total</div>
          </div>
          <div className="bg-brand-800 rounded-xl p-4 text-center text-white pitch-bg">
            <div className="text-3xl font-black tabular-nums">{centerCount}</div>
            <div className="text-[10px] text-brand-100 uppercase tracking-widest mt-1">Center</div>
          </div>
          <div className="bg-brand-800 rounded-xl p-4 text-center text-white pitch-bg">
            <div className="text-3xl font-black tabular-nums">{arCount}</div>
            <div className="text-[10px] text-brand-100 uppercase tracking-widest mt-1">As AR</div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 text-center text-white">
          <div className="text-2xl font-black tabular-nums">{recentCount}</div>
          <div className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Last 30 Days</div>
        </div>

        {/* Recent matches */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-gray-900 uppercase tracking-wide text-sm">Recent Matches</h2>
            <Link href="/matches" className="text-brand-600 text-sm font-medium">View all →</Link>
          </div>

          {matches.length === 0 ? (
            <div className="card text-center py-8 text-gray-400">
              <p>No matches yet.</p>
              <p className="text-sm mt-1">Log your first match to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map((match) => (
                <Link key={match.id} href={`/matches/${match.id}`} className="card block active:bg-gray-50">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-bold text-gray-900 flex-1 truncate text-sm">{match.homeTeam}</span>
                    <span className="font-black text-brand-700 tabular-nums text-xl px-2 shrink-0">{match.homeScore}–{match.awayScore}</span>
                    <span className="font-bold text-gray-900 flex-1 text-right truncate text-sm">{match.awayTeam}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{format(new Date(match.date), "MMM d, yyyy")} · {match.ageGroup} {match.gender}</span>
                    <span className="bg-gray-100 rounded px-1.5 py-0.5 font-medium text-gray-500">{match.role}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
