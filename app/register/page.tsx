"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import VerifyEmail from "@/components/VerifyEmail";

const US_STATES = [
  { abbr: "AL", name: "Alabama" }, { abbr: "AK", name: "Alaska" },
  { abbr: "AZ", name: "Arizona" }, { abbr: "AR", name: "Arkansas" },
  { abbr: "CA", name: "California" }, { abbr: "CO", name: "Colorado" },
  { abbr: "CT", name: "Connecticut" }, { abbr: "DE", name: "Delaware" },
  { abbr: "DC", name: "District of Columbia" }, { abbr: "FL", name: "Florida" },
  { abbr: "GA", name: "Georgia" }, { abbr: "HI", name: "Hawaii" },
  { abbr: "ID", name: "Idaho" }, { abbr: "IL", name: "Illinois" },
  { abbr: "IN", name: "Indiana" }, { abbr: "IA", name: "Iowa" },
  { abbr: "KS", name: "Kansas" }, { abbr: "KY", name: "Kentucky" },
  { abbr: "LA", name: "Louisiana" }, { abbr: "ME", name: "Maine" },
  { abbr: "MD", name: "Maryland" }, { abbr: "MA", name: "Massachusetts" },
  { abbr: "MI", name: "Michigan" }, { abbr: "MN", name: "Minnesota" },
  { abbr: "MS", name: "Mississippi" }, { abbr: "MO", name: "Missouri" },
  { abbr: "MT", name: "Montana" }, { abbr: "NE", name: "Nebraska" },
  { abbr: "NV", name: "Nevada" }, { abbr: "NH", name: "New Hampshire" },
  { abbr: "NJ", name: "New Jersey" }, { abbr: "NM", name: "New Mexico" },
  { abbr: "NY", name: "New York" }, { abbr: "NC", name: "North Carolina" },
  { abbr: "ND", name: "North Dakota" }, { abbr: "OH", name: "Ohio" },
  { abbr: "OK", name: "Oklahoma" }, { abbr: "OR", name: "Oregon" },
  { abbr: "PA", name: "Pennsylvania" }, { abbr: "RI", name: "Rhode Island" },
  { abbr: "SC", name: "South Carolina" }, { abbr: "SD", name: "South Dakota" },
  { abbr: "TN", name: "Tennessee" }, { abbr: "TX", name: "Texas" },
  { abbr: "UT", name: "Utah" }, { abbr: "VT", name: "Vermont" },
  { abbr: "VA", name: "Virginia" }, { abbr: "WA", name: "Washington" },
  { abbr: "WV", name: "West Virginia" }, { abbr: "WI", name: "Wisconsin" },
  { abbr: "WY", name: "Wyoming" },
  { abbr: "PR", name: "Puerto Rico" }, { abbr: "VI", name: "U.S. Virgin Islands" },
  { abbr: "GU", name: "Guam" }, { abbr: "AS", name: "American Samoa" },
  { abbr: "MP", name: "Northern Mariana Islands" },
];

const GRADES = [
  "Grassroots",
  "Grade 8",
  "Grade 7",
  "Grade 6",
  "Grade 5",
  "Grade 4",
  "Grade 3",
  "Grade 2",
  "Grade 1",
];

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    badgeNumber: "",
    currentGrade: "Grassroots",
    state: "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Registration failed");
      setLoading(false);
      return;
    }

    setLoading(false);
    setPendingEmail(form.email);
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12 bg-brand-800 pitch-bg">
      <div className="mb-8 text-center">
        <div className="text-5xl mb-3">⚽</div>
        <h1 className="text-3xl font-black text-white tracking-tight">Create Account</h1>
        <p className="text-brand-100 text-sm mt-1">Start tracking your matches</p>
      </div>

      <div className="card max-w-sm mx-auto w-full shadow-2xl">
        {pendingEmail ? (
          <VerifyEmail
            email={pendingEmail}
            onSuccess={() => { router.push("/dashboard"); router.refresh(); }}
          />
        ) : (
        <>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required inputMode="email" />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} required minLength={8} />
          </div>
          <div>
            <label className="label">Badge Number (optional)</label>
            <input className="input" value={form.badgeNumber} onChange={(e) => set("badgeNumber", e.target.value)} />
          </div>
          <div>
            <label className="label">Current Grade</label>
            <select className="input" value={form.currentGrade} onChange={(e) => set("currentGrade", e.target.value)}>
              {GRADES.map((g) => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="label">State (optional)</label>
            <select className="input" value={form.state} onChange={(e) => set("state", e.target.value)}>
              <option value="">Select state…</option>
              {US_STATES.map((s) => (
                <option key={s.abbr} value={s.abbr}>{s.name}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{" "}
          <Link href="/login" className="text-brand-600 font-medium">Sign in</Link>
        </p>
        </>
        )}
      </div>
    </div>
  );
}
