"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchJson } from "@/lib/fetchJson";
import {
  INCIDENT_TYPES,
  INCIDENT_TYPE_LABELS,
  FIELD_LOCATIONS,
  OFFICIAL_ROLES,
  SUBMISSION_DESTINATIONS,
  offenseCodeToDetailType,
  type IncidentType,
} from "@/lib/supplementalTypes";

// ── Types ────────────────────────────────────────────────────────────────────

type SupplementalReport = {
  id: string;
  incidentType: string;
  team: string | null;
  playerName: string | null;
  playerNumber: string | null;
  officialName: string | null;
  officialRole: string | null;
  minute: number | null;
  stoppageTime: number | null;
  period: string | null;
  fieldLocation: string | null;
  offenseCode: string | null;
  narrative: string | null;
  details: Record<string, unknown> | null;
  status: string;
  submittedTo: string | null;
};

type Prefill = {
  gameEventId?: string;
  incidentType?: string;
  team?: string;
  playerName?: string;
  playerNumber?: string;
  minute?: string;
  stoppageTime?: string;
  period?: string;
  offenseCode?: string;
};

type Props = {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  initialData?: SupplementalReport;
  prefill?: Prefill;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const PERIODS = [
  { value: "1", label: "1st Half" },
  { value: "2", label: "2nd Half" },
  { value: "et1", label: "ET 1st" },
  { value: "et2", label: "ET 2nd" },
  { value: "penalties", label: "Penalties" },
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

const YELLOW_REASONS = [
  "Unsporting behavior",
  "Dissent",
  "Persistent infringement",
  "Delaying restart",
  "Failure to respect required distance",
  "Entering/leaving field without permission",
  "Other",
];

// ── Small helpers ─────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
  placeholder = "Select…",
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[] | readonly { value: string; label: string }[] | string[];
  placeholder?: string;
}) {
  const normalized = (options as (string | { value: string; label: string })[]).map((o) =>
    typeof o === "string" ? { value: o, label: o } : o
  );
  return (
    <select
      className="input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {normalized.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-brand-600"
      />
      {label}
    </label>
  );
}

// ── Type-specific detail sub-forms ────────────────────────────────────────────

function ViolentDetails({
  d,
  set,
}: {
  d: Record<string, unknown>;
  set: (k: string, v: unknown) => void;
}) {
  return (
    <div className="space-y-3">
      <Field label="Body part used *">
        <input
          className="input"
          value={(d.bodyPartUsed as string) ?? ""}
          onChange={(e) => set("bodyPartUsed", e.target.value)}
          placeholder="e.g. elbow, fist, head"
        />
      </Field>
      <Field label="Force description *">
        <input
          className="input"
          value={(d.forceDescription as string) ?? ""}
          onChange={(e) => set("forceDescription", e.target.value)}
          placeholder="e.g. struck with elbow, lunged at"
        />
      </Field>
      <Field label="Victim name">
        <input
          className="input"
          value={(d.victimName as string) ?? ""}
          onChange={(e) => set("victimName", e.target.value)}
        />
      </Field>
      <Field label="Victim number">
        <input
          className="input"
          value={(d.victimNumber as string) ?? ""}
          onChange={(e) => set("victimNumber", e.target.value)}
          inputMode="numeric"
        />
      </Field>
      <Field label="Victim role">
        <Select
          value={(d.victimTeam as string) ?? ""}
          onChange={(v) => set("victimTeam", v)}
          options={["home", "away", "official", "spectator"]}
        />
      </Field>
      <Field label="Contact location (on victim)">
        <input
          className="input"
          value={(d.contactLocation as string) ?? ""}
          onChange={(e) => set("contactLocation", e.target.value)}
          placeholder="e.g. head, face, ribs"
        />
      </Field>
      <Checkbox
        label="Victim was injured"
        checked={!!(d.victimInjured)}
        onChange={(v) => set("victimInjured", v)}
      />
      {!!(d.victimInjured) && (
        <Checkbox
          label="Victim returned to play"
          checked={!!(d.victimReturnedToPlay)}
          onChange={(v) => set("victimReturnedToPlay", v)}
        />
      )}
      <Checkbox
        label="Ball was in play"
        checked={!!(d.ballInPlay)}
        onChange={(v) => set("ballInPlay", v)}
      />
      <Field label="Direction of play">
        <input
          className="input"
          value={(d.directionOfPlay as string) ?? ""}
          onChange={(e) => set("directionOfPlay", e.target.value)}
          placeholder="e.g. toward north goal"
        />
      </Field>
    </div>
  );
}

