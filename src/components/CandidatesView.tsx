"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, CalendarPlus, ChevronDown, GitCompareArrows, MapPin, Plus, RefreshCw, Search, Sparkles, Star, Trash2, X, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { duration, scoreColor, usd } from "@/lib/fit";
import { ROLES } from "@/lib/roles";
import type { Interview } from "@/lib/seed";
import type { Attribute, Candidate, Cell, Role, Stage } from "@/lib/types";
import { Avatar, FitRing, KIND_LABEL, KindIcon, Pending, STAGES, ScoreBar, Segmented, StagePill } from "./ui";
import type { Run } from "./useScoring";

type Props = {
  role: Role;
  attrs: Attribute[];
  candidates: Candidate[];
  cells: Record<string, Record<string, Cell>>;
  fits: Record<string, number | null>;
  stages: Record<string, Stage>;
  stageFilter: Stage | null;
  setStageFilter: (s: Stage | null) => void;
  activeRun?: Run;
  lastRun?: Run;
  newAttr: string | null;
  compare: string[];
  setCompare: (ids: string[]) => void;
  onOpen: (id: string) => void;
  onAdd: () => void;
  onRemoveAttr: (id: string) => void;
  onWeight: (id: string, w: number) => void;
  onRescore: () => void;
  onCompare: () => void;
  onStage: (id: string, s: Stage) => void;
  onSchedule: (id: string) => void;
  interviews: Record<string, Interview>;
  onHow: () => void;
  onSwitchRole: (id: string) => void;
};

type SortKey = "fit" | "name" | string;

