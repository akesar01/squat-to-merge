import { chromium } from 'playwright'; import { writeFileSync } from 'fs';
const truth = { 'squat-exercise-demonstration-video': 2, 'kettlebell-racked-squats-side-view': 6, 'double-kettlebell-racked-squat-up-view-0-55s': 6, 'interval-push-ups': 6, 'kettlebell-crush-grip-push-up': 5 };
const delegate = process.argv[2] ?? 'CPU'; const rate = process.argv[3] ?? '15';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] }); const out = [];
for (const [slug, gt] of Object.entries(truth)) {
  const p = await b.newPage(); const logs = []; p.on('console', m => logs.push(m.text())); p.on('pageerror', e => logs.push('ERR ' + e.message));
  await p.goto(`http://127.0.0.1:4175/?eval=${slug}&rate=${rate}&delegate=${delegate}`);
  try { await p.waitForFunction(() => window.__result, null, { timeout: 600000 }); } catch (e) { console.log(slug, 'timeout', logs.slice(-5)); continue; }
  const r = await p.evaluate(() => window.__result); const { angles, ...rest } = r;
  out.push({ ...rest, truth: gt, err: r.reps - gt, angles }); console.log(JSON.stringify({ ...rest, truth: gt }));
  await p.close();
}
await b.close(); writeFileSync(`eval-${delegate}-${rate}fps.json`, JSON.stringify(out));
