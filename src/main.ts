import { FilesetResolver, PoseLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import { RepCounter, jointAngle, unlockToken, type Exercise } from './counter';
import sources from '../videos/sources.json';
const $ = <T extends HTMLElement>(i: string) => document.getElementById(i) as T;
const v = $<HTMLVideoElement>('v'), cv = $<HTMLCanvasElement>('c'), ctx = cv.getContext('2d')!;
const SAMPLES: Record<string, Exercise> = { 'squat-exercise-demonstration-video': 'squat', 'kettlebell-racked-squats-side-view': 'squat', 'double-kettlebell-racked-squat-up-view-0-55s': 'squat', 'interval-push-ups': 'pushup', 'kettlebell-crush-grip-push-up': 'pushup' };
for (const s of Object.keys(SAMPLES)) $('sample').append(new Option(s, s));
const params = new URLSearchParams(location.search);
const delegate = (params.get('delegate') ?? 'CPU') as 'CPU' | 'GPU';
let pl: PoseLandmarker; let counter = new RepCounter('pushup'); let unlocked = false; let frames = 0, t0 = performance.now(), detMs = 0, fps = 0, lastAngle: number | null = null;
async function init() {
  const fs = await FilesetResolver.forVisionTasks('./wasm');
  pl = await PoseLandmarker.createFromOptions(fs, { baseOptions: { modelAssetPath: './models/pose_landmarker_lite.task', delegate }, runningMode: 'VIDEO', numPoses: 1 });
}
function ex(): Exercise { return ($('ex') as HTMLSelectElement).value as Exercise; }
function reset() { counter = new RepCounter(ex()); unlocked = false; $('token').hidden = true; $('gate').className = ''; render(); }
function credit(slug: string) { const s = (sources as any[]).find(x => slug.startsWith(x.slug)); $('credit').innerHTML = s ? `Video: <a href="${s.page}">${s.title.slice(5)}</a> · ${s.license} · Wikimedia Commons` : ''; }
function render() {
  const target = +($('target') as HTMLInputElement).value; $('reps').textContent = String(counter.reps);
  if (!unlocked) $('gate').innerHTML = `🔒 <b>${Math.max(0, target - counter.reps)}</b> reps to merge`;
  $('stats').textContent = `angle  ${lastAngle == null ? '—' : lastAngle.toFixed(0) + '°'}\nphase  ${counter.phase}\nfps    ${fps.toFixed(1)} (${delegate}, detect ${detMs.toFixed(0)} ms)`;
  if (!unlocked && counter.reps >= target) { unlocked = true; $('gate').className = 'ok'; $('gate').innerHTML = '🔓 Merge unlocked'; unlockToken(counter.reps, ex()).then(t => { $('token').hidden = false; $('token').textContent = `Paste in your PR description:\n${t}`; (window as any).__token = t; }); }
}
function draw(res: any) {
  cv.width = v.videoWidth; cv.height = v.videoHeight; ctx.clearRect(0, 0, cv.width, cv.height);
  const du = new DrawingUtils(ctx);
  for (const lm of res.landmarks ?? []) { du.drawConnectors(lm, PoseLandmarker.POSE_CONNECTIONS, { color: '#2da44e', lineWidth: 3 }); du.drawLandmarks(lm, { color: '#fff', fillColor: '#cf222e', radius: 3 }); }
}
function process(ts: number) {
  const a0 = performance.now(); const res = pl.detectForVideo(v, ts); detMs = performance.now() - a0;
  const lm = res.landmarks?.[0]; lastAngle = lm ? jointAngle(lm as any, counter.ex) : null; counter.update(lastAngle); draw(res);
  frames++; const now = performance.now(); if (now - t0 > 1000) { fps = frames * 1000 / (now - t0); frames = 0; t0 = now; } render();
}
function loop() { if (!v.paused && !v.ended && v.readyState >= 2) process(performance.now()); requestAnimationFrame(loop); }
async function playSrc(src: string | MediaStream) {
  if (typeof src === 'string') { v.srcObject = null; v.src = src; } else v.srcObject = src; if (!($('keep') as HTMLInputElement).checked) reset(); await v.play();
}
$('sample').onchange = () => { const s = ($('sample') as HTMLSelectElement).value; if (!s) return; if (!($('keep') as HTMLInputElement).checked) ($('ex') as HTMLSelectElement).value = SAMPLES[s]; credit(s); playSrc(`./videos/${s}.webm`); };
$('file').onchange = () => { const f = ($('file') as HTMLInputElement).files?.[0]; if (f) { $('credit').textContent = f.name; playSrc(URL.createObjectURL(f)); } };
$('cam').onclick = async () => playSrc(await navigator.mediaDevices.getUserMedia({ video: true }));
$('reset').onclick = reset; $('ex').onchange = reset;
// Offline eval: step through frames at fixed rate so the count doesn't depend on machine speed
async function evalRun(slug: string, rate: number) {
  ($('ex') as HTMLSelectElement).value = SAMPLES[slug]; reset(); credit(slug); v.src = `./videos/${slug}.webm`;
  await new Promise(r => v.onloadeddata = r); const dur = v.duration; const angles: (number | null)[] = []; const w0 = performance.now(); let n = 0, det = 0;
  for (let t = 0; t < dur; t += 1 / rate) {
    v.currentTime = t; await new Promise(r => v.onseeked = r);
    const a = performance.now(); const res = pl.detectForVideo(v, Math.round(t * 1000) + 1); det += performance.now() - a; n++;
    const lm = res.landmarks?.[0]; const ang = lm ? jointAngle(lm as any, counter.ex) : null; angles.push(ang); counter.update(ang); lastAngle = ang; draw(res); render();
  }
  (window as any).__result = { slug, reps: counter.reps, frames: n, noPose: angles.filter(a => a == null).length, detectMsAvg: det / n, wallS: (performance.now() - w0) / 1000, angles };
}
init().then(() => { (window as any).__ready = true; const e = params.get('eval'); if (e) evalRun(e, +(params.get('rate') ?? 15)); else if (params.get('sample')) { ($('sample') as HTMLSelectElement).value = params.get('sample')!; $('sample').onchange!(new Event('change')); } requestAnimationFrame(loop); });
