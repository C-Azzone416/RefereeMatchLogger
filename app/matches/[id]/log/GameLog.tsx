"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type GameEvent = {
  id: string;
  eventType: string;
  period: string;
  minute: number;
  stoppageTime: number | null;
  team: string;
  playerName: string | null;
  playerNumber: string | null;
  detail: { reason?: string; description?: string; penalty?: boolean; ownGoal?: boolean; assistName?: string; subOnName?: string; subOnNumber?: string; secondYellow?: boolean } | null;
  createdAt: string;
};

type Match = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  role: string;
  ageGroup: string;
  gender: string;
  competitionName: string;
  competitionLevel: string;
  halfLength: number;
  overtimePossible: boolean;
  events: GameEvent[];
};

const EVENT_TYPES = [
  { type: "goal",         label: "Goal",   emoji: "⚽", color: "bg-green-500"  },
  { type: "yellow_card",  label: "Yellow", emoji: "🟨", color: "bg-yellow-500" },
  { type: "red_card",     label: "Red",    emoji: "🟥", color: "bg-red-500"    },
  { type: "substitution", label: "Sub",    emoji: "🔄", color: "bg-blue-500"   },
  { type: "injury",       label: "Injury", emoji: "🏥", color: "bg-orange-500" },
  { type: "note",         label: "Note",   emoji: "📝", color: "bg-gray-500"   },
];

const PERIODS = ["1", "2", "et1", "et2", "penalties"];
const PERIOD_LABELS: Record<string, string> = {
  "1": "1st Half", "2": "2nd Half", "et1": "ET 1st", "et2": "ET 2nd", "penalties": "Pens",
};

const YELLOW_REASONS = [
  "Unsporting behavior",
  "Dissent",
  "Persistent infringement",
  "Delaying restart",
  "Failure to respect required distance",
  "Entering/leaving field without permission",
  "Other",
];

const RED_REASONS = [
  "Serious foul play",
  "Violent conduct",
  "Spitting",
  "DOGSO - foul",
  "DOGSO - handball",
  "Offensive/abusive/insulting language",
  "Second caution",
  "Other",
];

function minuteLabel(e: { minute: number; stoppageTime: number | null }) {
  return e.stoppageTime ? `${e.minute}+${e.stoppageTime}'` : `${e.minute}'`;
}

function eventSummary(e: GameEvent, homeTeam: string, awayTeam: string) {
  const team = e.team === "home" ? homeTeam : awayTeam;
  const player = e.playerNumber ? `#${e.playerNumber} ${e.playerName || ""}` : e.playerName || "";
  const detail = e.detail ?? {};

  switch (e.eventType) {
    case "goal": {
      const suffix = detail.penalty ? " (PK)" : detail.ownGoal ? " (OG)" : "";
      return `${team}${suffix} — ${player}`;
    }
    case "yellow_card": return `${team} — ${player}${detail.reason ? ` (${detail.reason})` : ""}`;
    case "red_card":    return `${team} — ${player}${detail.reason ? ` (${detail.reason})` : ""}`;
    case "substitution": {
      const onStr = [detail.subOnNumber ? `#${detail.subOnNumber}` : null, detail.subOnName || null].filter(Boolean).join(" ") || "Unknown";
      return `${team} — Off: ${player || "Unknown"} / On: ${onStr}`;
    }
    case "injury": return `${team} — ${player}`;
    case "note":   return detail.description || "";
    default:       return "";
  }
}

function detectPeriod(minute: number, halfLength: number, overtimePossible: boolean): string {
  if (minute <= halfLength) return "1";
  if (minute <= halfLength * 2) return "2";
  if (!overtimePossible) return "2";
  if (minute <= halfLength * 2 + 15) return "et1";
  if (minute <= halfLength * 2 + 30) return "et2";
  return "penalties";
}

