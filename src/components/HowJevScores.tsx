"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Play, RotateCcw, Sparkles, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { duration, fitScore, normalised, scoreColor, usd } from "@/lib/fit";
import { rubricFor, toQuestion } from "@/lib/questions";
import type { Attribute, Candidate, Cell, Role } from "@/lib/types";
import { Distribution } from "./CandidateDrawer";
import { Avatar, KIND_LABEL, KindIcon } from "./ui";
import type { Done, Run } from "./useScoring";

type ScoreFn = (
  roleId: string,
  attributes: Attribute[],
  total: number,
  opts: { label: string; fresh?: boolean; ids?: string[]; onRow?: (id: string, cells: Record<string, Cell>) => void },
) => Promise<Done | null>;

type Props = {
  role: Role;
  attrs: Attribute[];
  ranked: Candidate[];
  cells: Record<string, Record<string, Cell>>;
  fits: Record<string, number | null>;
  runs: Run[];
  score: ScoreFn;
};

const ease = [0.22, 1, 0.36, 1] as const;
const clock = () => performance.now();
const raceId = () => `race-${Date.now().toString(36)}`;

export default function HowJevScores({ role, attrs, ranked, runs, score }: Props) {
  return (
    <div className="mx-auto max-w-[1280px] px-5 pb-24 pt-10 sm:px-8">
      <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-cobalt">How Jev scores</div>
      <h1 className="mt-2 max-w-3xl font-serif text-[clamp(2.2rem,4.4vw,3.6rem)] leading-[1.02] tracking-tight">
        One resume in, typed answers out, <span className="italic text-cobalt">no prompt engineering.</span>
      </h1>
      <p className="mt-4 max-w-2xl text-[15.5px] leading-relaxed text-ink-2">
        Each criterion is a typed question: a <b>Score</b> against a rubric, a <b>Choice</b> between categories, or a <b>Noul</b> (yes / no). Jev answers
        all of them about a resume in a single call and returns a calibrated probability for every possible answer. The fit score is plain arithmetic
        on top.
      </p>

      <SingleResume role={role} attrs={attrs} ranked={ranked} score={score} />
      <BatchRace role={role} ranked={ranked} score={score} />
      <SessionLog runs={runs} />
    </div>
  );
}

/* ───────────── 1. One resume, every question ───────────── */