function DogsoDetails({
  d,
  set,
}: {
  d: Record<string, unknown>;
  set: (k: string, v: unknown) => void;
}) {
  return (
    <div className="space-y-3">
      <Field label="DOGSO type *">
        <Select
          value={(d.dogsoType as string) ?? ""}
          onChange={(v) => set("dogsoType", v)}
          options={[
            { value: "foul", label: "Foul" },
            { value: "handball", label: "Handball" },
          ]}
        />
      </Field>
      <Field label="Ball position *">
        <input
          className="input"
          value={(d.ballPosition as string) ?? ""}
          onChange={(e) => set("ballPosition", e.target.value)}
          placeholder="Describe where the ball was"
        />
      </Field>
      <Field label="Offending player position *">
        <input
          className="input"
          value={(d.playerPosition as string) ?? ""}
          onChange={(e) => set("playerPosition", e.target.value)}
          placeholder="Describe player's position"
        />
      </Field>
      <Field label="Distance to goal">
        <input
          className="input"
          value={(d.goalDistance as string) ?? ""}
          onChange={(e) => set("goalDistance", e.target.value)}
          placeholder="e.g. 10 yards"
        />
      </Field>
      <Field label="Defenders between player and goal (excl. keeper) *">
        <input
          className="input"
          type="number"
          min="0"
          max="10"
          value={(d.defenderCount as number) ?? ""}
          onChange={(e) => set("defenderCount", parseInt(e.target.value, 10) || 0)}
        />
      </Field>
      <Field label="Keeper position">
        <input
          className="input"
          value={(d.keeperPosition as string) ?? ""}
          onChange={(e) => set("keeperPosition", e.target.value)}
          placeholder="e.g. off their line, at far post"
        />
      </Field>
      <Field label="Direction of play">
        <input
          className="input"
          value={(d.directionOfPlay as string) ?? ""}
          onChange={(e) => set("directionOfPlay", e.target.value)}
        />
      </Field>
    </div>
  );
}

function SecondCautionDetails({
  d,
  set,
}: {
  d: Record<string, unknown>;
  set: (k: string, v: unknown) => void;
}) {
  return (
    <div className="space-y-3">
      <Field label="1st caution — minute *">
        <input
          className="input"
          type="number"
          min="1"
          value={(d.firstCautionMinute as number) ?? ""}
          onChange={(e) => set("firstCautionMinute", parseInt(e.target.value, 10) || "")}
        />
      </Field>
      <Field label="1st caution — period *">
        <Select
          value={(d.firstCautionPeriod as string) ?? ""}
          onChange={(v) => set("firstCautionPeriod", v)}
          options={PERIODS}
        />
      </Field>
      <Field label="1st caution — reason *">
        <Select
          value={(d.firstCautionReason as string) ?? ""}
          onChange={(v) => set("firstCautionReason", v)}
          options={YELLOW_REASONS}
        />
      </Field>
      <Field label="2nd caution — reason *">
        <Select
          value={(d.secondCautionReason as string) ?? ""}
          onChange={(v) => set("secondCautionReason", v)}
          options={YELLOW_REASONS}
        />
      </Field>
    </div>
  );
}

function LanguageDetails({
  d,
  set,
}: {
  d: Record<string, unknown>;
  set: (k: string, v: unknown) => void;
}) {
  return (
    <div className="space-y-3">
      <Field label="Exact quote (verbatim) *">
        <textarea
          className="input min-h-[80px]"
          value={(d.exactQuote as string) ?? ""}
          onChange={(e) => set("exactQuote", e.target.value)}
          placeholder="Record exact words used"
        />
      </Field>
      <Field label="Directed at *">
        <Select
          value={(d.directedAt as string) ?? ""}
          onChange={(v) => set("directedAt", v)}
          options={["referee", "opponent", "spectator", "other"]}
        />
      </Field>
      <Field label="Witnesses">
        <input
          className="input"
          value={(d.witnesses as string) ?? ""}
          onChange={(e) => set("witnesses", e.target.value)}
          placeholder="Names or roles of witnesses"
        />
      </Field>
    </div>
  );
}

