import type { Question } from "./jev";
import type { Attribute } from "./types";

/** How an attribute becomes a typed Jev question. Shared by the server and the "How Jev scores" page. */
export function toQuestion(a: Attribute): Question {
  if (a.kind === "score") return { type: "score", instructions: a.question, criteria: a.levels ?? ["Low", "Medium", "High"] };
  if (a.kind === "choice") return { type: "choice", instructions: a.question, criteria: a.options ?? {} };
  return { type: "noul", instructions: a.question };
}

/** Default rubric for a score attribute the recruiter types in. */
export function rubricFor(label: string) {
  const topic = label.trim().replace(/\.$/, "").toLowerCase();
  return [`No evidence of ${topic}`, `Minimal ${topic}`, `Some ${topic}`, `Solid ${topic}`, `Extensive, standout ${topic}`];
}
