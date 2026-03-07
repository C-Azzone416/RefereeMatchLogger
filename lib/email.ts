import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: "Reset your Referee Match Tracker password",
    text: `You requested a password reset.\n\nClick the link below to set a new password. This link expires in 1 hour.\n\n${resetUrl}\n\nIf you didn't request this, you can ignore this email — your password has not been changed.`,
    html: `
      <p>You requested a password reset.</p>
      <p><a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#16a34a;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Reset Password</a></p>
      <p>This link expires in <strong>1 hour</strong>.</p>
      <p style="color:#666;font-size:14px;">If the button doesn't work, copy and paste this URL into your browser:</p>
      <p style="color:#666;font-size:12px;word-break:break-all;">${resetUrl}</p>
      <p style="color:#666;font-size:14px;">If you didn't request a password reset, you can ignore this email — your password has not been changed.</p>
    `,
  });
}

export async function sendVerificationEmail(to: string, code: string) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: "Verify your Referee Match Tracker account",
    text: `Your verification code is: ${code}\n\nThis code expires in 15 minutes. Check your junk folder if you don't see this email.`,
    html: `
      <p>Your verification code is:</p>
      <h2 style="letter-spacing: 4px; font-size: 32px;">${code}</h2>
      <p>This code expires in <strong>15 minutes</strong>.</p>
      <p style="color: #666; font-size: 14px;">If you didn't create a Referee Match Tracker account, you can ignore this email.</p>
      <p style="color: #666; font-size: 14px;">Can't find this email? Check your junk or spam folder.</p>
    `,
  });
}