function CoachDismissalDetails({
  d,
  set,
}: {
  d: Record<string, unknown>;
  set: (k: string, v: unknown) => void;
}) {
  return (
    <div className="space-y-3">
      <Field label="Behaviour description *">
        <textarea
          className="input min-h-[80px]"
          value={(d.behaviourDescription as string) ?? ""}
          onChange={(e) => set("behaviourDescription", e.target.value)}
          placeholder="Factual description of what occurred"
        />
      </Field>
      <Field label="Exact quote (if applicable)">
        <textarea
          className="input min-h-[60px]"
          value={(d.exactQuote as string) ?? ""}
          onChange={(e) => set("exactQuote", e.target.value)}
        />
      </Field>
      <Checkbox
        label="Prior warning was issued"
        checked={!!(d.priorWarning)}
        onChange={(v) => set("priorWarning", v)}
      />
      {!!(d.priorWarning) && (
        <Field label="Warning given at minute">
          <input
            className="input"
            type="number"
            min="1"
            value={(d.warningMinute as number) ?? ""}
            onChange={(e) => set("warningMinute", parseInt(e.target.value, 10) || "")}
          />
        </Field>
      )}
      <Field label="Witnesses">
        <input
          className="input"
          value={(d.witnesses as string) ?? ""}
          onChange={(e) => set("witnesses", e.target.value)}
        />
      </Field>
    </div>
  );
}

function RefereeAbuseDetails({
  d,
  set,
}: {
  d: Record<string, unknown>;
  set: (k: string, v: unknown) => void;
}) {
  return (
    <div className="space-y-3">
      <Field label="Exact quote (verbatim) *">
        <textarea
          className="input min-h-[80px]"
          value={(d.exactQuote as string) ?? ""}
          onChange={(e) => set("exactQuote", e.target.value)}
          placeholder="Record exact words used"
        />
      </Field>
      <Field label="Abuse type *">
        <Select
          value={(d.abuseType as string) ?? ""}
          onChange={(v) => set("abuseType", v)}
          options={[
            { value: "verbal", label: "Verbal" },
            { value: "physical threatening", label: "Physical (threatening)" },
            { value: "social media", label: "Social media" },
            { value: "other", label: "Other" },
          ]}
        />
      </Field>
      <Field label="Directed at *">
        <Select
          value={(d.directedAt as string) ?? ""}
          onChange={(v) => set("directedAt", v)}
          options={[
            { value: "me", label: "Me (center)" },
            { value: "AR1", label: "AR1" },
            { value: "AR2", label: "AR2" },
            { value: "crew", label: "Entire crew" },
          ]}
        />
      </Field>
      <Field label="Witnesses">
        <input
          className="input"
          value={(d.witnesses as string) ?? ""}
          onChange={(e) => set("witnesses", e.target.value)}
        />
      </Field>
      <Checkbox
        label="Reported to assignor"
        checked={!!(d.reportedToAssignor)}
        onChange={(v) => set("reportedToAssignor", v)}
      />
    </div>
  );
}

function RefereeAssaultDetails({
  d,
  set,
}: {
  d: Record<string, unknown>;
  set: (k: string, v: unknown) => void;
}) {
  return (
    <div className="space-y-3">
      <Field label="Physical description *">
        <textarea
          className="input min-h-[80px]"
          value={(d.physicalDescription as string) ?? ""}
          onChange={(e) => set("physicalDescription", e.target.value)}
          placeholder="Factual description of what was done"
        />
      </Field>
      <Field label="Exact quote (if applicable)">
        <textarea
          className="input min-h-[60px]"
          value={(d.exactQuote as string) ?? ""}
          onChange={(e) => set("exactQuote", e.target.value)}
        />
      </Field>
      <Field label="Perpetrator role *">
        <Select
          value={(d.perpetratorRole as string) ?? ""}
          onChange={(v) => set("perpetratorRole", v)}
          options={["player", "coach", "spectator", "other"]}
        />
      </Field>
      <Field label="Perpetrator name">
        <input
          className="input"
          value={(d.perpetratorName as string) ?? ""}
          onChange={(e) => set("perpetratorName", e.target.value)}
        />
      </Field>
      <Field label="Witnesses">
        <input
          className="input"
          value={(d.witnesses as string) ?? ""}
          onChange={(e) => set("witnesses", e.target.value)}
        />
      </Field>
      <Checkbox
        label="Police were contacted"
        checked={!!(d.policeContacted)}
        onChange={(v) => set("policeContacted", v)}
      />
      {!!(d.policeContacted) && (
        <Field label="Police report number">
          <input
            className="input"
            value={(d.policeReportNumber as string) ?? ""}
            onChange={(e) => set("policeReportNumber", e.target.value)}
          />
        </Field>
      )}
    </div>
  );
}

