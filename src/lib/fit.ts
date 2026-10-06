import type { Attribute, Cell } from "./types";

/** Every attribute normalised to 0–10 so weights can mix scores, yes/no flags and mapped choices. */
export function normalised(a: Attribute, c: Cell | undefined): number | null {
  if (!c) return null;
  if (a.kind === "score") return c.value;
  if (a.kind === "noul") return c.value * 10;
  const max = Math.max(...Object.values(a.optionValues ?? { x: 1 }));
  return a.optionValues ? (c.value / max) * 10 : null;
}

/** Composite fit: a weighted average computed in code — Jev answers atomic questions, you own the weights. */
export function fitScore(attrs: Attribute[], cells: Record<string, Cell> | undefined) {
  if (!cells) return null;
  let sum = 0;
  let w = 0;
  for (const a of attrs) {
    if (!a.weight) continue;
    const v = normalised(a, cells[a.id]);
    if (v === null) continue;
    sum += v * a.weight;
    w += a.weight;
  }
  return w ? sum / w : null;
}

/** Rose → amber → emerald, tuned for a light background. */
export function scoreColor(v: number) {
  const t = Math.max(0, Math.min(1, v / 10));
  const hue = t < 0.5 ? 352 + (38 - 352 + 360) * (t / 0.5) : 38 + (158 - 38) * ((t - 0.5) / 0.5);
  return `hsl(${hue % 360} ${t < 0.5 ? 72 : 62}% ${t < 0.5 ? 52 : 40}%)`;
}

export function confidenceLabel(c?: number) {
  if (c === undefined) return null;
  return c >= 0.7 ? "High" : c >= 0.4 ? "Medium" : "Low";
}

export function usd(n: number) {
  if (n === 0) return "$0";
  if (n < 0.01) return `$${n.toFixed(5)}`;
  if (n < 10) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(2)}`;
}

export function duration(ms: number) {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.floor(ms / 60_000)} min ${Math.round((ms % 60_000) / 1000)} s`;
}

export const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
