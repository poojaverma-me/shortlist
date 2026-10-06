export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function rng(seed: number) {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rand = ReturnType<typeof rng>;

export const pick = <T,>(r: Rand, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
export const int = (r: Rand, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
export function sample<T>(r: Rand, xs: readonly T[], n: number): T[] {
  const copy = [...xs];
  const out: T[] = [];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(r() * copy.length), 1)[0]);
  return out;
}
