import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";

const RESET_COOLDOWN_MS = 60 * 1000; // 60 seconds between requests

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });

  // Do not reveal whether the email exists in the response
  if (!user || !user.emailVerified) {
    return NextResponse.json({ ok: true });
  }

  // Cooldown: prevent flooding (full rate limiting tracked in issue #20)
  if (user.passwordResetExpiry) {
    const tokenAge = Date.now() - (user.passwordResetExpiry.getTime() - 60 * 60 * 1000);
    if (tokenAge < RESET_COOLDOWN_MS) {
      // Return success to avoid timing-based enumeration
      return NextResponse.json({ ok: true });
    }
  }

  const token = generateToken();
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: hashToken(token),
      passwordResetExpiry: expiry,
    },
  });

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  await sendPasswordResetEmail(user.email, resetUrl);

  return NextResponse.json({ ok: true });
}
