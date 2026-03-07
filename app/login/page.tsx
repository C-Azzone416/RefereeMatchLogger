"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import VerifyEmail from "@/components/VerifyEmail";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setLoading(false);
      if (data.emailVerified === false) {
        setPendingVerification(true);
        return;
      }
      setError(data.error || "Login failed");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12 bg-brand-800 pitch-bg pitch-lines">
      <div className="mb-8 text-center">
        <div className="text-5xl mb-3">⚽</div>
        <h1 className="text-3xl font-black text-white tracking-tight">Referee Match Tracker</h1>
        <p className="text-brand-100 text-sm mt-1">Sign in to your account</p>
      </div>

      <div className="card max-w-sm mx-auto w-full shadow-2xl">
        {resetSuccess && (
          <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700 font-medium">
            Password updated. Sign in with your new password.
          </div>
        )}
        {pendingVerification ? (
          <VerifyEmail
            email={email}
            onSuccess={() => { router.push("/dashboard"); router.refresh(); }}
          />
        ) : (
        <>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              inputMode="email"
            />
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <label className="label" htmlFor="password">Password</label>
              <Link href="/forgot-password" className="text-xs text-brand-600 font-medium">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          No account?{" "}
          <Link href="/register" className="text-brand-600 font-medium">
            Register
          </Link>
        </p>
        </>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
