import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { INCIDENT_TYPE_LABELS, type IncidentType } from "@/lib/supplementalTypes";
import SupplementalForm from "../SupplementalForm";

export default async function EditSupplementalPage({
  params,
}: {
  params: Promise<{ id: string; reportId: string }>;
}) {
  const session = await getSession();
  if (!session.userId) redirect("/login");

  const { id, reportId } = await params;
  const match = await db.match.findFirst({
    where: { id, userId: session.userId },
  });
  if (!match) redirect("/dashboard");

  const report = await db.supplementalReport.findFirst({
    where: { id: reportId, matchId: id },
  });
  if (!report) redirect(`/matches/${id}/supplementals`);

  const title =
    INCIDENT_TYPE_LABELS[report.incidentType as IncidentType] ?? report.incidentType;

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
          <h1 className="text-xl font-bold">{title}</h1>
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
          initialData={{
            id: report.id,
            incidentType: report.incidentType,
            team: report.team,
            playerName: report.playerName,
            playerNumber: report.playerNumber,
            officialName: report.officialName,
            officialRole: report.officialRole,
            minute: report.minute,
            stoppageTime: report.stoppageTime,
            period: report.period,
            fieldLocation: report.fieldLocation,
            offenseCode: report.offenseCode,
            narrative: report.narrative,
            details: report.details as Record<string, unknown> | null,
            status: report.status,
            submittedTo: report.submittedTo,
          }}
        />
      </div>
    </div>
  );
}
