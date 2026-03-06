/**
 * Supplemental report types and offense-specific detail shapes.
 * Used by both API routes and the UI to ensure consistent structure.
 */

export const INCIDENT_TYPES = [
  "send_off",
  "coach_dismissal",
  "referee_abuse",
  "referee_assault",
  "serious_injury",
  "abandonment",
  "other",
] as const;

export type IncidentType = typeof INCIDENT_TYPES[number];

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  send_off:         "Send-off (Red Card)",
  coach_dismissal:  "Coach / Team Official Dismissal",
  referee_abuse:    "Referee Abuse",
  referee_assault:  "Referee Assault",
  serious_injury:   "Serious Injury",
  abandonment:      "Match Abandonment",
  other:            "Other",
};

export const SUPPLEMENTAL_STATUSES = ["draft", "complete"] as const;
export type SupplementalStatus = typeof SUPPLEMENTAL_STATUSES[number];

// Submission deadlines in hours by governing body
export const SUBMISSION_DEADLINES: Record<string, number> = {
  WYS:   24,  // Washington Youth Soccer
  WPL:   48,  // Washington Premier League
  WASA:  24,  // Washington Adult Soccer — "next business day" ≈ 24h
  USSF:  24,
  other: 48,
};

export const SUBMISSION_DESTINATIONS = [
  { value: "WYS",   label: "Washington Youth Soccer (Ridgestar)" },
  { value: "WPL",   label: "Washington Premier League (Ridgestar)" },
  { value: "WASA",  label: "Washington Adult Soccer" },
  { value: "USSF",  label: "US Soccer" },
  { value: "email", label: "Email to league/assignor" },
  { value: "other", label: "Other" },
] as const;

export const FIELD_LOCATIONS = [
  "Own penalty area",
  "Own half — wide left",
  "Own half — wide right",
  "Own half — center",
  "Center circle",
  "Opponent half — wide left",
  "Opponent half — wide right",
  "Opponent half — center",
  "Attacking penalty area",
] as const;

export const OFFICIAL_ROLES = [
  "Head Coach",
  "Assistant Coach",
  "Team Manager",
  "Other Team Official",
] as const;

// ── Detail shapes per incident type ─────────────────────────────────────────

/** send_off — Violent Conduct or Serious Foul Play */
export interface SendOffViolentDetails {
  bodyPartUsed: string;          // "elbow", "head", "fist", "foot", etc.
  forceDescription: string;      // "struck with elbow", "lunged at"
  victimName?: string;
  victimNumber?: string;
  victimTeam?: string;           // "home" | "away" | "official" | "spectator"
  contactLocation?: string;      // where on victim's body: "head", "face"
  victimInjured: boolean;
  victimReturnedToPlay?: boolean;
  ballInPlay?: boolean;
  directionOfPlay?: string;
}

/** send_off — DOGSO (Denying an Obvious Goal Scoring Opportunity) */
export interface SendOffDogsoDetails {
  dogsoType: "foul" | "handball";
  ballPosition: string;
  playerPosition: string;
  goalDistance?: string;
  defenderCount: number;          // number of defenders between player and goal (excluding keeper)
  keeperPosition?: string;
  directionOfPlay?: string;
}

/** send_off — Second Caution */
export interface SendOffSecondCautionDetails {
  firstCautionMinute: number;
  firstCautionPeriod: string;
  firstCautionReason: string;
  secondCautionReason: string;
}

/** send_off — Offensive / Abusive / Insulting Language or Gestures */
export interface SendOffLanguageDetails {
  exactQuote: string;            // verbatim — required
  directedAt: string;            // "referee", "opponent", "spectator"
  witnesses?: string;
}

/** coach_dismissal */
export interface CoachDismissalDetails {
  exactQuote?: string;
  behaviourDescription: string;  // what they did/said beyond the quote
  priorWarning: boolean;         // was a warning issued before dismissal?
  warningMinute?: number;
  witnesses?: string;
}

/** referee_abuse */
export interface RefereeAbuseDetails {
  exactQuote: string;            // verbatim — required by USSF/WASRC
  abuseType: string;             // "verbal", "physical threatening", "social media", "other"
  directedAt: string;            // "me", "AR1", "AR2", "crew"
  witnesses?: string;
  reportedToAssignor: boolean;
}

/** referee_assault */
export interface RefereeAssaultDetails {
  physicalDescription: string;   // exactly what was done
  exactQuote?: string;
  perpetratorRole: string;       // "player", "coach", "spectator"
  perpetratorName?: string;
  witnesses?: string;
  policeContacted: boolean;
  policeReportNumber?: string;
}

/** serious_injury */
export interface SeriousInjuryDetails {
  injuredPartyRole: string;      // "player", "official"
  injuredTeam?: string;
  injuryDescription: string;     // factual description — no diagnosis
  ambulanceCalled: boolean;
  hospitalTransport: boolean;
}

/** abandonment */
export interface AbandonmentDetails {
  reason: string;                // "field conditions", "weather", "crowd", "team walkoff"
  minuteAbandoned?: number;
  scoreAtAbandonment?: string;
  notifiedAuthorities?: string;
}

export type SupplementalDetails =
  | SendOffViolentDetails
  | SendOffDogsoDetails
  | SendOffSecondCautionDetails
  | SendOffLanguageDetails
  | CoachDismissalDetails
  | RefereeAbuseDetails
  | RefereeAssaultDetails
  | SeriousInjuryDetails
  | AbandonmentDetails
  | Record<string, unknown>;

/**
 * Given a red card offense code, return which incident detail shape applies.
 */
export function offenseCodeToDetailType(offenseCode: string): string {
  switch (offenseCode) {
    case "Serious foul play":
    case "Violent conduct":
    case "Spitting":
      return "violent";
    case "DOGSO - foul":
    case "DOGSO - handball":
      return "dogso";
    case "Second caution":
      return "second_caution";
    case "Offensive/abusive/insulting language":
      return "language";
    default:
      return "general";
  }
}

/**
 * Returns the deadline (in hours) for supplemental submission based on destination.
 */
export function getDeadlineHours(destinations: string[]): number {
  const hours = destinations.map((d) => SUBMISSION_DEADLINES[d] ?? 48);
  return Math.min(...hours); // use the strictest (shortest) deadline
}

/**
 * Returns the deadline datetime given match date and destinations.
 */
export function getDeadlineDate(matchDate: Date, destinations: string[]): Date {
  const hours = getDeadlineHours(destinations);
  return new Date(matchDate.getTime() + hours * 60 * 60 * 1000);
}
