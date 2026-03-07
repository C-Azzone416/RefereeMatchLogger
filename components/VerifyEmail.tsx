"use client";

import { useState } from "react";

interface Props {
  email: string;
  onSuccess: () => void;
}

export default function VerifyEmail({ email, onSuccess }: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [resendMsg, setResendMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      onSuccess();
      return;
    }

    if (data.tooManyAttempts) {
      setDisabled(true);
    }

    setError(data.error || "Verification failed");
  }

  async function handleResend() {
    setError("");
    setResendMsg("");
    setDisabled(false);
    setCode("");

    const res = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (!res.ok) {
      setResendMsg(data.error || "Could not resend code.");
    } else {
      setResendMsg("A new code has been sent. Check your inbox and junk folder.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-3xl mb-2">📧</div>
        <h2 className="text-lg font-bold text-gray-800">Check your email</h2>
        <p className="text-sm text-gray-500 mt-1">
          We sent a 6-digit code to <span className="font-medium text-gray-700">{email}</span>.
          <br />
          Check your inbox and junk folder.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Verification code</label>
          <input
            className="input text-center tracking-widest text-xl font-mono"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            disabled={disabled}
            maxLength={6}
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}
        {resendMsg && <p className="text-green-700 text-sm">{resendMsg}</p>}

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={loading || disabled}
        >
          {loading ? "Verifying..." : "Verify email"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500">
        Didn&apos;t get a code?{" "}
        <button
          type="button"
          onClick={handleResend}
          className="text-brand-600 font-medium hover:underline"
        >
          Resend code
        </button>
      </p>
    </div>
  );
}
