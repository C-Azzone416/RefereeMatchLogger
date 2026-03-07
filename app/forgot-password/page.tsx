"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    // Always show success — never reveal whether the email exists
    setLoading(false);
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12 bg-brand-800 pitch-bg">
      <div className="mb-8 text-center">
        <div className="text-5xl mb-3">⚽</div>
        <h1 className="text-3xl font-black text-white tracking-tight">Reset Password</h1>
        <p className="text-brand-100 text-sm mt-1">We&apos;ll send you a reset link</p>
      </div>

      <div className="card max-w-sm mx-auto w-full shadow-2xl">
        {submitted ? (
          <div className="space-y-4 text-center">
            <div className="text-4xl">📬</div>
            <p className="text-gray-700 text-sm">
              If an account exists for <span className="font-medium">{email}</span>, you&apos;ll
              receive a password reset link shortly. Check your inbox and spam folder.
            </p>
            <p className="text-xs text-gray-400">The link expires in 1 hour.</p>
            <Link href="/login" className="btn-secondary w-full text-center block">
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label" htmlFor="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                />
              </div>

              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-4">
              <Link href="/login" className="text-brand-600 font-medium">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
