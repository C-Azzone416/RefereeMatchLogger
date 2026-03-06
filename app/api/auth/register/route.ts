import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { name, email, password, badgeNumber, currentGrade, state } = await req.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email, and password required" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await db.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      badgeNumber: badgeNumber || null,
      currentGrade: currentGrade || "Grassroots",
      state: state || null,
    },
  });

  const session = await getSession();
  session.userId = user.id;
  session.userName = user.name;
  await session.save();

  return NextResponse.json({ ok: true });
}
