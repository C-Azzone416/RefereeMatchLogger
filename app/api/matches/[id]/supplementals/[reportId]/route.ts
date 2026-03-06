import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { SUPPLEMENTAL_STATUSES, getDeadlineDate } from "@/lib/supplementalTypes";

async function getReportAndVerify(matchId: string, reportId: string, userId: string) {
  const match = await db.match.findFirst({ where: { id: matchId, userId } });
  if (!match) return { match: null, report: null };

  const report = await db.supplementalReport.findFirst({
    where: { id: reportId, matchId },
    include: { gameEvent: true },
  });

  return { match, report };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  try {
    const session = await getSession();
    if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, reportId } = await params;
    const { match, report } = await getReportAndVerify(id, reportId, session.userId);

    if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    const destinations = report.submittedTo ? report.submittedTo.split(",") : [];
    const deadline = destinations.length
      ? getDeadlineDate(match.date, destinations).toISOString()
      : null;

    return NextResponse.json({ ...report, deadline });
  } catch (err) {
    console.error("GET /api/matches/[id]/supplementals/[reportId]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  try {
    const session = await getSession();
    if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, reportId } = await params;
    const { match, report } = await getReportAndVerify(id, reportId, session.userId);

    if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    const body = await req.json();

    // Validate status transition if provided
    if (body.status && !SUPPLEMENTAL_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Validate narrative exists if marking complete
    if (body.status === "complete" && !body.narrative && !report.narrative) {
      return NextResponse.json(
        { error: "A narrative is required before marking the report complete" },
        { status: 400 }
      );
    }

    const updated = await db.supplementalReport.update({
      where: { id: reportId },
      data: {
        ...(body.incidentType   !== undefined && { incidentType: body.incidentType }),
        ...(body.team           !== undefined && { team: body.team || null }),
        ...(body.playerName     !== undefined && { playerName: body.playerName || null }),
        ...(body.playerNumber   !== undefined && { playerNumber: body.playerNumber || null }),
        ...(body.officialName   !== undefined && { officialName: body.officialName || null }),
        ...(body.officialRole   !== undefined && { officialRole: body.officialRole || null }),
        ...(body.minute         !== undefined && { minute: body.minute !== null ? Number(body.minute) : null }),
        ...(body.stoppageTime   !== undefined && { stoppageTime: body.stoppageTime ? Number(body.stoppageTime) : null }),
        ...(body.period         !== undefined && { period: body.period || null }),
        ...(body.fieldLocation  !== undefined && { fieldLocation: body.fieldLocation || null }),
        ...(body.offenseCode    !== undefined && { offenseCode: body.offenseCode || null }),
        ...(body.narrative      !== undefined && { narrative: body.narrative || null }),
        ...(body.details        !== undefined && { details: body.details ? JSON.stringify(body.details) : null }),
        ...(body.status         !== undefined && { status: body.status }),
        ...(body.submittedTo    !== undefined && { submittedTo: body.submittedTo || null }),
        // Set submittedAt when transitioning to submitted (status = "complete" + submittedTo set)
        ...(body.submittedTo && body.status === "complete" && { submittedAt: new Date() }),
      },
      include: { gameEvent: true },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/matches/[id]/supplementals/[reportId]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  try {
    const session = await getSession();
    if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, reportId } = await params;
    const { match, report } = await getReportAndVerify(id, reportId, session.userId);

    if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    await db.supplementalReport.delete({ where: { id: reportId } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/matches/[id]/supplementals/[reportId]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
