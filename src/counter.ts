export type Exercise = 'pushup' | 'squat';
export interface LM { x: number; y: number; z?: number; visibility?: number }
// MediaPipe Pose indices
const L = { sh: 11, el: 13, wr: 15, hip: 23, kn: 25, an: 27 }, R = { sh: 12, el: 14, wr: 16, hip: 24, kn: 26, an: 28 };
export function angle(a: LM, b: LM, c: LM) {
  const ab = Math.atan2(a.y - b.y, a.x - b.x), cb = Math.atan2(c.y - b.y, c.x - b.x);
  let d = Math.abs((ab - cb) * 180 / Math.PI); return d > 180 ? 360 - d : d;
}
const vis = (p: LM) => p.visibility ?? 1;
export function jointAngle(lm: LM[], ex: Exercise): number | null {
  const pick = (s: typeof L) => ex === 'pushup' ? [lm[s.sh], lm[s.el], lm[s.wr]] : [lm[s.hip], lm[s.kn], lm[s.an]];
  const l = pick(L), r = pick(R); const vl = Math.min(...l.map(vis)), vr = Math.min(...r.map(vis));
  const best = vl >= vr ? l : r; if (Math.max(vl, vr) < 0.3) return null; // too uncertain
  return angle(best[0], best[1], best[2]);
}
export const THRESH = { pushup: { down: 100, up: 145 }, squat: { down: 110, up: 155 } };
export class RepCounter {
  reps = 0; phase: 'up' | 'down' = 'up'; smoothed: number | null = null; minSeen = 999;
  open = 0; // running "extended" angle, decays slowly so thresholds adapt to the person/camera
  constructor(public ex: Exercise, public alpha = 0.5, public adaptive = true) {}
  update(a: number | null): number {
    if (a == null) return this.reps;
    this.smoothed = this.smoothed == null ? a : this.alpha * a + (1 - this.alpha) * this.smoothed;
    const s = this.smoothed; this.open = Math.max(s, this.open - 0.05);
    const t = this.adaptive && this.open > 0 ? { down: Math.max(THRESH[this.ex].down, this.open - 35), up: Math.max(THRESH[this.ex].up - 20, this.open - 15) } : THRESH[this.ex];
    if (this.phase === 'up' && s < t.down) this.phase = 'down';
    else if (this.phase === 'down' && s > t.up) { this.phase = 'up'; this.reps++; }
    return this.reps;
  }
}
// Gag token, NOT security: salt is public, anyone can forge it.
export async function unlockToken(reps: number, ex: Exercise, ts = Date.now()) {
  const payload = `${ex}:${reps}:${ts}`;
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload + ':sweat-equity'));
  const sig = [...new Uint8Array(h)].slice(0, 6).map(b => b.toString(16).padStart(2, '0')).join('');
  return `REPS-${btoa(payload).replace(/=+$/, '')}-${sig}`;
}