function SeriousInjuryDetails({
  d,
  set,
  homeTeam,
  awayTeam,
}: {
  d: Record<string, unknown>;
  set: (k: string, v: unknown) => void;
  homeTeam: string;
  awayTeam: string;
}) {
  return (
    <div className="space-y-3">
      <Field label="Injured party role *">
        <Select
          value={(d.injuredPartyRole as string) ?? ""}
          onChange={(v) => set("injuredPartyRole", v)}
          options={["player", "official"]}
        />
      </Field>
      {d.injuredPartyRole === "player" && (
        <Field label="Injured player's team">
          <Select
            value={(d.injuredTeam as string) ?? ""}
            onChange={(v) => set("injuredTeam", v)}
            options={[
              { value: "home", label: homeTeam },
              { value: "away", label: awayTeam },
            ]}
          />
        </Field>
      )}
      <Field label="Injury description *">
        <textarea
          className="input min-h-[80px]"
          value={(d.injuryDescription as string) ?? ""}
          onChange={(e) => set("injuryDescription", e.target.value)}
          placeholder="Factual description — no diagnosis"
        />
      </Field>
      <Checkbox
        label="Ambulance was called"
        checked={!!(d.ambulanceCalled)}
        onChange={(v) => set("ambulanceCalled", v)}
      />
      <Checkbox
        label="Patient was transported to hospital"
        checked={!!(d.hospitalTransport)}
        onChange={(v) => set("hospitalTransport", v)}
      />
    </div>
  );
}

