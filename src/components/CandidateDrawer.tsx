"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CalendarClock, CalendarPlus, ChevronDown, Mail, MapPin, X } from "lucide-react";
import { useEffect, useState } from "react";
import { CANDIDATE_BY_ID } from "@/lib/candidates";
import { confidenceLabel, scoreColor } from "@/lib/fit";
import type { Interview } from "@/lib/seed";
import type { Attribute, Cell, Candidate, Role, Stage } from "@/lib/types";
import Radar from "./Radar";
import { Avatar, FitRing, KindIcon, Pending, STAGES, Segmented } from "./ui";

type Props = {
  id: string | null;
  role: Role;
  attrs: Attribute[];
  cells: Record<string, Record<string, Cell>>;
  fits: Record<string, number | null>;
  ranked: Candidate[];
  stage: Stage;
  interview?: Interview;
  onClose: () => void;
  onStage: (id: string, s: Stage) => void;
  onSchedule: (id: string) => void;
};

export function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function CandidateDrawer({ id, attrs, cells, fits, ranked, stage, interview, onClose, onStage, onSchedule }: Props) {
  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [id, onClose]);

  const c = id ? CANDIDATE_BY_ID[id] : null;
  return (
    <AnimatePresence>
      {c && (
        <>
          <motion.div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            key={c.id}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 36 }}
            className="thin-scroll fixed inset-y-0 right-0 z-50 w-full max-w-[600px] overflow-y-auto bg-bg shadow-2xl"
          >
            <Body c={c} attrs={attrs} cells={cells[c.id]} fit={fits[c.id] ?? null} rank={ranked.findIndex((x) => x.id === c.id) + 1} total={ranked.length} stage={stage} interview={interview} onClose={onClose} onStage={onStage} onSchedule={onSchedule} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Body({
  c,
  attrs,
  cells,
  fit,
  rank,
  total,
  stage,
  interview,
  onClose,
  onStage,
  onSchedule,
}: {
  c: Candidate;
  attrs: Attribute[];
  cells?: Record<string, Cell>;
  fit: number | null;
  rank: number;
  total: number;
  stage: Stage;
  interview?: Interview;
  onClose: () => void;
  onStage: (id: string, s: Stage) => void;
  onSchedule: (id: string) => void;
}) {
  const scoreAttrs = attrs.filter((a) => a.kind === "score");
  return (
    <div>
      <div className="material sticky top-0 z-10 flex items-center gap-3 border-b border-line px-6 py-4">
        <Avatar name={c.name} hue={c.hue} size={44} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[17px] font-semibold">{c.name}</div>
          <div className="truncate text-[12.5px] text-ink-2">
            {c.title} · {c.company}
          </div>
        </div>
        <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-fill-2 hover:bg-line-2" aria-label="Close">
          <X size={16} />
        </button>
      </div>

      <div className="space-y-5 p-6">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-2">
          <span className="flex items-center gap-1">
            <MapPin size={13} /> {c.location}
          </span>
          <span>{c.years} yrs experience</span>
          <span>via {c.source}</span>
          <span>applied {c.appliedDaysAgo === 0 ? "today" : `${c.appliedDaysAgo}d ago`}</span>
          <span className="flex items-center gap-1">
            <Mail size={13} /> {c.email}
          </span>
        </div>

        <div className="card rounded-2xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented value={stage} onChange={(s) => onStage(c.id, s)} options={STAGES.map((s) => ({ value: s.id, label: s.label }))} size="sm" />
            <button onClick={() => onSchedule(c.id)} className="flex items-center gap-1.5 rounded-lg bg-cobalt px-3 py-1.5 text-[13px] font-medium text-white hover:brightness-110">
              <CalendarPlus size={14} /> {interview ? "Reschedule" : "Schedule interview"}
            </button>
          </div>
          {interview && (
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-violet/8 p-3 text-[13px]" style={{ background: "color-mix(in srgb, var(--violet) 8%, transparent)" }}>
              <CalendarClock size={18} className="text-violet" />
              <div>
                <div className="font-medium">
                  {interview.round} · {formatWhen(interview.when)}
                </div>
                <div className="text-[12px] text-ink-2">
                  {interview.format} with {interview.with}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="card grid items-center gap-4 rounded-2xl p-5 sm:grid-cols-[auto_1fr]">
          <div className="flex flex-col items-center gap-2 px-2">
            <FitRing value={fit} size={96} stroke={8} />
            <div className="text-center text-[12px] text-ink-2">
              {fit === null ? "Scoring…" : (
                <>
                  Rank <span className="font-semibold text-ink">#{rank}</span> of {total}
                  <br />
                  Top {Math.max(1, Math.round((rank / total) * 100))}%
                </>
              )}
            </div>
          </div>
          <div className="flex justify-center">
            {cells && scoreAttrs.every((a) => cells[a.id]) ? (
              <Radar axes={scoreAttrs.map((a) => a.short ?? a.label)} series={[{ name: c.name, color: "var(--cobalt)", values: scoreAttrs.map((a) => cells[a.id].value) }]} size={280} />
            ) : (
              <div className="shimmer h-[220px] w-[220px] rounded-full" />
            )}
          </div>
        </div>

        <section className="card rounded-2xl">
          <div className="border-b border-line px-5 py-3">
            <div className="text-[14px] font-semibold">Jev&apos;s answers</div>
            <div className="text-[12px] text-ink-3">Each criterion is one typed question about this resume. Expand to see the full probability distribution.</div>
          </div>
          <div className="divide-y divide-line">
            {attrs.map((a) => (
              <AnswerRow key={a.id} a={a} cell={cells?.[a.id]} />
            ))}
          </div>
        </section>

        <section className="card rounded-2xl p-5">
          <div className="text-[14px] font-semibold">Resume</div>
          <p className="mt-3 text-[13.5px] leading-relaxed text-ink-2">{c.summary}</p>
          <div className="mt-5 space-y-4">
            {c.experience.map((e) => (
              <div key={`${e.company}-${e.period}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="text-[13.5px] font-semibold">
                    {e.title} · <span className="font-normal">{e.company}</span>
                  </div>
                  <div className="text-[12px] tabular-nums text-ink-3">{e.period}</div>
                </div>
                <div className="text-[12px] text-ink-3">
                  {e.industry} · {e.location}
                </div>
                <ul className="mt-1.5 space-y-1 text-[13px] leading-snug text-ink-2">
                  {e.bullets.map((b) => (
                    <li key={b} className="flex gap-2">
                      <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink-3" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-5 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">Education</div>
          <ul className="mt-1.5 space-y-0.5 text-[13px] text-ink-2">
            {c.education.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {c.skills.map((s) => (
              <span key={s} className="rounded-md bg-fill-2 px-2 py-0.5 text-[12px] text-ink-2">
                {s}
              </span>
            ))}
          </div>
          {c.extras.length > 0 && (
            <ul className="mt-4 space-y-1 text-[12.5px] text-ink-2">
              {c.extras.map((e) => (
                <li key={e}>· {e}</li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

export function Distribution({ a, cell }: { a: Attribute; cell: Cell }) {
  const entries =
    a.kind === "score"
      ? (a.levels ?? []).map((l, i) => ({ label: l, p: cell.probs[String(i)] ?? 0 }))
      : a.kind === "choice"
        ? Object.keys(a.options ?? {}).map((o) => ({ label: o, p: cell.probs[o] ?? 0 }))
        : [
            { label: "Yes", p: cell.value },
            { label: "No", p: 1 - cell.value },
          ];
  const max = Math.max(...entries.map((e) => e.p), 0.0001);
  return (
    <div className="space-y-1.5">
      {entries.map((e, i) => (
        <div key={e.label} className="grid grid-cols-[1fr_120px_40px] items-center gap-3 text-[12px]">
          <span className={`truncate ${e.p === max ? "font-medium text-ink" : "text-ink-2"}`}>{e.label}</span>
          <div className="h-1.5 overflow-hidden rounded-full bg-fill-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(1.5, e.p * 100)}%` }}
              transition={{ duration: 0.6, delay: i * 0.05 }}
              className="h-full rounded-full"
              style={{ background: e.p === max ? "var(--cobalt)" : "var(--ink-3)" }}
            />
          </div>
          <span className="text-right tabular-nums text-ink-3">{(e.p * 100).toFixed(0)}%</span>
        </div>
      ))}
    </div>
  );
}

function AnswerRow({ a, cell }: { a: Attribute; cell?: Cell }) {
  const [open, setOpen] = useState(false);
  const conf = confidenceLabel(cell?.confidence);
  return (
    <div>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-fill">
        <span className="text-ink-3">
          <KindIcon kind={a.kind} />
        </span>
        <span className="flex-1 text-[13px] font-medium">{a.label}</span>
        {!cell ? (
          <Pending width={70} />
        ) : a.kind === "score" ? (
          <span className="text-[14px] font-semibold tabular-nums" style={{ color: scoreColor(cell.value) }}>
            {cell.value.toFixed(1)}
          </span>
        ) : a.kind === "choice" ? (
          <span className="text-[13px] font-medium">{cell.choice}</span>
        ) : (
          <span className={`text-[13px] font-medium ${cell.value >= 0.5 ? "text-emerald" : "text-ink-3"}`}>
            {cell.value >= 0.5 ? "Yes" : "No"} <span className="font-normal tabular-nums">({cell.value.toFixed(2)})</span>
          </span>
        )}
        {conf && (
          <span
            className={`rounded px-1.5 py-0.5 text-[10.5px] font-semibold ${conf === "High" ? "bg-emerald/10 text-emerald" : conf === "Medium" ? "bg-amber/10 text-amber" : "bg-rose/10 text-rose"}`}
          >
            {conf}
          </span>
        )}
        <ChevronDown size={14} className={`text-ink-3 transition ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && cell && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-5 pb-4 pl-12">
              <p className="mb-3 text-[12px] italic text-ink-3">“{a.question}”</p>
              <Distribution a={a} cell={cell} />
              {cell.confidence !== undefined && <p className="mt-2 text-[11.5px] text-ink-3">Confidence {cell.confidence.toFixed(2)}, derived from how peaked the distribution is.</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
