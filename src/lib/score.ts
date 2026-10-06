import "server-only";
import { CANDIDATE_BY_ID } from "./candidates";
import { askJev, costUsd, type Answer } from "./jev";
import { toQuestion } from "./questions";
import { hash } from "./rng";
import type { Attribute, Cell, ScoreEvent } from "./types";

const CONCURRENCY = 24;

// Assumptions for the "re-parse everything with an LLM" baseline.
const LLM_IN = 3; // $ / M input tokens
const LLM_OUT = 15; // $ / M output tokens
const LLM_PROMPT_TOKENS = 350;
const LLM_TTFT_MS = 900;
const LLM_TOK_PER_SEC = 75;

/** Answers survive across requests so adding one attribute only asks one new question per resume. */
const cache = new Map<string, Cell>();

function attrKey(a: Attribute) {
  return hash(JSON.stringify([a.kind, a.question, a.levels, a.options])).toString(36);
}

function toCell(a: Attribute, ans: Answer): Cell {
  if (ans.type === "score") {
    const n = Object.keys(ans.probabilities).length;
    return { value: (ans.score / Math.max(1, n - 1)) * 10, confidence: ans.confidence, probs: ans.probabilities };
  }
  if (ans.type === "choice")
    return { value: a.optionValues?.[ans.choice] ?? 0, choice: ans.choice, confidence: ans.confidence, probs: ans.probabilities };
  return { value: ans.noul, probs: { yes: ans.noul } };
}

async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) await fn(items[i++]);
    }),
  );
}

export function scoreStream(ids: string[], attributes: Attribute[], fresh: boolean): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      const send = (e: ScoreEvent) => controller.enqueue(enc.encode(JSON.stringify(e) + "\n"));
      const started = performance.now();
      let requests = 0;
      let cachedRows = 0;
      let questions = 0;
      let inputTokens = 0;
      const keys = Object.fromEntries(attributes.map((a) => [a.id, attrKey(a)]));

      await pool(ids, CONCURRENCY, async (id) => {
        const c = CANDIDATE_BY_ID[id];
        if (!c) return;
        const cells: Record<string, Cell> = {};
        const missing: Attribute[] = [];
        for (const a of attributes) {
          const hit = !fresh && cache.get(`${id}::${keys[a.id]}`);
          if (hit) cells[a.id] = hit;
          else missing.push(a);
        }
        if (!missing.length) {
          cachedRows++;
          send({ type: "row", id, cells, latencyMs: 0, inputTokens: 0, cached: true });
          return;
        }
        try {
          const res = await askJev(c.resume, Object.fromEntries(missing.map((a) => [a.id, toQuestion(a)])));
          requests++;
          questions += missing.length;
          inputTokens += res.usage.input_tokens;
          for (const a of missing) {
            const ans = res.answers[a.id];
            if (!ans) continue;
            const cell = toCell(a, ans);
            cache.set(`${id}::${keys[a.id]}`, cell);
            cells[a.id] = cell;
          }
          send({ type: "row", id, cells, latencyMs: res.latencyMs, inputTokens: res.usage.input_tokens, cached: false });
        } catch (err) {
          send({ type: "error", id, message: err instanceof Error ? err.message : String(err) });
        }
      });

      // What re-parsing every resume with an LLM would cost for the same change.
      const resumeTokens = ids.reduce((s, id) => s + Math.ceil((CANDIDATE_BY_ID[id]?.resume.length ?? 0) / 4), 0);
      const llmIn = resumeTokens + ids.length * (LLM_PROMPT_TOKENS + attributes.length * 40);
      const outPer = 60 + attributes.length * 25;
      send({
        type: "done",
        wallMs: Math.round(performance.now() - started),
        requests,
        cachedRows,
        questions,
        inputTokens,
        costUsd: costUsd(inputTokens),
        llm: {
          inputTokens: llmIn,
          outputTokens: outPer * ids.length,
          costUsd: (llmIn / 1e6) * LLM_IN + ((outPer * ids.length) / 1e6) * LLM_OUT,
          serialMs: Math.round(ids.length * (LLM_TTFT_MS + (outPer / LLM_TOK_PER_SEC) * 1000)),
        },
      });
      controller.close();
    },
  });
}
