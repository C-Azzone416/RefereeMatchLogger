import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";

function generateCode(): string {
  return String(crypto.randomInt(100000, 999999));
}

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

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
  const code = generateCode();
  const expiry = new Date(Date.now() + 15 * 60 * 1000);

  await db.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      badgeNumber: badgeNumber || null,
      currentGrade: currentGrade || "Grassroots",
      state: state || null,
      emailVerified: false,
      emailVerificationCode: hashCode(code),
      emailVerificationExpiry: expiry,
      emailVerificationAttempts: 0,
      emailVerificationSentAt: new Date(),
    },
  });

  await sendVerificationEmail(email.toLowerCase(), code);

  return NextResponse.json({ ok: true, emailVerified: false });
}
