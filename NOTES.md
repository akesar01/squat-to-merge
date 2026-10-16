# squat-to-merge notes (2026-10-16)
- This repo was made from the Rep Counter build (notes below). Added: `scripts/verify-token.mjs` (+ vitest), the `squat-to-merge` workflow,
  a "keep count across clips" checkbox, and a default target of 10.
- Why the checkbox: none of the 5 hand-counted clips has 10 reps (max 6). The full 115 s double-kettlebell video counts 13, but
  reps 8–10 land at 64–68 s, where he is picking up the bells (false counts), so I didn't use it.
  Offline, chaining crush-grip (5) + interval (6) gives 11 in either order, which matches the hand count.
- The real token was generated in headed Chrome on my own Xvfb display :151: crush-grip ended at count 5, then count 10 at
  interval-push-ups t=32.8 s. Token: `REPS-cHVzaHVwOjEwOjE3OTIxNTY3NDQ5OTQ-2395c67d3a40` (10 push-ups, 2026-10-16 18:49 IST).

# Rep Counter for Devs: build notes (honest log)

## What it is
- A Vite + TS browser app using **MediaPipe Tasks Vision 1.1.1, PoseLandmarker *lite*** (float16 model), loaded locally from `public/`.
- Inputs: webcam, a video file, or a bundled sample video.
- Counting: joint angle with EMA smoothing plus hysteresis. Push-ups use the elbow (shoulder–elbow–wrist), squats use the knee (hip–knee–ankle). It picks the more-visible body side.
- Gag: after N reps it shows an unlock token, and `sample-github-action/` has a workflow plus a verifier. **The workflow is not installed in any repo.** The token is a joke, not security: the salt is public, so anyone can forge it.
- **The webcam path is untested.** There's no camera on the box.

## Videos (all real, from Wikimedia Commons; details in `videos/sources.json`)
| video | license | hand count |
|---|---|---|
| Squat - exercise demonstration video (7 s) | CC BY 3.0 | 2 squats |
| Kettlebell Racked Squats (side view) (51 s) | CC BY-SA 4.0 | 6 squats |
| Double Kettlebell Racked Squat (up view), first 55 s | CC BY-SA 4.0 | 6 squats |
| Interval Push-ups (51 s) | CC BY-SA 4.0 | 6 push-ups |
| Kettlebell crush grip push-up (8.6 s) | CC BY-SA 4.0 | 5 push-ups |
- **How I hand-counted:** I made ffmpeg contact sheets with timestamps (`handcount/*.jpg`) and counted the lowest positions frame by frame. One squat clip was cut to its first 55 s: after a camera change, the rest of the video was too ambiguous to count from frames.
- **Rejected and not counted:** 22 pushups for 22 veterans (×2), Tanzanian women competing (crowd / several people). The Army HRP video (many camera cuts, instructional). Muscle Strengthening at Home (mixed wall and knee push-ups, ambiguous). Navy SEAL (group).

## Accuracy (offline eval: step through frames at 15 fps; `node eval.mjs CPU 15`)
| version | squat demo | KB side | DKB up | interval PU | crush-grip PU | total abs error |
|---|---|---|---|---|---|---|
| v1 fixed thresholds (PU <100°/>145°, squat <110°/>155°) | 2/2 | 6/6 | 6/6 | 6/6 | **0/5** | 5 / 25 reps |
| v2 adaptive thresholds | 2/2 | **8/6** | 6/6 | 6/6 | 5/5 | 2 / 25 reps |
- **v1 failure:** on the crush-grip clip, the hands are on kettlebells and the elbow only bends to about 118–135° (2D angle). It never crossed 100°, so v1 counted 0.
- **v2 fix:** thresholds are now relative to the person's running "open" angle (down = open−35°, up = open−15°, never laxer than the fixed values). That fixed crush-grip, but **the KB side-view squat went from 6 to 8**. The extra counts are bending down to pick up the kettlebell (3.3 s) and to put it down (49.6 s).
- **Caveat:** v2 was tuned on these same 5 videos, so there's no held-out test. Treat 2/25 as optimistic.
- Real-time playback in a headed Chrome gave the same count (8) on the KB side-view clip.

## Speed / where it ran (measured on the box; no real GPU)
- **CPU delegate (WASM + XNNPACK)** in headless Chromium: detect ≈ 33–39 ms per frame on average (≈ 26–30 fps if detection were the only work).
- **GPU delegate** ran on WebGL through **SwiftShader** (software Vulkan): 127 ms per frame, ~4× slower than CPU. So on this box the "GPU" path is worse. On a real laptop GPU it should be different, but I didn't measure that.
- **Real-time in headed Google Chrome on Xvfb:** the in-app counter showed 35–41 fps (detect 19–27 ms). That dropped to 22–32 fps while ffmpeg was screen-recording at the same time.
- No pose was found in 0–2 frames per video (out of 107–825 frames).

## What broke
- The "merge unlocked" UI removed the element that `render()` wrote to, so it crashed on unlock. It surfaced as an eval timeout. Fixed.
- **My mistake:** my first screen recording grabbed X display `:99`, which another agent on this shared box was already using. My Xvfb didn't start, and ffmpeg recorded *their* screen. I deleted that recording and screenshot, closed the Chrome I had opened there, and re-recorded on my own display `:147`. The final files contain only this app.

## Deliverables
- `screenshot.png` is a frame from the real screen recording: Chrome window at 1440×900, real Commons video, pose overlay, "Merge unlocked" token.
  - It shows count 5 at video time ≈37 s. That's the 4th real squat, plus 1 false count from the kettlebell pickup.
- `recording.webm` is a 56 s x11grab of headed Chrome running the KB side-view clip in real time.
- I checked that the browser-generated token visible in the recording (`REPS-c3F1YXQ6NToxNzkyMTUzOTEwMzg4-60ab2f2ce6d6`) passes `sample-github-action/verify-token.mjs` with MIN_REPS=5. A tampered signature fails, and reps below MIN_REPS fail.

## Deploy
- Not deployed (no gh, Vercel or Netlify auth). Note that the WASM is 13 MB and the model 5.8 MB, which is fine for static hosting.

## Lessons
- Fixed angle thresholds fail on legit variations (kettlebell push-ups). Adaptive thresholds fix that but count any knee bend, so a real product needs an "in position" check (e.g. a horizontal torso for push-ups).
- In a headless VM, "GPU" can mean software rendering. Measure before assuming.