async function postEvent(matchId: string, payload: object): Promise<GameEvent | null> {
  const res = await fetch(`/api/matches/${matchId}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return null;
  const data = await res.json();
  // The events API returns { ...event, supplemental } — extract just the GameEvent fields
  const { supplemental: _supplemental, ...event } = data;
  return event as GameEvent;
}

export default function GameLog({ match }: { match: Match }) {
  const [events, setEvents] = useState<GameEvent[]>(match.events);
  const [homeScore, setHomeScore] = useState(match.homeScore);
  const [awayScore, setAwayScore] = useState(match.awayScore);

  const [viewPeriod, setViewPeriod]   = useState<string>("all");
  const [showForm, setShowForm]       = useState(false);
  const [confirming, setConfirming]   = useState(false); // second-yellow review step
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [period, setPeriod]           = useState("1");
  const [minute, setMinute]           = useState("");
  const [stoppageTime, setStoppageTime] = useState("");
  const [team, setTeam]               = useState<"home" | "away">("home");
  const [playerName, setPlayerName]   = useState("");
  const [playerNumber, setPlayerNumber] = useState("");
  const [detail, setDetail]           = useState<Record<string, string | boolean>>({});
  const [saving, setSaving]           = useState(false);

  const availablePeriods = match.overtimePossible ? PERIODS : PERIODS.slice(0, 2);

  // Find any prior yellow for same team + number
  const existingYellow =
    selectedType === "yellow_card" && playerNumber.trim()
      ? events.find(
          (e) =>
            e.eventType === "yellow_card" &&
            e.team === team &&
            e.playerNumber === playerNumber.trim()
        )
      : null;

  // Auto-check "second yellow" when a prior caution is detected; uncheck when cleared
  useEffect(() => {
    if (selectedType !== "yellow_card") return;
    if (existingYellow && !detail.secondYellow) {
      setDetail((d) => ({ ...d, secondYellow: true }));
    }
    if (!existingYellow && detail.secondYellow) {
      setDetail((d) => ({ ...d, secondYellow: false }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingYellow]);

  function openForm(type: string) {
    setSelectedType(type);
    setMinute("");
    setStoppageTime("");
    setPlayerName("");
    setPlayerNumber("");
    setDetail({});
    setConfirming(false);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setConfirming(false);
    setSelectedType(null);
  }

  // Called when user taps "Save Event" — if it's a second yellow, show review first
  function handleSavePress() {
    if (selectedType === "yellow_card" && detail.secondYellow) {
      setConfirming(true);
    } else {
      commitSave();
    }
  }

  async function commitSave() {
    if (!selectedType || !minute) return;
    setSaving(true);

    const basePayload = {
      period,
      minute: Number(minute),
      stoppageTime: stoppageTime ? Number(stoppageTime) : null,
      team,
      playerName: playerName || null,
      playerNumber: playerNumber || null,
    };

    const event = await postEvent(match.id, {
      ...basePayload,
      eventType: selectedType,
      detail: Object.keys(detail).length > 0 ? detail : null,
    });

    if (event) {
      setEvents((prev) => [...prev, event]);

      // Second yellow → also create red card
      if (selectedType === "yellow_card" && detail.secondYellow) {
        const redCard = await postEvent(match.id, {
          ...basePayload,
          eventType: "red_card",
          detail: { reason: "Second caution" },
        });
        if (redCard) setEvents((prev) => [...prev, redCard]);
      }

      // Update score for goals
      if (selectedType === "goal") {
        const scoringTeam = detail.ownGoal
          ? team === "home" ? "away" : "home"
          : team;
        if (scoringTeam === "home") {
          setHomeScore((s) => s + 1);
          await fetch(`/api/matches/${match.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ homeScore: homeScore + 1 }),
          });
        } else {
          setAwayScore((s) => s + 1);
          await fetch(`/api/matches/${match.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ awayScore: awayScore + 1 }),
          });
        }
      }
    }

    setSaving(false);
    closeForm();
  }

  async function deleteEvent(eventId: string, ev: GameEvent) {
    if (!confirm("Remove this event?")) return;
    const res = await fetch(`/api/matches/${match.id}/events`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId }),
    });
    if (res.ok) {
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      if (ev.eventType === "goal") {
        const d = ev.detail ?? {};
        const scoreTeam = d.ownGoal ? (ev.team === "home" ? "away" : "home") : ev.team;
        if (scoreTeam === "home") setHomeScore((s) => Math.max(0, s - 1));
        else setAwayScore((s) => Math.max(0, s - 1));
      }
    }
  }

  const teamName = team === "home" ? match.homeTeam : match.awayTeam;
  const playerLabel = [playerNumber ? `#${playerNumber}` : null, playerName || null]
    .filter(Boolean).join(" ") || "Unknown player";

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <header className="bg-brand-800 text-white px-4 pt-4 pb-8 pitch-bg">
        <div className="flex items-center gap-3 mb-5">
          <Link href="/dashboard" className="text-brand-300 text-sm font-medium">← Back</Link>
          <span className="text-brand-300 text-[10px] ml-auto uppercase tracking-widest">{match.role} · {match.ageGroup} {match.gender}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 text-center">
            <div className="text-[10px] text-brand-300 uppercase tracking-widest mb-2">Home</div>
            <div className="font-black text-base leading-tight">{match.homeTeam}</div>
          </div>
          <div className="px-5 text-center border-x border-brand-700">
            <div className="text-5xl font-black tracking-tight tabular-nums">{homeScore}–{awayScore}</div>
            <div className="text-brand-300 text-[10px] mt-2 uppercase tracking-widest">{match.competitionName}</div>
          </div>
          <div className="flex-1 text-center">
            <div className="text-[10px] text-brand-300 uppercase tracking-widest mb-2">Away</div>
            <div className="font-black text-base leading-tight">{match.awayTeam}</div>
          </div>
        </div>
      </header>

      {/* Period selector */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex gap-2 overflow-x-auto">
        <button
          onClick={() => setViewPeriod("all")}
          className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            viewPeriod === "all" ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600"
          }`}
        >
          All
        </button>
        {availablePeriods.map((p) => (
          <button
            key={p}
            onClick={() => setViewPeriod(p)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              viewPeriod === p ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Event log */}
      <div className="px-4 py-4 space-y-2">
        {events.filter((e) => viewPeriod === "all" || e.period === viewPeriod).length === 0 && (
          <div className="text-center text-gray-400 py-8 text-sm">
            {viewPeriod === "all"
              ? "No events yet. Tap an event button below to start logging."
              : `No events in ${PERIOD_LABELS[viewPeriod]}.`}
          </div>
        )}
        {events
          .filter((e) => viewPeriod === "all" || e.period === viewPeriod)
          .slice()
          .sort((a, b) => {
            const po = PERIODS.indexOf(a.period) - PERIODS.indexOf(b.period);
            return po !== 0 ? po : a.minute - b.minute;
          })
          .map((ev, i) => {
            const typeInfo = EVENT_TYPES.find((t) => t.type === ev.eventType);
            return (
              <div key={ev.id ?? `ev-${i}`} className="card flex items-start gap-3">
                <div className="flex-shrink-0 w-10 text-center">
                  <div className="text-xl">{typeInfo?.emoji}</div>
                  <div className="text-xs text-gray-400 font-mono">{minuteLabel(ev)}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {typeInfo?.label} · {PERIOD_LABELS[ev.period]}
                  </div>
                  <div className="text-sm text-gray-900 mt-0.5 leading-snug">
                    {eventSummary(ev, match.homeTeam, match.awayTeam)}
                  </div>
                  {ev.eventType === "red_card" && (
                    <Link
                      href={`/matches/${match.id}/supplementals/new?eventId=${ev.id}&team=${ev.team}&playerName=${encodeURIComponent(ev.playerName ?? "")}&playerNumber=${encodeURIComponent(ev.playerNumber ?? "")}&minute=${ev.minute}&stoppageTime=${ev.stoppageTime ?? ""}&period=${ev.period}&offenseCode=${encodeURIComponent((ev.detail?.reason as string) ?? "")}`}
                      className="text-xs text-brand-600 font-medium mt-1 inline-block"
                    >
                      File supplemental →
                    </Link>
                  )}
                </div>
                <button
                  onClick={() => deleteEvent(ev.id, ev)}
                  className="text-gray-300 text-lg active:text-red-400 flex-shrink-0 px-1"
                >
                  ×
                </button>
              </div>
            );
          })}
      </div>

      {/* Action buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3">
        <div className="grid grid-cols-3 gap-2 max-w-lg mx-auto mb-2">
          {EVENT_TYPES.map(({ type, label, emoji, color }) => (
            <button
              key={type}
              onClick={() => openForm(type)}
              className={`${color} text-white rounded-xl py-3 font-semibold text-sm flex flex-col items-center gap-0.5 active:opacity-80`}
            >
              <span className="text-xl">{emoji}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
        <Link href={`/matches/${match.id}`} className="btn-secondary w-full text-center block text-sm max-w-lg mx-auto">
          Finish & Review Report
        </Link>
      </div>

      {/* Modal */}
      {showForm && selectedType && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={closeForm}>
          <div
            className="bg-white w-full rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── REVIEW STEP (second yellow confirmation) ── */}
            {confirming ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-lg text-red-600">Confirm Second Caution</h2>
                  <button onClick={closeForm} className="text-gray-400 text-2xl leading-none">×</button>
                </div>

                <p className="text-sm text-gray-600">
                  Please review carefully before saving. This cannot be undone without manually deleting both events.
                </p>

                {/* Summary of what will be saved */}
                <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
                  <div className="px-4 py-3 bg-gray-50">
                    <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-0.5">Events that will be logged</div>
                  </div>

                  {/* Yellow card row */}
                  <div className="px-4 py-3 flex items-start gap-3">
                    <span className="text-2xl leading-none">🟨</span>
                    <div className="text-sm">
                      <div className="font-semibold text-gray-900">Yellow Card — {minuteLabel({ minute: Number(minute), stoppageTime: stoppageTime ? Number(stoppageTime) : null })}</div>
                      <div className="text-gray-600">{teamName} · {playerLabel}</div>
                      {detail.reason && <div className="text-gray-500">Reason: {detail.reason as string}</div>}
                    </div>
                  </div>

                  {/* Red card row */}
                  <div className="px-4 py-3 flex items-start gap-3 bg-red-50">
                    <span className="text-2xl leading-none">🟥</span>
                    <div className="text-sm">
                      <div className="font-semibold text-red-800">Red Card (Send-off) — {minuteLabel({ minute: Number(minute), stoppageTime: stoppageTime ? Number(stoppageTime) : null })}</div>
                      <div className="text-red-700">{teamName} · {playerLabel}</div>
                      <div className="text-red-600">Reason: Second caution</div>
                    </div>
                  </div>
                </div>

                {/* Prior yellow reference */}
                {existingYellow && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-sm text-yellow-800">
                    <span className="font-semibold">Prior caution on record:</span>{" "}
                    {teamName} · #{existingYellow.playerNumber}{existingYellow.playerName ? ` ${existingYellow.playerName}` : ""} at {minuteLabel(existingYellow)}
                    {existingYellow.detail && (existingYellow.detail as Record<string, unknown>).reason
                      ? ` — ${(existingYellow.detail as Record<string, unknown>).reason}`
                      : ""}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={() => setConfirming(false)}
                    className="btn-secondary"
                  >
                    ← Go Back & Edit
                  </button>
                  <button
                    onClick={commitSave}
                    disabled={saving}
                    className="btn-danger"
                  >
                    {saving ? "Saving..." : "Confirm & Log"}
                  </button>
                </div>
              </div>
            ) : (
              /* ── ENTRY FORM ── */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-lg">
                    {EVENT_TYPES.find((t) => t.type === selectedType)?.emoji}{" "}
                    {EVENT_TYPES.find((t) => t.type === selectedType)?.label}
                  </h2>
                  <button onClick={closeForm} className="text-gray-400 text-2xl leading-none">×</button>
                </div>

                {/* Team */}
                {selectedType !== "note" && (
                  <div>
                    <label className="label">Team</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["home", "away"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTeam(t)}
                          className={`py-3 rounded-lg font-medium text-sm border transition-colors ${
                            team === t
                              ? "bg-brand-600 text-white border-brand-600"
                              : "bg-white text-gray-700 border-gray-300"
                          }`}
                        >
                          {t === "home" ? match.homeTeam : match.awayTeam}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Minute */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Minute</label>
                    <input
                      className="input text-center text-xl font-bold"
                      type="number"
                      min={1}
                      max={120}
                      value={minute}
                      onChange={(e) => {
                        setMinute(e.target.value);
                        const m = Number(e.target.value);
                        if (m > 0) setPeriod(detectPeriod(m, match.halfLength, match.overtimePossible));
                      }}
                      placeholder="45"
                      inputMode="numeric"
                    />
                  </div>
                  <div>
                    <label className="label">Stoppage +</label>
                    <input
                      className="input text-center text-xl font-bold"
                      type="number"
                      min={0}
                      value={stoppageTime}
                      onChange={(e) => setStoppageTime(e.target.value)}
                      placeholder="0"
                      inputMode="numeric"
                    />
                  </div>
                </div>

                {/* Player */}
                {selectedType !== "note" && (
                  <div>
                    {selectedType === "substitution" && (
                      <div className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1.5">Player Coming Off</div>
                    )}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="label">#</label>
                        <input
                          className="input text-center"
                          value={playerNumber}
                          onChange={(e) => setPlayerNumber(e.target.value)}
                          placeholder="7"
                          inputMode="numeric"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="label">Player Name</label>
                        <input
                          className="input"
                          value={playerName}
                          onChange={(e) => setPlayerName(e.target.value)}
                          placeholder="Last name"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Yellow card fields */}
                {selectedType === "yellow_card" && (
                  <div className="space-y-3">
                    {existingYellow && (
                      <div className="bg-yellow-50 border border-yellow-300 rounded-lg px-3 py-2 text-sm text-yellow-800">
                        <div className="font-semibold">⚠ Prior caution on record</div>
                        <div className="mt-0.5">
                          #{existingYellow.playerNumber}{existingYellow.playerName ? ` ${existingYellow.playerName}` : ""} received a yellow at {minuteLabel(existingYellow)}.
                          Second caution has been checked — you will be asked to confirm before saving.
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="label">Reason for this caution</label>
                      <select
                        className="input"
                        value={(detail.reason as string) || ""}
                        onChange={(e) => setDetail((d) => ({ ...d, reason: e.target.value }))}
                      >
                        <option value="">Select reason...</option>
                        {YELLOW_REASONS.map((r) => <option key={r}>{r}</option>)}
                      </select>
                    </div>

                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!!detail.secondYellow}
                        onChange={(e) => setDetail((d) => ({ ...d, secondYellow: e.target.checked }))}
                        className="w-4 h-4"
                      />
                      Second caution — player is sent off
                    </label>

                    {detail.secondYellow && (
                      <p className="text-xs text-red-600 font-medium pl-6">
                        🟥 You will be asked to review before a red card is added.
                      </p>
                    )}
                  </div>
                )}

                {/* Red card fields */}
                {selectedType === "red_card" && (
                  <div>
                    <label className="label">Reason</label>
                    <select
                      className="input"
                      value={(detail.reason as string) || ""}
                      onChange={(e) => setDetail((d) => ({ ...d, reason: e.target.value }))}
                    >
                      <option value="">Select reason...</option>
                      {RED_REASONS.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                )}

                {/* Goal fields */}
                {selectedType === "goal" && (
                  <div className="space-y-2">
                    <label className="label">Assist (optional)</label>
                    <input
                      className="input"
                      value={(detail.assistName as string) || ""}
                      onChange={(e) => setDetail((d) => ({ ...d, assistName: e.target.value }))}
                      placeholder="Assisting player"
                    />
                    <div className="flex gap-3 mt-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={!!detail.penalty}
                          onChange={(e) => setDetail((d) => ({ ...d, penalty: e.target.checked }))}
                          className="w-4 h-4"
                        />
                        Penalty kick
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={!!detail.ownGoal}
                          onChange={(e) => setDetail((d) => ({ ...d, ownGoal: e.target.checked }))}
                          className="w-4 h-4"
                        />
                        Own goal
                      </label>
                    </div>
                  </div>
                )}

                {/* Substitution fields */}
                {selectedType === "substitution" && (
                  <div>
                    <div className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1.5">Player Coming On</div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="label">#</label>
                        <input
                          className="input text-center"
                          value={(detail.subOnNumber as string) || ""}
                          onChange={(e) => setDetail((d) => ({ ...d, subOnNumber: e.target.value }))}
                          placeholder="11"
                          inputMode="numeric"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="label">Player Name</label>
                        <input
                          className="input"
                          value={(detail.subOnName as string) || ""}
                          onChange={(e) => setDetail((d) => ({ ...d, subOnName: e.target.value }))}
                          placeholder="Last name"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Note / injury fields */}
                {(selectedType === "note" || selectedType === "injury") && (
                  <div>
                    <label className="label">Description</label>
                    <textarea
                      className="input min-h-[80px]"
                      value={(detail.description as string) || ""}
                      onChange={(e) => setDetail((d) => ({ ...d, description: e.target.value }))}
                      placeholder="Describe what happened..."
                    />
                  </div>
                )}

                <button
                  onClick={handleSavePress}
                  disabled={!minute || saving}
                  className="btn-primary w-full text-lg py-4"
                >
                  {selectedType === "yellow_card" && detail.secondYellow
                    ? "Review & Confirm →"
                    : "Save Event"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
