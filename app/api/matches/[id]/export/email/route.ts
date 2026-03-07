import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { sendMatchReportEmail } from "@/lib/email";

const schema = z.object({
  to: z.string().email("Invalid email address"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    await sendMatchReportEmail(to, match, user);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/matches/[id]/export/email:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
