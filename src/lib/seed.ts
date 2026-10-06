import { CANDIDATES } from "./candidates";
import { hash, int, pick, rng } from "./rng";
import type { Stage } from "./types";

export type Interview = { when: string; with: string; format: "Video call" | "On-site" | "Phone screen"; round: string };

export const INTERVIEWERS = [
  { name: "Margaret Ellis", title: "Head of Engineering" },
  { name: "Robert Hughes", title: "Staff Engineer" },
  { name: "Claire Donovan", title: "Engineering Manager" },
  { name: "Simon Whitfield", title: "Principal Scientist" },
  { name: "Julia Barnes", title: "Design Director" },
  { name: "Owen Fletcher", title: "Recruiter" },
];

const day = (offset: number) => {
  const d = new Date(2026, 9, 5 + offset, 10 + (offset % 5), offset % 2 ? 30 : 0);
  return d.toISOString();
};

/** A lived-in pipeline: a few candidates already moved along before the recruiter opens the app. */
export const INITIAL_STAGES: Record<string, Stage> = {};
export const INITIAL_INTERVIEWS: Record<string, Interview> = {};

for (const c of CANDIDATES) {
  const r = rng(hash(`stage-${c.id}`));
  const x = r();
  const stage: Stage = x < 0.07 ? "interview" : x < 0.17 ? "shortlisted" : x < 0.25 ? "rejected" : "new";
  INITIAL_STAGES[c.id] = stage;
  if (stage === "interview")
    INITIAL_INTERVIEWS[c.id] = {
      when: day(int(r, 0, 6)),
      with: pick(r, INTERVIEWERS).name,
      format: pick(r, ["Video call", "On-site", "Phone screen"] as const),
      round: pick(r, ["Technical deep-dive", "Hiring manager", "System design"]),
    };
}
