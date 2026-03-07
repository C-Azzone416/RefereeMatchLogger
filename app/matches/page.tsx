"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";

const AGE_GROUPS = ["U8", "U9", "U10", "U11", "U12", "U13", "U14", "U15", "U16", "U17", "U18", "U19", "Adult"];
const LEVELS = ["Recreational", "Competitive", "State Cup", "Regional", "National"];
const ROLES = ["Center", "AR1", "AR2"];

type DatePreset = "30d" | "90d" | "season" | "all";

interface Match {
  id: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  ageGroup: string;
  gender: string;
  role: string;
  yellowCards: number;
  redCards: number;
  supplementalCount: number;
}

const LIMIT = 20;

function dateFromPreset(preset: DatePreset): string {
  const d = new Date();
  switch (preset) {
    case "30d":
      d.setDate(d.getDate() - 30);
      return d.toISOString().split("T")[0];
    case "90d":
      d.setDate(d.getDate() - 90);
      return d.toISOString().split("T")[0];
    case "season":
      return `${d.getFullYear()}-01-01`;
    case "all":
      return "2000-01-01";
  }
}

const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "season": "This season",
  "all": "All time",
};

export default function MatchesPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [role, setRole] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [competitionLevel, setCompetitionLevel] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("30d");
  const [offset, setOffset] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Debounce search, reset pagination at the same time
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setOffset(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch whenever derived filters or pagination change
  useEffect(() => {
    async function load() {
      setLoading(true);
      const params = new URLSearchParams();
      if (debouncedQuery) params.set("q", debouncedQuery);
      if (role) params.set("role", role);
      if (ageGroup) params.set("ageGroup", ageGroup);
      if (competitionLevel) params.set("competitionLevel", competitionLevel);
      params.set("dateFrom", dateFromPreset(datePreset));
      params.set("limit", String(LIMIT));
      params.set("offset", String(offset));

      const res = await fetch(`/api/matches?${params}`);
      if (res.ok) {
        const data = await res.json();
        setMatches(data.matches);
        setTotal(data.total);
      }
      setLoading(false);
    }
    load();
  }, [debouncedQuery, role, ageGroup, competitionLevel, datePreset, offset]);

  function handleRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setRole(e.target.value);
    setOffset(0);
  }
  function handleAgeGroupChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setAgeGroup(e.target.value);
    setOffset(0);
  }
  function handleCompLevelChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setCompetitionLevel(e.target.value);
    setOffset(0);
  }
  function handleDatePreset(p: DatePreset) {
    setDatePreset(p);
    setOffset(0);
  }

  const activeFilterCount = [role, ageGroup, competitionLevel].filter(Boolean).length;
  const totalPages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-brand-800 text-white px-4 py-4 flex items-center gap-3 pitch-bg">
        <Link href="/dashboard" className="text-brand-200 text-sm font-medium">← Back</Link>
        <h1 className="font-black text-xl tracking-tight">Match History</h1>
      </header>

      <div className="px-4 py-6 space-y-4 max-w-lg mx-auto">
        {/* Search */}
        <input
          className="input"
          placeholder="Search teams, venue, competition..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {/* Filter toggle + date presets */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            className="btn-secondary flex items-center gap-1.5 text-sm py-1.5 px-3"
            onClick={() => setFiltersOpen((o) => !o)}
          >
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-brand-600 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {(Object.keys(DATE_PRESET_LABELS) as DatePreset[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handleDatePreset(p)}
              className={`text-xs px-2.5 py-1.5 rounded-full font-medium border transition-colors ${
                datePreset === p
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-gray-600 border-gray-200"
              }`}
            >
              {DATE_PRESET_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Filter panel */}
        {filtersOpen && (
          <div className="card space-y-3">
            <div>
              <label className="label">Role</label>
              <select className="input" value={role} onChange={handleRoleChange}>
                <option value="">All roles</option>
                {ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Age Group</label>
              <select className="input" value={ageGroup} onChange={handleAgeGroupChange}>
                <option value="">All ages</option>
                {AGE_GROUPS.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Competition Level</label>
              <select className="input" value={competitionLevel} onChange={handleCompLevelChange}>
                <option value="">All levels</option>
                {LEVELS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Result count */}
        <p className="text-sm text-gray-500">
          {loading ? "Loading..." : `${total} match${total !== 1 ? "es" : ""}`}
        </p>

        {/* Match list */}
        {!loading && matches.length === 0 ? (
          <div className="card text-center py-8 text-gray-400">
            <p>No matches found.</p>
            <p className="text-sm mt-1">Try adjusting your filters or date range.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => (
              <Link key={match.id} href={`/matches/${match.id}`} className="card block active:bg-gray-50">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-bold text-gray-900 flex-1 truncate text-sm">{match.homeTeam}</span>
                  <span className="font-black text-brand-700 tabular-nums text-xl px-2 shrink-0">{match.homeScore}–{match.awayScore}</span>
                  <span className="font-bold text-gray-900 flex-1 text-right truncate text-sm">{match.awayTeam}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{format(new Date(match.date), "MMM d, yyyy")} · {match.ageGroup} {match.gender}</span>
                  <div className="flex items-center gap-1.5">
                    {match.yellowCards > 0 && (
                      <span className="bg-yellow-100 text-yellow-700 rounded px-1.5 py-0.5 font-medium">{match.yellowCards} YC</span>
                    )}
                    {match.redCards > 0 && (
                      <span className="bg-red-100 text-red-700 rounded px-1.5 py-0.5 font-medium">{match.redCards} RC</span>
                    )}
                    {match.supplementalCount > 0 && (
                      <span className="bg-orange-100 text-orange-700 rounded px-1.5 py-0.5 font-medium">SUP</span>
                    )}
                    <span className="bg-gray-100 rounded px-1.5 py-0.5 font-medium text-gray-500">{match.role}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > LIMIT && (
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              className="btn-secondary text-sm"
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}
            >
              Prev
            </button>
            <span className="text-sm text-gray-500">Page {currentPage} of {totalPages}</span>
            <button
              type="button"
              className="btn-secondary text-sm"
              disabled={offset + LIMIT >= total}
              onClick={() => setOffset((o) => o + LIMIT)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
