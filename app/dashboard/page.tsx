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

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const recentCount = allMatches.filter((m) => new Date(m.date) >= ninetyDaysAgo).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-brand-600 text-white px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg">RefereeMatchTracker</h1>
          <p className="text-brand-100 text-xs">{session.userName}</p>
        </div>
        <Link href="/profile" className="text-brand-100 text-sm">Profile</Link>
      </header>

      <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
        {/* Quick action */}
        <Link href="/matches/new" className="btn-primary w-full text-center block text-lg py-4">
          + Log New Match
        </Link>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card text-center">
            <div className="text-2xl font-bold text-brand-600">{allMatches.length}</div>
            <div className="text-xs text-gray-500 mt-1">Total Matches</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-brand-600">{centerCount}</div>
            <div className="text-xs text-gray-500 mt-1">As Center</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-brand-600">{arCount}</div>
            <div className="text-xs text-gray-500 mt-1">As AR</div>
          </div>
        </div>

        <div className="card text-center">
          <div className="text-xl font-bold text-gray-700">{recentCount}</div>
          <div className="text-xs text-gray-500 mt-1">Matches in Last 90 Days</div>
        </div>

        {/* Recent matches */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Recent Matches</h2>
            <Link href="/matches" className="text-brand-600 text-sm">View all</Link>
          </div>

          {matches.length === 0 ? (
            <div className="card text-center py-8 text-gray-400">
              <p>No matches yet.</p>
              <p className="text-sm mt-1">Log your first match to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map((match) => (
                <Link key={match.id} href={`/matches/${match.id}`} className="card flex items-center justify-between active:bg-gray-50">
                  <div>
                    <div className="font-medium text-gray-900">
                      {match.homeTeam} vs {match.awayTeam}
                    </div>
                    <div className="text-sm text-gray-500">
                      {format(new Date(match.date), "MMM d, yyyy")} · {match.ageGroup} {match.gender}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {match.role} · {match.competitionLevel}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">{match.homeScore}–{match.awayScore}</div>
                    <div className="text-xs text-gray-400">{match.competitionName}</div>
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
