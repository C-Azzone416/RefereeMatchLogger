import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { format } from "date-fns";
import {
  INCIDENT_TYPE_LABELS,
  getDeadlineDate,
  type IncidentType,
} from "@/lib/supplementalTypes";

function DeadlineBadge({ deadline }: { deadline: Date | null }) {
  if (!deadline) return null;
  const now = new Date();
  const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
  const overdue = hoursLeft < 0;
  const urgent = !overdue && hoursLeft < 6;

  return (
    <span
      className={`text-xs px-1.5 py-0.5 rounded font-medium ${
        overdue
          ? "bg-red-100 text-red-700"
          : urgent
          ? "bg-orange-100 text-orange-700"
          : "bg-gray-100 text-gray-500"
      }`}
    >
      {overdue
        ? `Overdue ${format(deadline, "MMM d")}`
        : `Due ${format(deadline, "MMM d, h:mm a")}`}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`text-xs px-1.5 py-0.5 rounded font-medium uppercase tracking-wide ${
        status === "complete"
          ? "bg-green-100 text-green-700"
          : "bg-yellow-100 text-yellow-700"
      }`}
    >
      {status}
    </span>
  );
}

export default async function SupplementalsListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session.userId) redirect("/login");

  const { id } = await params;
  const match = await db.match.findFirst({
    where: { id, userId: session.userId },
  });
  if (!match) redirect("/dashboard");

  const reports = await db.supplementalReport.findMany({
    where: { matchId: id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-brand-800 text-white px-4 pt-4 pb-6 pitch-bg">
        <div className="flex items-center gap-3 mb-4">
          <Link href={`/matches/${id}`} className="text-brand-300 text-sm">
            ← Match Detail
          </Link>
        </div>
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-bold">Supplemental Reports</h1>
          <p className="text-brand-300 text-sm mt-1">
            {match.homeTeam} vs {match.awayTeam}
          </p>
        </div>
      </header>

      <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">
        <Link
          href={`/matches/${id}/supplementals/new`}
          className="btn-primary w-full text-center block"
        >
          + New Supplemental Report
        </Link>

        {reports.length === 0 ? (
          <div className="card text-center py-8 text-gray-400 text-sm">
            No supplemental reports yet.
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => {
              const destinations = report.submittedTo
                ? report.submittedTo.split(",")
                : [];
              const deadline =
                destinations.length > 0
                  ? getDeadlineDate(match.date, destinations)
                  : null;

              const who =
                report.playerName ||
                report.officialName ||
                (report.playerNumber ? `#${report.playerNumber}` : null);

              const when =
                report.minute != null
                  ? report.stoppageTime
                    ? `${report.minute}+${report.stoppageTime}'`
                    : `${report.minute}'`
                  : null;

              return (
                <Link
                  key={report.id}
                  href={`/matches/${id}/supplementals/${report.id}`}
                  className="card block hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900">
                        {INCIDENT_TYPE_LABELS[report.incidentType as IncidentType] ??
                          report.incidentType}
                      </div>
                      {(who || when) && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          {[who, when].filter(Boolean).join(" · ")}
                        </div>
                      )}
                      {report.narrative && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                          {report.narrative}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <StatusBadge status={report.status} />
                      <DeadlineBadge deadline={deadline} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
