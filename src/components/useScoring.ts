"use client";

import { useCallback, useRef, useState } from "react";
import type { Attribute, Cell, ScoreEvent } from "@/lib/types";

export type Done = Extract<ScoreEvent, { type: "done" }>;
export type Run = {
  id: number;
  label: string;
  roleId: string;
  attrIds: string[];
  total: number;
  received: number;
  errors: number;
  startedAt: number;
  done?: Done;
};

type Options = { label: string; fresh?: boolean; ids?: string[]; onRow?: (id: string, cells: Record<string, Cell>) => void };

export function useScoring() {
  const [cells, setCells] = useState<Record<string, Record<string, Cell>>>({});
  const [runs, setRuns] = useState<Run[]>([]);
  const seq = useRef(0);

  const score = useCallback(async (roleId: string, attributes: Attribute[], total: number, opts: Options) => {
    const id = ++seq.current;
    const run: Run = { id, label: opts.label, roleId, attrIds: attributes.map((a) => a.id), total, received: 0, errors: 0, startedAt: performance.now() };
    setRuns((rs) => [run, ...rs]);
    const patch = (p: Partial<Run>) => setRuns((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));

    const res = await fetch("/api/score", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ roleId, attributes, fresh: opts.fresh, ids: opts.ids }),
    });
    if (!res.ok || !res.body) {
      patch({ errors: total });
      return null;
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let received = 0;
    let errors = 0;
    let done: Done | undefined;
    for (;;) {
      const { value, done: end } = await reader.read();
      if (end) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      const rows: { id: string; cells: Record<string, Cell> }[] = [];
      for (const line of lines) {
        if (!line.trim()) continue;
        const e = JSON.parse(line) as ScoreEvent;
        if (e.type === "row") {
          rows.push(e);
          opts.onRow?.(e.id, e.cells);
        } else if (e.type === "error") errors++;
        else done = e;
      }
      if (rows.length) {
        received += rows.length;
        if (!opts.onRow)
          setCells((prev) => {
            const next = { ...prev };
            for (const r of rows) next[r.id] = { ...next[r.id], ...r.cells };
            return next;
          });
        patch({ received, errors });
      }
    }
    patch({ received, errors, done });
    return done ?? null;
  }, []);

  const clear = useCallback((ids: string[], attrIds?: string[]) => {
    setCells((prev) => {
      const next = { ...prev };
      for (const id of ids) {
        if (!attrIds) delete next[id];
        else if (next[id]) {
          const row = { ...next[id] };
          attrIds.forEach((a) => delete row[a]);
          next[id] = row;
        }
      }
      return next;
    });
  }, []);

  return { cells, runs, score, clear };
}
