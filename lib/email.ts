import nodemailer from "nodemailer";
import type { Match, GameEvent } from "@prisma/client";
import { format } from "date-fns";

type MatchWithEvents = Match & { events: GameEvent[] };
type ReportUser = { name: string; badgeNumber: string | null; currentGrade: string | null; state: string | null };

type EventDetail = {
  reason?: string;
  description?: string;
  penalty?: boolean;
  ownGoal?: boolean;
  assistName?: string;
  subOnName?: string;
  secondYellow?: boolean;
};

function esc(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function minuteLabel(e: { minute: number; stoppageTime: number | null }): string {
  return e.stoppageTime ? `${e.minute}+${e.stoppageTime}'` : `${e.minute}'`;
}

const PERIOD_LABELS: Record<string, string> = {
  "1": "First Half",
  "2": "Second Half",
  "et1": "Extra Time – First Half",
  "et2": "Extra Time – Second Half",
  "penalties": "Penalty Shootout",
};

const EVENT_ICONS: Record<string, string> = {
  goal: "⚽",
  yellow_card: "🟨",
  red_card: "🟥",
  substitution: "🔄",
  injury: "🏥",
  note: "📝",
};

function buildReportHtml(match: MatchWithEvents, user: ReportUser): string {
  const dateStr = format(new Date(match.date), "MMMM d, yyyy");
  const timeStr = format(new Date(match.date), "h:mm a");

  const ALL_PERIODS = ["1", "2", "et1", "et2", "penalties"];
  const periods = match.overtimePossible ? ALL_PERIODS : ALL_PERIODS.slice(0, 2);

  const eventsByPeriod = periods
    .map((p) => ({ period: p, label: PERIOD_LABELS[p], events: match.events.filter((e) => e.period === p) }))
    .filter((g) => g.events.length > 0);

  const yellowCards = match.events.filter((e) => e.eventType === "yellow_card");
  const redCards = match.events.filter((e) => e.eventType === "red_card");

  const cell = (content: string) =>
    `<td style="padding:6px 12px 6px 0;font-size:14px;vertical-align:top;border-bottom:1px solid #f0f0f0;">${content}</td>`;

  const eventsHtml = eventsByPeriod
    .map(({ label, events }) => {
      const rows = events
        .map((ev) => {
          const detail = (ev.detail ?? {}) as EventDetail;
          const team = ev.team === "home" ? esc(match.homeTeam) : esc(match.awayTeam);
          const player = [ev.playerNumber ? `#${esc(ev.playerNumber)}` : null, esc(ev.playerName)]
            .filter(Boolean)
            .join(" ");
          const icon = EVENT_ICONS[ev.eventType] ?? "";

          let desc = `<strong>${team}</strong>`;
          if (player) desc += ` — ${player}`;
          if (ev.eventType === "goal" && detail.ownGoal) desc += ` <span style="color:#c2410c">(Own Goal)</span>`;
          if (ev.eventType === "goal" && detail.penalty) desc += ` <span style="color:#1d4ed8">(Penalty)</span>`;
          if (ev.eventType === "goal" && detail.assistName)
            desc += ` · Assist: ${esc(detail.assistName)}`;
          if ((ev.eventType === "yellow_card" || ev.eventType === "red_card") && detail.reason)
            desc += `<br><span style="color:#666;font-size:12px;">${esc(detail.reason)}${detail.secondYellow ? " (2nd caution)" : ""}</span>`;
          if (ev.eventType === "substitution" && detail.subOnName)
            desc += ` → ${esc(detail.subOnName)}`;
          if ((ev.eventType === "note" || ev.eventType === "injury") && detail.description)
            desc += `<br><span style="color:#666;font-size:12px;">${esc(detail.description)}</span>`;

          return `<tr>${cell(`<span style="font-family:monospace;color:#888;">${minuteLabel(ev)}</span>`)}${cell(icon)}${cell(desc)}</tr>`;
        })
        .join("");

      return `
        <p style="font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;color:#888;margin:16px 0 4px;">${esc(label)}</p>
        <table style="width:100%;border-collapse:collapse;">${rows}</table>`;
    })
    .join("");

  const disciplinaryHtml =
    yellowCards.length > 0 || redCards.length > 0
      ? `
    <tr><td colspan="2" style="padding:16px 0 4px;"><strong style="font-size:13px;text-transform:uppercase;letter-spacing:1px;">Disciplinary Summary</strong></td></tr>
    <tr><td style="padding:4px 24px 4px 0;font-size:14px;vertical-align:top;">
      <strong>🟨 Cautions (${yellowCards.length})</strong><br>
      ${yellowCards.length === 0 ? "<em style='color:#999'>None</em>" : yellowCards.map((e) => {
        const detail = (e.detail ?? {}) as EventDetail;
        const team = e.team === "home" ? esc(match.homeTeam) : esc(match.awayTeam);
        return `${minuteLabel(e)} ${team}${e.playerName ? ` — ${esc(e.playerName)}` : ""}${detail.reason ? `<br><span style='color:#666;font-size:12px;padding-left:16px;'>${esc(detail.reason)}</span>` : ""}`;
      }).join("<br>")}
    </td><td style="padding:4px 0;font-size:14px;vertical-align:top;">
      <strong>🟥 Send-offs (${redCards.length})</strong><br>
      ${redCards.length === 0 ? "<em style='color:#999'>None</em>" : redCards.map((e) => {
        const detail = (e.detail ?? {}) as EventDetail;
        const team = e.team === "home" ? esc(match.homeTeam) : esc(match.awayTeam);
        return `${minuteLabel(e)} ${team}${e.playerName ? ` — ${esc(e.playerName)}` : ""}${detail.reason ? `<br><span style='color:#666;font-size:12px;padding-left:16px;'>${esc(detail.reason)}</span>` : ""}`;
      }).join("<br>")}
    </td></tr>`
      : "";

  const narrativeHtml = match.narrative
    ? `<tr><td colspan="2" style="padding:16px 0 4px;"><strong style="font-size:13px;text-transform:uppercase;letter-spacing:1px;">Referee's Report</strong></td></tr>
       <tr><td colspan="2" style="padding:4px 0;font-size:14px;white-space:pre-wrap;color:#333;">${esc(match.narrative)}</td></tr>`
    : "";

  const officialsHtml =
    match.role === "Center"
      ? `<tr>${cell("Referee")}<td style="padding:4px 0;font-size:14px;">${esc(user.name)}${user.badgeNumber ? ` (Badge: ${esc(user.badgeNumber)})` : ""}</td></tr>
         <tr>${cell("Grade")}<td style="padding:4px 0;font-size:14px;">${esc(user.currentGrade) || "—"}</td></tr>`
      : `<tr>${cell("Center Referee")}<td style="padding:4px 0;font-size:14px;">${esc(match.centerRefName) || "—"}${match.centerRefBadge ? ` (Badge: ${esc(match.centerRefBadge)})` : ""}</td></tr>
         <tr>${cell(esc(match.role))}<td style="padding:4px 0;font-size:14px;">${esc(user.name)}${user.badgeNumber ? ` (Badge: ${esc(user.badgeNumber)})` : ""}</td></tr>
         <tr>${cell("Grade")}<td style="padding:4px 0;font-size:14px;">${esc(user.currentGrade) || "—"}</td></tr>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

  <!-- Header -->
  <tr><td style="background:#15803d;padding:24px 32px;text-align:center;">
    <h1 style="margin:0;color:#fff;font-size:20px;letter-spacing:2px;text-transform:uppercase;">Official Match Report</h1>
    <p style="margin:4px 0 0;color:#bbf7d0;font-size:13px;">US Soccer${user.state ? ` — ${esc(user.state)}` : ""}</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:32px;">

    <!-- Match details -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border-bottom:2px solid #eee;padding-bottom:24px;">
      <tr>
        <td style="padding:4px 24px 4px 0;font-size:13px;color:#888;font-weight:bold;text-transform:uppercase;width:140px;">Competition</td>
        <td style="padding:4px 0;font-size:14px;">${esc(match.competitionName)}</td>
      </tr>
      <tr>
        <td style="padding:4px 24px 4px 0;font-size:13px;color:#888;font-weight:bold;text-transform:uppercase;">Date</td>
        <td style="padding:4px 0;font-size:14px;">${esc(dateStr)} at ${esc(timeStr)}</td>
      </tr>
      <tr>
        <td style="padding:4px 24px 4px 0;font-size:13px;color:#888;font-weight:bold;text-transform:uppercase;">Age / Gender</td>
        <td style="padding:4px 0;font-size:14px;">${esc(match.ageGroup)} ${esc(match.gender)}</td>
      </tr>
      <tr>
        <td style="padding:4px 24px 4px 0;font-size:13px;color:#888;font-weight:bold;text-transform:uppercase;">Level</td>
        <td style="padding:4px 0;font-size:14px;">${esc(match.competitionLevel)}</td>
      </tr>
      <tr>
        <td style="padding:4px 24px 4px 0;font-size:13px;color:#888;font-weight:bold;text-transform:uppercase;">Venue</td>
        <td style="padding:4px 0;font-size:14px;">${esc(match.venue)}${match.field ? `, ${esc(match.field)}` : ""}</td>
      </tr>
    </table>

    <!-- Score -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border-bottom:2px solid #eee;padding-bottom:24px;">
      <tr>
        <td style="text-align:center;width:40%;">
          <div style="font-size:18px;font-weight:bold;">${esc(match.homeTeam)}</div>
          <div style="font-size:12px;color:#999;">Home</div>
        </td>
        <td style="text-align:center;width:20%;">
          <div style="font-size:36px;font-weight:900;font-family:monospace;">${match.homeScore}–${match.awayScore}</div>
          ${match.halfTimeHomeScore !== null ? `<div style="font-size:12px;color:#999;">HT: ${match.halfTimeHomeScore}–${match.halfTimeAwayScore}</div>` : ""}
          ${match.overtimePossible && match.extraTime ? `<div style="font-size:11px;color:#999;">After extra time</div>` : ""}
          ${match.overtimePossible && match.penalties ? `<div style="font-size:11px;color:#999;">After penalties</div>` : ""}
        </td>
        <td style="text-align:center;width:40%;">
          <div style="font-size:18px;font-weight:bold;">${esc(match.awayTeam)}</div>
          <div style="font-size:12px;color:#999;">Away</div>
        </td>
      </tr>
      ${match.matchAbandoned ? `<tr><td colspan="3" style="text-align:center;padding-top:8px;color:#dc2626;font-size:14px;font-weight:bold;">⚠ Match Abandoned${match.abandonReason ? `: ${esc(match.abandonReason)}` : ""}</td></tr>` : ""}
    </table>

    <!-- Officials -->
    <p style="font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#333;margin:0 0 8px;">Officials</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border-bottom:2px solid #eee;padding-bottom:24px;">
      ${officialsHtml}
    </table>

    <!-- Events -->
    ${match.events.length > 0 ? `
    <p style="font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#333;margin:0 0 4px;">Match Events</p>
    ${eventsHtml}
    <div style="border-bottom:2px solid #eee;margin:16px 0;"></div>` : ""}

    <!-- Disciplinary / Narrative -->
    <table width="100%" cellpadding="0" cellspacing="0">
      ${disciplinaryHtml}
      ${narrativeHtml}
    </table>

    <!-- Footer -->
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:12px;color:#999;text-align:center;">
      Generated by Referee Match Tracker · Sent ${format(new Date(), "MMMM d, yyyy")}
    </div>

  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function buildReportText(match: MatchWithEvents, user: ReportUser): string {
  const dateStr = format(new Date(match.date), "MMMM d, yyyy");
  const timeStr = format(new Date(match.date), "h:mm a");

  const ALL_PERIODS = ["1", "2", "et1", "et2", "penalties"];
  const periods = match.overtimePossible ? ALL_PERIODS : ALL_PERIODS.slice(0, 2);

  const eventsByPeriod = periods
    .map((p) => ({ period: p, label: PERIOD_LABELS[p], events: match.events.filter((e) => e.period === p) }))
    .filter((g) => g.events.length > 0);

  const lines: string[] = [
    "OFFICIAL MATCH REPORT",
    "=====================",
    "",
    `Competition: ${match.competitionName}`,
    `Date: ${dateStr} at ${timeStr}`,
    `Age / Gender: ${match.ageGroup} ${match.gender}`,
    `Level: ${match.competitionLevel}`,
    `Venue: ${match.venue}${match.field ? `, ${match.field}` : ""}`,
    "",
    `${match.homeTeam}  ${match.homeScore} – ${match.awayScore}  ${match.awayTeam}`,
    match.halfTimeHomeScore !== null ? `Half-time: ${match.halfTimeHomeScore} – ${match.halfTimeAwayScore}` : "",
    match.matchAbandoned ? `MATCH ABANDONED${match.abandonReason ? `: ${match.abandonReason}` : ""}` : "",
    "",
    "OFFICIALS",
    "---------",
  ];

  if (match.role === "Center") {
    lines.push(`Referee: ${user.name}${user.badgeNumber ? ` (Badge: ${user.badgeNumber})` : ""}`);
  } else {
    lines.push(`Center Referee: ${match.centerRefName || "—"}${match.centerRefBadge ? ` (Badge: ${match.centerRefBadge})` : ""}`);
    lines.push(`${match.role}: ${user.name}${user.badgeNumber ? ` (Badge: ${user.badgeNumber})` : ""}`);
  }
  lines.push(`Grade: ${user.currentGrade || "—"}`);

  if (match.events.length > 0) {
    lines.push("", "MATCH EVENTS", "------------");
    for (const { label, events } of eventsByPeriod) {
      lines.push(`\n${label}:`);
      for (const ev of events) {
        const detail = (ev.detail ?? {}) as EventDetail;
        const team = ev.team === "home" ? match.homeTeam : match.awayTeam;
        const player = [ev.playerNumber ? `#${ev.playerNumber}` : null, ev.playerName].filter(Boolean).join(" ");
        let line = `  ${minuteLabel(ev)}  ${EVENT_ICONS[ev.eventType] ?? ""}  ${team}${player ? ` — ${player}` : ""}`;
        if (ev.eventType === "goal" && detail.ownGoal) line += " (OG)";
        if (ev.eventType === "goal" && detail.penalty) line += " (PK)";
        if (ev.eventType === "goal" && detail.assistName) line += ` · Assist: ${detail.assistName}`;
        if ((ev.eventType === "yellow_card" || ev.eventType === "red_card") && detail.reason)
          line += `\n    Reason: ${detail.reason}${detail.secondYellow ? " (2nd caution)" : ""}`;
        if (ev.eventType === "substitution" && detail.subOnName) line += ` → ${detail.subOnName}`;
        if ((ev.eventType === "note" || ev.eventType === "injury") && detail.description)
          line += `\n    ${detail.description}`;
        lines.push(line);
      }
    }
  }

  if (match.narrative) {
    lines.push("", "REFEREE'S REPORT", "----------------", match.narrative);
  }

  lines.push("", `Generated by Referee Match Tracker · Sent ${format(new Date(), "MMMM d, yyyy")}`);

  return lines.filter((l) => l !== undefined).join("\n");
}

export async function sendMatchReportEmail(to: string, match: MatchWithEvents, user: ReportUser) {
  const subject = `Match Report: ${match.homeTeam} vs ${match.awayTeam} — ${format(new Date(match.date), "MMM d, yyyy")}`;
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    text: buildReportText(match, user),
    html: buildReportHtml(match, user),
  });
}

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