export default function CandidatesView(p: Props) {
  const { role, attrs, candidates, cells, fits, stages } = p;
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "fit", dir: -1 });

  // Recruiter-added criteria go first so a new column is visible the moment it starts filling in.
  const scoreAttrs = [...attrs.filter((a) => a.kind === "score" && a.custom).reverse(), ...attrs.filter((a) => a.kind === "score" && !a.custom)];
  const choiceAttrs = attrs.filter((a) => a.kind === "choice");
  const flagAttrs = attrs.filter((a) => a.kind === "noul" && !a.custom);
  const customNouls = attrs.filter((a) => a.kind === "noul" && a.custom).reverse();
  const rankOf = useMemo(() => new Map(candidates.map((c, i) => [c.id, i + 1])), [candidates]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = candidates.filter(
      (c) =>
        (!p.stageFilter || stages[c.id] === p.stageFilter) &&
        (!needle || `${c.name} ${c.title} ${c.company} ${c.location} ${c.skills.join(" ")}`.toLowerCase().includes(needle)),
    );
    if (sort.key === "fit") return sort.dir === -1 ? list : [...list].reverse();
    const val = (c: Candidate) => (sort.key === "name" ? c.name : (cells[c.id]?.[sort.key]?.value ?? -1));
    return [...list].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      return (typeof x === "string" ? x.localeCompare(y as string) : (x as number) - (y as number)) * sort.dir;
    });
  }, [candidates, q, sort, cells, stages, p.stageFilter]);

  const scored = candidates.filter((c) => fits[c.id] !== null && fits[c.id] !== undefined);
  const fitVals = scored.map((c) => fits[c.id]!);
  const avg = fitVals.length ? fitVals.reduce((a, b) => a + b, 0) / fitVals.length : 0;
  const strong = fitVals.filter((v) => v >= 7).length;
  const interviewsCount = candidates.filter((c) => stages[c.id] === "interview").length;
  const bins = Array.from({ length: 10 }, (_, i) => fitVals.filter((v) => Math.min(9, Math.floor(v)) === i).length);
  const maxBin = Math.max(1, ...bins);

  const toggleCompare = (id: string) =>
    p.setCompare(p.compare.includes(id) ? p.compare.filter((x) => x !== id) : p.compare.length >= 3 ? [...p.compare.slice(1), id] : [...p.compare, id]);

  const header = (key: SortKey, label: React.ReactNode, cls = "") => (
    <th key={key} className={`whitespace-nowrap px-3 py-2.5 text-left text-[11.5px] font-semibold text-ink-2 ${cls}`}>
      <button
        onClick={() => setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: -1 }))}
        className="inline-flex items-center gap-1 hover:text-ink"
      >
        {label}
        {sort.key === key && (sort.dir === -1 ? <ArrowDown size={11} /> : <ArrowUp size={11} />)}
      </button>
    </th>
  );

  return (
    <div className="pb-24">
      {/* Toolbar */}
      <div className="material sticky top-0 z-30 flex items-center gap-3 border-b border-line px-5 py-3 sm:px-8">
        <select
          value={role.id}
          onChange={(e) => p.onSwitchRole(e.target.value)}
          className="min-w-0 max-w-[48%] rounded-lg bg-fill-2 px-2 py-1.5 text-[13px] md:hidden"
          aria-label="Opening"
        >
          {ROLES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title}
            </option>
          ))}
        </select>
        <div className="hidden text-[13px] text-ink-3 md:block">
          Openings <span className="mx-1">/</span> <span className="text-ink">{role.title}</span>
        </div>
        <label className="ml-auto flex h-8 min-w-0 flex-1 items-center gap-2 sm:max-w-[280px] rounded-lg bg-fill-2 px-2.5 focus-within:ring-2 focus-within:ring-cobalt/40">
          <Search size={14} className="text-ink-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search candidates, skills…" className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-ink-3" />
        </label>
        <button
          onClick={p.onRescore}
          disabled={!!p.activeRun}
          className="hidden h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-ink-2 ring-1 ring-line-2 transition hover:bg-fill hover:text-ink disabled:opacity-50 sm:flex"
        >
          <RefreshCw size={13} className={p.activeRun ? "spin" : ""} /> Re-score all
        </button>
      </div>

      <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
        {/* Role header */}
        <div className="flex flex-col gap-6 pb-6 pt-8 lg:flex-row lg:items-end">
          <div className="flex-1">
            <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-cobalt">{role.team}</div>
            <h1 className="mt-1.5 font-serif text-[clamp(2rem,3.6vw,2.9rem)] leading-[1.05] tracking-tight">{role.title}</h1>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-2">
              <span className="flex items-center gap-1">
                <MapPin size={13} /> {role.location}
              </span>
              <span>{role.type}</span>
              <span>Posted {role.postedDaysAgo} days ago</span>
              <span>{candidates.length} applicants</span>
            </div>
            <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">{role.description}</p>
          </div>
          <RunCard active={p.activeRun} last={p.lastRun} onHow={p.onHow} />
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-[1fr_1fr_1fr_1.6fr]">
          <Kpi label="Applicants scored" value={`${scored.length}/${candidates.length}`} />
          <Kpi label="Strong fits (≥ 7.0)" value={String(strong)} accent="var(--emerald)" />
          <Kpi label="Interviews booked" value={String(interviewsCount)} accent="var(--violet)" />
          <div className="card col-span-2 flex items-end gap-4 rounded-2xl p-4 lg:col-span-1">
            <div>
              <div className="text-[12px] text-ink-3">Fit distribution</div>
              <div className="mt-1 text-[22px] font-semibold tabular-nums">
                {avg.toFixed(1)} <span className="text-[13px] font-normal text-ink-3">avg</span>
              </div>
            </div>
            <div className="flex h-12 flex-1 items-end gap-1">
              {bins.map((b, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <motion.div
                    className="w-full rounded-[3px]"
                    style={{ background: scoreColor(i + 0.5) }}
                    initial={{ height: 0 }}
                    animate={{ height: `${(b / maxBin) * 40 + (b ? 4 : 1)}px` }}
                    transition={{ duration: 0.6 }}
                  />
                  <span className="text-[9px] text-ink-3">{i}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Criteria */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">Scoring criteria</span>
          {attrs.map((a) => (
            <AttrChip key={a.id} attr={a} isNew={a.id === p.newAttr} onWeight={(w) => p.onWeight(a.id, w)} onRemove={() => p.onRemoveAttr(a.id)} />
          ))}
          <button
            onClick={p.onAdd}
            className="flex items-center gap-1.5 rounded-full bg-cobalt px-3.5 py-1.5 text-[13px] font-medium text-white shadow-[0_6px_16px_-6px_var(--cobalt)] transition hover:brightness-110 active:scale-95"
          >
            <Plus size={14} strokeWidth={2.5} /> Add attribute
          </button>
        </div>
        <p className="mt-2 text-[12px] text-ink-3">Fit = weighted average of the criteria, computed in code. Change a weight and the ranking updates instantly, no new Jev call.</p>

        {/* Table */}
        <div className="card mt-5 overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <div className="flex items-center gap-2 text-[13px]">
              <span className="font-semibold">{rows.length} candidates</span>
              {p.stageFilter && (
                <button onClick={() => p.setStageFilter(null)} className="flex items-center gap-1 rounded-full bg-fill-2 px-2 py-0.5 text-[12px] text-ink-2">
                  {STAGES.find((s) => s.id === p.stageFilter)!.label} <X size={11} />
                </button>
              )}
            </div>
            <AnimatePresence>
              {p.compare.length > 0 && (
                <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-[12.5px]">
                  <span className="text-ink-3">{p.compare.length} selected</span>
                  <button onClick={() => p.setCompare([])} className="text-ink-3 hover:text-ink">
                    Clear
                  </button>
                  <button
                    disabled={p.compare.length < 2}
                    onClick={p.onCompare}
                    className="flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 font-medium text-white disabled:opacity-40"
                  >
                    <GitCompareArrows size={13} /> Compare
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="thin-scroll overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-fill/60">
                <tr className="border-b border-line">
                  <th className="w-10 px-3" />
                  <th className="w-10 px-1 py-2.5 text-left text-[11.5px] font-semibold text-ink-3">#</th>
                  {header("name", "Candidate", "min-w-[230px]")}
                  {header("fit", "Fit")}
                  {customNouls.map((a) => header(a.id, <span className="flex items-center gap-1 text-cobalt">{a.short ?? a.label}</span>, a.id === p.newAttr ? "bg-cobalt-soft/60" : ""))}
                  {scoreAttrs.map((a) =>
                    header(
                      a.id,
                      <span className={`flex items-center gap-1 ${a.id === p.newAttr ? "text-cobalt" : ""}`}>
                        {a.short ?? a.label}
                        {a.custom && <span className="rounded bg-cobalt-soft px-1 text-[9.5px] font-bold uppercase text-cobalt">new</span>}
                      </span>,
                      a.id === p.newAttr ? "bg-cobalt-soft/60" : "",
                    ),
                  )}
                  {choiceAttrs.map((a) => header(a.id, a.short ?? a.label))}
                  {flagAttrs.length > 0 && <th className="px-3 text-left text-[11.5px] font-semibold text-ink-2">Signals</th>}
                  <th className="px-3 text-left text-[11.5px] font-semibold text-ink-2">Stage</th>
                  <th className="w-20 px-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const row = cells[c.id];
                  const fit = fits[c.id] ?? null;
                  const checked = p.compare.includes(c.id);
                  return (
                    <motion.tr
                      layout="position"
                      transition={{ type: "spring", stiffness: 300, damping: 34 }}
                      key={c.id}
                      onClick={() => p.onOpen(c.id)}
                      className={`group cursor-pointer border-b border-line last:border-0 transition-colors hover:bg-cobalt-soft/40 ${checked ? "bg-cobalt-soft/50" : ""}`}
                    >
                      <td className="px-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCompare(c.id)}
                          className="h-4 w-4 cursor-pointer rounded accent-[var(--cobalt)]"
                          aria-label={`Select ${c.name} to compare`}
                        />
                      </td>
                      <td className="px-1 text-[12px] tabular-nums text-ink-3">{fit === null ? "–" : rankOf.get(c.id)}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={c.name} hue={c.hue} />
                          <div className="min-w-0">
                            <div className="truncate text-[13.5px] font-medium">{c.name}</div>
                            <div className="truncate text-[12px] text-ink-3">
                              {c.title} · {c.company}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3">
                        <FitRing value={fit} size={38} />
                      </td>
                      {customNouls.map((a) => (
                        <td key={a.id} className={`px-3 ${a.id === p.newAttr ? "bg-cobalt-soft/30" : ""}`}>
                          {row?.[a.id] ? <YesNo p={row[a.id].value} /> : <Pending width={56} />}
                        </td>
                      ))}
                      {scoreAttrs.map((a) => (
                        <td key={a.id} className={`px-3 ${a.id === p.newAttr ? "bg-cobalt-soft/30" : ""}`}>
                          {row?.[a.id] ? <ScoreBar value={row[a.id].value} /> : <Pending />}
                        </td>
                      ))}
                      {choiceAttrs.map((a) => (
                        <td key={a.id} className="whitespace-nowrap px-3 text-[12.5px] text-ink-2">
                          {row?.[a.id] ? row[a.id].choice : <Pending width={60} />}
                        </td>
                      ))}
                      {flagAttrs.length > 0 && (
                        <td className="px-3">
                          <div className="flex gap-1">
                            {flagAttrs.map((a) =>
                              row?.[a.id] && row[a.id].value >= 0.5 ? (
                                <span key={a.id} className="whitespace-nowrap rounded-md bg-fill-2 px-1.5 py-0.5 text-[11px] text-ink-2">
                                  {a.short ?? a.label}
                                </span>
                              ) : null,
                            )}
                          </div>
                        </td>
                      )}
                      <td className="px-3">
                        <StagePill stage={stages[c.id]} />
                      </td>
                      <td className="px-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1 opacity-60 transition group-hover:opacity-100">
                          <IconBtn
                            label={stages[c.id] === "shortlisted" ? "Remove from shortlist" : "Shortlist"}
                            onClick={() => p.onStage(c.id, stages[c.id] === "shortlisted" ? "new" : "shortlisted")}
                          >
                            <Star size={15} className={stages[c.id] === "shortlisted" ? "fill-amber text-amber" : ""} />
                          </IconBtn>
                          <IconBtn label="Schedule interview" onClick={() => p.onSchedule(c.id)}>
                            <CalendarPlus size={15} />
                          </IconBtn>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={label} aria-label={label} className="grid h-7 w-7 place-items-center rounded-md text-ink-2 hover:bg-fill-2 hover:text-ink">
      {children}
    </button>
  );
}

function YesNo({ p }: { p: number }) {
  const yes = p >= 0.5;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[12px] font-medium ${yes ? "bg-emerald/10 text-emerald" : "bg-fill-2 text-ink-3"}`}>
      {yes ? "Yes" : "No"} <span className="font-normal tabular-nums opacity-70">{p.toFixed(2)}</span>
    </span>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="card rounded-2xl p-4">
      <div className="text-[12px] text-ink-3">{label}</div>
      <div className="mt-1 text-[26px] font-semibold tabular-nums" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}

function RunCard({ active, last, onHow }: { active?: Run; last?: Run; onHow: () => void }) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(performance.now()), 50);
    return () => clearInterval(t);
  }, [active]);
  const run = active ?? last;
  if (!run) return null;
  const elapsed = active ? Math.max(0, now - active.startedAt) : (last?.done?.wallMs ?? 0);
  const done = run.done;
  return (
    <div className="card w-full rounded-2xl p-4 lg:w-[360px]">
      <div className="flex items-center gap-2 text-[12px] font-medium text-ink-2">
        <span className={`grid h-5 w-5 place-items-center rounded-full ${active ? "bg-cobalt text-white" : "bg-emerald/15 text-emerald"}`}>
          <Zap size={11} fill="currentColor" />
        </span>
        <span className="truncate">{run.label}</span>
        <button onClick={onHow} className="ml-auto flex items-center gap-1 text-cobalt hover:underline">
          <Sparkles size={12} /> How?
        </button>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="whitespace-nowrap text-[26px] font-semibold tabular-nums">{duration(elapsed)}</span>
        <span className="text-[13px] text-ink-3">
          {run.received}/{run.total} resumes{done && done.requests === 0 ? " · answers cached on the server" : ""}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fill-2">
        <motion.div className="h-full rounded-full bg-cobalt" animate={{ width: `${(run.received / Math.max(1, run.total)) * 100}%` }} transition={{ duration: 0.2 }} />
      </div>
      {done && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-[11.5px]">
          <div>
            <div className="text-ink-3">Questions</div>
            <div className="font-medium tabular-nums">{done.questions}</div>
          </div>
          <div>
            <div className="text-ink-3">Jev cost</div>
            <div className="font-medium tabular-nums text-emerald">{usd(done.costUsd)}</div>
          </div>
          <div>
            <div className="text-ink-3">LLM re-parse</div>
            <div className="font-medium tabular-nums">
              ≈ {duration(done.llm.serialMs)}, {usd(done.llm.costUsd)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const WEIGHTS = [0, 0.5, 1, 1.5, 2, 3];

function AttrChip({ attr, isNew, onWeight, onRemove }: { attr: Attribute; isNew: boolean; onWeight: (w: number) => void; onRemove: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium ring-1 transition ${
          isNew ? "bg-cobalt-soft text-cobalt ring-cobalt/30" : "bg-panel text-ink ring-line-2 hover:ring-ink-3"
        }`}
      >
        <span className="text-ink-3">
          <KindIcon kind={attr.kind} />
        </span>
        {attr.label}
        {attr.weight > 0 ? (
          <span className="rounded-full bg-fill-2 px-1.5 text-[10.5px] tabular-nums text-ink-2">×{attr.weight}</span>
        ) : (
          <span className="text-[10.5px] text-ink-3">info</span>
        )}
        <ChevronDown size={12} className="text-ink-3" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="card absolute left-0 top-10 z-40 w-[320px] rounded-xl p-4"
          >
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
              <KindIcon kind={attr.kind} size={12} /> {KIND_LABEL[attr.kind]}
            </div>
            <p className="mt-2 text-[13px] leading-snug">“{attr.question}”</p>
            {attr.levels && (
              <ol className="mt-2 space-y-0.5 text-[11.5px] text-ink-3">
                {attr.levels.map((l, i) => (
                  <li key={l}>
                    <span className="tabular-nums">{((i / (attr.levels!.length - 1)) * 10).toFixed(1)}</span> · {l}
                  </li>
                ))}
              </ol>
            )}
            <div className="mt-3 text-[12px] font-medium text-ink-2">Weight in fit score</div>
            <div className="mt-1.5">
              <Segmented size="sm" value={attr.weight} onChange={onWeight} options={WEIGHTS.map((w) => ({ value: w, label: w === 0 ? "Off" : `×${w}` }))} />
            </div>
            {attr.custom && (
              <button onClick={onRemove} className="mt-3 flex items-center gap-1.5 text-[12.5px] font-medium text-rose hover:underline">
                <Trash2 size={13} /> Remove attribute
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
