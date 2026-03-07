"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import JerseyColorPicker from "@/components/JerseyColorPicker";
import { fetchJson } from "@/lib/fetchJson";

const AGE_GROUPS = ["U8", "U9", "U10", "U11", "U12", "U13", "U14", "U15", "U16", "U17", "U18", "U19", "Adult"];
const GENDERS = ["Boys", "Girls", "Men", "Women", "Coed"];
const LEVELS = ["Recreational", "Competitive", "State Cup", "Regional", "National"];
const ROLES = ["Center", "AR1", "AR2"];

export default function NewMatchPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [halfLength, setHalfLength] = useState(45);
  const [overtimePossible, setOvertimePossible] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const now = new Date().toTimeString().slice(0, 5);

  const [form, setForm] = useState({
    date: today,
    time: now,
    venue: "",
    field: "",
    competitionName: "",
    ageGroup: "U14",
    gender: "Boys",
    competitionLevel: "Competitive",
    homeTeam: "",
    homeHeadCoach: "",
    awayTeam: "",
    awayHeadCoach: "",
    homeJerseyColor: "",
    awayJerseyColor: "",
    role: "Center",
    centerRefName: "",
    centerRefBadge: "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleNext(e: React.FormEvent) {
    e.preventDefault();
    setStep(2);
    window.scrollTo({ top: 0 });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: err } = await fetchJson<{ id: string }>("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, halfLength, overtimePossible }),
    });

    if (err || !data) {
      setError(err ?? "Failed to create match");
      setLoading(false);
      return;
    }

    router.push(`/matches/${data.id}/log`);
  }

  const isAR = form.role === "AR1" || form.role === "AR2";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-brand-800 text-white px-4 py-4 flex items-center gap-3 pitch-bg">
        {step === 2 ? (
          <button type="button" className="text-brand-100" onClick={() => setStep(1)}>← Back</button>
        ) : (
          <Link href="/dashboard" className="text-brand-100">← Back</Link>
        )}
        <h1 className="font-black text-lg tracking-tight">New Match</h1>
        <span className="ml-auto text-brand-200 text-sm font-medium">{step} of 2</span>
      </header>

      {/* Step indicator */}
      <div className="flex gap-1 px-4 pt-4 max-w-lg mx-auto">
        <div className="h-1 flex-1 rounded-full bg-brand-600" />
        <div className={`h-1 flex-1 rounded-full transition-colors ${step === 2 ? "bg-brand-600" : "bg-gray-200"}`} />
      </div>

      {step === 1 && (
        <form onSubmit={handleNext} className="px-4 py-6 space-y-5 max-w-lg mx-auto">
          {/* Your role */}
          <div className="card space-y-3">
            <h2 className="font-semibold text-gray-900">Your Role</h2>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => set("role", r)}
                  className={`py-3 rounded-lg font-medium text-sm border transition-colors ${
                    form.role === r
                      ? "bg-brand-600 text-white border-brand-600"
                      : "bg-white text-gray-700 border-gray-300"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            {isAR && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="label">Center Referee Name</label>
                  <input className="input" value={form.centerRefName} onChange={(e) => set("centerRefName", e.target.value)} placeholder="Name" />
                </div>
                <div>
                  <label className="label">Center Ref Badge # (optional)</label>
                  <input className="input" value={form.centerRefBadge} onChange={(e) => set("centerRefBadge", e.target.value)} placeholder="Badge #" />
                </div>
              </div>
            )}
          </div>

          {/* Date, time, venue */}
          <div className="card space-y-3">
            <h2 className="font-semibold text-gray-900">Match Details</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Date</label>
                <input className="input" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} required />
              </div>
              <div>
                <label className="label">Kick-off Time</label>
                <input className="input" type="time" value={form.time} onChange={(e) => set("time", e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="label">Venue / Complex</label>
              <input className="input" value={form.venue} onChange={(e) => set("venue", e.target.value)} placeholder="e.g. Central Park Fields" required />
            </div>
            <div>
              <label className="label">Field # (optional)</label>
              <input className="input" value={form.field} onChange={(e) => set("field", e.target.value)} placeholder="e.g. Field 3" />
            </div>
          </div>

          {/* Competition */}
          <div className="card space-y-3">
            <h2 className="font-semibold text-gray-900">Competition</h2>
            <div>
              <label className="label">League / Tournament Name</label>
              <input className="input" value={form.competitionName} onChange={(e) => set("competitionName", e.target.value)} placeholder="e.g. AYSO Spring League" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Age Group</label>
                <select className="input" value={form.ageGroup} onChange={(e) => set("ageGroup", e.target.value)}>
                  {AGE_GROUPS.map((g) => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Gender</label>
                <select className="input" value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                  {GENDERS.map((g) => <option key={g}>{g}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Competition Level</label>
              <select className="input" value={form.competitionLevel} onChange={(e) => set("competitionLevel", e.target.value)}>
                {LEVELS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Minutes per Half</label>
                <select className="input" value={halfLength} onChange={(e) => setHalfLength(Number(e.target.value))}>
                  {[20, 25, 30, 35, 40, 45].map((n) => (
                    <option key={n} value={n}>{n} min</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Overtime / Shootout</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOvertimePossible(false)}
                    className={`py-3 rounded-lg text-sm font-medium border transition-colors ${!overtimePossible ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-700 border-gray-300"}`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setOvertimePossible(true)}
                    className={`py-3 rounded-lg text-sm font-medium border transition-colors ${overtimePossible ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-700 border-gray-300"}`}
                  >
                    Yes
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full text-lg py-4">
            Next →
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleSubmit} className="px-4 py-6 space-y-5 max-w-lg mx-auto">
          {/* Teams + Jersey Colors */}
          <div className="card space-y-4">
            <h2 className="font-semibold text-gray-900">Home Team</h2>
            <div>
              <label className="label">Team Name</label>
              <input className="input" value={form.homeTeam} onChange={(e) => set("homeTeam", e.target.value)} placeholder="Home team name" required />
            </div>
            <div>
              <label className="label">Head Coach (optional)</label>
              <input className="input" value={form.homeHeadCoach} onChange={(e) => set("homeHeadCoach", e.target.value)} placeholder="Last name" />
            </div>
            <JerseyColorPicker
              label="Jersey Color"
              value={form.homeJerseyColor}
              onChange={(c) => set("homeJerseyColor", c)}
            />
          </div>

          <div className="card space-y-4">
            <h2 className="font-semibold text-gray-900">Away Team</h2>
            <div>
              <label className="label">Team Name</label>
              <input className="input" value={form.awayTeam} onChange={(e) => set("awayTeam", e.target.value)} placeholder="Away team name" required />
            </div>
            <div>
              <label className="label">Head Coach (optional)</label>
              <input className="input" value={form.awayHeadCoach} onChange={(e) => set("awayHeadCoach", e.target.value)} placeholder="Last name" />
            </div>
            <JerseyColorPicker
              label="Jersey Color"
              value={form.awayJerseyColor}
              onChange={(c) => set("awayJerseyColor", c)}
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button type="submit" className="btn-primary w-full text-lg py-4" disabled={loading}>
            {loading ? "Creating..." : "Start Match →"}
          </button>
        </form>
      )}
    </div>
  );
}