function SingleResume({ role, attrs, ranked, score }: { role: Role; attrs: Attribute[]; ranked: Candidate[]; score: ScoreFn }) {
  const [id, setId] = useState(ranked[0]?.id);
  const [result, setResult] = useState<{ cells: Record<string, Cell>; done: Done | null; wall: number } | null>(null);
  const [running, setRunning] = useState(false);
  const [shown, setShown] = useState(0);
  const c = ranked.find((x) => x.id === id) ?? ranked[0];

  useEffect(() => {
    if (!result || shown >= attrs.length) return;
    const t = setTimeout(() => setShown((s) => s + 1), 380);
    return () => clearTimeout(t);
  }, [result, shown, attrs.length]);

  const run = async () => {
    setRunning(true);
    setResult(null);
    setShown(0);
    let rowCells: Record<string, Cell> = {};
    const t = clock();
    const done = await score(role.id, attrs, 1, { label: `Live score · ${c.name}`, fresh: true, ids: [c.id], onRow: (_, cells) => (rowCells = cells) });
    setResult({ cells: rowCells, done, wall: Math.round(clock() - t) });
    setRunning(false);
  };

  const request = useMemo(() => ({ model: "jev-latest", state: c.resume, questions: Object.fromEntries(attrs.map((a) => [a.id, toQuestion(a)])) }), [c, attrs]);
  const fit = result ? fitScore(attrs, result.cells) : null;
  const allShown = result && shown >= attrs.length;

  return (
    <section className="mt-10">
      <div className="card flex flex-wrap items-center gap-3 rounded-2xl p-4">
        <span className="text-[13px] font-medium text-ink-2">Resume</span>
        <select
          value={c.id}
          onChange={(e) => {
            setId(e.target.value);
            setResult(null);
          }}
          className="h-9 min-w-[260px] rounded-lg bg-fill-2 px-3 text-[13.5px] outline-none"
        >
          {ranked.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name} · {x.title} · {x.company}
            </option>
          ))}
        </select>
        <span className="text-[12.5px] text-ink-3">
          {attrs.length} questions · 1 request
        </span>
        <button
          onClick={run}
          disabled={running}
          className="ml-auto flex items-center gap-2 rounded-lg bg-cobalt px-4 py-2 text-[13.5px] font-medium text-white shadow-[0_8px_20px_-8px_var(--cobalt)] transition hover:brightness-110 disabled:opacity-60"
        >
          {running ? <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent spin" /> : result ? <RotateCcw size={14} /> : <Play size={14} fill="currentColor" />}
          {running ? "Asking Jev…" : result ? "Score again" : "Score this resume live"}
        </button>
      </div>

      {result?.done && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex flex-wrap gap-2 text-[12.5px]">
          <Badge tone="cobalt">Jev answered in {duration(result.done.wallMs)}</Badge>
          <Badge>{result.done.inputTokens.toLocaleString()} input tokens</Badge>
          <Badge tone="emerald">{usd(result.done.costUsd)}</Badge>
          <Badge>Round trip {duration(result.wall)}</Badge>
        </motion.div>
      )}

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        {/* Resume paper */}
        <div className="card relative overflow-hidden rounded-2xl">
          <div className="flex items-center gap-3 border-b border-line px-5 py-3">
            <Avatar name={c.name} hue={c.hue} size={30} />
            <div className="text-[13px]">
              <div className="font-semibold">state</div>
              <div className="text-ink-3">the resume text, exactly as sent</div>
            </div>
          </div>
          <pre className="thin-scroll max-h-[620px] overflow-y-auto whitespace-pre-wrap px-5 py-4 font-serif text-[14px] leading-[1.55] text-ink-2">{c.resume}</pre>
          {running && <motion.div className="pointer-events-none absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-cobalt/10 to-transparent" initial={{ top: "-20%" }} animate={{ top: "110%" }} transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }} />}
        </div>

        {/* Questions */}
        <div className="space-y-2.5">
          {attrs.map((a, i) => {
            const cell = result?.cells[a.id];
            const visible = !!cell && i < shown;
            return (
              <motion.div key={a.id} layout className={`card rounded-xl p-4 transition ${visible ? "ring-1 ring-cobalt/25" : ""}`}>
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md ${visible ? "bg-cobalt text-white" : "bg-fill-2 text-ink-3"}`}>
                    <KindIcon kind={a.kind} size={12} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[13.5px] font-semibold">{a.label}</span>
                      <span className="shrink-0 font-mono text-[10.5px] uppercase tracking-wide text-ink-3">{a.kind === "noul" ? "noul" : a.kind} · {KIND_LABEL[a.kind]}</span>
                    </div>
                    <p className="mt-0.5 text-[12.5px] text-ink-3">“{a.question}”</p>
                    <AnimatePresence>
                      {visible && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} transition={{ duration: 0.35, ease }} className="overflow-hidden">
                          <div className="mt-3 flex items-center gap-3 text-[13px]">
                            <span className="font-semibold">Answer:</span>
                            {a.kind === "score" ? (
                              <span className="font-semibold tabular-nums" style={{ color: scoreColor(cell.value) }}>
                                {cell.value.toFixed(1)} / 10
                              </span>
                            ) : a.kind === "choice" ? (
                              <span className="font-semibold">{cell.choice}</span>
                            ) : (
                              <span className={`font-semibold ${cell.value >= 0.5 ? "text-emerald" : "text-ink-2"}`}>{cell.value >= 0.5 ? "Yes" : "No"} · p = {cell.value.toFixed(2)}</span>
                            )}
                            {cell.confidence !== undefined && <span className="text-[11.5px] text-ink-3">confidence {cell.confidence.toFixed(2)}</span>}
                          </div>
                          <div className="mt-2.5">
                            <Distribution a={a} cell={cell} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Composite */}
      <AnimatePresence>
        {allShown && result && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }} className="card mt-6 rounded-2xl p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">Composite fit · computed in code</div>
                <div className="mt-1 text-[14px] text-ink-2">Σ (weight × answer) ÷ Σ weight. Change a weight on the Candidates page and every rank updates without another call.</div>
              </div>
              <div className="text-right">
                <div className="text-[44px] font-semibold leading-none tabular-nums" style={{ color: fit !== null ? scoreColor(fit) : undefined }}>
                  {fit?.toFixed(2)}
                </div>
                <div className="text-[12px] text-ink-3">fit score for {c.name}</div>
              </div>
            </div>
            <div className="mt-5 space-y-2">
              {attrs
                .filter((a) => a.weight > 0)
                .map((a, i) => {
                  const v = normalised(a, result.cells[a.id]) ?? 0;
                  return (
                    <div key={a.id} className="grid grid-cols-[160px_60px_1fr_70px] items-center gap-3 text-[13px]">
                      <span className="truncate">{a.label}</span>
                      <span className="tabular-nums text-ink-3">× {a.weight}</span>
                      <div className="h-2 overflow-hidden rounded-full bg-fill-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${v * 10}%` }}
                          transition={{ delay: i * 0.08, duration: 0.7, ease }}
                          className="h-full rounded-full"
                          style={{ background: scoreColor(v) }}
                        />
                      </div>
                      <span className="text-right tabular-nums">{(v * a.weight).toFixed(1)}</span>
                    </div>
                  );
                })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <details className="card group mt-6 rounded-2xl">
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-[14px] font-semibold">
          The exact request · POST https://api.typesafe.ai/v1/systemone
          <span className="text-[12px] font-normal text-ink-3 group-open:hidden">Show JSON</span>
        </summary>
        <pre className="thin-scroll max-h-[480px] overflow-auto border-t border-line bg-[#0f1115] px-5 py-4 font-mono text-[12px] leading-relaxed text-[#c9d1e0]">
          {JSON.stringify(request, null, 2)}
        </pre>
      </details>
    </section>
  );
}

