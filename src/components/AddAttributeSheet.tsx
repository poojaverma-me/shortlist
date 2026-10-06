"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Plus, Sparkles, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { rubricFor } from "@/lib/questions";
import type { Attribute, AttributeKind, Role } from "@/lib/types";
import { KindIcon, KIND_LABEL, Segmented } from "./ui";

type Props = { open: boolean; role: Role; existing: Attribute[]; count: number; onClose: () => void; onAdd: (a: Attribute) => void };

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "attr";

function build(label: string, kind: AttributeKind, question: string, weight: number): Attribute {
  return {
    id: `custom-${slug(label)}-${Date.now().toString(36)}`,
    label: label.trim(),
    short: label.trim().length > 16 ? label.trim().split(" ").slice(0, 2).join(" ") : label.trim(),
    kind,
    question: question.trim(),
    levels: kind === "score" ? rubricFor(label) : undefined,
    weight,
    custom: true,
  };
}

const defaultQuestion = (label: string, kind: AttributeKind) =>
  !label.trim()
    ? ""
    : kind === "score"
      ? `How much ${label.trim().toLowerCase()} does the candidate have, based on the resume?`
      : `Does the candidate have ${label.trim().toLowerCase()}?`;

export default function AddAttributeSheet({ open, role, existing, count, onClose, onAdd }: Props) {
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<AttributeKind>("score");
  const [question, setQuestion] = useState("");
  const [touched, setTouched] = useState(false);
  const [weight, setWeight] = useState(1);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const q = touched ? question : defaultQuestion(label, kind);
  const used = new Set(existing.map((a) => a.label));
  const reset = () => {
    setLabel("");
    setQuestion("");
    setTouched(false);
    setKind("score");
    setWeight(1);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal
            aria-label="Add a scoring attribute"
            initial={{ y: 24, scale: 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            className="relative max-h-[90vh] w-full max-w-[720px] overflow-y-auto rounded-[22px] bg-bg shadow-2xl ring-1 ring-line"
          >
            <div className="flex items-start gap-3 border-b border-line bg-panel px-6 py-5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-cobalt-soft text-cobalt">
                <Sparkles size={18} />
              </div>
              <div className="flex-1">
                <h2 className="font-serif text-[1.6rem] leading-tight">Add a scoring attribute</h2>
                <p className="text-[13px] text-ink-2">
                  Jev scores all {count} resumes on it in about a second. No re-parsing, no re-prompting.
                </p>
              </div>
              <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-fill-2" aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="p-6">
              <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">One click</div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {role.suggestions.map((s) => {
                  const taken = used.has(s.label);
                  return (
                    <button
                      key={s.label}
                      disabled={taken}
                      onClick={() => onAdd(build(s.label, s.kind, s.question, s.kind === "score" ? 1 : 0))}
                      className="card group flex items-start gap-3 rounded-xl p-3 text-left transition hover:-translate-y-0.5 hover:ring-2 hover:ring-cobalt/30 disabled:opacity-40 disabled:hover:translate-y-0"
                    >
                      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-fill-2 text-ink-2 group-hover:bg-cobalt group-hover:text-white">
                        <KindIcon kind={s.kind} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] font-medium">{s.label}</span>
                        <span className="block text-[11.5px] text-ink-3">{taken ? "Already added" : KIND_LABEL[s.kind]}</span>
                      </span>
                      {!taken && <Zap size={14} className="mt-1 text-ink-3 group-hover:text-cobalt" />}
                    </button>
                  );
                })}
              </div>

              <div className="mt-7 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">Or write your own</div>
              <div className="card mt-2 space-y-4 rounded-xl p-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <label className="block">
                    <span className="text-[12px] font-medium text-ink-2">Attribute name</span>
                    <input
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      placeholder="e.g. GraphQL API design"
                      className="mt-1 h-9 w-full rounded-lg bg-fill-2 px-3 text-[14px] outline-none focus:ring-2 focus:ring-cobalt/40"
                    />
                  </label>
                  <div>
                    <span className="text-[12px] font-medium text-ink-2">Answer type</span>
                    <div className="mt-1">
                      <Segmented
                        value={kind}
                        onChange={setKind}
                        options={[
                          { value: "score", label: "Score 0–10" },
                          { value: "noul", label: "Yes / no" },
                        ]}
                      />
                    </div>
                  </div>
                </div>
                <label className="block">
                  <span className="text-[12px] font-medium text-ink-2">Question Jev answers for every resume</span>
                  <textarea
                    value={q}
                    onChange={(e) => {
                      setTouched(true);
                      setQuestion(e.target.value);
                    }}
                    rows={2}
                    className="mt-1 w-full resize-none rounded-lg bg-fill-2 px-3 py-2 text-[13.5px] outline-none focus:ring-2 focus:ring-cobalt/40"
                  />
                </label>
                {kind === "score" && label.trim() && (
                  <div>
                    <span className="text-[12px] font-medium text-ink-2">Rubric (auto-generated, five levels mapped to 0–10)</span>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {rubricFor(label).map((l, i) => (
                        <span key={l} className="rounded-md bg-fill-2 px-2 py-1 text-[11.5px] text-ink-2">
                          <span className="tabular-nums text-ink-3">{i * 2.5}</span> {l}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[12.5px] text-ink-2">
                    Weight
                    <Segmented size="sm" value={weight} onChange={setWeight} options={[0, 0.5, 1, 2, 3].map((w) => ({ value: w, label: w === 0 ? "Off" : `×${w}` }))} />
                  </div>
                  <button
                    disabled={!label.trim() || !q.trim()}
                    onClick={() => {
                      onAdd(build(label, kind, q, weight));
                      reset();
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-cobalt px-4 py-2 text-[13.5px] font-medium text-white transition hover:brightness-110 disabled:opacity-40"
                  >
                    <Plus size={15} /> Add &amp; score {count} resumes
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
