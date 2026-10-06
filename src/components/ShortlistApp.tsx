"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Briefcase, Sparkles, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { candidatesFor } from "@/lib/candidates";
import { fitScore, usd } from "@/lib/fit";
import { ROLES } from "@/lib/roles";
import { INITIAL_INTERVIEWS, INITIAL_STAGES, type Interview } from "@/lib/seed";
import type { Attribute, Stage } from "@/lib/types";
import AddAttributeSheet from "./AddAttributeSheet";
import CandidateDrawer from "./CandidateDrawer";
import CandidatesView from "./CandidatesView";
import CompareModal from "./CompareModal";
import HowJevScores from "./HowJevScores";
import ScheduleModal from "./ScheduleModal";
import { STAGES } from "./ui";
import { useScoring } from "./useScoring";

export type View = "candidates" | "how";

export default function ShortlistApp() {
  const [roleId, setRoleId] = useState(ROLES[0].id);
  const [attrsByRole, setAttrsByRole] = useState<Record<string, Attribute[]>>(() => Object.fromEntries(ROLES.map((r) => [r.id, r.attributes])));
  const [view, setViewState] = useState<View>("candidates");
  const [stages, setStages] = useState<Record<string, Stage>>(INITIAL_STAGES);
  const [interviews, setInterviews] = useState<Record<string, Interview>>(INITIAL_INTERVIEWS);
  const [selected, setSelected] = useState<string | null>(null);
  const [compare, setCompare] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [scheduleFor, setScheduleFor] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<Stage | null>(null);
  const [newAttr, setNewAttr] = useState<string | null>(null);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const { cells, runs, score, clear } = useScoring();
  const scoredRoles = useRef(new Set<string>());

  const role = ROLES.find((r) => r.id === roleId)!;
  const attrs = attrsByRole[roleId];
  const candidates = useMemo(() => candidatesFor(roleId), [roleId]);
  const fits = useMemo(() => Object.fromEntries(candidates.map((c) => [c.id, fitScore(attrs, cells[c.id])])), [candidates, attrs, cells]);
  const ranked = useMemo(() => [...candidates].sort((a, b) => (fits[b.id] ?? -1) - (fits[a.id] ?? -1)), [candidates, fits]);
  const activeRun = runs.find((r) => r.roleId === roleId && !r.done);

  const say = useCallback((text: string) => setToast({ id: Date.now(), text }), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(t);
  }, [toast]);

  const setView = useCallback((v: View) => {
    setViewState(v);
    setSelected(null);
    window.history.replaceState(null, "", v === "how" ? "#how-jev-scores" : window.location.pathname);
    document.getElementById("main")?.scrollTo({ top: 0 });
  }, []);
  // Deep link: /#how-jev-scores opens the explainer page.
  useEffect(() => {
    const fromHash = () => {
      if (window.location.hash !== "#how-jev-scores") return;
      setViewState("how");
      setSelected(null);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  // Score every resume for a role the first time it's opened.
  useEffect(() => {
    if (scoredRoles.current.has(roleId)) return;
    scoredRoles.current.add(roleId);
    void score(roleId, attrsByRole[roleId], candidatesFor(roleId).length, { label: `Initial screen · ${ROLES.find((r) => r.id === roleId)!.title}` });
  }, [roleId, attrsByRole, score]);

  const addAttribute = useCallback(
    async (a: Attribute) => {
      const next = [...attrsByRole[roleId], a];
      setAttrsByRole((m) => ({ ...m, [roleId]: next }));
      setSheet(false);
      setNewAttr(a.id);
      say(`Jev is scoring ${candidates.length} resumes on “${a.label}”…`);
      const done = await score(roleId, next, candidates.length, { label: `Added “${a.label}”` });
      if (done) say(`“${a.label}” scored for ${candidates.length} resumes in ${(done.wallMs / 1000).toFixed(2)} s · ${usd(done.costUsd)}`);
    },
    [attrsByRole, roleId, candidates.length, score, say],
  );

  const removeAttribute = useCallback((id: string) => setAttrsByRole((m) => ({ ...m, [roleId]: m[roleId].filter((a) => a.id !== id) })), [roleId]);
  const setWeight = useCallback(
    (id: string, weight: number) => setAttrsByRole((m) => ({ ...m, [roleId]: m[roleId].map((a) => (a.id === id ? { ...a, weight } : a)) })),
    [roleId],
  );

  const rescoreAll = useCallback(async () => {
    const ids = candidates.map((c) => c.id);
    clear(ids, attrs.map((a) => a.id));
    const done = await score(roleId, attrs, ids.length, { label: "Full re-score (no cache)", fresh: true });
    if (done) say(`Re-scored ${ids.length} resumes × ${attrs.length} attributes in ${(done.wallMs / 1000).toFixed(2)} s`);
  }, [candidates, attrs, roleId, clear, score, say]);

  const moveStage = useCallback(
    (id: string, s: Stage) => {
      setStages((m) => ({ ...m, [id]: s }));
      const c = candidates.find((x) => x.id === id);
      if (c) say(`${c.name} moved to ${STAGES.find((x) => x.id === s)!.label}`);
    },
    [candidates, say],
  );

  const switchRole = (id: string) => {
    setRoleId(id);
    setCompare([]);
    setStageFilter(null);
    setNewAttr(null);
    setSelected(null);
    setView("candidates");
  };

  const counts = Object.fromEntries(STAGES.map((s) => [s.id, candidates.filter((c) => stages[c.id] === s.id).length]));
  const totals = runs.reduce(
    (acc, r) => (r.done ? { q: acc.q + r.done.questions, cost: acc.cost + r.done.costUsd, llm: acc.llm + r.done.llm.costUsd, calls: acc.calls + r.done.requests } : acc),
    { q: 0, cost: 0, llm: 0, calls: 0 },
  );

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="material sticky top-0 hidden h-full w-[264px] shrink-0 flex-col border-r border-line md:flex">
        <div className="flex items-baseline gap-2 px-5 pb-4 pt-6">
          <span className="font-serif text-[1.65rem] italic leading-none tracking-tight">Shortlist</span>
          <span className="rounded-full bg-cobalt-soft px-1.5 py-0.5 text-[10px] font-semibold text-cobalt">Jev</span>
        </div>
        <nav className="thin-scroll flex-1 overflow-y-auto px-3 pb-4">
          <SideLabel>Openings</SideLabel>
          {ROLES.map((r) => (
            <button
              key={r.id}
              onClick={() => switchRole(r.id)}
              className={`mb-0.5 flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${r.id === roleId ? "bg-cobalt text-white shadow-sm" : "hover:bg-fill-2"}`}
            >
              <Briefcase size={15} className={`mt-0.5 shrink-0 ${r.id === roleId ? "text-white/80" : "text-ink-3"}`} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{r.title}</span>
                <span className={`block truncate text-[11.5px] ${r.id === roleId ? "text-white/70" : "text-ink-3"}`}>{r.location}</span>
              </span>
              <span className={`text-[11.5px] tabular-nums ${r.id === roleId ? "text-white/80" : "text-ink-3"}`}>{candidatesFor(r.id).length}</span>
            </button>
          ))}

          <SideLabel>Workspace</SideLabel>
          <SideItem icon={<Users size={15} />} active={view === "candidates"} onClick={() => setView("candidates")}>
            Candidates
          </SideItem>
          <SideItem icon={<Sparkles size={15} />} active={view === "how"} onClick={() => setView("how")}>
            How Jev scores
          </SideItem>

          <SideLabel>Pipeline</SideLabel>
          {STAGES.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setStageFilter(stageFilter === s.id ? null : s.id);
                setView("candidates");
              }}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition ${stageFilter === s.id ? "bg-fill-2 font-medium" : "hover:bg-fill"}`}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              <span className="flex-1 text-left">{s.label}</span>
              <span className="tabular-nums text-ink-3">{counts[s.id]}</span>
            </button>
          ))}
        </nav>
        <div className="m-3 rounded-xl bg-panel p-3.5 text-[12px] ring-1 ring-line">
          <div className="font-medium">This session</div>
          <div className="mt-2 grid grid-cols-2 gap-y-1 text-ink-2">
            <span>Jev calls</span>
            <span className="text-right tabular-nums text-ink">{totals.calls}</span>
            <span>Questions</span>
            <span className="text-right tabular-nums text-ink">{totals.q.toLocaleString()}</span>
            <span>Jev cost</span>
            <span className="text-right tabular-nums text-emerald">{usd(totals.cost)}</span>
            <span>LLM estimate</span>
            <span className="text-right tabular-nums text-ink">{usd(totals.llm)}</span>
          </div>
        </div>
      </aside>

      <main id="main" className="thin-scroll h-full min-w-0 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div key={`${view}-${roleId}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            {view === "candidates" ? (
              <CandidatesView
                role={role}
                attrs={attrs}
                candidates={ranked}
                cells={cells}
                fits={fits}
                stages={stages}
                stageFilter={stageFilter}
                setStageFilter={setStageFilter}
                activeRun={activeRun}
                lastRun={runs.find((r) => r.roleId === roleId && r.done)}
                newAttr={newAttr}
                compare={compare}
                setCompare={setCompare}
                onOpen={setSelected}
                onAdd={() => setSheet(true)}
                onRemoveAttr={removeAttribute}
                onWeight={setWeight}
                onRescore={rescoreAll}
                onCompare={() => setComparing(true)}
                onStage={moveStage}
                onSchedule={setScheduleFor}
                interviews={interviews}
                onHow={() => setView("how")}
                onSwitchRole={switchRole}
              />
            ) : (
              <HowJevScores role={role} attrs={attrs} ranked={ranked} cells={cells} fits={fits} runs={runs.filter((r) => r.roleId === roleId)} score={score} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <CandidateDrawer
        id={selected}
        role={role}
        attrs={attrs}
        cells={cells}
        fits={fits}
        ranked={ranked}
        stage={selected ? stages[selected] : "new"}
        interview={selected ? interviews[selected] : undefined}
        onClose={() => setSelected(null)}
        onStage={moveStage}
        onSchedule={setScheduleFor}
      />

      <AddAttributeSheet open={sheet} role={role} existing={attrs} count={candidates.length} onClose={() => setSheet(false)} onAdd={addAttribute} />

      <ScheduleModal
        candidate={candidates.find((c) => c.id === scheduleFor) ?? null}
        onClose={() => setScheduleFor(null)}
        onConfirm={(id, iv) => {
          setInterviews((m) => ({ ...m, [id]: iv }));
          setStages((m) => ({ ...m, [id]: "interview" }));
          setScheduleFor(null);
          const c = candidates.find((x) => x.id === id);
          say(`Interview booked for ${c?.name} with ${iv.with}`);
        }}
      />

      <CompareModal open={comparing} ids={compare} attrs={attrs} cells={cells} fits={fits} onClose={() => setComparing(false)} />

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-[13px] font-medium text-white shadow-2xl"
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SideLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-1.5 mt-5 px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">{children}</div>;
}

function SideItem({ icon, active, onClick, children }: { icon: React.ReactNode; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition ${active ? "bg-fill-2 font-medium" : "hover:bg-fill"}`}>
      <span className={active ? "text-cobalt" : "text-ink-3"}>{icon}</span>
      {children}
    </button>
  );
}
