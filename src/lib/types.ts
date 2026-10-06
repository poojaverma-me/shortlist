export type AttributeKind = "score" | "noul" | "choice";

export type Attribute = {
  id: string;
  label: string;
  short?: string;
  kind: AttributeKind;
  /** The question Jev answers about each resume. */
  question: string;
  /** Score: ordered rubric levels (2–10). */
  levels?: string[];
  /** Choice: option → description. */
  options?: Record<string, string | null>;
  /** Choice: numeric value per option, for sorting / weighting. */
  optionValues?: Record<string, number>;
  /** 0 = shown but not counted in the fit score. */
  weight: number;
  custom?: boolean;
};

export type Experience = { title: string; company: string; industry: string; period: string; location: string; bullets: string[] };

export type Stage = "new" | "shortlisted" | "interview" | "rejected";

export type Candidate = {
  id: string;
  roleId: string;
  name: string;
  hue: number;
  title: string;
  company: string;
  location: string;
  years: number;
  email: string;
  source: string;
  appliedDaysAgo: number;
  noticeDays: number;
  summary: string;
  experience: Experience[];
  education: string[];
  skills: string[];
  extras: string[];
  resume: string;
};

export type Role = {
  id: string;
  title: string;
  team: string;
  location: string;
  type: string;
  postedDaysAgo: number;
  description: string;
  attributes: Attribute[];
  suggestions: { label: string; kind: AttributeKind; question: string }[];
};

/** A single Jev answer normalised for the UI. */
export type Cell = {
  /** Score: 0–10. Noul: probability 0–1. Choice: option value (numeric) if mapped. */
  value: number;
  choice?: string;
  confidence?: number;
  probs: Record<string, number>;
};

export type ScoreEvent =
  | { type: "row"; id: string; cells: Record<string, Cell>; latencyMs: number; inputTokens: number; cached: boolean }
  | { type: "error"; id: string; message: string }
  | {
      type: "done";
      wallMs: number;
      requests: number;
      cachedRows: number;
      questions: number;
      inputTokens: number;
      costUsd: number;
      llm: { inputTokens: number; outputTokens: number; costUsd: number; serialMs: number };
    };
