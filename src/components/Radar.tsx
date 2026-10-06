"use client";

import { motion } from "framer-motion";

export type RadarSeries = { name: string; color: string; values: number[] };

const PAD_X = 64;

/** Long axis labels (custom criteria have no short name) wrap onto lines of about 14 characters. */
function wrap(label: string, max = 14) {
  const lines: string[] = [];
  for (const w of label.split(" ")) {
    const last = lines[lines.length - 1];
    if (last && (last + " " + w).length <= max) lines[lines.length - 1] = last + " " + w;
    else lines.push(w);
  }
  return lines;
}

export const SERIES_COLORS = ["var(--cobalt)", "var(--orange)", "var(--teal)"];

/** Multi-axis radar on a 0–10 scale. Axis labels sit outside the rings. */
export default function Radar({ axes, series, size = 300 }: { axes: string[]; series: RadarSeries[]; size?: number }) {
  const n = axes.length;
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 46;
  const pt = (i: number, v: number) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return [cx + Math.cos(a) * R * (v / 10), cy + Math.sin(a) * R * (v / 10)] as const;
  };
  const path = (vals: number[]) => vals.map((v, i) => pt(i, Math.max(0.2, v))).map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ") + " Z";

  if (n < 3) return <p className="text-sm text-ink-3">Add at least three score attributes to see the radar.</p>;
  return (
    <svg viewBox={`${-PAD_X} 0 ${size + PAD_X * 2} ${size}`} width="100%" style={{ maxWidth: size + PAD_X * 2 }} role="img" aria-label={`Radar chart of ${axes.join(", ")}`}>
      {[2.5, 5, 7.5, 10].map((ring) => (
        <path key={ring} d={path(axes.map(() => ring))} fill={ring === 10 ? "var(--fill)" : "none"} stroke="var(--line-2)" strokeWidth={1} />
      ))}
      {axes.map((_, i) => {
        const [x, y] = pt(i, 10);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line)" />;
      })}
      {series.map((s) => (
        <g key={s.name}>
          <motion.path
            initial={{ d: path(axes.map(() => 0.2)), opacity: 0 }}
            animate={{ d: path(s.values), opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            fill={s.color}
            fillOpacity={series.length > 1 ? 0.1 : 0.16}
            stroke={s.color}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          {s.values.map((v, i) => {
            const [x, y] = pt(i, Math.max(0.2, v));
            return <motion.circle key={i} initial={{ opacity: 0 }} animate={{ opacity: 1, cx: x, cy: y }} transition={{ duration: 0.8 }} r={3} fill={s.color} stroke="white" strokeWidth={1.5} />;
          })}
        </g>
      ))}
      {axes.map((label, i) => {
        const [x, y] = pt(i, 12.4);
        const anchor = Math.abs(x - cx) < 6 ? "middle" : x > cx ? "start" : "end";
        return (
          <text key={label} x={x} y={y} textAnchor={anchor} dominantBaseline="middle" fontSize={11} fill="var(--ink-2)" fontWeight={500}>
            {wrap(label).map((line, j, all) => (
              <tspan key={j} x={x} dy={j ? "1.2em" : `${-(all.length - 1) * 0.6}em`}>
                {line}
              </tspan>
            ))}
          </text>
        );
      })}
    </svg>
  );
}