function AbandonmentDetails({
  d,
  set,
}: {
  d: Record<string, unknown>;
  set: (k: string, v: unknown) => void;
}) {
  return (
    <div className="space-y-3">
      <Field label="Reason *">
        <Select
          value={(d.reason as string) ?? ""}
          onChange={(v) => set("reason", v)}
          options={[
            "Field conditions",
            "Weather",
            "Crowd disturbance",
            "Team walkoff",
            "Other",
          ]}
        />
      </Field>
      <Field label="Minute abandoned">
        <input
          className="input"
          type="number"
          min="1"
          value={(d.minuteAbandoned as number) ?? ""}
          onChange={(e) => set("minuteAbandoned", parseInt(e.target.value, 10) || "")}
        />
      </Field>
      <Field label="Score at abandonment">
        <input
          className="input"
          value={(d.scoreAtAbandonment as string) ?? ""}
          onChange={(e) => set("scoreAtAbandonment", e.target.value)}
          placeholder="e.g. 1–0"
        />
      </Field>
      <Field label="Authorities notified">
        <input
          className="input"
          value={(d.notifiedAuthorities as string) ?? ""}
          onChange={(e) => set("notifiedAuthorities", e.target.value)}
          placeholder="e.g. Police, league commissioner"
        />
      </Field>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SupplementalForm({
  matchId,
  homeTeam,
  awayTeam,
  initialData,
  prefill,
}: Props) {
  const router = useRouter();
  const isEdit = !!initialData;

  const [incidentType, setIncidentType] = useState(initialData?.incidentType ?? prefill?.incidentType ?? "");
  const [team, setTeam] = useState(initialData?.team ?? prefill?.team ?? "");
  const [playerName, setPlayerName] = useState(initialData?.playerName ?? prefill?.playerName ?? "");
  const [playerNumber, setPlayerNumber] = useState(initialData?.playerNumber ?? prefill?.playerNumber ?? "");
  const [officialName, setOfficialName] = useState(initialData?.officialName ?? "");
  const [officialRole, setOfficialRole] = useState(initialData?.officialRole ?? "");
  const [minute, setMinute] = useState(initialData?.minute?.toString() ?? prefill?.minute ?? "");
  const [stoppageTime, setStoppageTime] = useState(initialData?.stoppageTime?.toString() ?? prefill?.stoppageTime ?? "");
  const [period, setPeriod] = useState(initialData?.period ?? prefill?.period ?? "");
  const [fieldLocation, setFieldLocation] = useState(initialData?.fieldLocation ?? "");
  const [offenseCode, setOffenseCode] = useState(initialData?.offenseCode ?? prefill?.offenseCode ?? "");
  const [narrative, setNarrative] = useState(initialData?.narrative ?? "");
  const [destinations, setDestinations] = useState<string[]>(
    initialData?.submittedTo ? initialData.submittedTo.split(",") : []
  );
  const [details, setDetails] = useState<Record<string, unknown>>(
    (initialData?.details as Record<string, unknown>) ?? {}
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  function setDetail(key: string, value: unknown) {
    setDetails((prev) => ({ ...prev, [key]: value }));
  }

  function toggleDestination(value: string) {
    setDestinations((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]
    );
  }

  function buildPayload() {
    return {
      incidentType,
      ...(prefill?.gameEventId && !isEdit ? { gameEventId: prefill.gameEventId } : {}),
      team: team || null,
      playerName: playerName || null,
      playerNumber: playerNumber || null,
      officialName: officialName || null,
      officialRole: officialRole || null,
      minute: minute ? parseInt(minute, 10) : null,
      stoppageTime: stoppageTime ? parseInt(stoppageTime, 10) : null,
      period: period || null,
      fieldLocation: fieldLocation || null,
      offenseCode: offenseCode || null,
      narrative: narrative || null,
      details: Object.keys(details).length > 0 ? details : null,
      submittedTo: destinations.length > 0 ? destinations.join(",") : null,
    };
  }

  async function handleSave(status: "draft" | "complete") {
    if (!incidentType) {
      setError("Please select an incident type.");
      return;
    }
    if (status === "complete" && !narrative.trim()) {
      setError("A narrative is required to mark the report complete.");
      return;
    }

    setSaving(true);
    setError("");

    const payload = { ...buildPayload(), status };
    const url = isEdit
      ? `/api/matches/${matchId}/supplementals/${initialData!.id}`
      : `/api/matches/${matchId}/supplementals`;
    const method = isEdit ? "PATCH" : "POST";

    const { error: apiError } = await fetchJson(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (apiError) {
      setError(apiError);
      setSaving(false);
      return;
    }

    router.push(`/matches/${matchId}/supplementals`);
  }

  async function handleDelete() {
    setSaving(true);
    setError("");

    const { error: apiError } = await fetchJson(
      `/api/matches/${matchId}/supplementals/${initialData!.id}`,
      { method: "DELETE" }
    );

    if (apiError) {
      setError("Failed to delete. Please try again.");
      setSaving(false);
      return;
    }

    router.push(`/matches/${matchId}/supplementals`);
  }

  // Which detail sub-form to render
  const detailType =
    incidentType === "send_off" && offenseCode
      ? offenseCodeToDetailType(offenseCode)
      : incidentType;

  const showPlayerFields =
    incidentType === "send_off" ||
    incidentType === "serious_injury" ||
    incidentType === "other";

  const showOfficialFields = incidentType === "coach_dismissal";

  return (
    <div className="space-y-6">
      {/* ── Incident type ── */}
      <div>
        <p className="label mb-2">Incident type *</p>
        <div className="grid grid-cols-2 gap-2">
          {INCIDENT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setIncidentType(type);
                setDetails({});
              }}
              className={`text-left px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                incidentType === type
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              {INCIDENT_TYPE_LABELS[type as IncidentType]}
            </button>
          ))}
        </div>
      </div>

      {incidentType && (
        <>
          {/* ── Basic details ── */}
          <div className="card space-y-4">
            <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
              Incident Details
            </h2>

            {/* Team */}
            {(showPlayerFields || showOfficialFields || incidentType === "referee_abuse" || incidentType === "referee_assault") && (
              <Field label="Team">
                <Select
                  value={team}
                  onChange={setTeam}
                  options={[
                    { value: "home", label: homeTeam },
                    { value: "away", label: awayTeam },
                  ]}
                />
              </Field>
            )}

            {/* Player fields */}
            {showPlayerFields && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Player name">
                  <input
                    className="input"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                  />
                </Field>
                <Field label="Jersey #">
                  <input
                    className="input"
                    value={playerNumber}
                    onChange={(e) => setPlayerNumber(e.target.value)}
                    inputMode="numeric"
                  />
                </Field>
              </div>
            )}

            {/* Official fields */}
            {showOfficialFields && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Official name">
                  <input
                    className="input"
                    value={officialName}
                    onChange={(e) => setOfficialName(e.target.value)}
                  />
                </Field>
                <Field label="Role">
                  <Select
                    value={officialRole}
                    onChange={setOfficialRole}
                    options={[...OFFICIAL_ROLES]}
                  />
                </Field>
              </div>
            )}

            {/* Offense code for red cards */}
            {incidentType === "send_off" && (
              <Field label="Offense code *">
                <Select
                  value={offenseCode}
                  onChange={(v) => {
                    setOffenseCode(v);
                    setDetails({});
                  }}
                  options={RED_REASONS}
                />
              </Field>
            )}

            {/* Time */}
            <div className="grid grid-cols-3 gap-3">
              <Field label="Period">
                <Select value={period} onChange={setPeriod} options={PERIODS} />
              </Field>
              <Field label="Minute">
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={minute}
                  onChange={(e) => setMinute(e.target.value)}
                  inputMode="numeric"
                />
              </Field>
              <Field label="Stoppage">
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={stoppageTime}
                  onChange={(e) => setStoppageTime(e.target.value)}
                  inputMode="numeric"
                />
              </Field>
            </div>

            {/* Field location */}
            <Field label="Field location">
              <Select
                value={fieldLocation}
                onChange={setFieldLocation}
                options={[...FIELD_LOCATIONS]}
              />
            </Field>
          </div>

          {/* ── Type-specific details ── */}
          {(detailType !== "general" && incidentType !== "other") && (
            <div className="card space-y-4">
              <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
                {incidentType === "send_off" ? "Send-off Details" : "Incident Details"}
              </h2>

              {detailType === "violent" && (
                <ViolentDetails d={details} set={setDetail} />
              )}
              {detailType === "dogso" && (
                <DogsoDetails d={details} set={setDetail} />
              )}
              {detailType === "second_caution" && (
                <SecondCautionDetails d={details} set={setDetail} />
              )}
              {detailType === "language" && (
                <LanguageDetails d={details} set={setDetail} />
              )}
              {incidentType === "coach_dismissal" && (
                <CoachDismissalDetails d={details} set={setDetail} />
              )}
              {incidentType === "referee_abuse" && (
                <RefereeAbuseDetails d={details} set={setDetail} />
              )}
              {incidentType === "referee_assault" && (
                <RefereeAssaultDetails d={details} set={setDetail} />
              )}
              {incidentType === "serious_injury" && (
                <SeriousInjuryDetails
                  d={details}
                  set={setDetail}
                  homeTeam={homeTeam}
                  awayTeam={awayTeam}
                />
              )}
              {incidentType === "abandonment" && (
                <AbandonmentDetails d={details} set={setDetail} />
              )}
            </div>
          )}

          {/* ── Narrative ── */}
          <div className="card space-y-3">
            <div>
              <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
                Narrative
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Required to mark complete. Use factual language and Laws of the Game terminology.
              </p>
            </div>
            <textarea
              className="input min-h-[120px]"
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              placeholder="Describe what happened in factual terms…"
            />
          </div>

          {/* ── Submission destinations ── */}
          <div className="card space-y-3">
            <div>
              <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
                Submission Destinations
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Select where this report must be filed — sets the deadline.
              </p>
            </div>
            <div className="space-y-2">
              {SUBMISSION_DESTINATIONS.map((dest) => (
                <Checkbox
                  key={dest.value}
                  label={dest.label}
                  checked={destinations.includes(dest.value)}
                  onChange={() => toggleDestination(dest.value)}
                />
              ))}
            </div>
          </div>

          {/* ── Error ── */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* ── Actions ── */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleSave("complete")}
              disabled={saving}
              className="btn-primary w-full"
            >
              {saving ? "Saving…" : "Mark Complete"}
            </button>
            <button
              type="button"
              onClick={() => handleSave("draft")}
              disabled={saving}
              className="btn-secondary w-full"
            >
              {saving ? "Saving…" : "Save Draft"}
            </button>

            {isEdit && (
              <>
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="btn-danger w-full"
                  >
                    Delete Report
                  </button>
                ) : (
                  <div className="card border border-red-200 space-y-3">
                    <p className="text-sm text-red-700 font-medium">
                      Delete this report? This cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={saving}
                        className="btn-danger flex-1"
                      >
                        {saving ? "Deleting…" : "Yes, delete"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="btn-secondary flex-1"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
