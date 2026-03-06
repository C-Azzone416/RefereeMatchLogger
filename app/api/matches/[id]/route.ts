import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const match = await db.match.findFirst({
      where: { id, userId: session.userId },
      include: { events: { orderBy: { createdAt: "asc" } }, players: true },
    });

    if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(match);
  } catch (err) {
    console.error("GET /api/matches/[id]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const match = await db.match.findFirst({ where: { id, userId: session.userId } });
    if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();

    const updated = await db.match.update({
      where: { id },
      data: {
        ...(body.homeScore !== undefined && { homeScore: Number(body.homeScore) }),
        ...(body.awayScore !== undefined && { awayScore: Number(body.awayScore) }),
        ...(body.halfTimeHomeScore !== undefined && { halfTimeHomeScore: Number(body.halfTimeHomeScore) }),
        ...(body.halfTimeAwayScore !== undefined && { halfTimeAwayScore: Number(body.halfTimeAwayScore) }),
        ...(body.narrative !== undefined && { narrative: body.narrative }),
        ...(body.matchAbandoned !== undefined && { matchAbandoned: body.matchAbandoned }),
        ...(body.abandonReason !== undefined && { abandonReason: body.abandonReason }),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/matches/[id]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const match = await db.match.findFirst({ where: { id, userId: session.userId } });
    if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.match.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/matches/[id]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
