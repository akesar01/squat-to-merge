import { describe, it, expect } from 'vitest';
// @ts-ignore
import { checkToken, findTokens } from '../scripts/verify-token.mjs';
import { unlockToken } from '../src/counter';
const now = 1_790_000_000_000;
describe('verify-token', () => {
  it('accepts a browser-made token that meets the target', async () => {
    const t = await unlockToken(11, 'pushup', now - 1000);
    expect(checkToken(t, { min: 10, now })).toMatchObject({ ok: true, reps: 11 });
  });
  it('rejects too few reps, tampering, stale and missing tokens', async () => {
    expect(checkToken(await unlockToken(9, 'squat', now), { min: 10, now }).ok).toBe(false);
    const t = await unlockToken(11, 'squat', now);
    expect(checkToken(t.slice(0, -1) + (t.endsWith('0') ? '1' : '0'), { now }).why).toMatch(/signature/);
    expect(checkToken(t, { now: now + 25 * 3600e3 }).why).toMatch(/24h/);
    expect(findTokens('LGTM')).toEqual([]);
    expect(findTokens(`REPS-TOKEN: ${t}`)).toEqual([t]);
  });
});
