"use client";

import { motion } from "framer-motion";
import { CircleCheck, Gauge, ListChecks } from "lucide-react";
import { initials, scoreColor } from "@/lib/fit";
import type { AttributeKind, Stage } from "@/lib/types";

export function Avatar({ name, hue, size = 34 }: { name: string; hue: number; size?: number }) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full font-medium text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(140deg, hsl(${hue} 55% 62%), hsl(${(hue + 30) % 360} 50% 45%))`,
      }}
    >
      {initials(name)}
    </div>
  );
}

export function FitRing({ value, size = 40, stroke = 4, label = true }: { value: number | null; size?: number; stroke?: number; label?: boolean }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = value ?? 0;
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--fill-2)" strokeWidth={stroke} fill="none" />
        {value !== null && (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={scoreColor(v)}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            initial={false}
            animate={{ strokeDashoffset: c * (1 - v / 10) }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
        )}
      </svg>
      {label && (
        <span className="absolute font-semibold tabular-nums" style={{ fontSize: size * 0.3 }}>
          {value === null ? "–" : v.toFixed(1)}
        </span>
      )}
    </div>
  );
}

export function ScoreBar({ value, width = 56 }: { value: number; width?: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-7 text-right text-[13px] font-medium tabular-nums">{value.toFixed(1)}</span>
      <div className="h-[5px] overflow-hidden rounded-full bg-fill-2" style={{ width }}>
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(4, value * 10)}%` }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ background: scoreColor(value) }}
        />
      </div>
    </div>
  );
}

export function Pending({ width = 84 }: { width?: number }) {
  return <div className="shimmer h-[18px] rounded-md" style={{ width }} />;
}

export function KindIcon({ kind, size = 13 }: { kind: AttributeKind; size?: number }) {
  if (kind === "score") return <Gauge size={size} />;
  if (kind === "choice") return <ListChecks size={size} />;
  return <CircleCheck size={size} />;
}

export const KIND_LABEL: Record<AttributeKind, string> = { score: "Score 0–10", choice: "Category", noul: "Yes / no" };

export const STAGES: { id: Stage; label: string; color: string }[] = [
  { id: "new", label: "New", color: "var(--ink-3)" },
  { id: "shortlisted", label: "Shortlisted", color: "var(--cobalt)" },
  { id: "interview", label: "Interview", color: "var(--violet)" },
  { id: "rejected", label: "Rejected", color: "var(--rose)" },
];

export function StagePill({ stage }: { stage: Stage }) {
  const s = STAGES.find((x) => x.id === stage)!;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-medium" style={{ color: s.color, background: `color-mix(in srgb, ${s.color} 11%, transparent)` }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  size = "md",
}: {
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className={`inline-flex rounded-[9px] bg-fill-2 p-0.5 ${size === "sm" ? "text-[12px]" : "text-[13px]"}`}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          className={`relative rounded-[7px] px-2.5 py-1 font-medium transition ${value === o.value ? "text-ink" : "text-ink-2 hover:text-ink"}`}
        >
          {value === o.value && (
            <motion.span layoutId={`seg-${options.map((x) => x.value).join("-")}`} className="absolute inset-0 rounded-[7px] bg-panel shadow-[0_1px_3px_rgba(0,0,0,.12)]" transition={{ type: "spring", bounce: 0.15, duration: 0.4 }} />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
