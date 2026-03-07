import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    badgeNumber: user.badgeNumber,
    grade: user.currentGrade,
    state: user.state,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, email, badgeNumber, currentGrade, state, currentPassword, newPassword } = body;

  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Check if email is taken by another user
  if (email.toLowerCase() !== user.email) {
    const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: "That email is already in use" }, { status: 409 });
    }
  }

  // Handle password change
  let passwordHash = user.passwordHash;
  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json({ error: "Current password is required to set a new one" }, { status: 400 });
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }
    passwordHash = await bcrypt.hash(newPassword, 12);
  }

  const updated = await db.user.update({
    where: { id: session.userId },
    data: {
      name,
      email: email.toLowerCase(),
      badgeNumber: badgeNumber || null,
      currentGrade: currentGrade || null,
      state: state || null,
      passwordHash,
    },
  });

  // Update session name if it changed
  if (updated.name !== session.userName) {
    session.userName = updated.name;
    await session.save();
  }

  return NextResponse.json({ ok: true });
}
