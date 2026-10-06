"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CalendarCheck, Check, X } from "lucide-react";
import { useMemo, useState } from "react";
import { hash, rng } from "@/lib/rng";
import { INTERVIEWERS, type Interview } from "@/lib/seed";
import type { Candidate } from "@/lib/types";
import { Avatar, Segmented } from "./ui";

const SLOTS = ["09:30", "11:00", "12:30", "14:00", "15:30", "17:00"];
const ROUNDS = ["Technical deep-dive", "Hiring manager", "System design"];

function weekdays(n: number) {
  const out: Date[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  while (out.length < n) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) out.push(new Date(d));
  }
  return out;
}

export default function ScheduleModal({ candidate, onClose, onConfirm }: { candidate: Candidate | null; onClose: () => void; onConfirm: (id: string, iv: Interview) => void }) {
  return <AnimatePresence>{candidate && <Inner key={candidate.id} c={candidate} onClose={onClose} onConfirm={onConfirm} />}</AnimatePresence>;
}

function Inner({ c, onClose, onConfirm }: { c: Candidate; onClose: () => void; onConfirm: (id: string, iv: Interview) => void }) {
  const days = useMemo(() => weekdays(7), []);
  const [day, setDay] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);
  const [who, setWho] = useState(INTERVIEWERS[0].name);
  const [format, setFormat] = useState<Interview["format"]>("Video call");
  const [round, setRound] = useState(ROUNDS[0]);
  // Some slots are already taken on the interviewer's (mock) calendar.
  const busy = useMemo(() => {
    const r = rng(hash(`${who}-${day}`));
    return new Set(SLOTS.filter(() => r() < 0.3));
  }, [who, day]);

  const confirm = () => {
    if (!slot) return;
    const [h, m] = slot.split(":").map(Number);
    const when = new Date(days[day]);
    when.setHours(h, m);
    onConfirm(c.id, { when: when.toISOString(), with: who, format, round });
  };

  return (
    <motion.div className="fixed inset-0 z-[70] grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        role="dialog"
        aria-modal
        aria-label={`Schedule interview with ${c.name}`}
        initial={{ y: 24, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 16, opacity: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 30 }}
        className="relative w-full max-w-[620px] overflow-hidden rounded-[22px] bg-bg shadow-2xl ring-1 ring-line"
      >
        <div className="flex items-center gap-3 border-b border-line bg-panel px-6 py-4">
          <Avatar name={c.name} hue={c.hue} size={40} />
          <div className="flex-1">
            <div className="font-serif text-[1.35rem] leading-tight">Schedule an interview</div>
            <div className="text-[12.5px] text-ink-2">
              {c.name} · {c.title}
            </div>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-fill-2" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-5 p-6">
          <div className="flex flex-wrap gap-3">
            <Segmented size="sm" value={round} onChange={setRound} options={ROUNDS.map((r) => ({ value: r, label: r }))} />
            <Segmented size="sm" value={format} onChange={setFormat} options={(["Video call", "On-site", "Phone screen"] as const).map((f) => ({ value: f, label: f }))} />
          </div>

          <div>
            <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">Interviewer</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {INTERVIEWERS.map((p, i) => (
                <button
                  key={p.name}
                  onClick={() => setWho(p.name)}
                  className={`flex items-center gap-2 rounded-xl p-2 text-left ring-1 transition ${who === p.name ? "bg-cobalt-soft ring-cobalt/40" : "bg-panel ring-line hover:ring-line-2"}`}
                >
                  <Avatar name={p.name} hue={i * 57} size={28} />
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] font-medium">{p.name}</span>
                    <span className="block truncate text-[11px] text-ink-3">{p.title}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">Date</div>
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              {days.map((d, i) => (
                <button
                  key={d.toISOString()}
                  onClick={() => {
                    setDay(i);
                    setSlot(null);
                  }}
                  className={`flex w-[68px] shrink-0 flex-col items-center rounded-xl py-2 ring-1 transition ${day === i ? "bg-ink text-white ring-ink" : "bg-panel ring-line hover:ring-line-2"}`}
                >
                  <span className={`text-[11px] ${day === i ? "text-white/70" : "text-ink-3"}`}>{d.toLocaleDateString("en-GB", { weekday: "short" })}</span>
                  <span className="text-[18px] font-semibold tabular-nums">{d.getDate()}</span>
                  <span className={`text-[10.5px] ${day === i ? "text-white/70" : "text-ink-3"}`}>{d.toLocaleDateString("en-GB", { month: "short" })}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">Time</div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {SLOTS.map((s) => {
                const taken = busy.has(s);
                return (
                  <button
                    key={s}
                    disabled={taken}
                    onClick={() => setSlot(s)}
                    className={`rounded-lg py-2 text-[13px] font-medium tabular-nums ring-1 transition ${
                      slot === s ? "bg-cobalt text-white ring-cobalt" : taken ? "bg-fill text-ink-3 line-through ring-transparent" : "bg-panel ring-line hover:ring-cobalt/40"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-line bg-panel px-6 py-4">
          <span className="text-[12px] text-ink-3">Demo only. Adds to the pipeline; no invite is sent.</span>
          <button
            disabled={!slot}
            onClick={confirm}
            className="flex items-center gap-1.5 rounded-lg bg-cobalt px-4 py-2 text-[13.5px] font-medium text-white transition hover:brightness-110 disabled:opacity-40"
          >
            {slot ? <CalendarCheck size={15} /> : <Check size={15} />} Book interview
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
