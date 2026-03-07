import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";

const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds

function generateCode(): string {
  return String(crypto.randomInt(100000, 999999));
}

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });

  // Return success even if user not found to avoid email enumeration
  if (!user || user.emailVerified) {
    return NextResponse.json({ ok: true });
  }

  if (user.emailVerificationSentAt) {
    const elapsed = Date.now() - user.emailVerificationSentAt.getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      const secondsLeft = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      return NextResponse.json(
        { error: `Please wait ${secondsLeft} seconds before requesting another code.` },
        { status: 429 }
      );
    }
  }

  const code = generateCode();
  const expiry = new Date(Date.now() + 15 * 60 * 1000);

  await db.user.update({
    where: { id: user.id },
    data: {
      emailVerificationCode: hashCode(code),
      emailVerificationExpiry: expiry,
      emailVerificationAttempts: 0,
      emailVerificationSentAt: new Date(),
    },
  });

  await sendVerificationEmail(email.toLowerCase(), code);

  return NextResponse.json({ ok: true });
}
