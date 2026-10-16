// Joke gate: checks that some text (PR body + comments) contains a rep token from the
// Rep Counter page that meets MIN_REPS. NOT security: the salt is public, so anyone can
// forge a token with a few lines of code. See README.
// Token format: REPS-<base64("exercise:reps:unixms")>-<first 12 hex of sha256(payload + ":sweat-equity")>
import { createHash } from 'crypto';
import { readFileSync } from 'fs';

export function checkToken(token, { min = 10, now = Date.now(), maxAgeMs = 24 * 3600e3 } = {}) {
  const m = token.match(/^REPS-([A-Za-z0-9+/]+)-([0-9a-f]{12})$/);
  if (!m) return { ok: false, why: 'malformed token' };
  const payload = Buffer.from(m[1], 'base64').toString();
  const [ex, repsS, tsS] = payload.split(':'); const reps = +repsS, ts = +tsS;
  if (!['squat', 'pushup'].includes(ex) || !Number.isInteger(reps) || !Number.isFinite(ts)) return { ok: false, why: 'bad payload' };
  const sig = createHash('sha256').update(payload + ':sweat-equity').digest('hex').slice(0, 12);
  if (sig !== m[2]) return { ok: false, why: 'signature mismatch. Nice try.' };
  if (reps < min) return { ok: false, why: `only ${reps} ${ex}s, need ${min}` };
  if (ts > now + 5 * 60e3) return { ok: false, why: 'token from the future' };
  if (now - ts > maxAgeMs) return { ok: false, why: 'token older than 24h. Sweat is perishable.' };
  return { ok: true, ex, reps, ts };
}

export function findTokens(text) {
  return [...(text ?? '').matchAll(/REPS-[A-Za-z0-9+/]+-[0-9a-f]{12}/g)].map(m => m[0]);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const text = process.env.TEXT_FILE ? readFileSync(process.env.TEXT_FILE, 'utf8') : (process.argv[2] ?? '');
  const min = +(process.env.MIN_REPS ?? 10);
  const tokens = findTokens(text);
  if (!tokens.length) { console.error(`❌ No rep token in the PR body or comments. Do ${min} squats or push-ups first.`); process.exit(1); }
  for (const t of tokens) {
    const r = checkToken(t, { min });
    if (r.ok) { console.log(`✅ ${r.reps} ${r.ex}s verified (counted ${new Date(r.ts).toISOString()}). Merge away.`); process.exit(0); }
    console.error(`token ${t.slice(0, 24)}…: ${r.why}`);
  }
  console.error('❌ No valid token.'); process.exit(1);
}
