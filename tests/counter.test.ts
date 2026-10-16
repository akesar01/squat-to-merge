import { describe, it, expect } from 'vitest'; import { RepCounter, angle, unlockToken } from '../src/counter';
describe('synthetic angle sequences (not real video)', () => {
  it('angle of right angle', () => expect(Math.round(angle({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }))).toBe(90));
  it('counts 3 squats with hysteresis and ignores jitter', () => {
    const c = new RepCounter('squat', 1); const seq = [170, 165, 120, 105, 90, 112, 95, 160, 170, 90, 170, 150, 100, 168, 158, 152];
    seq.forEach(a => c.update(a)); expect(c.reps).toBe(3);
  });
  it('null frames do not change count', () => { const c = new RepCounter('pushup', 1); [160, null, 80, null, 160].forEach(a => c.update(a as any)); expect(c.reps).toBe(1); });
  it('token format', async () => expect(await unlockToken(10, 'pushup', 1)).toMatch(/^REPS-[A-Za-z0-9+/]+-[0-9a-f]{12}$/));
});
