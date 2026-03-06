"use client";

import { useState } from "react";

export default function MatchReportActions({ matchId }: { matchId: string }) {
  const [email, setEmail] = useState("");
  const [showEmail, setShowEmail] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setMessage("");

    const res = await fetch(`/api/matches/${matchId}/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: email }),
    });

    if (res.ok) {
      setMessage("Report sent!");
      setShowEmail(false);
      setEmail("");
    } else {
      setMessage("Failed to send. Check email configuration.");
    }
    setSending(false);
  }

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-gray-900">Export Report</h2>

      <a
        href={`/api/matches/${matchId}/pdf`}
        target="_blank"
        className="btn-secondary w-full text-center block"
      >
        Download PDF
      </a>

      <a
        href={`/api/matches/${matchId}/arbiter`}
        download
        className="btn-secondary w-full text-center block"
      >
        Download Arbiter CSV
      </a>

      <button
        onClick={() => setShowEmail((v) => !v)}
        className="btn-secondary w-full"
      >
        Email Report
      </button>

      {showEmail && (
        <form onSubmit={handleEmail} className="card space-y-3">
          <label className="label">Send to email address</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="recipient@example.com"
            inputMode="email"
            required
          />
          <button type="submit" className="btn-primary w-full" disabled={sending}>
            {sending ? "Sending..." : "Send"}
          </button>
        </form>
      )}

      {message && <p className="text-sm text-center text-gray-600">{message}</p>}
    </div>
  );
}
