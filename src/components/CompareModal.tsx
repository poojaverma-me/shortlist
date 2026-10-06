"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Crown, X } from "lucide-react";
import { useEffect } from "react";
import { CANDIDATE_BY_ID } from "@/lib/candidates";
import { scoreColor } from "@/lib/fit";
import type { Attribute, Cell } from "@/lib/types";
import Radar, { SERIES_COLORS } from "./Radar";
import { Avatar, FitRing } from "./ui";

type Props = { open: boolean; ids: string[]; attrs: Attribute[]; cells: Record<string, Record<string, Cell>>; fits: Record<string, number | null>; onClose: () => void };

export default function CompareModal({ open, ids, attrs, cells, fits, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const people = ids.map((id) => CANDIDATE_BY_ID[id]);
  const scoreAttrs = attrs.filter((a) => a.kind === "score");
  const ready = people.every((p) => scoreAttrs.every((a) => cells[p.id]?.[a.id]));
  const best = (a: Attribute) => Math.max(...people.map((p) => cells[p.id]?.[a.id]?.value ?? -1));
  const bestFit = Math.max(...people.map((p) => fits[p.id] ?? -1));

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal
            aria-label="Compare candidates"
            initial={{ y: 24, scale: 0.97 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 16, opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            className="thin-scroll relative max-h-[92vh] w-full max-w-[980px] overflow-y-auto rounded-[22px] bg-bg shadow-2xl ring-1 ring-line"
          >
            <div className="flex items-center justify-between border-b border-line bg-panel px-6 py-4">
              <h2 className="font-serif text-[1.6rem]">Side by side</h2>
              <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-fill-2" aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="grid gap-6 p-6 lg:grid-cols-[360px_1fr]">
              <div className="card flex flex-col items-center rounded-2xl p-4">
                {ready ? (
                  <Radar axes={scoreAttrs.map((a) => a.short ?? a.label)} series={people.map((p, i) => ({ name: p.name, color: SERIES_COLORS[i], values: scoreAttrs.map((a) => cells[p.id][a.id].value) }))} size={320} />
                ) : (
                  <div className="shimmer h-[280px] w-[280px] rounded-full" />
                )}
                <div className="mt-2 flex flex-wrap justify-center gap-3 text-[12px]">
                  {people.map((p, i) => (
                    <span key={p.id} className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: SERIES_COLORS[i] }} /> {p.name}
                    </span>
                  ))}
                </div>
              </div>
              <div className="card overflow-hidden rounded-2xl">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="px-4 py-3" />
                      {people.map((p, i) => (
                        <th key={p.id} className="px-3 py-3 text-left">
                          <div className="flex items-center gap-2">
                            <Avatar name={p.name} hue={p.hue} size={30} />
                            <div className="min-w-0">
                              <div className="truncate font-semibold" style={{ color: SERIES_COLORS[i] }}>
                                {p.name}
                              </div>
                              <div className="truncate text-[11.5px] font-normal text-ink-3">{p.company}</div>
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-line bg-fill/60">
                      <td className="px-4 py-3 font-semibold">Fit</td>
                      {people.map((p) => (
                        <td key={p.id} className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <FitRing value={fits[p.id] ?? null} size={36} />
                            {fits[p.id] === bestFit && <Crown size={14} className="text-amber" />}
                          </div>
                        </td>
                      ))}
                    </tr>
                    {attrs.map((a) => (
                      <tr key={a.id} className="border-b border-line last:border-0">
                        <td className="px-4 py-2.5 text-ink-2">{a.label}</td>
                        {people.map((p) => {
                          const cell = cells[p.id]?.[a.id];
                          const isBest = a.kind === "score" && cell && cell.value === best(a);
                          return (
                            <td key={p.id} className="px-3 py-2.5">
                              {!cell ? (
                                "–"
                              ) : a.kind === "score" ? (
                                <span className={`font-semibold tabular-nums ${isBest ? "underline decoration-2 underline-offset-4" : ""}`} style={{ color: scoreColor(cell.value) }}>
                                  {cell.value.toFixed(1)}
                                </span>
                              ) : a.kind === "choice" ? (
                                cell.choice
                              ) : (
                                <span className={cell.value >= 0.5 ? "text-emerald" : "text-ink-3"}>{cell.value >= 0.5 ? "Yes" : "No"}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
