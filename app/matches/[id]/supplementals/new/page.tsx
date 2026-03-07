import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import SupplementalForm from "../SupplementalForm";

export default async function NewSupplementalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getSession();
  if (!session.userId) redirect("/login");

  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const match = await db.match.findFirst({
    where: { id, userId: session.userId },
  });
  if (!match) redirect("/dashboard");

  const prefill = {
    gameEventId: sp.eventId,
    incidentType: sp.incidentType ?? (sp.eventId ? "send_off" : undefined),
    team: sp.team,
    playerName: sp.playerName,
    playerNumber: sp.playerNumber,
    minute: sp.minute,
    stoppageTime: sp.stoppageTime,
    period: sp.period,
    offenseCode: sp.offenseCode,
  };

  const hasPrefill = Object.values(prefill).some(Boolean);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-brand-800 text-white px-4 pt-4 pb-6 pitch-bg">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href={`/matches/${id}/supplementals`}
            className="text-brand-300 text-sm"
          >
            ← Supplemental Reports
          </Link>
        </div>
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-bold">New Supplemental Report</h1>
          <p className="text-brand-300 text-sm mt-1">
            {match.homeTeam} vs {match.awayTeam}
          </p>
        </div>
      </header>

      <div className="px-4 py-5 max-w-lg mx-auto">
        <SupplementalForm
          matchId={id}
          homeTeam={match.homeTeam}
          awayTeam={match.awayTeam}
          prefill={hasPrefill ? prefill : undefined}
        />
      </div>
    </div>
  );
}