/* ───────────── 2. One new attribute, every resume ───────────── */

function BatchRace({ role, ranked, score }: { role: Role; ranked: Candidate[]; score: ScoreFn }) {
  const options = role.suggestions.filter((s) => s.kind === "score");
  const [label, setLabel] = useState(options[0]?.label ?? "");
  const [vals, setVals] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [start, setStart] = useState(0);
  const [now, setNow] = useState(0);
  const [done, setDone] = useState<Done | null>(null);

  useEffect(() => {
    if (phase === "idle") return;
    const t = setInterval(() => setNow(clock()), 40);
    return () => clearInterval(t);
  }, [phase]);

  const run = async () => {
    const s = options.find((o) => o.label === label)!;
    const a: Attribute = { id: raceId(), label: s.label, kind: "score", question: s.question, levels: rubricFor(s.label), weight: 1, custom: true };
    setVals({});
    setDone(null);
    setPhase("running");
    const t0 = clock();
    setStart(t0);
    setNow(t0);
    const d = await score(role.id, [a], ranked.length, {
      label: `Race · “${s.label}” on ${ranked.length} resumes`,
      fresh: true,
      onRow: (id, cells) => setVals((v) => ({ ...v, [id]: cells[a.id]?.value ?? 0 })),
    });
    setDone(d);
    setPhase("done");
  };

  const jevMs = done ? done.wallMs : Math.max(0, now - start);
  const elapsed = Math.max(0, now - start);
  const llmMs = done?.llm.serialMs ?? ranked.length * 4800;
  const llmProgress = Math.min(1, elapsed / llmMs);
  const top = Object.entries(vals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const byId = Object.fromEntries(ranked.map((c) => [c.id, c]));

  return (
    <section className="card mt-14 overflow-hidden rounded-[24px]">
      <div className="border-b border-line bg-gradient-to-br from-cobalt-soft to-panel p-6 sm:p-8">
        <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-cobalt">
          <Zap size={13} fill="currentColor" /> The one-click test
        </div>
        <h2 className="mt-2 font-serif text-[clamp(1.8rem,3vw,2.5rem)] leading-tight">The hiring manager wants a new criterion. Now.</h2>
        <p className="mt-2 max-w-2xl text-[14.5px] text-ink-2">
          An LLM pipeline that extracted fixed JSON fields has to re-read every resume. Jev asks one new question per resume, in parallel. This run is
          live; the LLM lane is projected from token counts at ~75 tokens/s.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <select value={label} onChange={(e) => setLabel(e.target.value)} className="h-10 rounded-lg bg-panel px-3 text-[14px] ring-1 ring-line-2">
            {options.map((o) => (
              <option key={o.label}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={run}
            disabled={phase === "running"}
            className="flex h-10 items-center gap-2 rounded-lg bg-ink px-4 text-[14px] font-medium text-white transition hover:bg-ink/90 disabled:opacity-60"
          >
            <Sparkles size={15} /> Score all {ranked.length} resumes on it
          </button>
        </div>
      </div>

      <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="grid grid-cols-8 gap-2 sm:grid-cols-10">
            {ranked.map((c, i) => {
              const v = vals[c.id];
              return (
                <motion.div
                  key={c.id}
                  title={c.name}
                  animate={{ scale: v !== undefined ? [0.8, 1.08, 1] : 1 }}
                  transition={{ duration: 0.35 }}
                  className="grid aspect-square place-items-center rounded-lg text-[11px] font-semibold"
                  style={{
                    // Intensity of blue = how strongly the resume shows the new criterion.
                    background: v !== undefined ? `color-mix(in srgb, var(--cobalt) ${12 + v * 8.8}%, white)` : "var(--fill-2)",
                    color: v === undefined ? "var(--ink-3)" : v >= 4 ? "white" : "var(--cobalt)",
                  }}
                >
                  {v !== undefined ? v.toFixed(1) : i + 1}
                </motion.div>
              );
            })}
          </div>
          {phase === "done" && top.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2 text-[12.5px]">
              <span className="text-ink-3">Strongest on “{label}”:</span>
              {top.map(([id, v]) => (
                <span key={id} className="rounded-full bg-fill-2 px-2.5 py-0.5">
                  {byId[id]?.name} · <b className="tabular-nums">{v.toFixed(1)}</b>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <Lane label="Jev" color="var(--cobalt)" progress={phase === "idle" ? 0 : Object.keys(vals).length / ranked.length} time={phase === "idle" ? "—" : duration(jevMs)} sub={done ? `${done.requests} calls · ${usd(done.costUsd)}` : phase === "running" ? "streaming…" : "ready"} />
          <Lane
            label="LLM re-parse (projected)"
            color="var(--ink-3)"
            progress={phase === "idle" ? 0 : llmProgress}
            time={phase === "idle" ? "—" : `${duration(elapsed)} / ≈ ${duration(llmMs)}`}
            sub={done ? `≈ ${done.llm.inputTokens.toLocaleString()} in + ${done.llm.outputTokens.toLocaleString()} out tokens · ${usd(done.llm.costUsd)}` : "re-reads every resume"}
          />
          {done && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-cobalt-soft p-3">
                <div className="text-[26px] font-semibold tabular-nums text-cobalt">{Math.round(done.llm.serialMs / Math.max(1, done.wallMs)).toLocaleString()}×</div>
                <div className="text-[12px] text-ink-2">faster</div>
              </div>
              <div className="rounded-xl bg-emerald/10 p-3">
                <div className="text-[26px] font-semibold tabular-nums text-emerald">{Math.round(done.llm.costUsd / Math.max(1e-9, done.costUsd)).toLocaleString()}×</div>
                <div className="text-[12px] text-ink-2">cheaper</div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}

function Lane({ label, color, progress, time, sub }: { label: string; color: string; progress: number; time: string; sub: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-[13px]">
        <span className="font-semibold">{label}</span>
        <span className="font-mono text-[12px] tabular-nums">{time}</span>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-fill-2">
        <motion.div className="h-full rounded-full" style={{ background: color }} animate={{ width: `${Math.max(progress > 0 ? 1 : 0, progress * 100)}%` }} transition={{ duration: 0.15 }} />
      </div>
      <div className="mt-1 text-[11.5px] text-ink-3">{sub}</div>
    </div>
  );
}

/* ───────────── 3. Session log ───────────── */

function SessionLog({ runs }: { runs: Run[] }) {
  const done = runs.filter((r) => r.done);
  if (!done.length) return null;
  return (
    <section className="card mt-10 overflow-hidden rounded-2xl">
      <div className="border-b border-line px-5 py-4">
        <div className="text-[15px] font-semibold">Every Jev run this session</div>
        <div className="text-[12.5px] text-ink-3">Measured latency and cost, next to what re-parsing with an LLM would take for the same change.</div>
      </div>
      <div className="thin-scroll overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead className="bg-fill/60 text-left text-[11.5px] text-ink-2">
            <tr>
              <th className="px-5 py-2.5 font-semibold">Run</th>
              <th className="px-3 font-semibold">Resumes</th>
              <th className="px-3 font-semibold">Questions</th>
              <th className="px-3 font-semibold">Input tokens</th>
              <th className="px-3 font-semibold">Jev time</th>
              <th className="px-3 font-semibold">Jev cost</th>
              <th className="px-3 font-semibold">LLM (est.)</th>
            </tr>
          </thead>
          <tbody>
            {done.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="px-5 py-2.5">{r.label}</td>
                <td className="px-3 tabular-nums">{r.total}</td>
                <td className="px-3 tabular-nums">{r.done!.questions}</td>
                <td className="px-3 tabular-nums">{r.done!.inputTokens.toLocaleString()}</td>
                <td className="px-3 tabular-nums">{duration(r.done!.wallMs)}</td>
                <td className="px-3 tabular-nums text-emerald">{usd(r.done!.costUsd)}</td>
                <td className="px-3 tabular-nums text-ink-2">
                  {duration(r.done!.llm.serialMs)} · {usd(r.done!.llm.costUsd)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone?: "cobalt" | "emerald" }) {
  const cls = tone === "cobalt" ? "bg-cobalt-soft text-cobalt" : tone === "emerald" ? "bg-emerald/10 text-emerald" : "bg-fill-2 text-ink-2";
  return <span className={`rounded-full px-2.5 py-1 font-medium ${cls}`}>{children}</span>;
}
