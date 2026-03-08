import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { sendSupplementalReportEmail } from "@/lib/email";

const schema = z.object({
  to: z.string().email("Invalid email address"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  try {
    const session = await getSession();
    if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }
    const { to } = parsed.data;

    const { id, reportId } = await params;

    const [match, user] = await Promise.all([
      db.match.findFirst({ where: { id, userId: session.userId } }),
      db.user.findUnique({
        where: { id: session.userId },
        select: { name: true, badgeNumber: true, currentGrade: true, state: true },
      }),
    ]);

    if (!match || !user) return NextResponse.json({ error: "Match not found" }, { status: 404 });

    const report = await db.supplementalReport.findFirst({
      where: { id: reportId, matchId: id },
      include: { gameEvent: true },
    });

    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    await sendSupplementalReportEmail(to, report, match, user);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/matches/[id]/supplementals/[reportId]/export/email:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
