import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

const MAX_ATTEMPTS = 3;

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function POST(req: NextRequest) {
  const { email, code } = await req.json();

  if (!email || !code) {
    return NextResponse.json({ error: "Email and code required" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });

  if (!user) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  if (user.emailVerified) {
    return NextResponse.json({ error: "Email already verified" }, { status: 400 });
  }

  if (!user.emailVerificationCode || !user.emailVerificationExpiry) {
    return NextResponse.json({ error: "No verification code found. Please request a new one." }, { status: 400 });
  }

  if (user.emailVerificationAttempts >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "Too many incorrect attempts. Please request a new code.", tooManyAttempts: true },
      { status: 400 }
    );
  }

  if (new Date() > user.emailVerificationExpiry) {
    return NextResponse.json(
      { error: "Verification code has expired. Please request a new one.", expired: true },
      { status: 400 }
    );
  }

  const codeHash = hashCode(String(code).trim());
  if (codeHash !== user.emailVerificationCode) {
    await db.user.update({
      where: { id: user.id },
      data: { emailVerificationAttempts: { increment: 1 } },
    });
    const attemptsLeft = MAX_ATTEMPTS - (user.emailVerificationAttempts + 1);
    return NextResponse.json(
      { error: `Incorrect code. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} remaining.` },
      { status: 400 }
    );
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerificationCode: null,
      emailVerificationExpiry: null,
      emailVerificationAttempts: 0,
      emailVerificationSentAt: null,
    },
  });

  const session = await getSession();
  session.userId = user.id;
  session.userName = user.name;
  await session.save();

  return NextResponse.json({ ok: true });
}
